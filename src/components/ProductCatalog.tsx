import React, { useState } from 'react';
import { Product, BotConfig } from '../types';
import { 
  ShoppingBag, 
  Plus, 
  Edit3, 
  Trash2, 
  Tag, 
  Layers, 
  KeyRound, 
  Check, 
  X,
  ExternalLink,
  DollarSign
} from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  config: BotConfig | null;
  onRefresh: () => void;
  onOpenCodeCheckerForProduct: (productId: number) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  config,
  onRefresh,
  onOpenCodeCheckerForProduct
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('DISCORD');
  const [deliveryType, setDeliveryType] = useState<'code' | 'text' | 'account' | 'file'>('code');
  const [deliveryData, setDeliveryData] = useState('');
  const [thumbnail, setThumbnail] = useState('');

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setPrice('');
    setCategory(config?.categories[0] || 'DISCORD');
    setDeliveryType('code');
    setDeliveryData('');
    setThumbnail('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description);
    setPrice(String(p.price));
    setCategory(p.category);
    setDeliveryType(p.delivery_type);
    setDeliveryData(p.delivery_data || '');
    setThumbnail(p.thumbnail || '');
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || !category) return;

    try {
      if (editingProduct) {
        await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            price: Number(price),
            category: category.toUpperCase(),
            delivery_type: deliveryType,
            delivery_data: deliveryData,
            thumbnail
          })
        });
      } else {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            price: Number(price),
            category: category.toUpperCase(),
            delivery_type: deliveryType,
            delivery_data: deliveryData,
            thumbnail
          })
        });
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product and its associated stock codes?')) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const categories = ['all', ...(config?.categories || ['DISCORD', 'STREAMING', 'GAMING', 'DIGITAL KEYS', 'BOTS & TOOLS'])];

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'all' && p.category.toUpperCase() !== selectedCategory.toUpperCase()) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Product Inventory & Catalog</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure items sold on Discord. Real-time stock counts update as codes are verified and dispensed.
          </p>
        </div>

        <button
          onClick={openAddModal}
          id="add-product-btn"
          className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProducts.map(product => {
          const hasStock = product.stock > 0;
          return (
            <div
              key={product.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition flex flex-col justify-between shadow-sm"
            >
              <div>
                {/* Thumbnail / Header */}
                <div className="h-36 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                  {product.thumbnail ? (
                    <img
                      src={product.thumbnail}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ShoppingBag className="w-12 h-12 text-slate-700" />
                  )}
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-900/90 backdrop-blur-sm text-[11px] font-mono font-bold text-white border border-slate-700">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-indigo-950/80 backdrop-blur-sm text-[10px] uppercase font-bold text-indigo-300 border border-indigo-700/50">
                    {product.category}
                  </span>
                </div>

                {/* Body Details */}
                <div className="p-4 space-y-2.5">
                  <h3 className="text-sm font-bold text-white line-clamp-1">{product.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {product.description || '*No description provided.*'}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400">Inventory Stock:</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                      hasStock ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {hasStock ? `${product.stock} in stock` : 'Out of stock'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenCodeCheckerForProduct(product.id)}
                  className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-500/30 transition"
                  title="Import & Check digital codes for this product"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Check & Add Codes</span>
                </button>

                <button
                  onClick={() => openEditModal(product)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                  title="Edit product"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                  title="Delete product"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Discord Nitro 1 Month Boost"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Price (USD $)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="4.99"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 uppercase"
                  >
                    {(config?.categories || ['DISCORD', 'STREAMING', 'GAMING', 'DIGITAL KEYS', 'BOTS & TOOLS']).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Product description displayed to customers on Discord..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Image / Thumbnail URL</label>
                <input
                  type="url"
                  value={thumbnail}
                  onChange={e => setThumbnail(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Default Fallback Delivery Text (Optional)</label>
                <input
                  type="text"
                  value={deliveryData}
                  onChange={e => setDeliveryData(e.target.value)}
                  placeholder="Default text if no individual codes in inventory..."
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
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProductCatalog;
