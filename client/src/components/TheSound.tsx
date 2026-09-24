import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Plug, Zap, Speaker } from 'lucide-react';

export function TheSound() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.5, 0.8, 1], [0, 1, 1, 0, 0]);
  const y = useTransform(scrollYProgress, [0, 0.2, 0.5, 0.8, 1], [80, 0, 0, -80, -150]);

  return (
    <section ref={containerRef} className="relative min-h-screen w-full bg-[#0B0E14] flex flex-col items-center justify-center py-32 overflow-hidden border-t border-white/10">
      
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#FF5E1E]/5 blur-[160px] rounded-full pointer-events-none" />

      <motion.div style={{ opacity, y }} className="max-w-4xl mx-auto px-6 text-center z-10 space-y-6">
        <span className="text-xs font-mono-tech uppercase tracking-[0.3em] text-[#FF5E1E] font-bold block">
          SIGNAL TRANSMISSION PATH
        </span>

        <h2 className="text-4xl md:text-7xl font-editorial font-normal tracking-tight text-[#F6F4EE] leading-tight">
          Plug in.<br/>
          Hit a chord.<br/>
          <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-[#FF4500]">Hear something better.</span>
        </h2>
        
        <p className="text-base md:text-xl text-[#8E98A8] font-light max-w-2xl mx-auto mb-16 leading-relaxed">
          The IDIOT Pedals circuit isn't trying to emulate anything digital. It's pure, unapologetic analog character designed to make your tube amplifier work harder.
        </p>

        {/* Signal Flow Diagram */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 w-full pt-8">
          {/* Guitar Input */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-[#121722] border border-white/10 flex items-center justify-center text-[#8E98A8] shadow-lg">
              <Plug size={28} className="text-[#FF5E1E]" />
            </div>
            <span className="font-mono-tech font-bold tracking-widest text-xs text-[#8E98A8] uppercase">Guitar In</span>
          </div>

          {/* Signal Line 1 */}
          <div className="hidden md:block flex-1 h-[2px] bg-white/10 relative overflow-hidden rounded-full">
            <motion.div 
              className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-[#FF5E1E] to-transparent"
              animate={{ left: ["-100%", "200%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Pedal */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#FF7A00] to-[#FF4500] shadow-xl shadow-[#FF5E1E]/30 flex items-center justify-center text-white glow-neon-orange">
              <Zap size={36} className="fill-white" />
            </div>
            <span className="font-mono-tech font-bold tracking-widest text-xs text-[#FF5E1E] uppercase">Neon Fuzz Box</span>
          </div>

          {/* Signal Line 2 - Processed */}
          <div className="hidden md:block flex-1 h-[2px] bg-white/10 relative overflow-hidden rounded-full">
            <motion.div 
              className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-[#FF5E1E] to-transparent"
              animate={{ left: ["-100%", "200%"] }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Output */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-[#121722] border border-white/10 flex items-center justify-center text-[#8E98A8] shadow-lg">
              <Speaker size={28} className="text-[#FF5E1E]" />
            </div>
            <span className="font-mono-tech font-bold tracking-widest text-xs text-[#8E98A8] uppercase">Tube Amp Out</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
