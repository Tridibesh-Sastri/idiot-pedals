import React from 'react';
import { HeroFullscreenScrub } from '../components/HeroFullscreenScrub';
// NOTE (hidden 2026-09-25): Product + Tone Demo sections kept in code but hidden from website.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SoundDemoSection as _SoundDemoSection } from '../components/pedal/SoundDemoSection';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PedalPhotoGallery as _PedalPhotoGallery } from '../components/pedal/PedalPhotoGallery';
import { ControlsOverview } from '../components/pedal/ControlsOverview';
import { Specifications } from '../components/pedal/Specifications';
// Keep ExplodedView in the code as requested
import { ExplodedView as _ExplodedView } from '../components/ExplodedView';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Keep hidden-section references so imports stay in code without rendering
void _SoundDemoSection;
void _PedalPhotoGallery;
void _ExplodedView;

export const HomePage: React.FC = () => {
  const { addItem, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  const handleQuickAdd = () => {
    // Direct checkout flow: add to cart silently, skip Workbench Cart drawer
    addItem();
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="bg-[#FFF8F1] text-[#2A1A12]">
      {/* ================= STATIC HERO ================= */}
      <HeroFullscreenScrub />

      {/*
        HIDDEN FROM WEBSITE (kept in code):
        - <PedalPhotoGallery />  (Product / Hardware Showcase Gallery)
        - <SoundDemoSection />   (Tone Demo / Audio Test Bench)
        Uncomment below to restore them on the landing page.
      */}
      {/* <div className="relative z-10 bg-[#0B0E14]">
        <_PedalPhotoGallery />
      </div> */}

      {/* <div id="demo" className="relative z-10 bg-[#0B0E14]">
        <_SoundDemoSection />
      </div> */}

      {/* ================= CONTROLS BREAKDOWN ================= */}
      <div id="controls" className="relative z-10 bg-[#FFF8F1] scroll-mt-28">
        <ControlsOverview />
      </div>

      {/* ================= SPECIFICATIONS DATA SHEET ================= */}
      <div className="relative z-10 bg-[#FFF8F1]">
        <Specifications />
      </div>

      {/* ================= MANIFESTO / WORKSHOP TEASER ================= */}
      <section id="workshop" className="py-28 bg-white border-t border-[#F0D3B8] relative overflow-hidden scroll-mt-28">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#FF5E1E]/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          
          <div className="flex items-center justify-center gap-3 text-xs font-mono-tech tracking-[0.3em] text-[#FF5E1E] uppercase">
            <span className="w-8 h-px bg-[#FF5E1E]" />
            <span>BURDWAN WORKBENCH</span>
            <span className="w-8 h-px bg-[#FF5E1E]" />
          </div>

          <h2 className="text-4xl sm:text-6xl font-editorial tracking-tight text-[#2A1A12]">
            Hand-wired for tone purists who refuse the boutique tax.
          </h2>

          <p className="max-w-2xl mx-auto text-[#8A6A54] text-base sm:text-lg font-sans leading-relaxed">
            Every IDIOT pedal is hand-soldered, individually biased, and spectrum-tested in small batches of 25 units. Built to survive tour vans and bedroom jam sessions alike.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleQuickAdd}
              className="px-8 py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold tracking-[0.2em] uppercase rounded-full shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange transition-all cursor-pointer"
            >
              Order Neon Fuzz Box — ₹2,499
            </button>
            <Link
              to="/about"
              className="px-8 py-4 bg-[#FFF1E6] hover:bg-[#FFE8D3] text-[#2A1A12] border border-[#F0D3B8] text-xs font-mono-tech tracking-[0.2em] uppercase rounded-full transition-all flex items-center gap-2"
            >
              <span>Our Workshop Story</span>
              <ArrowRight size={14} className="text-[#FF5E1E]" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
