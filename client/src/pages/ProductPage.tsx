import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Truck,
  Check,
  Package,
  MapPin,
  Flame,
  Zap,
} from 'lucide-react';
import { useCart, NEON_FUZZ_BOX } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { shippingService } from '../services/shippingService';
import { SoundDemoSection } from '../components/pedal/SoundDemoSection';
import { ControlsOverview } from '../components/pedal/ControlsOverview';
import { Specifications } from '../components/pedal/Specifications';
import { PedalPhotoGallery } from '../components/pedal/PedalPhotoGallery';

export const ProductPage: React.FC = () => {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState<{
    deliverable: boolean;
    estDays: number;
    codAvailable: boolean;
  } | null>(null);
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);

  const handleAddToCart = () => {
    addItem(NEON_FUZZ_BOX, quantity);
    showToast(`Added ${quantity} Neon Fuzz Box to your workbench cart!`);
  };

  const handleBuyNow = () => {
    addItem(NEON_FUZZ_BOX, quantity);
    navigate('/checkout');
  };

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
    '1× IDIOT Pedals Vinyl Case Decal',
    'Quick-Start Dial Guide with Sweet-Spot Settings',
  ];

  return (
    <div className="bg-[#0B0E14] text-[#F6F4EE] pt-28 pb-20 overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-20 right-10 w-[600px] h-[600px] bg-[#FF5E1E]/5 blur-[170px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Product Purchase Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start py-8">
          
          {/* Left Column: Visual Showcase Card */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#121722]/80 border border-white/10 rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center relative shadow-2xl min-h-[500px] backdrop-blur-xl glow-neon-subtle">
              
              {/* Authentic Physical Pedal Enclosure Card */}
              <div className="relative my-4">
                <div className="w-60 sm:w-72 bg-[#161C28] text-[#F6F4EE] rounded-3xl p-6 shadow-2xl border border-white/15 flex flex-col justify-between h-[420px] select-none relative">
                  
                  {/* Screws */}
                  <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-400" />
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-400" />
                  <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-400" />
                  <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-400" />

                  {/* Knobs Section */}
                  <div className="flex justify-between items-center px-1 pt-1">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#0B0E14] border-2 border-zinc-700 shadow-lg relative flex items-center justify-center">
                        <div className="w-1 h-4 bg-[#FF5E1E] rounded-full absolute top-1 -rotate-45 shadow-[0_0_6px_#FF5E1E]" />
                        <div className="w-4 h-4 rounded-full bg-zinc-800" />
                      </div>
                      <span className="text-[10px] font-mono-tech font-bold tracking-widest text-[#FF5E1E] uppercase mt-2">
                        GAIN
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#0B0E14] border-2 border-zinc-700 shadow-lg relative flex items-center justify-center">
                        <div className="w-1 h-4 bg-amber-400 rounded-full absolute top-1 rotate-15 shadow-[0_0_6px_#f59e0b]" />
                        <div className="w-4 h-4 rounded-full bg-zinc-800" />
                      </div>
                      <span className="text-[10px] font-mono-tech font-bold tracking-widest text-amber-400 uppercase mt-2">
                        TONE
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#0B0E14] border-2 border-zinc-700 shadow-lg relative flex items-center justify-center">
                        <div className="w-1 h-4 bg-[#FF7A00] rounded-full absolute top-1 rotate-45 shadow-[0_0_6px_#FF7A00]" />
                        <div className="w-4 h-4 rounded-full bg-zinc-800" />
                      </div>
                      <span className="text-[10px] font-mono-tech font-bold tracking-widest text-[#FF7A00] uppercase mt-2">
                        VOL
                      </span>
                    </div>
                  </div>

                  {/* Brand Typography Center */}
                  <div className="text-center my-auto flex flex-col items-center justify-center">
                    <div className="text-4xl sm:text-5xl font-editorial font-black tracking-wider text-[#F6F4EE] leading-none uppercase">
                      IDIOT
                    </div>
                    <div className="text-3xl sm:text-4xl font-script font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-[#FF4500] -mt-1 -rotate-4 tracking-wide">
                      Pedals
                    </div>
                    <div className="text-[8px] font-mono-tech font-bold tracking-[0.25em] text-[#8E98A8] uppercase mt-1">
                      NEON FUZZ BOX
                    </div>
                  </div>

                  {/* LED & Switch Bottom */}
                  <div className="flex items-center justify-between px-2 pt-2 border-t border-white/10">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-[#FF5E1E] shadow-[0_0_16px_#FF5E1E] border border-red-950 relative">
                        <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full opacity-90" />
                      </div>
                      <span className="text-[7px] font-mono-tech font-bold text-[#8E98A8] uppercase">
                        ACTIVE
                      </span>
                    </div>

                    <div className="w-14 h-14 rounded-full border-4 border-zinc-700 bg-zinc-800 flex items-center justify-center shadow-inner">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-zinc-400 via-zinc-200 to-zinc-300 border-2 border-zinc-400 flex items-center justify-center shadow-md">
                        <div className="w-6 h-6 rounded-full bg-zinc-300 border border-zinc-500 shadow-inner" />
                      </div>
                    </div>

                    <div className="w-6" />
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-[#8E98A8] font-mono-tech uppercase tracking-widest mt-4">
                Matte Obsidian Chassis • 1590B Enclosure • 1/4" Mono In/Out
              </div>
            </div>
          </div>

          {/* Right Column: Purchasing Decisions, Options & Buy Buttons */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 bg-[#161C28] border border-[#FF5E1E]/30 text-xs font-mono-tech uppercase tracking-widest text-[#FF5E1E] font-bold rounded-full">
                  FLAGSHIP ANALOG FUZZ
                </span>
                <span className="text-xs text-emerald-400 font-mono-tech flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Batch 04 Ready
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-editorial font-normal tracking-tight text-[#F6F4EE] uppercase leading-tight">
                Neon Fuzz Box
              </h1>

              <p className="text-xs sm:text-sm text-[#8E98A8] leading-relaxed font-light">
                A dual-stage hybrid vintage fuzz engineered for uncompromising guitarists. Dial in anything from warm organic tube break-up to roaring, thick, wall-of-sound harmonic saturation.
              </p>
            </div>

            {/* Pricing Section */}
            <div className="p-5 bg-[#121722]/80 border border-white/10 rounded-2xl space-y-2 backdrop-blur-xl">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono-tech text-[#F6F4EE]">
                  ₹2,499
                </span>
                <span className="text-base text-[#8E98A8] line-through font-mono-tech">
                  ₹3,499
                </span>
                <span className="text-xs font-bold text-[#FF5E1E] bg-[#FF5E1E]/15 px-2.5 py-1 rounded-full border border-[#FF5E1E]/30">
                  Save ₹1,000 (28% Off)
                </span>
              </div>
              <div className="text-xs font-mono-tech text-[#8E98A8] flex items-center gap-2 pt-2 border-t border-white/10">
                <span>Inclusive of all taxes</span>
                <span className="text-[#FF5E1E]">•</span>
                <span className="text-[#F6F4EE]">Free Doorstep Delivery Across India</span>
              </div>
            </div>

            {/* Quantity Selector & Action Buttons */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-xs font-mono-tech uppercase tracking-widest text-[#8E98A8]">
                  Quantity:
                </label>
                <div className="flex items-center border border-white/15 rounded-full bg-[#121722] px-2 py-0.5">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-2.5 py-1 text-xs text-[#8E98A8] hover:text-white cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3 text-xs font-bold font-mono-tech text-[#F6F4EE]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-2.5 py-1 text-xs text-[#8E98A8] hover:text-white cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  className="w-full py-4 bg-[#121722] hover:bg-[#161C28] text-[#F6F4EE] border border-white/15 hover:border-[#FF5E1E]/50 text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ShoppingBag size={15} className="text-[#FF5E1E]" />
                  <span>Add to Cart</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange cursor-pointer"
                >
                  <span>Buy Now — ₹{(2499 * quantity).toLocaleString()}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Pincode Deliverability Check */}
            <div className="p-5 bg-[#121722]/80 border border-white/10 rounded-2xl space-y-3 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-mono-tech text-[#F6F4EE] uppercase font-bold tracking-wider">
                <MapPin size={14} className="text-[#FF5E1E]" />
                Estimate Delivery Date
              </div>

              <form onSubmit={handleCheckPincode} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit PIN code"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-[#0B0E14] border border-white/15 rounded-full px-4 py-2.5 text-xs text-[#F6F4EE] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
                <button
                  type="submit"
                  disabled={isCheckingPincode}
                  className="px-5 py-2.5 bg-[#161C28] hover:bg-[#1A2232] border border-white/15 text-xs font-mono-tech text-[#F6F4EE] uppercase font-bold rounded-full cursor-pointer transition-all"
                >
                  {isCheckingPincode ? 'Checking...' : 'Check'}
                </button>
              </form>

              {pincodeResult && pincodeResult.deliverable && (
                <div className="text-xs font-mono-tech text-emerald-400 space-y-0.5 pt-1">
                  <div className="font-semibold">✓ Delivery available in ~{pincodeResult.estDays} business days</div>
                  <div className="text-[11px] text-[#8E98A8]">
                    Cash on Delivery (COD) & Razorpay Online payment both supported for {pincode}.
                  </div>
                </div>
              )}
            </div>

            {/* In the Box list */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-mono-tech uppercase tracking-wider text-[#F6F4EE] font-bold flex items-center gap-2">
                <Package size={14} className="text-[#FF5E1E]" />
                What's Inside The Box
              </div>
              <div className="space-y-2">
                {boxContents.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs font-mono-tech text-[#8E98A8]">
                    <Check size={14} className="text-[#FF5E1E] shrink-0" />
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
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0E14]/95 border-t border-white/10 p-3 sm:hidden backdrop-blur-2xl flex items-center justify-between gap-3 shadow-2xl">
        <div>
          <div className="text-xs font-bold font-mono-tech text-[#F6F4EE] uppercase">Neon Fuzz Box</div>
          <div className="flex items-baseline gap-1.5 font-mono-tech">
            <span className="text-base font-extrabold text-[#F6F4EE]">₹2,499</span>
            <span className="text-[10px] text-[#8E98A8] line-through">₹3,499</span>
          </div>
        </div>

        <button
          onClick={handleBuyNow}
          className="px-6 py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center gap-1.5 shadow-lg shadow-[#FF5E1E]/30"
        >
          <span>Buy Now</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
