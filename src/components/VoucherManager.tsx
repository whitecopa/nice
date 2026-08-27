import React, { useState } from 'react';
import { Voucher, Product } from '../types';
import { 
  Gift, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Tag, 
  Percent, 
  DollarSign,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

interface VoucherManagerProps {
  vouchers: Voucher[];
  products: Product[];
  onRefresh: () => void;
}

export const VoucherManager: React.FC<VoucherManagerProps> = ({
  vouchers,
  products,
  onRefresh
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'balance' | 'product' | 'discount_percent' | 'discount_fixed'>('balance');
  const [value, setValue] = useState('10.00');
  const [productId, setProductId] = useState<number>(products[0]?.id || 1);
  const [maxUses, setMaxUses] = useState('50');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !value) return;

    try {
      await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          type,
          value: Number(value),
          product_id: type === 'product' ? productId : undefined,
          max_uses: Number(maxUses || 1)
        })
      });
      setIsModalOpen(false);
      setCode('');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVoucher = async (voucherCode: string) => {
    if (!confirm(`Delete voucher ${voucherCode}?`)) return;
    try {
      await fetch(`/api/vouchers/${voucherCode}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedCode(txt);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = 'GIFT-';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(res);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Gift className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Vouchers & Redeemable Codes</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Create gift cards ($ balance top-up), discount promotional codes, and free product claim keys.
          </p>
        </div>

        <button
          onClick={() => {
            generateRandomCode();
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Generate New Voucher</span>
        </button>
      </div>

      {/* Grid of active vouchers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {vouchers.map(v => {
          const isExpired = v.times_used >= v.max_uses;
          const associatedProd = v.product_id ? products.find(p => p.id === v.product_id) : null;

          return (
            <div
              key={v.code}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    v.type === 'balance' ? 'bg-emerald-500/10 text-emerald-400' :
                    v.type === 'product' ? 'bg-indigo-500/10 text-indigo-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>
                    {v.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {v.times_used} / {v.max_uses} uses
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                  <span className="font-mono font-bold text-sm text-indigo-300 tracking-wider">
                    {v.code}
                  </span>
                  <button
                    onClick={() => handleCopy(v.code)}
                    className="text-slate-400 hover:text-white p-1"
                    title="Copy code"
                  >
                    {copiedCode === v.code ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="mt-3 text-xs text-slate-300 space-y-1">
                  {v.type === 'balance' && (
                    <div className="font-semibold text-emerald-400">
                      Value: +${v.value.toFixed(2)} Shop Balance
                    </div>
                  )}
                  {v.type === 'discount_percent' && (
                    <div className="font-semibold text-amber-400">
                      Discount: {v.value}% OFF Order
                    </div>
                  )}
                  {v.type === 'discount_fixed' && (
                    <div className="font-semibold text-amber-400">
                      Discount: ${v.value.toFixed(2)} OFF Order
                    </div>
                  )}
                  {v.type === 'product' && (
                    <div className="font-semibold text-indigo-300">
                      Free Item: {associatedProd?.name || `Product #${v.product_id}`}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[11px] text-slate-500">
                <span>Redeemable via <code className="text-indigo-400 font-mono">/redeem {v.code}</code></span>
                <button
                  onClick={() => handleDeleteVoucher(v.code)}
                  className="text-slate-500 hover:text-rose-400 p-1 transition"
                  title="Delete voucher"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Voucher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Generate Shop Voucher</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Voucher Code</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. NITRO-FREE-2026"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500 uppercase"
                  />
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg"
                  >
                    Random
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Reward Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="balance">Account Balance Top-up ($)</option>
                  <option value="discount_percent">Percentage Discount (% OFF)</option>
                  <option value="discount_fixed">Fixed Amount Discount ($ OFF)</option>
                  <option value="product">Free Digital Product Key</option>
                </select>
              </div>

              {type === 'product' ? (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Associated Product</label>
                  <select
                    value={productId}
                    onChange={e => setProductId(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {type === 'balance' ? 'Balance Amount ($)' : type === 'discount_percent' ? 'Discount Percentage (%)' : 'Discount Amount ($)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder="10.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Max Redemptions Allowed</label>
                <input
                  type="number"
                  required
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value)}
                  placeholder="50"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition shadow-md"
                >
                  Create Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default VoucherManager;
