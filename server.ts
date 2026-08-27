import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import db from './server/database';
import botManager from './server/botManager';
import { deliverOrder } from './server/delivery';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // --- HEALTH CHECK (For Railway & AI Studio) ---
  app.get(['/api/health', '/health'], (req, res) => {
    res.json({
      status: 'ok',
      service: 'discord-automated-shop-bot',
      botConnected: botManager.isConnected,
      timestamp: new Date().toISOString()
    });
  });

  // --- BOT STATUS & MANAGEMENT ---
  app.get('/api/bot/status', (req, res) => {
    res.json(botManager.getStatus());
  });

  app.post('/api/bot/start', async (req, res) => {
    const { token } = req.body;
    const config = db.getConfig();
    const useToken = token || config.token;
    if (!useToken) {
      return res.status(400).json({ success: false, message: 'No Bot Token provided' });
    }
    const result = await botManager.initClient(useToken);
    res.json(result);
  });

  app.post('/api/bot/stop', async (req, res) => {
    const result = await botManager.stopClient();
    res.json(result);
  });

  app.post('/api/bot/deploy', async (req, res) => {
    const { token, clientId, guildId } = req.body;
    const result = await botManager.deploySlashCommands(token, clientId, guildId);
    res.json(result);
  });

  // --- COMMAND SIMULATOR (Live Web Discord Terminal) ---
  app.post('/api/simulate-command', async (req, res) => {
    const { command, args, user } = req.body;
    const result = await botManager.handleCommand(
      command,
      args || {},
      user || { id: '985810642818703401', tag: 'WhiteCopa (Admin)', isAdmin: true }
    );
    res.json(result);
  });

  app.post('/api/simulate-interaction', async (req, res) => {
    const { customId, values, user } = req.body;
    const result = await botManager.handleInteraction(
      customId,
      values || [],
      user || { id: '985810642818703401', tag: 'WhiteCopa (Admin)', isAdmin: true }
    );
    res.json(result);
  });

  // --- PRODUCTS API ---
  app.get('/api/products', (req, res) => {
    db.updateStockCounts();
    res.json(db.getProducts());
  });

  app.post('/api/products', (req, res) => {
    const { name, description, price, category, delivery_type, delivery_data, thumbnail } = req.body;
    if (!name || price === undefined || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }
    const newProduct = db.addProduct({
      name,
      description: description || '',
      price: Number(price),
      category: String(category).toUpperCase(),
      stock: 0,
      delivery_type: delivery_type || 'code',
      delivery_data: delivery_data || '',
      thumbnail: thumbnail || '',
      active: 1
    });
    res.status(201).json(newProduct);
  });

  app.put('/api/products/:id', (req, res) => {
    const id = Number(req.params.id);
    const updated = db.updateProduct(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  });

  app.delete('/api/products/:id', (req, res) => {
    const id = Number(req.params.id);
    const success = db.deleteProduct(id);
    res.json({ success });
  });

  // --- AUTOMATED CODE CHECKER & INVENTORY API ---
  app.get('/api/codes', (req, res) => {
    const { productId } = req.query;
    let codes = db.getStockCodes();
    if (productId) {
      codes = codes.filter(c => c.product_id === Number(productId));
    }
    res.json(codes);
  });

  // Instant code format inspection
  app.post('/api/codes/check', (req, res) => {
    const { code } = req.body;
    const result = db.checkAndFormatCode(code || '');
    const existing = db.getStockCodes().find(c => c.code.toLowerCase() === (result.normalized || '').toLowerCase());
    res.json({
      ...result,
      isDuplicate: Boolean(existing),
      existingCode: existing || null
    });
  });

  // Batch code check & import into product inventory
  app.post('/api/codes/import', (req, res) => {
    const { productId, rawCodes } = req.body;
    if (!productId || !rawCodes) {
      return res.status(400).json({ error: 'Product ID and rawCodes are required' });
    }
    const result = db.batchCheckCodes(Number(productId), rawCodes);
    res.json(result);
  });

  app.delete('/api/codes/:id', (req, res) => {
    const { id } = req.params;
    const success = db.deleteStockCode(id);
    res.json({ success });
  });

  // --- ORDERS API ---
  app.get('/api/orders', (req, res) => {
    res.json(db.getOrders());
  });

  app.post('/api/orders/:id/deliver', async (req, res) => {
    const { id } = req.params;
    const result = await deliverOrder(botManager.client, id);
    res.json(result);
  });

  app.post('/api/orders/:id/mark-paid', async (req, res) => {
    const { id } = req.params;
    const order = db.getOrders().find(o => o.id.toUpperCase() === id.toUpperCase());
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = 'paid';
    order.paid_at = new Date().toISOString();
    db.saveData();
    const result = await deliverOrder(botManager.client, id);
    res.json(result);
  });

  app.post('/api/orders/:id/cancel', (req, res) => {
    const { id } = req.params;
    const order = db.getOrders().find(o => o.id.toUpperCase() === id.toUpperCase());
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = 'cancelled';
    db.saveData();
    res.json({ success: true, order });
  });

  // --- VOUCHERS API ---
  app.get('/api/vouchers', (req, res) => {
    res.json(db.getVouchers());
  });

  app.post('/api/vouchers', (req, res) => {
    const { code, type, value, product_id, max_uses, expires_at } = req.body;
    if (!code || !type || value === undefined) {
      return res.status(400).json({ error: 'Code, type, and value are required' });
    }
    const newVoucher = db.addVoucher({
      code: code.trim().toUpperCase(),
      type: type || 'balance',
      value: Number(value),
      product_id: product_id ? Number(product_id) : undefined,
      max_uses: Number(max_uses || 1),
      expires_at: expires_at || null
    });
    res.status(201).json(newVoucher);
  });

  app.delete('/api/vouchers/:code', (req, res) => {
    const { code } = req.params;
    const success = db.deleteVoucher(code);
    res.json({ success });
  });

  // --- USERS & BALANCES ---
  app.get('/api/users', (req, res) => {
    res.json(Object.values(db.getUsers()));
  });

  app.post('/api/users/:id/balance', (req, res) => {
    const { id } = req.params;
    const { amount, action } = req.body;
    const users = db.getUsers();
    if (!users[id]) {
      users[id] = {
        user_id: id,
        username: `User_${id.slice(-4)}`,
        balance: 0,
        total_spent: 0,
        orders_count: 0,
        blacklisted: 0,
        blacklist_reason: '',
        created_at: new Date().toISOString()
      };
    }
    if (action === 'set') {
      users[id].balance = Number(amount);
    } else {
      users[id].balance += Number(amount);
    }
    db.saveData();
    res.json({ success: true, user: users[id] });
  });

  app.post('/api/users/:id/blacklist', (req, res) => {
    const { id } = req.params;
    const { blacklisted, reason } = req.body;
    const users = db.getUsers();
    if (users[id]) {
      users[id].blacklisted = blacklisted ? 1 : 0;
      users[id].blacklist_reason = reason || '';
      db.saveData();
    }
    res.json({ success: true });
  });

  // --- REVIEWS & LOGS ---
  app.get('/api/reviews', (req, res) => {
    res.json(db.getReviews());
  });

  app.get('/api/logs', (req, res) => {
    res.json(db.getLogs().slice(0, 50));
  });

  // --- CONFIGURATION API ---
  app.get('/api/config', (req, res) => {
    res.json(db.getConfig());
  });

  app.post('/api/config', (req, res) => {
    const updated = db.updateConfig(req.body);
    res.json(updated);
  });

  // --- STATS OVERVIEW ---
  app.get('/api/stats', (req, res) => {
    const orders = db.getOrders();
    const delivered = orders.filter(o => o.status === 'delivered');
    const revenue = delivered.reduce((acc, o) => acc + o.price * o.quantity, 0);
    const totalCodes = db.getStockCodes().length;
    const availableCodes = db.getStockCodes().filter(c => c.status === 'available').length;

    res.json({
      revenue,
      totalOrders: orders.length,
      completedOrders: delivered.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      totalProducts: db.getProducts().length,
      availableCodes,
      totalCodes,
      totalUsers: Object.keys(db.getUsers()).length
    });
  });

  // --- VITE MIDDLEWARE (Development) or STATIC ASSETS (Production) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Automated Shop Server running on http://localhost:${PORT}`);
  });
}

startServer();
