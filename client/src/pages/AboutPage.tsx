import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Shield, Heart, Zap, Compass, ArrowRight } from 'lucide-react';
import { IdiotPedalsLogo } from '../components/common/IdiotPedalsLogo';

export const AboutPage: React.FC = () => {
  return (
    <div className="bg-[#0B0B0A] text-[#F3EFE6] pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 pt-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#171513] border border-[#8C857A]/30 rounded-full text-xs font-mono-tech uppercase tracking-widest text-[#D91E18]">
            The Workbench Story
          </div>
          <h1 className="text-4xl sm:text-6xl font-cinzel font-black tracking-tight uppercase">
            Built For Real Players.
          </h1>
          <p className="text-base sm:text-xl text-[#8C857A] font-medium max-w-2xl mx-auto leading-relaxed">
            We started IDIOT Pedals with one straightforward obsession: build road-worthy analog effects pedals that deliver authentic vintage guitar tone without charging boutique hype prices.
          </p>
        </div>

        {/* The Manifesto Card */}
        <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-8 sm:p-12 space-y-6 relative overflow-hidden shadow-2xl">
          <div className="w-12 h-1 bg-[#D91E18] rounded-full" />
          <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-[#F3EFE6]">
            Why "IDIOT"?
          </h2>
          <div className="space-y-4 text-xs sm:text-sm text-[#8C857A] leading-relaxed">
            <p>
              When we told veteran boutique pedal builders we were going to build a heavy-duty, die-cast aluminum analog fuzz with through-hole components, alpha pots, and a true-bypass 3PDT switch for under ₹2,500 ($30), they said:
            </p>
            <blockquote className="p-4 bg-[#0B0B0A] border-l-4 border-[#D91E18] text-[#F3EFE6] font-editorial italic text-base sm:text-lg">
              "You’re idiots. You should price it at ₹12,000, print a fancy mystical name on it, and pretend it uses unobtainable fairy-dust germanium."
            </blockquote>
            <p>
              We loved the name so much we put it right on the faceplate. Because the real idiocy is paying half a month’s rent for an overdrive or fuzz that has thirty cents of copper and an op-amp inside.
            </p>
          </div>
        </div>

        {/* 3 Core Tenets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-[#171513] border border-[#8C857A]/20 rounded-xl space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#0B0B0A] border border-[#8C857A]/30 flex items-center justify-center text-[#D91E18]">
              <Zap size={18} />
            </div>
            <h3 className="text-lg font-bold font-cinzel text-[#F3EFE6]">Zero Digital Emulation</h3>
            <p className="text-xs text-[#8C857A] leading-relaxed">
              No DSP chips, no microcode, and no latency. Every circuit is 100% pure analog signal manipulation that reacts dynamically to your guitar's volume knob and pick attack.
            </p>
          </div>

          <div className="p-6 bg-[#171513] border border-[#8C857A]/20 rounded-xl space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#0B0B0A] border border-[#8C857A]/30 flex items-center justify-center text-[#D91E18]">
              <Wrench size={18} />
            </div>
            <h3 className="text-lg font-bold font-cinzel text-[#F3EFE6]">Handcrafted In Kolkata</h3>
            <p className="text-xs text-[#8C857A] leading-relaxed">
              Each pedal is hand-assembled, individually biased, and tested with real guitars into real tube amplifiers in our workshop before getting boxed with an inspector stamp.
            </p>
          </div>

          <div className="p-6 bg-[#171513] border border-[#8C857A]/20 rounded-xl space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#0B0B0A] border border-[#8C857A]/30 flex items-center justify-center text-[#D91E18]">
              <Shield size={18} />
            </div>
            <h3 className="text-lg font-bold font-cinzel text-[#F3EFE6]">Real Musician Support</h3>
            <p className="text-xs text-[#8C857A] leading-relaxed">
              When you message or email us, you’re talking directly with the builders who designed the circuit. If you ever have an issue on the road, we repair it under warranty without excuses.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-8 space-y-4">
          <Link
            to="/product"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#D91E18] hover:bg-[#b51712] text-white text-xs font-mono-tech font-bold uppercase rounded shadow-xl shadow-[#D91E18]/30 transition-all"
          >
            Check Out The Neon Fuzz Box
            <ArrowRight size={16} />
          </Link>
          <div className="text-xs text-[#8C857A] font-mono-tech">
            CHEAPER. CLASSIC SOUND. BIGGER STORIES.
          </div>
        </div>
      </div>
    </div>
  );
};
