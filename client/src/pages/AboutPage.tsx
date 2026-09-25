import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Shield, Zap, ArrowRight } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="bg-[#FFF8F1] text-[#2A1A12] pt-28 pb-20 overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#FF5E1E]/10 blur-[170px] pointer-events-none rounded-full" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-4 pt-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-[#FF5E1E]/30 rounded-full text-xs font-mono-tech uppercase tracking-[0.25em] text-[#FF5E1E] shadow-sm">
            The Workbench Story
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-editorial font-normal tracking-tight uppercase">
            Built For Real Players.
          </h1>
          <p className="text-base sm:text-xl text-[#8A6A54] font-light max-w-2xl mx-auto leading-relaxed">
            We started IDIOT Pedals with one straightforward obsession: build road-worthy analog effects pedals that deliver authentic vintage guitar tone without charging boutique hype prices.
          </p>
        </div>

        {/* The Manifesto Card */}
        <div className="bg-white border border-[#F0D3B8] rounded-3xl p-8 sm:p-12 space-y-6 relative overflow-hidden shadow-[0_8px_40px_-16px_rgba(255,94,30,0.25)]">
          <div className="w-12 h-1 bg-[#FF5E1E] rounded-full" />
          <h2 className="text-2xl sm:text-4xl font-editorial font-normal text-[#2A1A12]">
            Why "IDIOT"?
          </h2>
          <div className="space-y-4 text-xs sm:text-sm text-[#8A6A54] leading-relaxed font-light">
            <p>
              When we told veteran boutique pedal builders we were going to build a heavy-duty, die-cast aluminum analog fuzz with through-hole components, alpha pots, and a true-bypass 3PDT switch for under ₹2,500 ($30), they said:
            </p>
            <blockquote className="p-5 bg-[#FFF1E6] border-l-4 border-[#FF5E1E] text-[#2A1A12] font-editorial italic text-base sm:text-xl rounded-r-2xl">
              "You’re idiots. You should price it at ₹12,000, print a fancy mystical name on it, and pretend it uses unobtainable fairy-dust germanium."
            </blockquote>
            <p>
              We loved the name so much we put it right on the faceplate. Because the real idiocy is paying half a month’s rent for an overdrive or fuzz that has thirty cents of copper and an op-amp inside.
            </p>
          </div>
        </div>

        {/* 3 Core Tenets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 sm:p-8 bg-white border border-[#F0D3B8] rounded-3xl space-y-4 shadow-[0_8px_40px_-16px_rgba(255,94,30,0.25)]">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] border border-[#FF5E1E]/30 flex items-center justify-center text-white shadow-lg shadow-[#FF5E1E]/30">
              <Zap size={20} />
            </div>
            <h3 className="text-xl font-editorial font-bold text-[#2A1A12]">Zero Digital Emulation</h3>
            <p className="text-xs text-[#8A6A54] leading-relaxed font-light">
              No DSP chips, no microcode, and no latency. Every circuit is 100% pure analog signal manipulation that reacts dynamically to your guitar's volume knob and pick attack.
            </p>
          </div>

          <div className="p-6 sm:p-8 bg-white border border-[#F0D3B8] rounded-3xl space-y-4 shadow-[0_8px_40px_-16px_rgba(255,94,30,0.25)]">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] border border-[#FF5E1E]/30 flex items-center justify-center text-white shadow-lg shadow-[#FF5E1E]/30">
              <Wrench size={20} />
            </div>
            <h3 className="text-xl font-editorial font-bold text-[#2A1A12]">Handcrafted In Burdwan</h3>
            <p className="text-xs text-[#8A6A54] leading-relaxed font-light">
              Each pedal is hand-assembled, individually biased, and tested with real guitars into real tube amplifiers in our workshop before getting boxed with an inspector stamp.
            </p>
          </div>

          <div className="p-6 sm:p-8 bg-white border border-[#F0D3B8] rounded-3xl space-y-4 shadow-[0_8px_40px_-16px_rgba(255,94,30,0.25)]">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] border border-[#FF5E1E]/30 flex items-center justify-center text-white shadow-lg shadow-[#FF5E1E]/30">
              <Shield size={20} />
            </div>
            <h3 className="text-xl font-editorial font-bold text-[#2A1A12]">Real Musician Support</h3>
            <p className="text-xs text-[#8A6A54] leading-relaxed font-light">
              When you message or email us, you’re talking directly with the builders who designed the circuit. If you ever have an issue on the road, we repair it under warranty without excuses.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-8 space-y-4">
          <Link
            to="/checkout"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full shadow-xl shadow-[#FF5E1E]/30 transition-all glow-neon-orange"
          >
            <span>Check Out The Neon Fuzz Box</span>
            <ArrowRight size={14} />
          </Link>
          <div className="text-xs text-[#8A6A54] font-mono-tech tracking-widest uppercase">
            CHEAPER. CLASSIC SOUND. BIGGER STORIES.
          </div>
        </div>
      </div>
    </div>
  );
};
