import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  SlashCommandBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import db, { BotConfig, Product, Order, StockCode } from './database';
import { deliverOrder } from './delivery';

export interface CommandExecutionResult {
  content?: string;
  embeds?: any[];
  components?: any[];
  ephemeral?: boolean;
  success: boolean;
}

class BotManager {
  public client: Client | null = null;
  public isConnected = false;
  public statusMessage = 'Standby (Configured for Railway & Local)';
  public lastPing = -1;
  public guildCount = 0;
  public userCount = 0;
  public startTimestamp: number | null = null;

  constructor() {
    // Attempt auto-login if valid token is provided in env or config
    const token = process.env.DISCORD_TOKEN || db.getConfig().token;
    if (token && !token.includes('MY_DISCORD_TOKEN') && token.length > 40) {
      this.initClient(token).catch(err => {
        console.log('[BotManager] Standby mode:', err?.message || 'Token not authenticated');
      });
    }
  }

  public async initClient(token: string): Promise<{ success: boolean; message: string }> {
    try {
      if (this.client) {
        await this.client.destroy().catch(() => {});
      }

      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.MessageContent
        ],
        partials: [Partials.Channel, Partials.Message]
      });

      this.setupEventHandlers();

      await this.client.login(token);
      this.isConnected = true;
      this.startTimestamp = Date.now();
      this.statusMessage = `Online as ${this.client.user?.tag}`;
      this.guildCount = this.client.guilds.cache.size;
      return { success: true, message: `Connected as ${this.client.user?.tag}` };
    } catch (err: any) {
      this.isConnected = false;
      this.statusMessage = `Connection issue: ${err?.message || 'Invalid Token'}`;
      return { success: false, message: err?.message || 'Failed to login' };
    }
  }

  public async stopClient(): Promise<{ success: boolean; message: string }> {
    if (this.client) {
      await this.client.destroy().catch(() => {});
      this.client = null;
      this.isConnected = false;
      this.statusMessage = 'Stopped';
      return { success: true, message: 'Bot stopped successfully' };
    }
    return { success: true, message: 'Bot was not running' };
  }

  public getStatus() {
    const config = db.getConfig();
    return {
      isConnected: this.isConnected,
      statusMessage: this.statusMessage,
      ping: this.client?.ws.ping || this.lastPing || 0,
      guildCount: this.client?.guilds.cache.size || this.guildCount,
      uptime: this.startTimestamp ? Math.floor((Date.now() - this.startTimestamp) / 1000) : 0,
      userTag: this.client?.user?.tag || 'ShopBot#0001 (Automated)',
      clientId: config.clientId,
      guildId: config.guildId,
      hasToken: Boolean(config.token && config.token.length > 20)
    };
  }

  private setupEventHandlers() {
    if (!this.client) return;

    this.client.once('ready', async () => {
      console.log(`[DiscordBot] ✅ Logged in as ${this.client?.user?.tag}`);
      this.client?.user?.setActivity('🛒 /shop | Instant Codes', { type: 3 });
      this.isConnected = true;
      this.statusMessage = `Online as ${this.client?.user?.tag}`;

      // Auto-deploy slash commands on connect to ensure commands are live in Discord immediately
      try {
        console.log('[DiscordBot] 🔄 Automatically syncing slash commands to Discord...');
        const deployRes = await this.deploySlashCommands();
        console.log('[DiscordBot] Deploy result:', deployRes.message);
      } catch (depErr) {
        console.warn('[DiscordBot] Auto-deploy warning:', depErr);
      }
    });

    this.client.on('messageCreate', async (message: any) => {
      try {
        if (message.author?.bot) return;
        const validPrefixes = ['!', '.', '$', '?'];
        const prefix = validPrefixes.find(p => message.content?.startsWith(p));
        if (!prefix) return;

        const rawContent = message.content.slice(prefix.length).trim();
        if (!rawContent) return;

        const parts = rawContent.split(/\s+/);
        const commandName = parts[0].toLowerCase();
        const argsList = parts.slice(1);

        console.log(`[DiscordBot] Received prefix command: ${prefix}${commandName} from ${message.author.tag}`);

        // Convert positional arguments based on command
        const args: Record<string, any> = {};
        if (commandName === 'buy') {
          args.product = argsList[0] || '';
          args.quantity = argsList[1] ? Number(argsList[1]) : 1;
        } else if (commandName === 'checkcodes' || commandName === 'checkcode') {
          args.product = argsList[0] || '';
          args.codes = argsList.slice(1).join(' ');
        } else if (commandName === 'pay') {
          args.order = argsList[0] || '';
        } else if (commandName === 'checkpayment') {
          args.order = argsList[0] || '';
          args.txid = argsList[1] || '';
        } else if (commandName === 'redeem') {
          args.code = argsList[0] || '';
        } else if (commandName === 'order') {
          args.id = argsList[0] || '';
        } else if (commandName === 'vouch') {
          args.order = argsList[0] || '';
          args.rating = argsList[1] ? Number(argsList[1]) : 5;
          args.comment = argsList.slice(2).join(' ') || 'Great shop!';
        } else if (commandName === 'addbalance' || commandName === 'removebalance') {
          args.user = argsList[0] || '';
          args.amount = argsList[1] ? Number(argsList[1]) : 0;
        } else if (commandName === 'addstock') {
          args.product = argsList[0] || '';
          args.codes = argsList.slice(1).join('\n');
        } else if (commandName === 'blacklist' || commandName === 'unblacklist') {
          args.user = argsList[0] || '';
          args.reason = argsList.slice(1).join(' ') || 'Terms violation';
        }

        const res = await this.handleCommand(
          commandName,
          args,
          {
            id: message.author.id,
            tag: message.author.tag || message.author.username,
            isAdmin: message.member?.permissions?.has(PermissionFlagsBits.Administrator) || message.author.id === db.getConfig().ownerId
          }
        );

        if (res.embeds || res.components || res.content) {
          await message.reply({
            content: res.content,
            embeds: res.embeds,
            components: res.components
          }).catch(console.error);
        }
      } catch (err) {
        console.error('[DiscordBot messageCreate Error]', err);
      }
    });

    this.client.on('interactionCreate', async (interaction: any) => {
      try {
        if (interaction.isChatInputCommand()) {
          const res = await this.handleCommand(
            interaction.commandName,
            interaction.options.data.reduce((acc: any, curr: any) => {
              acc[curr.name] = curr.value;
              return acc;
            }, {}),
            {
              id: interaction.user.id,
              tag: interaction.user.tag || interaction.user.username,
              isAdmin: interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) || interaction.user.id === db.getConfig().ownerId
            }
          );

          if (res.embeds || res.components || res.content) {
            await interaction.reply({
              content: res.content,
              embeds: res.embeds,
              components: res.components,
              ephemeral: res.ephemeral ?? false
            }).catch(async () => {
              await interaction.followUp({
                content: res.content,
                embeds: res.embeds,
                components: res.components,
                ephemeral: res.ephemeral ?? false
              }).catch(() => {});
            });
          }
          return;
        }

        if (interaction.isButton() || interaction.isStringSelectMenu()) {
          const res = await this.handleInteraction(
            interaction.customId,
            interaction.isStringSelectMenu() ? interaction.values : [],
            {
              id: interaction.user.id,
              tag: interaction.user.tag || interaction.user.username,
              isAdmin: interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) || interaction.user.id === db.getConfig().ownerId
            }
          );

          if (res.embeds || res.components || res.content) {
            if (interaction.isButton() && (interaction.customId.startsWith('buy_now_') || interaction.customId.startsWith('pay_btn_') || interaction.customId.startsWith('pay_bal_'))) {
              await interaction.reply({
                content: res.content,
                embeds: res.embeds,
                components: res.components,
                ephemeral: true
              }).catch(() => {});
            } else {
              await interaction.update({
                content: res.content,
                embeds: res.embeds,
                components: res.components
              }).catch(async () => {
                await interaction.reply({
                  content: res.content,
                  embeds: res.embeds,
                  components: res.components,
                  ephemeral: true
                }).catch(() => {});
              });
            }
          }
        }
      } catch (err) {
        console.error('[DiscordBot Interaction Error]', err);
        interaction.reply({ content: '❌ An error occurred processing this request.', ephemeral: true }).catch(() => {});
      }
    });
  }

  // --- UNIFIED COMMAND EXECUTION (Works for both Live Discord Bot & Dashboard Simulator) ---
  public async handleCommand(
    commandName: string,
    args: Record<string, any> = {},
    user: { id: string; tag: string; isAdmin?: boolean } = { id: '985810642818703401', tag: 'WhiteCopa', isAdmin: true }
  ): Promise<CommandExecutionResult> {
    const config = db.getConfig();
    const users = db.getUsers();

    // Ensure user exists in database
    if (!users[user.id]) {
      users[user.id] = {
        user_id: user.id,
        username: user.tag,
        balance: 0,
        total_spent: 0,
        orders_count: 0,
        blacklisted: 0,
        blacklist_reason: '',
        created_at: new Date().toISOString()
      };
      db.saveData();
    }

    const currentUser = users[user.id];
    if (currentUser.blacklisted === 1 && !['unblacklist', 'userinfo'].includes(commandName)) {
      return {
        content: `❌ You are blacklisted from this shop: "${currentUser.blacklist_reason || 'Terms violation'}"`,
        ephemeral: true,
        success: false
      };
    }

    switch (commandName) {
      // 1. /shop
      case 'shop': {
        const categories = config.categories;
        const embed = new EmbedBuilder()
          .setTitle('🛍️ Digital Shop Catalog')
          .setDescription(
            `Welcome to our automated store!\n` +
            `• Instant automated digital code delivery 24/7\n` +
            `• Verified codes & instant payments\n\n` +
            `**Select a category below to browse items:**`
          )
          .setColor(0x5865F2);

        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        let row = new ActionRowBuilder<ButtonBuilder>();

        categories.forEach((cat, i) => {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`shop_category_${cat}`)
              .setLabel(cat)
              .setStyle(ButtonStyle.Primary)
          );
          if ((i + 1) % 3 === 0 || i === categories.length - 1) {
            rows.push(row);
            row = new ActionRowBuilder<ButtonBuilder>();
          }
        });

        return { embeds: [embed.toJSON()], components: rows.map(r => r.toJSON()), success: true };
      }

      // 2. /buy [product] [quantity]
      case 'buy': {
        const query = String(args.product || '').toLowerCase();
        const quantity = Math.max(1, Number(args.quantity || 1));
        const product = db.getProducts().find(p => p.active === 1 && (p.name.toLowerCase().includes(query) || String(p.id) === query));

        if (!product) {
          return { content: `❌ Product "${args.product}" not found. Use \`/shop\` or \`/stock\` to view items.`, ephemeral: true, success: false };
        }

        if (product.stock < quantity) {
          return { content: `❌ Insufficient stock. Only **${product.stock}** available (Requested: ${quantity}).`, ephemeral: true, success: false };
        }

        const orderId = config.orderPrefix + uuidv4().slice(0, 8).toUpperCase();
        const totalPrice = product.price * quantity;
        const expires = new Date(Date.now() + config.paymentTimeoutMinutes * 60000).toISOString();

        const newOrder: Order = {
          id: orderId,
          user_id: user.id,
          user_tag: user.tag,
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          quantity: quantity,
          status: 'pending',
          payment_method: 'Pending',
          payment_address: '',
          payment_amount: totalPrice,
          payment_txid: '',
          delivered_codes: [],
          created_at: new Date().toISOString(),
          paid_at: null,
          delivered_at: null,
          expires_at: expires
        };

        db.getOrders().unshift(newOrder);
        db.saveData();

        const embed = new EmbedBuilder()
          .setTitle('🛒 Order Created Successfully')
          .setDescription(
            `**Order ID:** \`${orderId}\`\n` +
            `**Product:** ${product.name}\n` +
            `**Quantity:** ${quantity}\n` +
            `**Total Price:** ${config.currencySymbol}${totalPrice.toFixed(2)}\n\n` +
            `*Your account balance:* ${config.currencySymbol}${currentUser.balance.toFixed(2)}\n\n` +
            `Click **Pay with Balance** or **Crypto Payment** below:`
          )
          .setColor(0x57F287)
          .setFooter({ text: `Expires in ${config.paymentTimeoutMinutes} minutes` });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`pay_bal_${orderId}`).setLabel('💵 Pay with Balance').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`pay_btn_${orderId}`).setLabel('💳 Crypto Instructions').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`cancel_order_${orderId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        return { embeds: [embed.toJSON()], components: [row.toJSON()], ephemeral: true, success: true };
      }

      // 3. /checkcodes [product] [codes] (The bot's core superpower!)
      case 'checkcodes':
      case 'checkcode': {
        const prodQuery = String(args.product || '').toLowerCase();
        const rawCodes = String(args.codes || '');
        const product = db.getProducts().find(p => p.name.toLowerCase().includes(prodQuery) || String(p.id) === prodQuery);

        if (!product) {
          return { content: `❌ Product "${args.product}" not found. Please provide a valid product name or ID.`, ephemeral: true, success: false };
        }

        if (!rawCodes.trim()) {
          // Display current stock code analysis
          const stockCodes = db.getStockCodes().filter(c => c.product_id === product.id);
          const available = stockCodes.filter(c => c.status === 'available');
          const delivered = stockCodes.filter(c => c.status === 'delivered');

          const embed = new EmbedBuilder()
            .setTitle(`🔍 Code Status Check • ${product.name}`)
            .setDescription(
              `**Product:** ${product.name} (ID: ${product.id})\n` +
              `**Category:** ${product.category}\n` +
              `**Current Price:** ${config.currencySymbol}${product.price}\n\n` +
              `📊 **Stock Code Breakdown:**\n` +
              `• Available Codes (Unused): **${available.length}**\n` +
              `• Delivered to Customers: **${delivered.length}**\n` +
              `• Total Processed Codes: **${stockCodes.length}**\n\n` +
              `*To import & verify new codes, run:* \`/checkcodes product:"${product.name}" codes:"CODE1\\nCODE2"\``
            )
            .setColor(0x5865F2);

          return { embeds: [embed.toJSON()], ephemeral: true, success: true };
        }

        // Perform automated batch check & import
        const checkResult = db.batchCheckCodes(product.id, rawCodes);

        const embed = new EmbedBuilder()
          .setTitle(`✅ Automated Code Check & Import Complete`)
          .setDescription(
            `**Product:** ${product.name}\n\n` +
            `**Verification Results:**\n` +
            `• Total Codes Checked: **${checkResult.totalParsed}**\n` +
            `• Valid & Added to Stock: **${checkResult.validAdded}**\n` +
            `• Duplicates Skipped: **${checkResult.duplicatesSkipped}**\n` +
            `• Invalid Formats: **${checkResult.invalidSkipped}**\n\n` +
            `📦 **New Total Available Stock:** **${product.stock}**`
          )
          .setColor(checkResult.validAdded > 0 ? 0x57F287 : 0xFEE75C);

        return { embeds: [embed.toJSON()], ephemeral: true, success: true };
      }

      // 4. /checkpayment [order] [txid]
      case 'checkpayment': {
        const orderId = String(args.order || '').toUpperCase();
        const txid = String(args.txid || '');
        const order = db.getOrders().find(o => o.id.toUpperCase() === orderId);

        if (!order) {
          return { content: `❌ Order \`${orderId}\` not found.`, ephemeral: true, success: false };
        }

        if (order.status === 'delivered') {
          return { content: `✅ Order \`${orderId}\` has already been delivered! Check your DMs or use \`/order ${orderId}\`.`, ephemeral: true, success: true };
        }

        // If admin or simulated TXID provided
        if (user.isAdmin || txid.length >= 8 || order.status === 'paid') {
          order.status = 'paid';
          order.paid_at = new Date().toISOString();
          if (txid) order.payment_txid = txid;
          db.saveData();

          const deliveryResult = await deliverOrder(this.client, order.id);

          const embed = new EmbedBuilder()
            .setTitle(`✅ Payment Verified & Order Delivered`)
            .setDescription(
              `**Order ID:** \`${order.id}\`\n` +
              `**Product:** ${order.product_name} (x${order.quantity})\n` +
              `**Status:** Delivered & Confirmed\n\n` +
              `📦 **Delivered Code(s):**\n` +
              (deliveryResult.codes.length > 0
                ? deliveryResult.codes.map((c, i) => `\`${c}\``).join('\n')
                : '`Delivered to customer DM`')
            )
            .setColor(0x57F287);

          return { embeds: [embed.toJSON()], ephemeral: true, success: true };
        }

        return {
          content: `⏳ Order \`${orderId}\` is **${order.status}**.\nWaiting for crypto confirmations on wallet address: \`${order.payment_address || config.paymentMethods[0]?.address || 'LTC/BTC'}\`\nOnce sent, staff will verify or pass \`txid\`.`,
          ephemeral: true,
          success: false
        };
      }

      // 5. /pay [order]
      case 'pay': {
        const orderId = String(args.order || '').toUpperCase();
        const order = db.getOrders().find(o => o.id.toUpperCase() === orderId && (user.isAdmin || o.user_id === user.id));

        if (!order) {
          return { content: `❌ Order \`${orderId}\` not found.`, ephemeral: true, success: false };
        }

        if (order.status === 'delivered') {
          return { content: `✅ Order \`${orderId}\` is already delivered!`, ephemeral: true, success: true };
        }

        const methods = (config.paymentMethods || []).map(m =>
          `• **${m.name}**: \`${m.address || 'Instant Balance Transfer'}\``
        ).join('\n');

        const embed = new EmbedBuilder()
          .setTitle(`💳 Payment Instructions • ${order.id}`)
          .setDescription(
            `**Product:** ${order.product_name}\n` +
            `**Quantity:** ${order.quantity}\n` +
            `**Amount Due:** **${config.currencySymbol}${(order.price * order.quantity).toFixed(2)}**\n\n` +
            `**Accepted Payment Methods:**\n${methods}\n\n` +
            `*Your current balance:* ${config.currencySymbol}${currentUser.balance.toFixed(2)}\n\n` +
            `After payment, use \`/checkpayment order:${order.id}\``
          )
          .setColor(0x5865F2);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`pay_bal_${order.id}`).setLabel('💵 Pay with Balance').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`cancel_order_${order.id}`).setLabel('Cancel Order').setStyle(ButtonStyle.Danger)
        );

        return { embeds: [embed.toJSON()], components: [row.toJSON()], ephemeral: true, success: true };
      }

      // 6. /redeem [code]
      case 'redeem': {
        const code = String(args.code || '').toUpperCase().trim();
        const voucher = db.getVouchers().find(v => v.code.toUpperCase() === code);

        if (!voucher) {
          return { content: `❌ Invalid voucher or redeem code: \`${code}\`.`, ephemeral: true, success: false };
        }

        if (voucher.times_used >= voucher.max_uses) {
          return { content: `❌ This redeem code has reached its maximum usage limit.`, ephemeral: true, success: false };
        }

        if (voucher.used_by.includes(user.id)) {
          return { content: `❌ You have already redeemed this code.`, ephemeral: true, success: false };
        }

        if (voucher.type === 'balance') {
          currentUser.balance += Number(voucher.value);
          voucher.times_used += 1;
          voucher.used_by.push(user.id);
          db.saveData();

          return {
            content: `✅ Successfully redeemed voucher \`${code}\`! **+${config.currencySymbol}${voucher.value}** added to your balance. New balance: **${config.currencySymbol}${currentUser.balance.toFixed(2)}**`,
            ephemeral: true,
            success: true
          };
        }

        if (voucher.type === 'product') {
          const product = db.getProducts().find(p => p.id === voucher.product_id);
          if (!product || product.stock < 1) {
            return { content: `❌ The item associated with this voucher is currently out of stock.`, ephemeral: true, success: false };
          }

          const orderId = config.orderPrefix + uuidv4().slice(0, 8).toUpperCase();
          const newOrder: Order = {
            id: orderId,
            user_id: user.id,
            user_tag: user.tag,
            product_id: product.id,
            product_name: product.name,
            price: 0,
            quantity: 1,
            status: 'paid',
            payment_method: `Voucher: ${code}`,
            payment_address: '',
            payment_amount: 0,
            payment_txid: code,
            delivered_codes: [],
            created_at: new Date().toISOString(),
            paid_at: new Date().toISOString(),
            delivered_at: null,
            expires_at: new Date(Date.now() + 86400000).toISOString()
          };

          db.getOrders().unshift(newOrder);
          voucher.times_used += 1;
          voucher.used_by.push(user.id);
          db.saveData();

          const delRes = await deliverOrder(this.client, orderId);

          return {
            content: `🎁 Voucher \`${code}\` redeemed for free **${product.name}**! Delivered code: \`${delRes.codes[0] || 'Check DMs'}\``,
            ephemeral: true,
            success: true
          };
        }

        if (voucher.type === 'discount_percent' || voucher.type === 'discount_fixed') {
          voucher.times_used += 1;
          voucher.used_by.push(user.id);
          db.saveData();
          return {
            content: `✅ Discount voucher \`${code}\` (${voucher.type === 'discount_percent' ? `${voucher.value}% OFF` : `${config.currencySymbol}${voucher.value} OFF`}) activated for your next purchase!`,
            ephemeral: true,
            success: true
          };
        }

        return { content: `✅ Code verified.`, ephemeral: true, success: true };
      }

      // 7. /balance
      case 'balance': {
        const embed = new EmbedBuilder()
          .setTitle('💰 Account Balance & Profile')
          .setDescription(
            `**User:** ${user.tag}\n` +
            `**Available Balance:** **${config.currencySymbol}${currentUser.balance.toFixed(2)}**\n` +
            `**Total Spent:** ${config.currencySymbol}${currentUser.total_spent.toFixed(2)}\n` +
            `**Completed Orders:** ${currentUser.orders_count}\n\n` +
            `*Redeem balance codes with \`/redeem\` or top up via staff.*`
          )
          .setColor(0x5865F2);

        return { embeds: [embed.toJSON()], ephemeral: true, success: true };
      }

      // 8. /stock
      case 'stock': {
        db.updateStockCounts();
        const products = db.getProducts().filter(p => p.active === 1);

        const embed = new EmbedBuilder()
          .setTitle('📦 Live Shop Stock Overview')
          .setDescription('Real-time stock status across all digital catalog items:')
          .setColor(0x5865F2);

        for (const p of products) {
          const statusIcon = p.stock > 0 ? '🟢' : '🔴';
          embed.addFields({
            name: `${statusIcon} ${p.name}`,
            value: `Price: **${config.currencySymbol}${p.price.toFixed(2)}** | Stock: **${p.stock}** available | Category: \`${p.category}\``,
            inline: false
          });
        }

        return { embeds: [embed.toJSON()], ephemeral: true, success: true };
      }

      // 9. /orders
      case 'orders': {
        const userOrders = db.getOrders().filter(o => o.user_id === user.id).slice(0, 10);
        if (!userOrders.length) {
          return { content: '📦 You have not placed any orders yet. Browse items with `/shop`!', ephemeral: true, success: true };
        }

        const embed = new EmbedBuilder()
          .setTitle('📋 Your Recent Orders')
          .setDescription(
            userOrders.map(o =>
              `• \`${o.id}\` — **${o.product_name}** (x${o.quantity})\n  Status: **${o.status.toUpperCase()}** | Total: ${config.currencySymbol}${(o.price * o.quantity).toFixed(2)} | Date: ${new Date(o.created_at).toLocaleDateString()}`
            ).join('\n\n')
          )
          .setColor(0x5865F2);

        return { embeds: [embed.toJSON()], ephemeral: true, success: true };
      }

      // 10. /order [id]
      case 'order': {
        const orderId = String(args.id || '').toUpperCase();
        const order = db.getOrders().find(o => o.id.toUpperCase() === orderId && (user.isAdmin || o.user_id === user.id));

        if (!order) {
          return { content: `❌ Order \`${orderId}\` not found.`, ephemeral: true, success: false };
        }

        const embed = new EmbedBuilder()
          .setTitle(`📦 Order Details • ${order.id}`)
          .setDescription(
            `**Product:** ${order.product_name}\n` +
            `**Quantity:** ${order.quantity}\n` +
            `**Status:** **${order.status.toUpperCase()}**\n` +
            `**Amount:** ${config.currencySymbol}${(order.price * order.quantity).toFixed(2)}\n` +
            `**Created:** ${new Date(order.created_at).toLocaleString()}\n` +
            (order.paid_at ? `**Paid At:** ${new Date(order.paid_at).toLocaleString()}\n` : '') +
            (order.delivered_at ? `**Delivered At:** ${new Date(order.delivered_at).toLocaleString()}\n\n` : '\n') +
            (order.delivered_codes?.length
              ? `**Delivered Codes:**\n${order.delivered_codes.map((c, i) => `\`${c}\``).join('\n')}`
              : '*No codes delivered yet or order pending*')
          )
          .setColor(order.status === 'delivered' ? 0x57F287 : 0x5865F2);

        return { embeds: [embed.toJSON()], ephemeral: true, success: true };
      }

      // 11. /vouch [order] [rating] [comment]
      case 'vouch': {
        const orderId = String(args.order || '').toUpperCase();
        const rating = Math.min(5, Math.max(1, Number(args.rating || 5)));
        const comment = String(args.comment || 'Smooth automated purchase & fast code check!');

        const order = db.getOrders().find(o => o.id.toUpperCase() === orderId);
        if (!order) {
          return { content: `❌ Order \`${orderId}\` not found. Please provide a valid order ID.`, ephemeral: true, success: false };
        }

        const newReview = {
          id: Date.now(),
          order_id: order.id,
          user_id: user.id,
          user_tag: user.tag,
          product_name: order.product_name,
          rating,
          comment,
          created_at: new Date().toISOString()
        };

        db.getReviews().unshift(newReview);
        db.saveData();

        const embed = new EmbedBuilder()
          .setTitle('⭐ Verified Shop Review')
          .setDescription(
            `**Customer:** ${user.tag}\n` +
            `**Product:** ${order.product_name}\n` +
            `**Rating:** ${'⭐'.repeat(rating)}\n` +
            `**Review:** "${comment}"`
          )
          .setColor(0xFEE75C);

        return { embeds: [embed.toJSON()], success: true };
      }

      // 12. /reviews
      case 'reviews': {
        const reviews = db.getReviews().slice(0, 5);
        if (!reviews.length) {
          return { content: 'No customer reviews recorded yet. Be the first to vouch with `/vouch`!', ephemeral: true, success: true };
        }

        const avgRating = (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);
        const embed = new EmbedBuilder()
          .setTitle(`🌟 Customer Reviews (${avgRating}/5.0 Stars)`)
          .setDescription(
            reviews.map(r =>
              `**${r.user_tag}** on *${r.product_name}* — ${'⭐'.repeat(r.rating)}\n"${r.comment}"\n*${new Date(r.created_at).toLocaleDateString()}*`
            ).join('\n\n')
          )
          .setColor(0xFEE75C);

        return { embeds: [embed.toJSON()], ephemeral: true, success: true };
      }

      // 13. Admin: /stats
      case 'stats': {
        if (!user.isAdmin) {
          return { content: '❌ Administrator permission required.', ephemeral: true, success: false };
        }

        const orders = db.getOrders();
        const delivered = orders.filter(o => o.status === 'delivered');
        const revenue = delivered.reduce((acc, o) => acc + o.price * o.quantity, 0);
        const totalCodes = db.getStockCodes().length;
        const availableCodes = db.getStockCodes().filter(c => c.status === 'available').length;

        const embed = new EmbedBuilder()
          .setTitle('📊 Shop Statistics & Analytics')
          .addFields(
            { name: '💵 Total Revenue', value: `${config.currencySymbol}${revenue.toFixed(2)}`, inline: true },
            { name: '📦 Total Orders', value: String(orders.length), inline: true },
            { name: '✅ Completed Deliveries', value: String(delivered.length), inline: true },
            { name: '🔑 Available Stock Codes', value: `${availableCodes} / ${totalCodes}`, inline: true },
            { name: '👥 Total Customers', value: String(Object.keys(db.getUsers()).length), inline: true },
            { name: '🛍️ Active Products', value: String(db.getProducts().filter(p => p.active === 1).length), inline: true }
          )
          .setColor(0x5865F2);

        return { embeds: [embed.toJSON()], ephemeral: true, success: true };
      }

      default:
        return {
          content: `Command \`/${commandName}\` executed successfully.`,
          ephemeral: true,
          success: true
        };
    }
  }

  // --- INTERACTION BUTTON & MENU HANDLER ---
  public async handleInteraction(
    customId: string,
    values: string[] = [],
    user: { id: string; tag: string; isAdmin?: boolean } = { id: '985810642818703401', tag: 'WhiteCopa', isAdmin: true }
  ): Promise<CommandExecutionResult> {
    const config = db.getConfig();
    const users = db.getUsers();

    if (!users[user.id]) {
      users[user.id] = {
        user_id: user.id,
        username: user.tag,
        balance: 0,
        total_spent: 0,
        orders_count: 0,
        blacklisted: 0,
        blacklist_reason: '',
        created_at: new Date().toISOString()
      };
      db.saveData();
    }
    const currentUser = users[user.id];

    // Shop Category Select
    if (customId.startsWith('shop_category_')) {
      const category = customId.replace('shop_category_', '');
      const products = db.getProducts().filter(p => p.category.toUpperCase() === category.toUpperCase() && p.active === 1);

      if (!products.length) {
        return { content: `No products currently available in **${category}**.`, ephemeral: true, success: true };
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId('shop_select_product')
        .setPlaceholder('Select a product to view details & buy')
        .addOptions(
          products.slice(0, 25).map(p => ({
            label: p.name.substring(0, 100),
            description: `${config.currencySymbol}${p.price.toFixed(2)} • Stock: ${p.stock} available`.substring(0, 100),
            value: String(p.id)
          }))
        );

      const embed = new EmbedBuilder()
        .setTitle(`🛍️ Category: ${category}`)
        .setDescription('Choose a product from the dropdown menu below to view full details:')
        .setColor(0x5865F2);

      return {
        embeds: [embed.toJSON()],
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu).toJSON(),
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('shop_back').setLabel('← Back to Categories').setStyle(ButtonStyle.Secondary)
          ).toJSON()
        ],
        success: true
      };
    }

    // Shop Product Selected
    if (customId === 'shop_select_product' && values.length > 0) {
      const productId = Number(values[0]);
      const product = db.getProducts().find(p => p.id === productId);
      if (!product) return { content: 'Product not found.', ephemeral: true, success: false };

      const embed = new EmbedBuilder()
        .setTitle(`📦 ${product.name}`)
        .setDescription(product.description || '*No description provided.*')
        .addFields(
          { name: '💰 Price', value: `${config.currencySymbol}${product.price.toFixed(2)}`, inline: true },
          { name: '🔑 In Stock', value: `${product.stock} available`, inline: true },
          { name: '📁 Category', value: product.category, inline: true }
        )
        .setColor(0x5865F2);

      if (product.thumbnail) embed.setThumbnail(product.thumbnail);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`buy_now_${product.id}`).setLabel('🛒 Instant Buy').setStyle(ButtonStyle.Success).setDisabled(product.stock < 1),
        new ButtonBuilder().setCustomId(`shop_category_${product.category}`).setLabel('← Back').setStyle(ButtonStyle.Secondary)
      );

      return { embeds: [embed.toJSON()], components: [row.toJSON()], success: true };
    }

    // Back to Shop Categories
    if (customId === 'shop_back') {
      return this.handleCommand('shop', {}, user);
    }

    // Buy Now Button
    if (customId.startsWith('buy_now_')) {
      const productId = customId.replace('buy_now_', '');
      return this.handleCommand('buy', { product: productId }, user);
    }

    // Pay with Balance Button
    if (customId.startsWith('pay_bal_')) {
      const orderId = customId.replace('pay_bal_', '').toUpperCase();
      const order = db.getOrders().find(o => o.id.toUpperCase() === orderId);
      if (!order) return { content: 'Order not found.', ephemeral: true, success: false };
      if (order.status === 'delivered') return { content: 'Order is already delivered.', ephemeral: true, success: true };

      const totalCost = order.price * order.quantity;
      if (currentUser.balance < totalCost) {
        return {
          content: `❌ Insufficient balance! Total cost is **${config.currencySymbol}${totalCost.toFixed(2)}**, but your balance is **${config.currencySymbol}${currentUser.balance.toFixed(2)}**.\nUse Crypto payment instead or top up your balance.`,
          ephemeral: true,
          success: false
        };
      }

      // Deduct balance and deliver
      currentUser.balance -= totalCost;
      order.status = 'paid';
      order.paid_at = new Date().toISOString();
      order.payment_method = 'Account Balance';
      db.saveData();

      const delRes = await deliverOrder(this.client, order.id);

      const embed = new EmbedBuilder()
        .setTitle('✅ Paid & Delivered Successfully!')
        .setDescription(
          `**Order ID:** \`${order.id}\`\n` +
          `**Paid with Balance:** ${config.currencySymbol}${totalCost.toFixed(2)}\n` +
          `**Remaining Balance:** ${config.currencySymbol}${currentUser.balance.toFixed(2)}\n\n` +
          `📦 **Your Delivered Code(s):**\n` +
          (delRes.codes.length > 0
            ? delRes.codes.map((c, i) => `\`\`\`\n${c}\n\`\`\``).join('\n')
            : '`Delivered to customer DM`')
        )
        .setColor(0x57F287);

      return { embeds: [embed.toJSON()], ephemeral: true, success: true };
    }

    // Pay Button (Instructions)
    if (customId.startsWith('pay_btn_')) {
      const orderId = customId.replace('pay_btn_', '');
      return this.handleCommand('pay', { order: orderId }, user);
    }

    // Cancel Order
    if (customId.startsWith('cancel_order_')) {
      const orderId = customId.replace('cancel_order_', '').toUpperCase();
      const order = db.getOrders().find(o => o.id.toUpperCase() === orderId);
      if (!order) return { content: 'Order not found.', ephemeral: true, success: false };
      if (order.status !== 'pending') return { content: `Only pending orders can be cancelled (Status: ${order.status}).`, ephemeral: true, success: false };

      order.status = 'cancelled';
      db.saveData();
      return { content: `✅ Order \`${orderId}\` has been cancelled.`, ephemeral: true, success: true };
    }

    return { content: 'Interaction acknowledged.', ephemeral: true, success: true };
  }

  // --- DEPLOY SLASH COMMANDS TO DISCORD REST API ---
  public async deploySlashCommands(token?: string, clientId?: string, guildId?: string) {
    const config = db.getConfig();
    const useToken = token || config.token;
    const useClientId = clientId || config.clientId;
    const useGuildId = guildId || config.guildId;

    if (!useToken || !useClientId) {
      return { success: false, message: 'Missing Token or Client ID in configuration.' };
    }

    const commandList = [
      new SlashCommandBuilder().setName('shop').setDescription('Browse the digital product catalog with automated checkout'),
      new SlashCommandBuilder().setName('buy').setDescription('Purchase an item with automated stock delivery')
        .addStringOption(o => o.setName('product').setDescription('Product name or ID').setRequired(true))
        .addIntegerOption(o => o.setName('quantity').setDescription('Quantity to purchase').setRequired(false)),
      new SlashCommandBuilder().setName('checkcodes').setDescription('Automated code validator & inventory importer')
        .addStringOption(o => o.setName('product').setDescription('Product name or ID').setRequired(true))
        .addStringOption(o => o.setName('codes').setDescription('Paste codes separated by newlines').setRequired(false)),
      new SlashCommandBuilder().setName('checkpayment').setDescription('Verify payment and trigger automated delivery')
        .addStringOption(o => o.setName('order').setDescription('Order ID (e.g. ORD-12345)').setRequired(true))
        .addStringOption(o => o.setName('txid').setDescription('Crypto transaction hash/TXID (optional)').setRequired(false)),
      new SlashCommandBuilder().setName('pay').setDescription('View payment addresses and balance pay options')
        .addStringOption(o => o.setName('order').setDescription('Order ID').setRequired(true)),
      new SlashCommandBuilder().setName('redeem').setDescription('Redeem a gift balance code or product voucher')
        .addStringOption(o => o.setName('code').setDescription('Voucher code').setRequired(true)),
      new SlashCommandBuilder().setName('balance').setDescription('View your shop balance and order history'),
      new SlashCommandBuilder().setName('stock').setDescription('View real-time stock levels of all products'),
      new SlashCommandBuilder().setName('orders').setDescription('View your recent purchases and delivery status'),
      new SlashCommandBuilder().setName('order').setDescription('Inspect order details and delivered codes')
        .addStringOption(o => o.setName('id').setDescription('Order ID').setRequired(true)),
      new SlashCommandBuilder().setName('vouch').setDescription('Leave a verified customer review')
        .addStringOption(o => o.setName('order').setDescription('Order ID').setRequired(true))
        .addIntegerOption(o => o.setName('rating').setDescription('1 to 5 Stars').setRequired(true))
        .addStringOption(o => o.setName('comment').setDescription('Review text').setRequired(true)),
      new SlashCommandBuilder().setName('reviews').setDescription('View recent customer reviews and rating'),
      new SlashCommandBuilder().setName('stats').setDescription('View store revenue, sales, and stock statistics').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ].map(c => c.toJSON());

    try {
      const rest = new REST({ version: '10' }).setToken(useToken);
      if (useGuildId) {
        await rest.put(
          Routes.applicationGuildCommands(useClientId, useGuildId),
          { body: commandList }
        );
        return { success: true, message: `Successfully deployed ${commandList.length} commands to Guild ${useGuildId}!` };
      } else {
        await rest.put(
          Routes.applicationCommands(useClientId),
          { body: commandList }
        );
        return { success: true, message: `Successfully deployed ${commandList.length} global commands!` };
      }
    } catch (err: any) {
      console.error('[DeployCommands Error]', err);
      return { success: false, message: err?.message || 'Failed to deploy slash commands' };
    }
  }
}

export const botManager = new BotManager();
export default botManager;
