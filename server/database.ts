import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  delivery_type: 'code' | 'text' | 'batch_code' | 'account' | 'file';
  delivery_data: string;
  thumbnail: string;
  active: number;
  created_at: string;
}

export interface StockCode {
  id: string;
  product_id: number;
  code: string;
  status: 'available' | 'reserved' | 'delivered' | 'invalid';
  order_id: string | null;
  notes?: string;
  format_type: string;
  added_at: string;
  delivered_at: string | null;
  checked_at: string | null;
  check_status: 'valid' | 'flagged' | 'unchecked';
}

export interface Order {
  id: string;
  user_id: string;
  user_tag: string;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  status: 'pending' | 'paid' | 'delivered' | 'cancelled' | 'refunded';
  payment_method: string;
  payment_address: string;
  payment_amount: number;
  payment_txid: string;
  delivered_codes: string[];
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  expires_at: string;
}

export interface UserAccount {
  user_id: string;
  username: string;
  balance: number;
  total_spent: number;
  orders_count: number;
  blacklisted: number;
  blacklist_reason: string;
  created_at: string;
}

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
}

export interface Voucher {
  code: string;
  type: 'balance' | 'product' | 'discount_percent' | 'discount_fixed';
  value: number;
  product_id?: number;
  max_uses: number;
  times_used: number;
  used_by: string[];
  expires_at: string | null;
  created_at: string;
}

export interface Review {
  id: number;
  order_id: string;
  user_id: string;
  user_tag: string;
  product_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface LogEntry {
  id: number;
  type: string;
  user_id: string | null;
  staff_id: string | null;
  data: Record<string, any>;
  created_at: string;
}

export interface BotConfig {
  token: string;
  clientId: string;
  guildId: string;
  ownerId: string;
  currency: string;
  currencySymbol: string;
  orderPrefix: string;
  paymentTimeoutMinutes: number;
  autoDelivery: boolean;
  categories: string[];
  colors: {
    primary: string;
    success: string;
    error: string;
    warning: string;
    info: string;
  };
  paymentMethods: Array<{
    name: string;
    type: string;
    address?: string;
    qrCode?: string;
  }>;
}

interface DatabaseSchema {
  products: Product[];
  stock_codes: StockCode[];
  orders: Order[];
  users: Record<string, UserAccount>;
  carts: Record<string, CartItem[]>;
  reviews: Review[];
  vouchers: Voucher[];
  logs: LogEntry[];
  settings: Record<string, string>;
  config: BotConfig;
}

class ShopDatabase {
  private dataFilePath: string;
  private data: DatabaseSchema;
  private nextProductId = 1;
  private nextReviewId = 1;
  private nextLogId = 1;

  constructor() {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {
        console.warn('Could not create data dir, using root directory:', e);
      }
    }
    this.dataFilePath = path.join(dataDir, 'shop-store.json');
    this.data = this.loadInitialData();
  }

  private getDefaultConfig(): BotConfig {
    return {
      token: process.env.DISCORD_TOKEN || 'MTU0MjYxNjQzMjg4ODY0MzYzNg.Gd7zYL.zw2OAY3ZwpZsRU7MLophVyjnKLNYQwp9G8dJSk',
      clientId: process.env.CLIENT_ID || '1542616432888643636',
      guildId: process.env.GUILD_ID || '1542618247495553084',
      ownerId: process.env.OWNER_ID || '985810642818703401',
      currency: 'USD',
      currencySymbol: '$',
      orderPrefix: 'ORD-',
      paymentTimeoutMinutes: 30,
      autoDelivery: true,
      categories: [
        'DISCORD',
        'STREAMING',
        'GAMING',
        'DIGITAL KEYS',
        'BOTS & TOOLS',
        'ACCOUNTS'
      ],
      colors: {
        primary: '#5865F2',
        success: '#57F287',
        error: '#ED4245',
        warning: '#FEE75C',
        info: '#5865F2'
      },
      paymentMethods: [
        {
          name: 'Litecoin (LTC)',
          type: 'crypto',
          address: 'LZnepEWbTYdwQwBua2xob47RBMqTDU1Bif'
        },
        {
          name: 'Bitcoin (BTC)',
          type: 'crypto',
          address: 'bc1q7ndxgpxtwel55rmvnlg2xaahwefe6e6addcxy6'
        },
        {
          name: 'USDT (TRC20)',
          type: 'crypto',
          address: 'TXg7B9K8L6xMnPQwEr12V3Y4Z5A6B7C8D9'
        },
        {
          name: 'Account Balance',
          type: 'balance'
        }
      ]
    };
  }

