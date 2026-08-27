import React, { useState } from 'react';
import { Order, BotConfig } from '../types';
import { 
  Receipt, 
  Search, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Send, 
  Key, 
  ExternalLink, 
  DollarSign, 
  CreditCard,
  User,
  Eye,
  Check
} from 'lucide-react';

interface OrdersManagerProps {
  orders: Order[];
  config: BotConfig | null;
  onRefresh: () => void;
}

export const OrdersManager: React.FC<OrdersManagerProps> = ({
  orders,
  config,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Deliver order
  const handleDeliverOrder = async (orderId: string) => {
    setIsProcessing(true);
    try {
      await fetch(`/api/orders/${orderId}/deliver`, { method: 'POST' });
      onRefresh();
      // Update selected order view
      const updated = orders.find(o => o.id === orderId);
      if (updated) setSelectedOrder(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mark Paid & Deliver
  const handleMarkPaidAndDeliver = async (orderId: string) => {
    setIsProcessing(true);
    try {
      await fetch(`/api/orders/${orderId}/mark-paid`, { method: 'POST' });
      onRefresh();
      setSelectedOrder(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel order
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
      onRefresh();
      setSelectedOrder(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.product_name.toLowerCase().includes(q) ||
        o.user_id.includes(q) ||
        (o.user_tag && o.user_tag.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Orders & Payment Verification</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time feed of Discord orders, automated code fulfillment, and crypto/balance payment confirmations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400">Total Orders: </span>
            <span className="font-bold text-white">{orders.length}</span>
          </div>
          <div className="bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-emerald-400 font-bold">
              {orders.filter(o => o.status === 'delivered').length} Delivered
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {['all', 'pending', 'paid', 'delivered', 'cancelled'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition ${
                filterStatus === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Order ID, user, product..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Product & Qty</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Delivered Codes</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    No orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isDelivered = order.status === 'delivered';
                  const isPending = order.status === 'pending';
                  const isPaid = order.status === 'paid';

                  return (
                    <tr key={order.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                        {order.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200">
                        <div className="flex flex-col">
                          <span>{order.user_tag || `User_${order.user_id.slice(-4)}`}</span>
                          <span className="text-[10px] font-mono text-slate-500">{order.user_id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        <span className="font-semibold">{order.product_name}</span>
                        <span className="text-slate-400 text-[11px] ml-1.5 font-mono">x{order.quantity}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        ${(order.price * order.quantity).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          isDelivered ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          isPaid ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' :
                          isPending ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {order.delivered_codes?.length ? (
                          <span className="text-emerald-400 font-medium">
                            {order.delivered_codes.length} code(s) delivered
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition"
                          title="Inspect Order"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          <span>View</span>
                        </button>
                        {isPending && (
                          <button
                            onClick={() => handleMarkPaidAndDeliver(order.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-xs transition shadow-sm"
                            title="Confirm Payment & Deliver Codes"
                          >
                            <Check className="w-3.5 h-3.5 inline mr-1" />
                            <span>Auto Deliver</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail & DM Inspector Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Order Details: {selectedOrder.id}</h3>
                <p className="text-xs text-slate-400">Created: {new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 rounded-lg">
                <div>
                  <span className="text-slate-400 block">Product:</span>
                  <span className="font-semibold text-white">{selectedOrder.product_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Quantity & Price:</span>
                  <span className="font-semibold text-white font-mono">{selectedOrder.quantity}x (${selectedOrder.price.toFixed(2)}) = ${(selectedOrder.price * selectedOrder.quantity).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Customer Tag:</span>
                  <span className="font-semibold text-indigo-300">{selectedOrder.user_tag}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Method:</span>
                  <span className="font-semibold text-slate-200">{selectedOrder.payment_method || 'Pending'}</span>
                </div>
              </div>

              {/* Delivered Codes Box */}
              <div>
                <span className="text-slate-300 font-semibold block mb-1">Delivered Stock Codes / License Keys:</span>
                {selectedOrder.delivered_codes?.length ? (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 font-mono text-xs text-emerald-400">
                    {selectedOrder.delivered_codes.map((code, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded">
                        <span>{code}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(code)}
                          className="text-[10px] text-slate-400 hover:text-white bg-slate-800 px-1.5 py-0.5 rounded"
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic p-3 bg-slate-950 rounded-lg">
                    No codes have been delivered yet. Click "Auto-Deliver Codes" to reserve available stock codes and fulfill this order.
                  </p>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                {selectedOrder.status === 'pending' && (
                  <button
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded font-medium transition"
                  >
                    Cancel Order
                  </button>
                )}
                <div className="flex space-x-2 ml-auto">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium transition"
                  >
                    Close
                  </button>
                  {selectedOrder.status !== 'delivered' && (
                    <button
                      onClick={() => handleMarkPaidAndDeliver(selectedOrder.id)}
                      disabled={isProcessing}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded transition shadow"
                    >
                      {isProcessing ? 'Delivering...' : 'Auto-Deliver Codes'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default OrdersManager;
