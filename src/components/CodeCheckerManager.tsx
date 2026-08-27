import React, { useState } from 'react';
import { Product, StockCode } from '../types';
import { 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  UploadCloud, 
  Copy, 
  Trash2, 
  Search, 
  Download, 
  Sparkles,
  Filter,
  Check,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface CodeCheckerManagerProps {
  products: Product[];
  codes: StockCode[];
  onRefresh: () => void;
}

export const CodeCheckerManager: React.FC<CodeCheckerManagerProps> = ({
  products,
  codes,
  onRefresh
}) => {
  const [selectedProductId, setSelectedProductId] = useState<number>(products[0]?.id || 1);
  const [rawInputCodes, setRawInputCodes] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    totalParsed: number;
    validAdded: number;
    duplicatesSkipped: number;
    invalidSkipped: number;
    details: Array<{ code: string; status: string; reason?: string }>;
  } | null>(null);

  // Single code inspection state
  const [singleInspectCode, setSingleInspectCode] = useState('');
  const [inspectResult, setInspectResult] = useState<{
    format: string;
    isValid: boolean;
    normalized: string;
    isDuplicate: boolean;
    existingCode: StockCode | null;
  } | null>(null);

  // Table filters
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Handle single code check
  const handleInspectSingle = async () => {
    if (!singleInspectCode.trim()) return;
    try {
      const res = await fetch('/api/codes/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: singleInspectCode })
      });
      const data = await res.json();
      setInspectResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle batch import & check
  const handleBatchImport = async () => {
    if (!rawInputCodes.trim() || !selectedProductId) return;
    setIsImporting(true);
    try {
      const res = await fetch('/api/codes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          rawCodes: rawInputCodes
        })
      });
      const result = await res.json();
      setImportResult(result);
      setRawInputCodes('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  // Delete individual code
  const handleDeleteCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stock code?')) return;
    try {
      await fetch(`/api/codes/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Copy code to clipboard
  const handleCopy = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export unused codes as TXT
  const handleExportAvailable = () => {
    const available = filteredCodes.filter(c => c.status === 'available');
    if (!available.length) return alert('No available codes to export with current filter.');
    const content = available.map(c => c.code).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
  };

  // Filtered codes list
  const filteredCodes = codes.filter(c => {
    if (filterProduct !== 'all' && c.product_id !== Number(filterProduct)) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return c.code.toLowerCase().includes(q) || (c.order_id && c.order_id.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Automated Shop Check Codes Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <KeyRound className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white">Automated Shop Code Checker & Stock Engine</h2>
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-medium border border-emerald-500/20">
                  Bot Main Feature
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Automatic code verification, format detection (Steam, Discord Nitro, serials, accounts), duplicate prevention, and per-order automated dispensing.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-xl text-center flex-1 md:flex-initial">
              <span className="text-xs text-slate-400 block">Available In Stock</span>
              <span className="text-lg font-bold text-emerald-400">
                {codes.filter(c => c.status === 'available').length}
              </span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-xl text-center flex-1 md:flex-initial">
              <span className="text-xs text-slate-400 block">Delivered Total</span>
              <span className="text-lg font-bold text-indigo-400">
                {codes.filter(c => c.status === 'delivered').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Batch Code Importer & Automated Validator */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <UploadCloud className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Bulk Code Checker & Restock</h3>
              </div>
              <span className="text-xs text-slate-400">1 code per line</span>
            </div>

            {/* Target Product Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select Target Product for Restock:
                </label>
                <select
                  id="target-product-select"
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.stock} | ${p.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Textarea for raw codes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Paste Digital Codes / Keys / Account Credentials:
                </label>
                <textarea
                  id="raw-codes-input"
                  rows={6}
                  value={rawInputCodes}
                  onChange={e => setRawInputCodes(e.target.value)}
                  placeholder={`Paste codes line by line, e.g.:
https://discord.gift/a7Kx9mQ2vL8p4WsR
4X9TQ-8MKP2-VBL7W
user@example.com:Password123
SPOT-3M-9842-KLX8-9021`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-400">
                  {rawInputCodes.split(/\r?\n/).filter(l => l.trim()).length} lines detected
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setRawInputCodes('')}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    id="batch-import-btn"
                    onClick={handleBatchImport}
                    disabled={isImporting || !rawInputCodes.trim()}
                    className="flex items-center space-x-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition shadow-md shadow-indigo-600/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isImporting ? 'Validating...' : 'Validate & Add to Stock'}</span>
                  </button>
                </div>
              </div>

              {/* Import Results Box */}
              {importResult && (
                <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Automated Check Summary
                    </h4>
                    <span className="text-xs text-slate-400">
                      Total Checked: {importResult.totalParsed}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-emerald-950/40 border border-emerald-800/40 rounded-lg">
                      <span className="text-emerald-400 font-bold text-sm block">
                        +{importResult.validAdded}
                      </span>
                      <span className="text-slate-400 text-[11px]">Valid & Added</span>
                    </div>
                    <div className="p-2 bg-amber-950/40 border border-amber-800/40 rounded-lg">
                      <span className="text-amber-400 font-bold text-sm block">
                        {importResult.duplicatesSkipped}
                      </span>
                      <span className="text-slate-400 text-[11px]">Duplicates</span>
                    </div>
                    <div className="p-2 bg-rose-950/40 border border-rose-800/40 rounded-lg">
                      <span className="text-rose-400 font-bold text-sm block">
                        {importResult.invalidSkipped}
                      </span>
                      <span className="text-slate-400 text-[11px]">Invalid Format</span>
                    </div>
                  </div>

                  {/* Sample details */}
                  <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] font-mono scrollbar-thin">
                    {importResult.details.slice(0, 10).map((d, idx) => (
                      <div key={idx} className="flex items-center justify-between text-slate-400 py-0.5">
                        <span className="truncate max-w-[240px]">{d.code}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                          d.status === 'added_valid' ? 'bg-emerald-900/50 text-emerald-300' :
                          d.status === 'duplicate' ? 'bg-amber-900/50 text-amber-300' : 'bg-rose-900/50 text-rose-300'
                        }`}>
                          {d.status === 'added_valid' ? 'Valid' : d.reason || d.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Instant Single Code Inspector */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <Search className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Instant Code Inspector</h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Test any code format, verify if it's already in the database or assigned to an order.
            </p>

            <div className="space-y-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={singleInspectCode}
                  onChange={e => setSingleInspectCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInspectSingle()}
                  placeholder="e.g. https://discord.gift/xyz or 4X9TQ-..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleInspectSingle}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition"
                >
                  Inspect
                </button>
              </div>

              {inspectResult && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Format Type:</span>
                    <span className="font-mono text-indigo-300 font-semibold uppercase">{inspectResult.format}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Format Validity:</span>
                    <span className={`font-semibold flex items-center space-x-1 ${inspectResult.isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {inspectResult.isValid ? <CheckCircle2 className="w-3.5 h-3.5 inline" /> : <XCircle className="w-3.5 h-3.5 inline" />}
                      <span>{inspectResult.isValid ? 'Format Valid' : 'Invalid Format'}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Database Status:</span>
                    <span className={`font-semibold ${inspectResult.isDuplicate ? 'text-amber-400' : 'text-slate-300'}`}>
                      {inspectResult.isDuplicate 
                        ? `Found (${inspectResult.existingCode?.status.toUpperCase()})` 
                        : 'Not in Database'}
                    </span>
                  </div>
                  {inspectResult.existingCode?.order_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Assigned Order:</span>
                      <span className="font-mono text-indigo-400">{inspectResult.existingCode.order_id}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Supported Digital Code Formats</span>
            </div>
            <ul className="space-y-1 list-disc list-inside text-slate-400 text-[11px]">
              <li>Discord Nitro Gift Links (<code className="text-indigo-300">discord.gift/xxxx</code>)</li>
              <li>Steam Game Keys (<code className="text-indigo-300">AAAAA-BBBBB-CCCCC</code>)</li>
              <li>Account Logins (<code className="text-indigo-300">email@domain.com:password</code>)</li>
              <li>License / Serial Keys (<code className="text-indigo-300">XXXX-XXXX-XXXX-XXXX</code>)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Section: Full Stock Code Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Digital Code Inventory</h3>
            <p className="text-xs text-slate-400">Manage individual stock items, check assignment to orders, and copy keys</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filter by product */}
            <select
              value={filterProduct}
              onChange={e => setFilterProduct(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="all">All Products</option>
              {products.map(p => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>

            {/* Filter by status */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available (Unused)</option>
              <option value="delivered">Delivered to Customer</option>
              <option value="reserved">Reserved</option>
            </select>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search code..."
                className="bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 w-36 sm:w-44"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>

            {/* Export Available */}
            <button
              onClick={handleExportAvailable}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition border border-slate-700"
              title="Download available codes as TXT file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Code / Key Value</th>
                <th className="py-2.5 px-3">Format</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Date Added</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 font-sans">
                    No stock codes found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredCodes.map(codeItem => {
                  const prod = products.find(p => p.id === codeItem.product_id);
                  const isAvailable = codeItem.status === 'available';

                  return (
                    <tr key={codeItem.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                        {prod ? prod.name : `Product #${codeItem.product_id}`}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-1.5 max-w-xs truncate">
                          <span className={isAvailable ? 'text-emerald-400 font-semibold' : 'text-slate-400 line-through'}>
                            {codeItem.code}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-400 uppercase">
                        {codeItem.format_type}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          isAvailable
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                        }`}>
                          {codeItem.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-indigo-400 font-sans">
                        {codeItem.order_id ? (
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                            {codeItem.order_id}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-500 text-[11px]">
                        {new Date(codeItem.added_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1">
                        <button
                          onClick={() => handleCopy(codeItem.code, codeItem.id)}
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition"
                          title="Copy code"
                        >
                          {copiedId === codeItem.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteCode(codeItem.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded transition"
                          title="Delete code"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default CodeCheckerManager;
