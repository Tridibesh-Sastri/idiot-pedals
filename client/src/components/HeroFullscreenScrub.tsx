import React from 'react';
import { ArrowRight } from 'lucide-react';
// NOTE: Audition/Tone-Demo entry kept in code but hidden (Volume2 icon + #demo link removed from UI).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Volume2 as _Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNeonFuzzBox } from '../hooks/useNeonFuzzBox';

void _Volume2;

interface HeroFullscreenScrubProps {
  onTransitionStateChange?: (isMidTransition: boolean, isCompleted: boolean) => void;
}

export function HeroFullscreenScrub({ onTransitionStateChange: _ }: HeroFullscreenScrubProps) {
  // Catalogue-driven price. No cart line is invented here.
  const { priceLabel, compareAtLabel, savingsLabel } = useNeonFuzzBox();
  const navigate = useNavigate();

  /**
   * Sends the visitor to the shop listing to browse. It deliberately does not
   * touch the cart and does not jump to a specific product: this is a
   * "browse the shop" entry point, not a purchase action.
   */
  const handleQuickAdd = () => navigate('/products');

  return (
    <section id="hero" className="relative w-full overflow-hidden" style={{ height: '100dvh' }}>
      {/* ── High-Resolution Background Image (Responsive Picture) ── */}
      <picture className="absolute inset-0 w-full h-full select-none pointer-events-none">
        <source media="(max-width: 1023px)" srcSet="/frames/mobile/image.webp" />
        <img
          src="/frames/web/frame_0001.webp"
          alt="Idiot Pedals Neon Fuzz Box"
          className="w-full h-full object-cover object-center select-none pointer-events-none"
          draggable={false}
          fetchPriority="high"
        />
      </picture>

      {/* ── Desktop: Left subtle studio scrim for high readability ── */}
      <div className="hidden lg:block absolute inset-y-0 left-0 w-[55%] pointer-events-none bg-gradient-to-r from-[#FAF9F6]/95 via-[#FAF9F6]/75 to-transparent" />

      {/* ── Mobile: Subtle edge scrims only (pedal in the center is 100% clean and unwashed) ── */}
      <div className="lg:hidden absolute top-0 inset-x-0 h-40 pointer-events-none bg-gradient-to-b from-[#FAF9F6]/90 via-[#FAF9F6]/40 to-transparent" />
      <div className="lg:hidden absolute bottom-0 inset-x-0 h-52 pointer-events-none bg-gradient-to-t from-[#FAF9F6]/65 via-[#FAF9F6]/50 to-transparent" />

      {/* ═══════════════ DESKTOP EDITORIAL LAYOUT ═══════════════ */}
      <div className="hidden lg:flex absolute inset-0 z-20 flex-col justify-center px-12 lg:px-20 pt-24 pb-12 pointer-events-none">
        <div className="max-w-7xl mx-auto w-full flex justify-start">
          <div className="w-[48%] xl:w-[44%] space-y-6 lg:space-y-7">
            <div className="inline-flex items-center gap-2 text-xs font-mono-tech tracking-widest uppercase text-[#FF5E1E] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#FF5E1E]" />
              <span>Distortion Pedal Electric Guitar</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-5xl lg:text-[4.5rem] font-editorial tracking-tight uppercase leading-[0.90] text-[#0B0E14]">
                Idiot Pedals.<br />
                <span className="italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] via-[#FF5E1E] to-[#FF3E00]">
                  Distortion One.
                </span>
              </h1>
              <p className="max-w-md text-base font-sans text-[#475569] font-normal leading-relaxed pt-1">
                Handmade Guitar Pedal
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {priceLabel && (
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-extrabold text-[#FF5E1E] font-mono-tech tracking-tight">₹{priceLabel}</span>
                  {compareAtLabel && (
                    <span className="text-lg text-[#94A3B8] line-through font-mono-tech font-medium">₹{compareAtLabel}</span>
                  )}
                  {savingsLabel && (
                    <span className="text-xs font-bold text-white bg-[#FF5E1E] px-3 py-1 rounded-full font-mono-tech shadow-md shadow-[#FF5E1E]/30">
                      Save ₹{savingsLabel} Direct
                    </span>
                  )}
                </div>
              )}
              {priceLabel && (
                <div className="text-xs text-[#475569] flex items-center gap-2 font-mono-tech font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#FF5E1E]" />
                  <span>Ships in 24h</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2 pointer-events-auto">
              <button
                onClick={handleQuickAdd}
                className="px-8 py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-sm font-mono-tech font-bold tracking-[0.2em] uppercase rounded-full flex items-center gap-2.5 transition-all shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange group cursor-pointer"
              >
                <span>Buy Now</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ═══════════════ MOBILE EDITORIAL LAYOUT ═══════════════ */}
      <div className="lg:hidden absolute inset-0 z-20 flex flex-col justify-between pt-24 pb-6 px-5 pointer-events-none select-none">
        {/* TOP: Headline below the navbar */}
        <div className="shrink-0 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF5E1E]/10 border border-[#FF5E1E]/20 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5E1E]" />
            <span className="text-[10px] font-mono-tech font-bold tracking-[0.2em] uppercase text-[#FF5E1E]">
              Distortion Pedal Electric Guitar
            </span>
          </div>

          <h1
            className="font-editorial tracking-tight uppercase leading-[0.9] text-[#0B0E14]"
            style={{
              fontSize: 'clamp(2.1rem, 8.5vw, 2.6rem)',
            }}
          >
            Idiot Pedals.<br />
            <span
              className="italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] via-[#FF5E1E] to-[#FF3E00]"
            >
              Distortion One.
            </span>
          </h1>

          <p
            className="text-[12px] font-sans font-normal leading-snug text-[#475569] pt-0.5"
            style={{ maxWidth: '280px' }}
          >
            Handmade Guitar Pedal
          </p>
        </div>

        {/* MIDDLE: spacing */}
        <div className="flex-1 min-h-0" />

        {/* BOTTOM: Pricing & CTA Controls */}
        <div className="shrink-0 pointer-events-auto space-y-2.5">
          {/* Price strip — original layout, fed by the catalogue */}
          {priceLabel && (
            <div className="relative flex items-center justify-between py-1">
              {/* Soft studio white feather like web behind the price area */}
              <div className="absolute -left-5 -right-5 -top-2.5 -bottom-2.5 bg-gradient-to-r from-[#FAF9F6]/65 via-[#FAF9F6]/55 to-transparent pointer-events-none -z-10 blur-[3px]" />

              <div className="flex items-baseline gap-2 relative z-10">
                <span
                  className="font-extrabold font-mono-tech tracking-tight text-[#FF5E1E] leading-none"
                  style={{ fontSize: 'clamp(2rem, 9vw, 2.5rem)' }}
                >
                  ₹{priceLabel}
                </span>
                {compareAtLabel && (
                  <span
                    className="text-sm font-mono-tech font-medium line-through text-[#94A3B8]"
                  >
                    ₹{compareAtLabel}
                  </span>
                )}
              </div>
              {savingsLabel && (
                <span className="text-[11px] font-mono-tech font-bold text-white bg-[#FF5E1E] px-3 py-1 rounded-full shadow-md shadow-[#FF5E1E]/30 relative z-10">
                  Save ₹{savingsLabel} Direct
                </span>
              )}
            </div>
          )}

          {/* Same restored element, for the mobile price row above. */}
          {priceLabel && (
            <div className="text-xs text-[#475569] flex items-center gap-2 font-mono-tech font-medium">
              <span className="w-2 h-2 rounded-full bg-[#FF5E1E]" />
              <span>Ships in 24h</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={handleQuickAdd}
              className="py-[14px] bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-[13px] font-mono-tech font-bold tracking-[0.15em] uppercase rounded-full shadow-xl shadow-[#FF5E1E]/30 flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
            >
              <span>Buy Now</span>
              <ArrowRight size={14} />
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
