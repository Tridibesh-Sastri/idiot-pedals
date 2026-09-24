import React from 'react';
import { HeroFullscreenScrub } from '../components/HeroFullscreenScrub';
import { SoundDemoSection } from '../components/pedal/SoundDemoSection';
import { PedalPhotoGallery } from '../components/pedal/PedalPhotoGallery';
import { ControlsOverview } from '../components/pedal/ControlsOverview';
import { Specifications } from '../components/pedal/Specifications';
// Keep ExplodedView in the code as requested
import { ExplodedView as _ExplodedView } from '../components/ExplodedView';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { addItem } = useCart();
  const { showToast } = useToast();

  const handleQuickAdd = () => {
    addItem();
    showToast('Neon Fuzz Box added to workbench cart!');
  };

  return (
    <div className="bg-[#0B0E14] text-[#F6F4EE]">
      {/* ================= STATIC HERO ================= */}
      <HeroFullscreenScrub />

      {/* ================= HARDWARE SHOWCASE GALLERY ================= */}
      <div className="relative z-10 bg-[#0B0E14]">
        <PedalPhotoGallery />
      </div>

      {/* ================= AUDIO TEST BENCH ================= */}
      <div id="demo" className="relative z-10 bg-[#0B0E14]">
        <SoundDemoSection />
      </div>

      {/* ================= CONTROLS BREAKDOWN ================= */}
      <div className="relative z-10 bg-[#0B0E14]">
        <ControlsOverview />
      </div>

      {/* ================= SPECIFICATIONS DATA SHEET ================= */}
      <div className="relative z-10 bg-[#0B0E14]">
        <Specifications />
      </div>

      {/* ================= MANIFESTO / WORKSHOP TEASER ================= */}
      <section className="py-28 bg-[#0E131C] border-t border-white/10 relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#FF5E1E]/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          
          <div className="flex items-center justify-center gap-3 text-xs font-mono-tech tracking-[0.3em] text-[#FF5E1E] uppercase">
            <span className="w-8 h-px bg-[#FF5E1E]" />
            <span>BURDWAN WORKBENCH</span>
            <span className="w-8 h-px bg-[#FF5E1E]" />
          </div>

          <h2 className="text-4xl sm:text-6xl font-editorial tracking-tight text-[#F6F4EE]">
            Hand-wired for tone purists who refuse the boutique tax.
          </h2>

          <p className="max-w-2xl mx-auto text-[#8E98A8] text-base sm:text-lg font-sans leading-relaxed">
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
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-[#F6F4EE] border border-white/15 text-xs font-mono-tech tracking-[0.2em] uppercase rounded-full transition-all flex items-center gap-2"
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