  private loadInitialData(): DatabaseSchema {
    if (fs.existsSync(this.dataFilePath)) {
      try {
        const raw = fs.readFileSync(this.dataFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.products && Array.isArray(parsed.products)) {
          this.nextProductId = Math.max(...parsed.products.map((p: Product) => p.id), 0) + 1;
          this.nextReviewId = (parsed.reviews?.length || 0) + 1;
          this.nextLogId = (parsed.logs?.length || 0) + 1;
          return parsed;
        }
      } catch (err) {
        console.error('Failed to parse database file, initializing defaults:', err);
      }
    }

    const defaultProducts: Product[] = [
      {
        id: 1,
        name: 'Discord Nitro 1 Month (Promo / Link)',
        description: 'Instant automated Discord Nitro 1-Month Boost link activation.',
        price: 4.99,
        category: 'DISCORD',
        stock: 5,
        delivery_type: 'code',
        delivery_data: 'https://discord.gift/nitro-promo-key',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
        active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Spotify Premium 3 Months Voucher Code',
        description: 'Global 3-Month Spotify Premium activation key. Instant automated delivery.',
        price: 3.50,
        category: 'STREAMING',
        stock: 4,
        delivery_type: 'code',
        delivery_data: 'SPOTIFY-PREM-3M',
        thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
        active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Steam Random Premium Game Key',
        description: 'Guaranteed AAA or High-Tier Indie Steam game CD-Key activation code.',
        price: 2.99,
        category: 'GAMING',
        stock: 6,
        delivery_type: 'code',
        delivery_data: 'STEAM-CDKEY',
        thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80',
        active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 4,
        name: 'NordVPN 1-Year License Key',
        description: 'Fast, secure VPN key for 1 year with unlimited device protection.',
        price: 9.99,
        category: 'BOTS & TOOLS',
        stock: 3,
        delivery_type: 'code',
        delivery_data: 'NORD-1Y-LICENSE',
        thumbnail: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&q=80',
        active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 5,
        name: 'Xbox Game Pass Ultimate 1 Month Code',
        description: 'Stackable 1-Month Game Pass Ultimate digital code for PC & Console.',
        price: 6.50,
        category: 'GAMING',
        stock: 4,
        delivery_type: 'code',
        delivery_data: 'XBOX-GPU-1M',
        thumbnail: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80',
        active: 1,
        created_at: new Date().toISOString()
      }
    ];

    const defaultStockCodes: StockCode[] = [
      // Discord Nitro codes (Product 1)
      { id: uuidv4(), product_id: 1, code: 'https://discord.gift/a7Kx9mQ2vL8p4WsR', status: 'available', order_id: null, format_type: 'nitro_link', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 1, code: 'https://discord.gift/bP3w8nL1vK9m5RsT', status: 'available', order_id: null, format_type: 'nitro_link', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 1, code: 'https://discord.gift/cR9v4mK2pL8w1WsN', status: 'available', order_id: null, format_type: 'nitro_link', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 1, code: 'https://discord.gift/dQ2p5nL9vM1w8RsK', status: 'available', order_id: null, format_type: 'nitro_link', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 1, code: 'https://discord.gift/eT8v1mP4kL9w2RsX', status: 'available', order_id: null, format_type: 'nitro_link', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },

      // Spotify codes (Product 2)
      { id: uuidv4(), product_id: 2, code: 'SPOT-3M-9842-KLX8-9021', status: 'available', order_id: null, format_type: 'serial_key', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 2, code: 'SPOT-3M-1129-PAW3-7742', status: 'available', order_id: null, format_type: 'serial_key', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 2, code: 'SPOT-3M-4491-NVQ7-3310', status: 'available', order_id: null, format_type: 'serial_key', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 2, code: 'SPOT-3M-8820-TKL5-9014', status: 'available', order_id: null, format_type: 'serial_key', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },

      // Steam Keys (Product 3)
      { id: uuidv4(), product_id: 3, code: '4X9TQ-8MKP2-VBL7W', status: 'available', order_id: null, format_type: 'steam_key', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 3, code: '7NZKP-2WLR9-QXM5T', status: 'available', order_id: null, format_type: 'steam_key', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 3, code: '9BLMW-4TPX2-KN7RQ', status: 'available', order_id: null, format_type: 'steam_key', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 3, code: '3KXPQ-9VMW7-TBR4L', status: 'available', order_id: null, format_type: 'steam_key', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 3, code: '6WRLT-5MXP9-KN2VQ', status: 'available', order_id: null, format_type: 'steam_key', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 3, code: '8VQPM-1NXW4-TBR9K', status: 'available', order_id: null, format_type: 'steam_key', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },

      // NordVPN (Product 4)
      { id: uuidv4(), product_id: 4, code: 'NORD-2026-X84K-912M-PLQ7', status: 'available', order_id: null, format_type: 'license_key', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 4, code: 'NORD-2026-B19V-774P-KWL3', status: 'available', order_id: null, format_type: 'license_key', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 4, code: 'NORD-2026-Q42T-331L-MPR8', status: 'available', order_id: null, format_type: 'license_key', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },

      // Xbox GPU (Product 5)
      { id: uuidv4(), product_id: 5, code: 'XGPU-992K-441X-772M-PWW9', status: 'available', order_id: null, format_type: 'gamepass_code', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 5, code: 'XGPU-118L-993V-551K-QTR4', status: 'available', order_id: null, format_type: 'gamepass_code', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 5, code: 'XGPU-774M-229P-883L-NKW2', status: 'available', order_id: null, format_type: 'gamepass_code', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' },
      { id: uuidv4(), product_id: 5, code: 'XGPU-335K-664X-119M-PTR7', status: 'available', order_id: null, format_type: 'gamepass_code', added_at: new Date().toISOString(), delivered_at: null, checked_at: new Date().toISOString(), check_status: 'valid' }
    ];

    const defaultVouchers: Voucher[] = [
      {
        code: 'WELCOME10',
        type: 'balance',
        value: 10.0,
        max_uses: 100,
        times_used: 1,
        used_by: ['985810642818703401'],
        expires_at: null,
        created_at: new Date().toISOString()
      },
      {
        code: 'SHOP25',
        type: 'discount_percent',
        value: 25.0,
        max_uses: 50,
        times_used: 0,
        used_by: [],
        expires_at: null,
        created_at: new Date().toISOString()
      },
      {
        code: 'FREE5',
        type: 'discount_fixed',
        value: 5.0,
        max_uses: 50,
        times_used: 0,
        used_by: [],
        expires_at: null,
        created_at: new Date().toISOString()
      }
    ];

    const defaultUsers: Record<string, UserAccount> = {
      '985810642818703401': {
        user_id: '985810642818703401',
        username: 'WhiteCopa (Owner)',
        balance: 50.0,
        total_spent: 45.98,
        orders_count: 3,
        blacklisted: 0,
        blacklist_reason: '',
        created_at: new Date().toISOString()
      },
      '123456789012345678': {
        user_id: '123456789012345678',
        username: 'DemoCustomer#0001',
        balance: 15.0,
        total_spent: 9.99,
        orders_count: 1,
        blacklisted: 0,
        blacklist_reason: '',
        created_at: new Date().toISOString()
      }
    };

    const initialData: DatabaseSchema = {
      products: defaultProducts,
      stock_codes: defaultStockCodes,
      orders: [
        {
          id: 'ORD-DEMO101',
          user_id: '985810642818703401',
          user_tag: 'WhiteCopa',
          product_id: 1,
          product_name: 'Discord Nitro 1 Month (Promo / Link)',
          price: 4.99,
          quantity: 1,
          status: 'delivered',
          payment_method: 'Account Balance',
          payment_address: '',
          payment_amount: 4.99,
          payment_txid: 'BALANCE-PAY-101',
          delivered_codes: ['https://discord.gift/sample-delivered-code-1'],
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          paid_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          delivered_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          expires_at: new Date(Date.now() - 3600000 * 3).toISOString()
        }
      ],
      users: defaultUsers,
      carts: {},
      reviews: [
        {
          id: 1,
          order_id: 'ORD-DEMO101',
          user_id: '985810642818703401',
          user_tag: 'WhiteCopa',
          product_name: 'Discord Nitro 1 Month (Promo / Link)',
          rating: 5,
          comment: 'Instant code check and delivery worked super fast! 10/10 shop bot.',
          created_at: new Date(Date.now() - 3600000 * 3).toISOString()
        }
      ],
      vouchers: defaultVouchers,
      logs: [
        {
          id: 1,
          type: 'system_init',
          user_id: null,
          staff_id: 'SYSTEM',
          data: { action: 'Automated shop bot store initialized with code checker engine.' },
          created_at: new Date().toISOString()
        }
      ],
      settings: {
        shop_status: 'open',
        announcement: 'Welcome to our automated digital shop! Instant code check & automated delivery 24/7.',
        anti_scam: 'enabled'
      },
      config: this.getDefaultConfig()
    };

    this.nextProductId = 6;
    this.saveData(initialData);
    return initialData;
  }

  public saveData(customData?: DatabaseSchema): void {
    const dataToSave = customData || this.data;
    try {
      fs.writeFileSync(this.dataFilePath, JSON.stringify(dataToSave, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  // --- RECALCULATE STOCK FROM AVAILABLE CODES ---
  public updateStockCounts(): void {
    for (const product of this.data.products) {
      const availableCodes = this.data.stock_codes.filter(
        c => c.product_id === product.id && c.status === 'available'
      ).length;
      product.stock = availableCodes;
    }
    this.saveData();
  }

  // --- AUTOMATED CODE CHECK ENGINE ---
  public checkAndFormatCode(codeStr: string): { format: string; isValid: boolean; normalized: string } {
    const trimmed = codeStr.trim();
    if (!trimmed) return { format: 'empty', isValid: false, normalized: '' };

    // Discord gift / Nitro link
    if (trimmed.includes('discord.gift/') || trimmed.startsWith('https://discord.gift/')) {
      const match = trimmed.match(/(?:discord\.gift\/|https:\/\/discord\.gift\/)([a-zA-Z0-9_-]{16,24})/);
      return {
        format: 'discord_nitro',
        isValid: Boolean(match),
        normalized: match ? `https://discord.gift/${match[1]}` : trimmed
      };
    }

    // Steam CD Key: 5x5x5 or 5x5x5x5
    if (/^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}(-[A-Z0-9]{5})?$/i.test(trimmed)) {
      return { format: 'steam_cdkey', isValid: true, normalized: trimmed.toUpperCase() };
    }

    // Account credentials: user:pass or user:pass:email
    if (/^[^:\s]+:[^:\s]+(:[^:\s]+)?$/.test(trimmed)) {
      return { format: 'account_credentials', isValid: true, normalized: trimmed };
    }

    // Standard serial or 4x4x4x4 key
    if (/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}(-[A-Z0-9]{4})?$/i.test(trimmed)) {
      return { format: 'product_license', isValid: true, normalized: trimmed.toUpperCase() };
    }

    // General alphanumeric key
    if (trimmed.length >= 6) {
      return { format: 'generic_digital_key', isValid: true, normalized: trimmed };
    }

    return { format: 'unknown_short', isValid: false, normalized: trimmed };
  }

  public batchCheckCodes(productId: number, rawCodesText: string): {
    totalParsed: number;
    validAdded: number;
    duplicatesSkipped: number;
    invalidSkipped: number;
    details: Array<{ code: string; status: string; reason?: string }>;
  } {
    const lines = rawCodesText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const details: Array<{ code: string; status: string; reason?: string }> = [];
    let validAdded = 0;
    let duplicatesSkipped = 0;
    let invalidSkipped = 0;

    const existingCodeSet = new Set(this.data.stock_codes.map(c => c.code.toLowerCase()));

    for (const line of lines) {
      const analysis = this.checkAndFormatCode(line);
      if (!analysis.isValid) {
        invalidSkipped++;
        details.push({ code: line, status: 'invalid_format', reason: 'Format check failed' });
        continue;
      }

      if (existingCodeSet.has(analysis.normalized.toLowerCase())) {
        duplicatesSkipped++;
        details.push({ code: analysis.normalized, status: 'duplicate', reason: 'Code already in database' });
        continue;
      }

      // Add code
      const newStockCode: StockCode = {
        id: uuidv4(),
        product_id: productId,
        code: analysis.normalized,
        status: 'available',
        order_id: null,
        format_type: analysis.format,
        added_at: new Date().toISOString(),
        delivered_at: null,
        checked_at: new Date().toISOString(),
        check_status: 'valid'
      };

      this.data.stock_codes.push(newStockCode);
      existingCodeSet.add(analysis.normalized.toLowerCase());
      validAdded++;
      details.push({ code: analysis.normalized, status: 'added_valid' });
    }

    this.updateStockCounts();
    this.saveData();

    return {
      totalParsed: lines.length,
      validAdded,
      duplicatesSkipped,
      invalidSkipped,
      details
    };
  }

  // --- RESERVE & DISPENSE CODES ON DELIVERY ---
  public dispenseCodes(productId: number, quantity: number, orderId: string): string[] {
    const available = this.data.stock_codes.filter(
      c => c.product_id === productId && c.status === 'available'
    );

    const needed = Math.min(quantity, available.length);
    const dispensed: string[] = [];

    for (let i = 0; i < needed; i++) {
      const item = available[i];
      item.status = 'delivered';
      item.order_id = orderId;
      item.delivered_at = new Date().toISOString();
      dispensed.push(item.code);
    }

    this.updateStockCounts();
    this.saveData();
    return dispensed;
  }

  // --- SQL-LIKE COMPATIBILITY LAYER ---
  public prepare(sql: string) {
    const db = this;
    const lower = sql.toLowerCase().trim();

    return {
      get(...params: any[]): any {
        // Users
        if (lower.includes('select * from users where user_id =') || lower.includes('select blacklisted from users where user_id =')) {
          const uid = String(params[0]);
          return db.data.users[uid] || null;
        }
        if (lower.includes('select * from products where id =')) {
          const id = Number(params[0]);
          return db.data.products.find(p => p.id === id) || null;
        }
        if (lower.includes('select * from products where name like')) {
          const pattern = String(params[0]).replace(/%/g, '').toLowerCase();
          return db.data.products.find(p => p.name.toLowerCase().includes(pattern) && p.active === 1) || null;
        }
        if (lower.includes('select * from orders where id =')) {
          const id = String(params[0]).toUpperCase();
          if (params.length > 1) {
            const uid = String(params[1]);
            return db.data.orders.find(o => o.id.toUpperCase() === id && o.user_id === uid) || null;
          }
          return db.data.orders.find(o => o.id.toUpperCase() === id) || null;
        }
        if (lower.includes('select * from vouchers where code =')) {
          const code = String(params[0]).toUpperCase();
          return db.data.vouchers.find(v => v.code.toUpperCase() === code) || null;
        }
        if (lower.includes('select items from carts where user_id =')) {
          const uid = String(params[0]);
          const items = db.data.carts[uid] || [];
          return { items: JSON.stringify(items) };
        }
        return null;
      },

      all(...params: any[]): any[] {
        if (lower.includes('select * from products where category =')) {
          const cat = String(params[0]).toUpperCase();
          return db.data.products.filter(p => p.category.toUpperCase() === cat && p.active === 1 && p.stock > 0);
        }
        if (lower.includes('select * from products')) {
          return [...db.data.products];
        }
        if (lower.includes('select * from orders where user_id =')) {
          const uid = String(params[0]);
          return db.data.orders.filter(o => o.user_id === uid);
        }
        if (lower.includes('select * from orders')) {
          return [...db.data.orders];
        }
        if (lower.includes('select * from stock_codes where product_id =')) {
          const pid = Number(params[0]);
          return db.data.stock_codes.filter(c => c.product_id === pid);
        }
        if (lower.includes('select * from reviews')) {
          return [...db.data.reviews];
        }
        return [];
      },

      run(...params: any[]): { changes: number } {
        // Handle Insert User
        if (lower.includes('insert or ignore into users')) {
          const uid = String(params[0]);
          if (!db.data.users[uid]) {
            db.data.users[uid] = {
              user_id: uid,
              username: `User_${uid.slice(-4)}`,
              balance: 0,
              total_spent: 0,
              orders_count: 0,
              blacklisted: 0,
              blacklist_reason: '',
              created_at: new Date().toISOString()
            };
            db.saveData();
          }
          return { changes: 1 };
        }

        // Insert Order
        if (lower.includes('insert into orders')) {
          const [id, user_id, product_id, product_name, price, expires_at] = params;
          const order: Order = {
            id: String(id),
            user_id: String(user_id),
            user_tag: `User_${String(user_id).slice(-4)}`,
            product_id: Number(product_id),
            product_name: String(product_name),
            price: Number(price),
            quantity: 1,
            status: 'pending',
            payment_method: 'Crypto / Balance',
            payment_address: '',
            payment_amount: Number(price),
            payment_txid: '',
            delivered_codes: [],
            created_at: new Date().toISOString(),
            paid_at: null,
            delivered_at: null,
            expires_at: String(expires_at)
          };
          db.data.orders.unshift(order);
          db.saveData();
          return { changes: 1 };
        }

        // Update Orders Status
        if (lower.includes('update orders set status =')) {
          const orderId = String(params[params.length - 1]).toUpperCase();
          const order = db.data.orders.find(o => o.id.toUpperCase() === orderId);
          if (order) {
            if (lower.includes("'cancelled'")) order.status = 'cancelled';
            else if (lower.includes("'paid'")) {
              order.status = 'paid';
              order.paid_at = new Date().toISOString();
            } else if (lower.includes("'delivered'")) {
              order.status = 'delivered';
              order.delivered_at = new Date().toISOString();
              order.paid_at = order.paid_at || new Date().toISOString();
            }
            db.saveData();
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        // Update User Balance
        if (lower.includes('update users set balance = balance +')) {
          const amount = Number(params[0]);
          const uid = String(params[1]);
          if (db.data.users[uid]) {
            db.data.users[uid].balance += amount;
            db.saveData();
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        // Deduct balance
        if (lower.includes('update users set balance = balance -')) {
          const amount = Number(params[0]);
          const uid = String(params[1]);
          if (db.data.users[uid]) {
            db.data.users[uid].balance -= amount;
            db.data.users[uid].total_spent += amount;
            db.data.users[uid].orders_count += 1;
            db.saveData();
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        // Voucher update
        if (lower.includes('update vouchers set used_by =')) {
          const uid = String(params[0]);
          const code = String(params[1]).toUpperCase();
          const v = db.data.vouchers.find(voc => voc.code.toUpperCase() === code);
          if (v) {
            v.times_used += 1;
            if (!v.used_by.includes(uid)) v.used_by.push(uid);
            db.saveData();
            return { changes: 1 };
          }
        }

        // Insert Log
        if (lower.includes('insert into logs')) {
          const [type, user_id, staff_id, dataStr] = params;
          let parsedData = {};
          try { parsedData = JSON.parse(dataStr); } catch (e) {}
          db.data.logs.unshift({
            id: db.nextLogId++,
            type: String(type),
            user_id: user_id ? String(user_id) : null,
            staff_id: staff_id ? String(staff_id) : null,
            data: parsedData,
            created_at: new Date().toISOString()
          });
          db.saveData();
          return { changes: 1 };
        }

        // Insert Product
        if (lower.includes('insert into products')) {
          const [name, price, category, stock, description, delivery_data] = params;
          const newProd: Product = {
            id: db.nextProductId++,
            name: String(name),
            price: Number(price),
            category: String(category).toUpperCase(),
            stock: Number(stock),
            description: String(description || ''),
            delivery_type: 'code',
            delivery_data: String(delivery_data || ''),
            thumbnail: '',
            active: 1,
            created_at: new Date().toISOString()
          };
          db.data.products.push(newProd);
          db.saveData();
          return { changes: 1 };
        }

        // Update product stock
        if (lower.includes('update products set stock =')) {
          const stock = Number(params[0]);
          const pattern = String(params[1]).replace(/%/g, '').toLowerCase();
          const prod = db.data.products.find(p => p.name.toLowerCase().includes(pattern));
          if (prod) {
            prod.stock = stock;
            db.saveData();
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        db.saveData();
        return { changes: 1 };
      }
    };
  }

  // --- DIRECT GETTERS FOR API & DASHBOARD ---
  public getProducts(): Product[] { return this.data.products; }
  public getStockCodes(): StockCode[] { return this.data.stock_codes; }
  public getOrders(): Order[] { return this.data.orders; }
  public getUsers(): Record<string, UserAccount> { return this.data.users; }
  public getVouchers(): Voucher[] { return this.data.vouchers; }
  public getReviews(): Review[] { return this.data.reviews; }
  public getLogs(): LogEntry[] { return this.data.logs; }
  public getConfig(): BotConfig { return this.data.config; }
  public getSettings(): Record<string, string> { return this.data.settings; }

  public updateConfig(newConfig: Partial<BotConfig>): BotConfig {
    this.data.config = { ...this.data.config, ...newConfig };
    this.saveData();
    return this.data.config;
  }

  public addProduct(prod: Omit<Product, 'id' | 'created_at'>): Product {
    const newP: Product = {
      ...prod,
      id: this.nextProductId++,
      created_at: new Date().toISOString()
    };
    this.data.products.push(newP);
    this.saveData();
    return newP;
  }

  public updateProduct(id: number, updates: Partial<Product>): Product | null {
    const p = this.data.products.find(item => item.id === id);
    if (!p) return null;
    Object.assign(p, updates);
    this.saveData();
    return p;
  }

  public deleteProduct(id: number): boolean {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.products.splice(idx, 1);
    // remove stock codes
    this.data.stock_codes = this.data.stock_codes.filter(c => c.product_id !== id);
    this.saveData();
    return true;
  }

  public deleteStockCode(id: string): boolean {
    const idx = this.data.stock_codes.findIndex(c => c.id === id);
    if (idx === -1) return false;
    const removed = this.data.stock_codes.splice(idx, 1)[0];
    this.updateStockCounts();
    this.saveData();
    return true;
  }

  public addVoucher(voucher: Omit<Voucher, 'created_at' | 'times_used' | 'used_by'>): Voucher {
    const newV: Voucher = {
      ...voucher,
      code: voucher.code.toUpperCase(),
      times_used: 0,
      used_by: [],
      created_at: new Date().toISOString()
    };
    this.data.vouchers.push(newV);
    this.saveData();
    return newV;
  }

  public deleteVoucher(code: string): boolean {
    const idx = this.data.vouchers.findIndex(v => v.code.toUpperCase() === code.toUpperCase());
    if (idx === -1) return false;
    this.data.vouchers.splice(idx, 1);
    this.saveData();
    return true;
  }
}

export const dbInstance = new ShopDatabase();
export default dbInstance;
