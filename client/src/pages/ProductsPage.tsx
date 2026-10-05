import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Search, PackageSearch, AlertTriangle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { getActiveProducts } from '../services/productService';
import { toCartItem } from '../lib/normalize';
import { isSafeUrl } from '../lib/security';
import { EmptyState, ErrorState, LoadingState } from '../components/common/AsyncState';
import type { Product } from '../types';

/**
 * Product listing — wired to GET /api/products.
 * New page (no listing existed before; the old /product page was a single
 * hardcoded product detail).
 */

const StockBadge: React.FC<{ product: Product }> = ({ product }) => {
  if (product.status === 'out_of_stock' || product.availableStock <= 0) {
    return (
      <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-500/30 text-red-600 text-[10px] font-mono-tech uppercase font-bold">
        Out of Stock
      </span>
    );
  }
  if (product.availableStock <= 3) {
    return (
      <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-500/30 text-amber-700 text-[10px] font-mono-tech uppercase font-bold">
        Only {product.availableStock} left
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-500/30 text-emerald-600 text-[10px] font-mono-tech uppercase font-bold">
      In Stock
    </span>
  );
};

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const outOfStock = product.status !== 'active' || product.availableStock <= 0;
  const image = product.images.find((entry) => isSafeUrl(entry));

  const handleAdd = () => {
    if (outOfStock) return;
    addItem(toCartItem(product, 1));
    showToast(`${product.name} added to your cart.`);
  };

  const handleBuyNow = () => {
    if (outOfStock) return;
    // Buy Now on a listing card routes to the product detail page —
    // only the detail page's own Buy Now puts anything in the cart.
    navigate(`/products/${product.id}`);
  };

  return (
    <div className="bg-white border border-[#F0D3B8] rounded-2xl sm:rounded-3xl overflow-hidden shadow-md sm:shadow-xl hover:border-[#FF5E1E]/40 transition-all flex flex-col backdrop-blur-xl">
      <Link to={`/products/${product.id}`} className="block relative">
        <div className="aspect-[4/3] bg-[#FFF1E6] flex items-center justify-center overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-20 sm:w-24 h-28 sm:h-32 bg-[#161C28] rounded-xl sm:rounded-2xl border border-[#F0D3B8] flex flex-col items-center justify-between p-2 shadow-lg">
              <div className="w-full flex justify-around">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF5E1E]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF7A00]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF5E1E]" />
              </div>
              <div className="text-[9px] font-mono-tech font-bold text-[#F6F4EE] leading-none">IDIOT</div>
              <div className="w-4 h-4 rounded-full bg-zinc-700 border border-zinc-500" />
            </div>
          )}
        </div>
        <div className="absolute top-3 left-3">
          <StockBadge product={product} />
        </div>
      </Link>

      <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 flex flex-col flex-1">
        <div className="space-y-1.5 flex-1">
          <div className="text-[10px] font-mono-tech text-[#8A6A54] uppercase tracking-widest">
            {product.sku || product.slug}
          </div>
          <Link to={`/products/${product.id}`}>
            <h3 className="text-lg font-editorial font-bold text-[#2A1A12] leading-tight hover:text-[#FF5E1E] transition-colors">
              {product.name}
            </h3>
          </Link>
          <p className="text-xs text-[#8A6A54] font-light leading-relaxed line-clamp-3">
            {product.description}
          </p>
        </div>

        <div className="flex items-baseline justify-between pt-3 border-t border-[#F0D3B8]">
          <span className="text-xl font-extrabold font-mono-tech text-[#2A1A12]">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] font-mono-tech text-[#8A6A54] uppercase">{product.currency}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            className="py-3 bg-[#FFF1E6] hover:bg-[#FFE8D3] border border-[#F0D3B8] hover:border-[#FF5E1E]/50 text-[#2A1A12] text-[11px] font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag size={13} className="text-[#FF5E1E]" />
            <span>Add</span>
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={outOfStock}
            className="py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-[11px] font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-1.5 shadow-lg shadow-[#FF5E1E]/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Buy Now</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActiveProducts(50);
      setProducts(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.slug.toLowerCase().includes(term)
    );
  }, [products, search]);

  return (
    <div className="bg-[#FFF8F1] text-[#2A1A12] pt-28 pb-20 min-h-screen relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-20 right-10 w-[600px] h-[600px] bg-[#FF5E1E]/10 blur-[170px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
        {/* Header */}
        <div className="border-b border-[#F0D3B8] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-editorial font-normal uppercase text-[#2A1A12]">
              The Workbench Collection
            </h1>
            <p className="text-xs text-[#8A6A54] font-mono-tech">
              Hand-built analog pedals — direct from Burdwan, shipped across India.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="search"
              maxLength={150}
              placeholder="Search pedals…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-[#F0D3B8] rounded-full pl-10 pr-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
            />
            <Search size={15} className="absolute left-3.5 top-3.5 text-[#8A6A54]" />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState message="Loading the pedal catalogue…" />
        ) : error ? (
          <ErrorState error={error} message="We could not load the catalogue right now." onRetry={load} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<PackageSearch size={22} />}
            title="No Pedals Listed Yet"
            description="The workbench catalogue is empty right now. Check back soon for the next drop."
            action={
              <Link
                to="/contact"
                className="inline-block px-7 py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white text-xs font-mono-tech font-bold uppercase rounded-full shadow-lg shadow-[#FF5E1E]/25"
              >
                Notify Me
              </Link>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle size={22} />}
            title="No Matches"
            description={`No pedals match "${search}". Try a different name or SKU.`}
            action={
              <button
                type="button"
                onClick={() => setSearch('')}
                className="inline-block px-7 py-3 bg-[#FFF1E6] border border-[#F0D3B8] text-[#2A1A12] text-xs font-mono-tech font-bold uppercase rounded-full cursor-pointer"
              >
                Clear Search
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
