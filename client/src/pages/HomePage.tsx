import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Volume2, ShieldCheck, Truck, Zap, Flame, CheckCircle2 } from 'lucide-react';
import { PedalModel } from '../components/PedalModel';
import { SoundDemoSection } from '../components/pedal/SoundDemoSection';
import { PedalPhotoGallery } from '../components/pedal/PedalPhotoGallery';
import { ControlsOverview } from '../components/pedal/ControlsOverview';
import { Specifications } from '../components/pedal/Specifications';
import { ExplodedView } from '../components/ExplodedView';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export const HomePage: React.FC = () => {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [isPedalEngaged, setIsPedalEngaged] = useState(true);

  const handleQuickAdd = () => {
    addItem();
    showToast('Neon Fuzz Box added to workbench cart!');
  };

  return (
    <div className="bg-[#0B0B0A] text-[#F3EFE6] overflow-x-hidden">
      {/* ================= HERO SECTION ================= */}
      <section className="relative min-h-[92vh] flex items-center justify-center pt-24 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle Ambient Workshop Lighting */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-[#D91E18]/10 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-20 right-10 w-96 h-96 bg-[#5A3A27]/15 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Column: Headlines & CTA */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left pt-6 sm:pt-0">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171513] border border-[#8C857A]/30 text-xs font-mono-tech tracking-widest uppercase text-[#F3EFE6]">
              <Flame size={14} className="text-[#D91E18]" />
              CHEAPER. CLASSIC SOUND.
            </div>

            {/* Main Headline */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-cinzel font-black tracking-tight text-[#F3EFE6] uppercase leading-[1.05]">
                Simple Sounds.<br />
                <span className="text-[#D91E18]">Serious Vibes.</span>
              </h1>
              <p className="text-base sm:text-xl text-[#8C857A] font-medium max-w-xl mx-auto lg:mx-0 pt-2 leading-relaxed">
                Handcrafted analog guitar pedals for real players. Classic vintage harmonic saturation. Zero boutique hype tax.
              </p>
            </div>

            {/* Launch Pricing & Stock Info */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-[#F3EFE6] font-mono-tech">
                  ₹2,499
                </span>
                <span className="text-sm sm:text-base text-[#8C857A] line-through font-mono-tech">
                  ₹3,499
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  Save ₹1,000 Direct
                </span>
              </div>
              <div className="h-4 w-[1px] bg-[#8C857A]/40 hidden sm:block" />
              <div className="text-xs text-[#8C857A] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Workbench Batch 04 In Stock — Ships in 24h</span>
              </div>
            </div>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <button
                onClick={handleQuickAdd}
                className="w-full sm:w-auto px-8 py-4 bg-[#D91E18] hover:bg-[#b51712] text-white text-xs sm:text-sm font-bold tracking-widest uppercase rounded flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#D91E18]/30 group"
              >
                Buy Neon Fuzz Box
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#demo"
                className="w-full sm:w-auto px-7 py-4 bg-[#171513] hover:bg-[#0B0B0A] text-[#F3EFE6] border border-[#8C857A]/30 hover:border-[#8C857A]/60 text-xs sm:text-sm font-bold tracking-widest uppercase rounded flex items-center justify-center gap-2 transition-colors"
              >
                <Volume2 size={16} className="text-[#D91E18]" />
                Audition Tone
              </a>
            </div>

            {/* Reassurance Micro-Copy */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#8C857A]/15 text-[11px] sm:text-xs text-[#8C857A]">
              <div className="flex items-center gap-1.5 justify-center lg:justify-start">
                <ShieldCheck size={14} className="text-[#D91E18] shrink-0" />
                <span>1-Yr Warranty</span>
              </div>
              <div className="flex items-center gap-1.5 justify-center lg:justify-start">
                <Truck size={14} className="text-[#D91E18] shrink-0" />
                <span>Free Shipping</span>
              </div>
              <div className="flex items-center gap-1.5 justify-center lg:justify-start">
                <Zap size={14} className="text-[#D91E18] shrink-0" />
                <span>True-Bypass</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 3D Ivory Pedal Model */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative perspective-1000 py-6">
            <div className="relative flex items-center justify-center">
              <PedalModel
                rotationX={55}
                rotationZ={-20}
                rotationY={-5}
                scale={1.05}
                isEngaged={isPedalEngaged}
                onToggleEngage={() => setIsPedalEngaged(!isPedalEngaged)}
                interactive={true}
              />
            </div>

            {/* Click to stomp prompt */}
            <button
              onClick={() => setIsPedalEngaged(!isPedalEngaged)}
              className="mt-8 px-4 py-2 rounded-full bg-[#171513]/80 border border-[#8C857A]/30 text-xs font-mono-tech text-[#8C857A] hover:text-white transition-colors flex items-center gap-2"
            >
              <span className={`w-2 h-2 rounded-full ${isPedalEngaged ? 'bg-[#D91E18] shadow-[0_0_6px_#D91E18]' : 'bg-zinc-700'}`} />
              <span>Tap footswitch to engage / bypass LED</span>
            </button>
          </div>
        </div>
      </section>

      {/* ================= HARDWARE SHOWCASE GALLERY ================= */}
      <PedalPhotoGallery />

      {/* ================= AUDIO TEST BENCH ================= */}
      <SoundDemoSection />

      {/* ================= CONTROLS BREAKDOWN ================= */}
      <ControlsOverview />

      {/* ================= EXPLODED INTERNAL VIEW ================= */}
      <ExplodedView />

      {/* ================= SPECIFICATIONS DATA SHEET ================= */}
      <Specifications />

      {/* ================= MANIFESTO / WORKSHOP TEASER ================= */}
      <section className="py-24 bg-[#171513] border-t border-[#8C857A]/20 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="w-16 h-1 bg-[#D91E18] mx-auto rounded-full" />
          <h2 className="text-3xl sm:text-5xl font-cinzel font-black tracking-tight text-[#F3EFE6] max-w-3xl mx-auto leading-tight">
            "We’d Rather You Spend Your Money On Strings, Gas, And Road Trips."
          </h2>
          <p className="text-sm sm:text-base text-[#8C857A] max-w-2xl mx-auto leading-relaxed">
            The pedal industry got hijacked by boutique hype. $300 pedals inside identical Hammond boxes with fancy silkscreens. We make straight-shooting, rock-ready pedals that deliver legendary tone without emptying your pockets.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/about"
              className="px-6 py-3.5 bg-[#0B0B0A] hover:bg-[#171513] text-[#F3EFE6] border border-[#8C857A]/40 text-xs font-mono-tech font-bold uppercase rounded tracking-wider"
            >
              Read Our Workbench Story
            </Link>
            <button
              onClick={handleQuickAdd}
              className="px-8 py-3.5 bg-[#D91E18] hover:bg-[#b51712] text-white text-xs font-mono-tech font-bold uppercase rounded tracking-wider shadow-lg shadow-[#D91E18]/25"
            >
              Order Neon Fuzz Box — ₹2,499
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
