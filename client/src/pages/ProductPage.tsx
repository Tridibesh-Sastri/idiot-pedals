import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShoppingBag, ArrowRight, ArrowLeft, ShieldCheck, Truck, Check, MapPin, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { getProductById } from '../services/productService';
import { toCartItem } from '../lib/normalize';
import { isSafeUrl } from '../lib/security';
import { ErrorState, LoadingState } from '../components/common/AsyncState';
import { shippingService } from '../services/shippingService';
import type { Product } from '../types';

/**
 * Product detail — wired to GET /api/products/:id.
 * The decorative pedal rendering is kept for brand continuity; every price,
 * name, description, stock and specification now comes from the API.
 */

const MAX_QUANTITY = 10;

const formatSpecValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((entry) => String(entry)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const PedalPlaceholder: React.FC = () => (
  <div className="w-60 sm:w-72 bg-[#161C28] text-[#F6F4EE] rounded-3xl p-6 shadow-2xl border border-[#F0D3B8] flex flex-col justify-between h-[420px] select-none relative">
    <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-400" />
    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-400" />
    <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-400" />
    <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-400" />

    <div className="flex justify-between items-center px-1 pt-1">
      {['GAIN', 'TONE', 'VOL'].map((label, index) => (
        <div key={label} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#0B0E14] border-2 border-zinc-700 shadow-lg relative flex items-center justify-center">
            <div
              className={`w-1 h-4 rounded-full absolute top-1 ${
                index === 0 ? 'bg-[#FF5E1E] -rotate-45' : index === 1 ? 'bg-amber-400 rotate-15' : 'bg-[#FF7A00] rotate-45'
              }`}
            />
            <div className="w-4 h-4 rounded-full bg-zinc-800" />
          </div>
          <span className="text-[10px] font-mono-tech font-bold tracking-widest text-[#FF5E1E] uppercase mt-2">
            {label}
          </span>
        </div>
      ))}
    </div>

    <div className="text-center my-auto flex flex-col items-center justify-center">
      <div className="text-4xl sm:text-5xl font-editorial font-black tracking-wider text-[#F6F4EE] leading-none uppercase">
        IDIOT
      </div>
      <div className="text-3xl sm:text-4xl font-script font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-[#FF4500] -mt-1 -rotate-4 tracking-wide">
        Pedals
      </div>
    </div>

    <div className="flex items-center justify-between px-2 pt-2 border-t border-[#F0D3B8]">
      <div className="flex flex-col items-center gap-1">
        <div className="w-4 h-4 rounded-full bg-[#FF5E1E] shadow-[0_0_16px_#FF5E1E] border border-red-950 relative">
          <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full opacity-90" />
        </div>
        <span className="text-[7px] font-mono-tech font-bold text-[#8A6A54] uppercase">ACTIVE</span>
      </div>
      <div className="w-14 h-14 rounded-full border-4 border-zinc-700 bg-zinc-800 flex items-center justify-center shadow-inner">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-zinc-400 via-zinc-200 to-zinc-300 border-2 border-zinc-400 flex items-center justify-center shadow-md">
          <div className="w-6 h-6 rounded-full bg-zinc-300 border border-zinc-500 shadow-inner" />
        </div>
      </div>
      <div className="w-6" />
    </div>
  </div>
);

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addItem, replaceItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState<{ deliverable: boolean; estDays: number } | null>(null);
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setError(null);
      setProduct(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getProductById(id);
      setProduct(data);
      setQuantity(1);
      setActiveImage(0);
    } catch (err) {
      setProduct(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const images = useMemo(
    () => (product?.images ?? []).filter((entry) => isSafeUrl(entry)),
    [product]
  );

  const outOfStock = !product || product.status !== 'active' || product.availableStock <= 0;
  const maxQuantity = product ? Math.max(1, Math.min(MAX_QUANTITY, product.availableStock || 0)) : 1;

  const handleAddToCart = () => {
    if (!product || outOfStock) return;
    addItem(toCartItem(product, quantity), quantity);
    showToast(`Added ${quantity} × ${product.name} to your cart.`);
  };

  const handleBuyNow = () => {
    if (!product || outOfStock) return;
    // Buy Now sets the line to the chosen quantity instead of adding to it.
    replaceItem(toCartItem(product, quantity));
    navigate('/checkout');
  };

  const handleCheckPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.length !== 6) {
      showToast('Please enter a valid 6-digit Indian PIN code.', 'error');
      return;
    }
    setIsCheckingPincode(true);
    try {
      const res = await shippingService.checkPincodeDeliverability(pincode);
      setPincodeResult(res);
      if (res.deliverable) showToast(`Standard delivery in ~${res.estDays} days.`);
    } finally {
      setIsCheckingPincode(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* States                                                                  */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="bg-[#FFF8F1] text-[#2A1A12] pt-28 pb-20 min-h-screen px-4">
        <div className="max-w-3xl mx-auto">
          <LoadingState message="Loading pedal details…" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="bg-[#FFF8F1] text-[#2A1A12] pt-28 pb-20 min-h-screen px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <ErrorState
            error={error}
            message={error ? undefined : 'That pedal could not be found. It may have been removed.'}
            onRetry={load}
          />
          <div className="text-center">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-xs font-mono-tech uppercase text-[#8A6A54] hover:text-[#2A1A12]"
            >
              <ArrowLeft size={14} />
              <span>Back to the collection</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const specEntries = Object.entries(product.specifications ?? {});

  return (
    <div className="bg-[#FFF8F1] text-[#2A1A12] pt-28 pb-20 overflow-hidden relative">
      {/* Background ambient lighting */}
      <div className="absolute top-20 right-10 w-[600px] h-[600px] bg-[#FF5E1E]/10 blur-[170px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-xs font-mono-tech uppercase text-[#8A6A54] hover:text-[#2A1A12] transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          <span>Back to the collection</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start pb-8">
          {/* Left: gallery / decorative pedal */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center relative shadow-2xl min-h-[500px] backdrop-blur-xl glow-neon-subtle">
              {images.length > 0 ? (
                <img
                  src={images[Math.min(activeImage, images.length - 1)]}
                  alt={product.name}
                  className="max-h-[420px] w-auto max-w-full object-contain rounded-2xl"
                />
              ) : (
                <div className="relative my-4">
                  <PedalPlaceholder />
                </div>
              )}

              <div className="text-center text-xs text-[#8A6A54] font-mono-tech uppercase tracking-widest mt-4">
                {[product.sku, product.currency].filter(Boolean).join(' • ')}
              </div>
            </div>

            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`w-20 h-20 shrink-0 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                      index === activeImage ? 'border-[#FF5E1E]' : 'border-[#F0D3B8] hover:border-[#FF5E1E]/50'
                    }`}
                  >
                    <img src={image} alt={`${product.name} view ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: purchase decisions */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                {outOfStock ? (
                  <span className="px-3 py-1 bg-red-50 border border-red-500/30 text-xs font-mono-tech uppercase tracking-widest text-red-600 font-bold rounded-full">
                    Out Of Stock
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-[#FFF1E6] border border-[#FF5E1E]/30 text-xs font-mono-tech uppercase tracking-widest text-[#FF5E1E] font-bold rounded-full">
                    In Stock — {product.availableStock} available
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-editorial font-normal tracking-tight text-[#2A1A12] uppercase leading-tight">
                {product.name}
              </h1>

              <p className="text-xs sm:text-sm text-[#8A6A54] leading-relaxed font-light whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Pricing */}
            <div className="p-5 bg-white border border-[#F0D3B8] rounded-2xl space-y-2 backdrop-blur-xl">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono-tech text-[#2A1A12]">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-mono-tech text-[#8A6A54] uppercase">{product.currency}</span>
              </div>
              <div className="text-xs font-mono-tech text-[#8A6A54] flex items-center gap-2 pt-2 border-t border-[#F0D3B8]">
                <span>Inclusive of all taxes</span>
                <span className="text-[#FF5E1E]">•</span>
                <span className="text-[#2A1A12]">Free Doorstep Delivery Across India</span>
              </div>
            </div>

            {/* Quantity + actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-xs font-mono-tech uppercase tracking-widest text-[#8A6A54]">
                  Quantity:
                </label>
                <div className="flex items-center border border-[#F0D3B8] rounded-full bg-[#FFF1E6] px-2 py-0.5">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={outOfStock || quantity <= 1}
                    className="px-2.5 py-1 text-xs text-[#8A6A54] hover:text-[#FF5E1E] cursor-pointer disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="px-3 text-xs font-bold font-mono-tech text-[#2A1A12]">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                    disabled={outOfStock || quantity >= maxQuantity}
                    className="px-2.5 py-1 text-xs text-[#8A6A54] hover:text-[#FF5E1E] cursor-pointer disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                  className="w-full py-4 bg-[#FFF1E6] hover:bg-[#FFE8D3] text-[#2A1A12] border border-[#F0D3B8] hover:border-[#FF5E1E]/50 text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag size={15} className="text-[#FF5E1E]" />
                  <span>Add to Cart</span>
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={outOfStock}
                  className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Buy Now — ₹{(product.price * quantity).toLocaleString('en-IN')}</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {outOfStock && (
                <p className="text-[11px] font-mono-tech text-amber-700 bg-amber-50 border border-amber-500/30 rounded-2xl p-3">
                  This pedal is currently out of stock. Check back soon or contact us for the next batch.
                </p>
              )}
            </div>

            {/* Pincode estimator */}
            <div className="p-5 bg-white border border-[#F0D3B8] rounded-2xl space-y-3 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-mono-tech text-[#2A1A12] uppercase font-bold tracking-wider">
                <MapPin size={14} className="text-[#FF5E1E]" />
                Estimate Delivery Date
              </div>

              <form onSubmit={handleCheckPincode} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="Enter 6-digit PIN code"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1 bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-2.5 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
                <button
                  type="submit"
                  disabled={isCheckingPincode}
                  className="px-5 py-2.5 bg-[#FFF1E6] hover:bg-[#FFE8D3] border border-[#F0D3B8] text-xs font-mono-tech text-[#2A1A12] uppercase font-bold rounded-full cursor-pointer transition-all disabled:opacity-50"
                >
                  {isCheckingPincode ? 'Checking…' : 'Check'}
                </button>
              </form>

              {pincodeResult && (
                <div className="text-xs font-mono-tech space-y-0.5 pt-1">
                  {pincodeResult.deliverable ? (
                    <>
                      <div className="text-emerald-600 font-semibold">
                        ✓ Delivery available in ~{pincodeResult.estDays} business days
                      </div>
                      <div className="text-[11px] text-[#8A6A54]">
                        COD & Razorpay online payment both supported for {pincode}.
                      </div>
                    </>
                  ) : (
                    <div className="text-amber-700">We couldn&apos;t estimate delivery for {pincode}.</div>
                  )}
                </div>
              )}
            </div>

            {/* Assurance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono-tech">
              <div className="p-4 bg-[#FFF1E6] border border-[#F0D3B8] rounded-2xl flex items-start gap-2.5 text-[#8A6A54]">
                <Truck size={14} className="text-[#FF5E1E] mt-0.5 shrink-0" />
                <span>Free insured shipping across India, dispatched from the Burdwan workbench.</span>
              </div>
              <div className="p-4 bg-[#FFF1E6] border border-[#F0D3B8] rounded-2xl flex items-start gap-2.5 text-[#8A6A54]">
                <ShieldCheck size={14} className="text-[#FF5E1E] mt-0.5 shrink-0" />
                <span>365-day bench warranty against component defects.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications */}
        <section className="mt-8 bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-10 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2 pb-4 border-b border-[#F0D3B8]">
            <Package size={16} className="text-[#FF5E1E]" />
            <h2 className="text-xl font-editorial font-bold uppercase tracking-tight text-[#2A1A12]">
              Specifications
            </h2>
          </div>

          {specEntries.length === 0 ? (
            <p className="text-xs font-mono-tech text-[#8A6A54] pt-4">
              Detailed specifications for this pedal have not been published yet.
            </p>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5">
              {specEntries.map(([key, value]) => {
                const formatted = formatSpecValue(value);
                if (!formatted) return null;
                return (
                  <div key={key} className="flex items-start gap-3 text-xs font-mono-tech">
                    <Check size={14} className="text-[#FF5E1E] mt-0.5 shrink-0" />
                    <div>
                      <dt className="text-[#8A6A54] uppercase tracking-wider text-[11px]">{key}</dt>
                      <dd className="text-[#2A1A12] font-bold">{formatted}</dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          )}
        </section>
      </div>

      {/* Mobile sticky purchase bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF8F1]/95 border-t border-[#F0D3B8] p-3 sm:hidden backdrop-blur-2xl flex items-center justify-between gap-3 shadow-2xl">
        <div>
          <div className="text-xs font-bold font-mono-tech text-[#2A1A12] uppercase">{product.name}</div>
          <div className="flex items-baseline gap-1.5 font-mono-tech">
            <span className="text-base font-extrabold text-[#2A1A12]">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {!outOfStock && <span className="text-[10px] text-[#8A6A54]">{product.availableStock} left</span>}
          </div>
        </div>

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={outOfStock}
          className="px-6 py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center gap-1.5 shadow-lg shadow-[#FF5E1E]/30 disabled:opacity-50"
        >
          {outOfStock ? (
            <span>Out of Stock</span>
          ) : (
            <>
              <span>Buy Now</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Backwards-compatible alias (old import name).
export const ProductPage = ProductDetailPage;

export default ProductDetailPage;
