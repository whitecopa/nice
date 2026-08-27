import { EmbedBuilder } from 'discord.js';
import db from './database';

export async function deliverOrder(client: any, orderId: string): Promise<{ success: boolean; codes: string[]; error?: string }> {
  const order = db.getOrders().find(o => o.id.toUpperCase() === orderId.toUpperCase());
  if (!order) {
    return { success: false, codes: [], error: 'Order not found' };
  }

  if (order.status === 'delivered') {
    return { success: true, codes: order.delivered_codes || [], error: 'Already delivered' };
  }

  const product = db.getProducts().find(p => p.id === order.product_id);
  if (!product) {
    return { success: false, codes: [], error: 'Associated product not found' };
  }

  // Dispense unique stock codes from inventory
  let codes = db.dispenseCodes(product.id, order.quantity, order.id);

  // If no individual stock codes found, fallback to delivery_data
  if (codes.length === 0 && product.delivery_data) {
    codes = [product.delivery_data];
  }

  // Update order record
  order.status = 'delivered';
  order.delivered_codes = codes;
  order.delivered_at = new Date().toISOString();
  if (!order.paid_at) {
    order.paid_at = new Date().toISOString();
  }

  // Update user stats
  const users = db.getUsers();
  if (!users[order.user_id]) {
    users[order.user_id] = {
      user_id: order.user_id,
      username: order.user_tag || `User_${order.user_id.slice(-4)}`,
      balance: 0,
      total_spent: 0,
      orders_count: 0,
      blacklisted: 0,
      blacklist_reason: '',
      created_at: new Date().toISOString()
    };
  }

  users[order.user_id].total_spent += order.price * order.quantity;
  users[order.user_id].orders_count += 1;

  db.saveData();

  // Log delivery
  const logs = db.getLogs();
  logs.unshift({
    id: Date.now(),
    type: 'order_delivered',
    user_id: order.user_id,
    staff_id: 'SYSTEM',
    data: { orderId: order.id, product: order.product_name, codesCount: codes.length },
    created_at: new Date().toISOString()
  });

  // Attempt Discord DM if client is active
  if (client && client.users) {
    try {
      const user = await client.users.fetch(order.user_id).catch(() => null);
      if (user) {
        const config = db.getConfig();
        const codeDisplay = codes.length > 0
          ? codes.map((c, i) => `**Code #${i + 1}:**\n\`\`\`\n${c}\n\`\`\``).join('\n')
          : '```\nThank you for your purchase! Contact support for claim details.\n```';

        const embed = new EmbedBuilder()
          .setTitle('✅ Order Delivered Successfully!')
          .setDescription(
            `**Order ID:** \`${order.id}\`\n` +
            `**Product:** ${order.product_name}\n` +
            `**Quantity:** ${order.quantity}\n` +
            `**Total:** ${config.currencySymbol}${(order.price * order.quantity).toFixed(2)}\n\n` +
            `📦 **Your Digital Code(s) / Item(s):**\n` +
            `${codeDisplay}\n\n` +
            `*Leave a review using \`/vouch\` or \`/reviews\`!*`
          )
          .setColor(0x57F287)
          .setTimestamp();

        await user.send({ embeds: [embed] }).catch(() => {
          console.log(`[Delivery] User DMs are disabled for user ${order.user_id}`);
        });
      }
    } catch (err) {
      console.warn(`[Delivery] Could not send DM to user ${order.user_id}:`, err);
    }
  }

  return { success: true, codes };
}

export default deliverOrder;
