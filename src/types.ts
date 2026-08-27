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
  }>;
}

export interface BotStatus {
  isConnected: boolean;
  statusMessage: string;
  ping: number;
  guildCount: number;
  uptime: number;
  userTag: string;
  clientId: string;
  guildId: string;
  hasToken: boolean;
}

export interface StatsOverview {
  revenue: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalProducts: number;
  availableCodes: number;
  totalCodes: number;
  totalUsers: number;
}
