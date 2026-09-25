import React from 'react';
import { ArrowRight, ShieldCheck, Truck, Zap } from 'lucide-react';
// NOTE: Audition/Tone-Demo entry kept in code but hidden (Volume2 icon + #demo link removed from UI).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Volume2 as _Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

void _Volume2;

interface HeroFullscreenScrubProps {
  onTransitionStateChange?: (isMidTransition: boolean, isCompleted: boolean) => void;
}

export function HeroFullscreenScrub({ onTransitionStateChange: _ }: HeroFullscreenScrubProps) {
  const { addItem, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  const handleQuickAdd = () => {
    // Direct checkout flow: add to cart silently, skip Workbench Cart drawer
    addItem();
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <section id="hero" className="relative w-full overflow-hidden" style={{ height: '100dvh' }}>
      {/* ── High-Resolution Background Image ── */}
      <img
        src="/frames/web/frame_0001.webp"
        alt="Idiot Pedals Neon Fuzz Box"
        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
        draggable={false}
        fetchPriority="high"
      />

      {/* ── Desktop: Left subtle studio scrim for high readability ── */}
      <div className="hidden lg:block absolute inset-y-0 left-0 w-[55%] pointer-events-none bg-gradient-to-r from-[#FAF9F6]/95 via-[#FAF9F6]/75 to-transparent" />

      {/* ═══════════════ DESKTOP EDITORIAL LAYOUT ═══════════════ */}
      <div className="hidden lg:flex absolute inset-0 z-20 flex-col justify-center px-12 lg:px-20 pt-24 pb-12 pointer-events-none">
        <div className="max-w-7xl mx-auto w-full flex justify-start">
          <div className="w-[48%] xl:w-[44%] space-y-6 lg:space-y-7">
            <div className="inline-flex items-center gap-2 text-xs font-mono-tech tracking-widest uppercase text-[#FF5E1E] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#FF5E1E]" />
              <span>CHEAPER. CLASSIC SOUND.</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-5xl lg:text-[4.5rem] font-editorial tracking-tight uppercase leading-[0.90] text-[#0B0E14]">
                Simple Sounds.<br />
                <span className="italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] via-[#FF5E1E] to-[#FF3E00]">
                  Serious Vibes.
                </span>
              </h1>
              <p className="max-w-md text-base font-sans text-[#475569] font-normal leading-relaxed pt-1">
                Handcrafted analog guitar pedals for real players. Classic vintage harmonic saturation. Zero boutique hype tax.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-extrabold text-[#FF5E1E] font-mono-tech tracking-tight">₹2,499</span>
                <span className="text-lg text-[#94A3B8] line-through font-mono-tech font-medium">₹3,499</span>
                <span className="text-xs font-bold text-white bg-[#FF5E1E] px-3 py-1 rounded-full font-mono-tech shadow-md shadow-[#FF5E1E]/30">
                  Save ₹1,000 Direct
                </span>
              </div>
              <div className="text-xs text-[#475569] flex items-center gap-2 font-mono-tech font-medium">
                <span className="w-2 h-2 rounded-full bg-[#FF5E1E]" />
                <span>Workbench Batch 04 · Ships in 24h</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 pointer-events-auto">
              <button
                onClick={handleQuickAdd}
                className="px-8 py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-sm font-mono-tech font-bold tracking-[0.2em] uppercase rounded-full flex items-center gap-2.5 transition-all shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange group cursor-pointer"
              >
                <span>Buy Neon Fuzz Box</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
              {/*
                HIDDEN FROM WEBSITE (kept in code): Tone Demo entry.
                <a href="#demo" className="...">
                  <_Volume2 size={14} ... />
                  <span>Audition Tone</span>
                </a>
              */}
            </div>

            <div className="flex items-center gap-6 pt-2 text-xs font-mono-tech text-[#64748B] font-medium">
              <div className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#FF5E1E]" /><span>1-Yr Warranty</span></div>
              <div className="flex items-center gap-1.5"><Truck size={14} className="text-[#FF5E1E]" /><span>Free Shipping</span></div>
              <div className="flex items-center gap-1.5"><Zap size={14} className="text-[#FF5E1E]" /><span>True-Bypass</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ MOBILE EDITORIAL LAYOUT ═══════════════ */}
      <div className="lg:hidden absolute inset-0 z-20 flex flex-col justify-between pt-24 pb-5 px-5 pointer-events-none select-none">
        {/* TOP: Headline below the navbar */}
        <div className="shrink-0 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5E1E]" />
            <span className="text-[10px] font-mono-tech font-bold tracking-[0.2em] uppercase text-[#FF5E1E]">
              IDIOT PEDALS — BURDWAN
            </span>
          </div>

          <h1
            className="font-editorial tracking-tight uppercase leading-[0.9] text-white"
            style={{
              fontSize: 'clamp(2rem, 8.5vw, 2.6rem)',
              textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)',
            }}
          >
            Simple Sounds.<br />
            <span
              className="italic font-normal"
              style={{
                WebkitTextFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                backgroundImage: 'linear-gradient(to right, #FF7A00, #FF5E1E, #FF3E00)',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 2px 10px rgba(255,94,30,0.8))',
              }}
            >
              Serious Vibes.
            </span>
          </h1>

          <p
            className="text-[12px] font-sans font-medium leading-snug text-white/90 pt-0.5"
            style={{ textShadow: '0 1px 12px rgba(0,0,0,0.8)', maxWidth: '280px' }}
          >
            Handcrafted analog guitar pedals.<br />
            Classic vintage harmonic saturation.
          </p>
        </div>

        {/* MIDDLE: spacing */}
        <div className="flex-1 min-h-0" />

        {/* BOTTOM: Pricing & CTA Controls */}
        <div className="shrink-0 pointer-events-auto space-y-2.5">
          {/* Price strip */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span
                className="font-black font-mono-tech tracking-tight text-[#FF5E1E] leading-none"
                style={{ fontSize: 'clamp(2rem, 9vw, 2.5rem)', textShadow: '0 0 25px rgba(255,94,30,0.5)' }}
              >
                ₹2,499
              </span>
              <span
                className="text-sm font-mono-tech font-medium line-through text-white/60"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}
              >
                ₹3,499
              </span>
            </div>
            <span className="text-[11px] font-mono-tech font-extrabold text-white bg-[#FF5E1E] px-3 py-1 rounded-full shadow-lg shadow-[#FF5E1E]/40">
              Save ₹1,000
            </span>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={handleQuickAdd}
              className="py-[14px] bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white text-[13px] font-mono-tech font-black tracking-[0.1em] uppercase rounded-xl shadow-[0_4px_24px_rgba(255,94,30,0.55)] flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
            >
              <span>Buy Now</span>
              <ArrowRight size={14} />
            </button>
            {/*
              HIDDEN FROM WEBSITE (kept in code): Tone Demo / Audition entry.
              <a href="#demo" className="...">
                <_Volume2 size={13} ... />
                <span>Audition</span>
              </a>
            */}
          </div>

          {/* Guarantee strip */}
          <div className="flex items-center justify-center gap-2.5 py-0.5">
            <span
              className="text-[10px] font-mono-tech font-bold text-white/80"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
            >
              1-Yr Warranty
            </span>
            <span className="w-1 h-1 rounded-full bg-[#FF5E1E]" />
            <span
              className="text-[10px] font-mono-tech font-bold text-white/80"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
            >
              Free Shipping
            </span>
            <span className="w-1 h-1 rounded-full bg-[#FF5E1E]" />
            <span
              className="text-[10px] font-mono-tech font-bold text-white/80"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
            >
              True-Bypass
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
