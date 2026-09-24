import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Truck,
  Check,
  Package,
  Cpu,
  MapPin,
  Flame,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { useCart, NEON_FUZZ_BOX } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { shippingService } from '../services/shippingService';
import { SoundDemoSection } from '../components/pedal/SoundDemoSection';
import { ControlsOverview } from '../components/pedal/ControlsOverview';
import { Specifications } from '../components/pedal/Specifications';
import { PedalPhotoGallery } from '../components/pedal/PedalPhotoGallery';

/**
 * ProductPage Component
 *
 * Comprehensive product presentation and e-commerce conversion page:
 * - Multi-angle photo gallery and workbench preview
 * - Live PIN code deliverability lookup via shippingService
 * - "What's in the Box" unpacking breakdown
 * - Embedded Web Audio tone test bench & circuit controls manual
 * - Sticky mobile purchase bar with instant "Buy Now" checkout dispatch
 */
export const ProductPage: React.FC = () => {
  // Global cart operations (addItem opens the slide-out drawer)
  const { addItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Unit purchase quantity (default: 1)
  const [quantity, setQuantity] = useState(1);
  // PIN code checker states
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState<{
    deliverable: boolean;
    estDays: number;
    codAvailable: boolean;
  } | null>(null);
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);

  /**
   * Adds the configured quantity of pedals to the cart and dispatches confirmation toast
   */
  const handleAddToCart = () => {
    addItem(NEON_FUZZ_BOX, quantity);
    showToast(`Added ${quantity} Neon Fuzz Box to your workbench cart!`);
  };

  /**
   * Direct express purchase: adds item to cart and immediately routes to /checkout
   */
  const handleBuyNow = () => {
    addItem(NEON_FUZZ_BOX, quantity);
    navigate('/checkout');
  };

  /**
   * Queries logistics provider to verify deliverability and estimated transit days
   */
  const handleCheckPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode || pincode.length !== 6) {
      showToast('Please enter a valid 6-digit Indian PIN code.', 'error');
      return;
    }
    setIsCheckingPincode(true);
    try {
      const res = await shippingService.checkPincodeDeliverability(pincode);
      setPincodeResult(res);
      if (res.deliverable) {
        showToast(`Standard delivery in ~${res.estDays} days via Blue Dart.`);
      }
    } finally {
      setIsCheckingPincode(false);
    }
  };

  const boxContents = [
    '1× Neon Fuzz Box Analog Effects Pedal',
    '1× Custom Heavy IDIOT Pedals Tortex Guitar Pick (1.0mm)',
    '1× Hand-Stamped Workbench Calibration Card & Serial Certificate',
    '4× High-Grip 3M Neoprene Non-Slip Rubber Feet',
    '1× IDIOT Pedals Vinyl Helmet / Case Decal',
    'Quick-Start Dial Guide with Sweet-Spot Settings',
  ];

  return (
    <div className="bg-[#0B0B0A] text-[#F3EFE6] pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Product Purchase Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start py-8">
          {/* Left Column: Visual Showcase Gallery */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-center relative shadow-2xl min-h-[480px]">
              {/* Authentic Physical Pedal Enclosure Card */}
              <div className="relative my-4">
                <div className="w-60 sm:w-72 bg-[#F3EFE6] text-[#0B0B0A] rounded-2xl p-6 shadow-2xl border-2 border-[#D6CFC0] flex flex-col justify-between h-[420px] select-none relative">
                  {/* Subtle Metallic Highlight */}
                  <div className="absolute inset-0 rounded-2xl border border-white/60 pointer-events-none" />

                  {/* Corner Screws */}
                  <div className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-[#BDB5A4] border border-[#7D7667]" />
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#BDB5A4] border border-[#7D7667]" />
                  <div className="absolute bottom-2.5 left-2.5 w-2 h-2 rounded-full bg-[#BDB5A4] border border-[#7D7667]" />
                  <div className="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full bg-[#BDB5A4] border border-[#7D7667]" />

                  {/* Knobs Section */}
                  <div className="flex justify-between items-center px-1 pt-1">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#171513] border-2 border-zinc-700 shadow-lg relative flex items-center justify-center">
                        <div className="w-1 h-4 bg-sky-400 rounded-full absolute top-1 -rotate-45" />
                        <div className="w-4 h-4 rounded-full bg-zinc-800" />
                      </div>
                      <span className="text-[10px] font-black tracking-widest text-[#0B0B0A] uppercase mt-2">
                        GAIN
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#171513] border-2 border-zinc-700 shadow-lg relative flex items-center justify-center">
                        <div className="w-1 h-4 bg-amber-500 rounded-full absolute top-1 rotate-15" />
                        <div className="w-4 h-4 rounded-full bg-zinc-800" />
                      </div>
                      <span className="text-[10px] font-black tracking-widest text-[#0B0B0A] uppercase mt-2">
                        TONE
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#171513] border-2 border-zinc-700 shadow-lg relative flex items-center justify-center">
                        <div className="w-1 h-4 bg-yellow-400 rounded-full absolute top-1 rotate-45" />
                        <div className="w-4 h-4 rounded-full bg-zinc-800" />
                      </div>
                      <span className="text-[10px] font-black tracking-widest text-[#0B0B0A] uppercase mt-2">
                        VOL
                      </span>
                    </div>
                  </div>

                  {/* Brand Typography Center */}
                  <div className="text-center my-auto flex flex-col items-center justify-center">
                    <div className="text-5xl font-cinzel font-black tracking-wider text-[#0B0B0A] leading-none">
                      IDIOT
                    </div>
                    <div className="text-4xl font-script font-bold text-[#D91E18] -mt-1 -rotate-6 tracking-wide drop-shadow-sm">
                      Pedals
                    </div>
                    <div className="text-[8px] font-mono-tech font-bold tracking-widest text-[#8C857A] uppercase mt-1">
                      NEON FUZZ BOX
                    </div>
                  </div>

                  {/* LED & Switch Bottom */}
                  <div className="flex items-center justify-between px-2 pt-2 border-t border-[#8C857A]/20">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-[#FF2E2E] shadow-[0_0_16px_#FF2E2E] border border-red-950 relative">
                        <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full opacity-80" />
                      </div>
                      <span className="text-[7px] font-mono-tech font-bold text-black/60 uppercase">
                        ACTIVE
                      </span>
                    </div>

                    <div className="w-14 h-14 rounded-full border-4 border-[#CBC5B6] bg-[#DDD6C8] flex items-center justify-center shadow-inner">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-zinc-400 via-zinc-200 to-zinc-300 border-2 border-zinc-400 flex items-center justify-center shadow-md">
                        <div className="w-6 h-6 rounded-full bg-zinc-300 border border-zinc-500 shadow-inner" />
                      </div>
                    </div>

                    <div className="w-6" />
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-[#8C857A] font-mono-tech uppercase tracking-wider mt-4">
                Warm Ivory Finish • 1590B Aluminum Chassis • 1/4" Mono In/Out
              </div>
            </div>
          </div>

          {/* Right Column: Purchasing Decisions, Options & Buy Buttons */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-[#171513] border border-[#8C857A]/30 text-xs font-mono-tech uppercase tracking-widest text-[#D91E18] font-bold rounded">
                  FLAGSHIP ANALOG FUZZ
                </span>
                <span className="text-xs text-emerald-400 font-medium">● Batch 04 Ready</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-cinzel font-black tracking-tight text-[#F3EFE6] uppercase">
                Neon Fuzz Box
              </h1>

              <p className="text-xs sm:text-sm text-[#8C857A] leading-relaxed">
                A dual-stage hybrid vintage fuzz engineered for uncompromising guitarists. Dial in anything from warm organic tube break-up to roaring, thick, wall-of-sound fuzz saturation.
              </p>
            </div>

            {/* Pricing Section */}
            <div className="p-4 bg-[#171513] border border-[#8C857A]/25 rounded-xl space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black font-mono-tech text-[#F3EFE6]">
                  ₹2,499
                </span>
                <span className="text-base text-[#8C857A] line-through font-mono-tech">
                  ₹3,499
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  Save ₹1,000 (28% Off)
                </span>
              </div>
              <div className="text-xs text-[#8C857A] flex items-center gap-2 pt-1 border-t border-[#8C857A]/15">
                <span>Inclusive of all taxes</span>
                <span>•</span>
                <span className="text-[#F3EFE6] font-medium">Free Doorstep Delivery Across India</span>
              </div>
            </div>

            {/* Quantity Selector & Action Buttons */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-xs font-mono-tech uppercase tracking-wider text-[#8C857A]">
                  Quantity:
                </label>
                <div className="flex items-center border border-[#8C857A]/30 rounded bg-[#171513]">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 text-xs text-[#8C857A] hover:text-white"
                  >
                    -
                  </button>
                  <span className="px-3 text-xs font-bold font-mono-tech text-[#F3EFE6]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-1.5 text-xs text-[#8C857A] hover:text-white"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  className="w-full py-4 bg-[#171513] hover:bg-[#0B0B0A] text-[#F3EFE6] border border-[#8C857A]/40 hover:border-[#D91E18] text-xs font-mono-tech font-bold uppercase rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <ShoppingBag size={16} />
                  Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  className="w-full py-4 bg-[#D91E18] hover:bg-[#b51712] text-white text-xs font-mono-tech font-bold uppercase rounded flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#D91E18]/30"
                >
                  Buy Now — ₹{(2499 * quantity).toLocaleString()}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Pincode Deliverability Check */}
            <div className="p-4 bg-[#171513]/60 border border-[#8C857A]/20 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono-tech text-[#F3EFE6] uppercase font-bold">
                <MapPin size={14} className="text-[#D91E18]" />
                Estimate Delivery Date
              </div>

              <form onSubmit={handleCheckPincode} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit PIN code"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-[#0B0B0A] border border-[#8C857A]/30 rounded px-3 py-2 text-xs text-[#F3EFE6] font-mono-tech focus:outline-none focus:border-[#D91E18]"
                />
                <button
                  type="submit"
                  disabled={isCheckingPincode}
                  className="px-4 py-2 bg-[#171513] hover:bg-[#0B0B0A] border border-[#8C857A]/40 text-xs font-mono-tech text-[#F3EFE6] uppercase font-bold rounded"
                >
                  {isCheckingPincode ? 'Checking...' : 'Check'}
                </button>
              </form>

              {pincodeResult && pincodeResult.deliverable && (
                <div className="text-xs text-emerald-400 space-y-0.5 pt-1">
                  <div className="font-semibold">✓ Delivery available in ~{pincodeResult.estDays} business days</div>
                  <div className="text-[11px] text-[#8C857A]">
                    Cash on Delivery (COD) & Razorpay Online payment both supported for {pincode}.
                  </div>
                </div>
              )}
            </div>

            {/* In the Box list */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-mono-tech uppercase tracking-wider text-[#F3EFE6] font-bold flex items-center gap-2">
                <Package size={14} className="text-[#D91E18]" />
                What's Inside The Box
              </div>
              <div className="space-y-2">
                {boxContents.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-[#8C857A]">
                    <Check size={14} className="text-[#D91E18] shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Hardware Views */}
        <PedalPhotoGallery />

        {/* Tone Audition */}
        <SoundDemoSection />

        {/* Controls Guide */}
        <ControlsOverview />

        {/* Tech Specs */}
        <Specifications />
      </div>

      {/* ================= MOBILE STICKY PURCHASE BAR ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0B0A]/95 border-t border-[#8C857A]/30 p-3 sm:hidden backdrop-blur-lg flex items-center justify-between gap-3 shadow-2xl">
        <div>
          <div className="text-xs font-bold text-[#F3EFE6] uppercase">Neon Fuzz Box</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-black text-[#F3EFE6] font-mono-tech">₹2,499</span>
            <span className="text-[10px] text-[#8C857A] line-through">₹3,499</span>
          </div>
        </div>

        <button
          onClick={handleBuyNow}
          className="px-5 py-3 bg-[#D91E18] text-white text-xs font-mono-tech font-bold uppercase rounded flex items-center gap-1.5 shadow-lg shadow-[#D91E18]/30"
        >
          Buy Now
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
