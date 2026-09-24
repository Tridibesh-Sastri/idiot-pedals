import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Plug, Zap, Speaker } from 'lucide-react';

export function TheSound() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.5, 0.8, 1], [0, 1, 1, 0, 0]);
  const y = useTransform(scrollYProgress, [0, 0.2, 0.5, 0.8, 1], [100, 0, 0, -100, -200]);

  return (
    <section ref={containerRef} className="relative min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center py-32 overflow-hidden">
      
      <motion.div style={{ opacity, y }} className="max-w-4xl mx-auto px-6 text-center z-10">
        <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-6">
          Plug in.<br/>
          Hit a chord.<br/>
          <span className="text-orange-500">Hear something better.</span>
        </h2>
        
        <p className="text-xl md:text-2xl text-zinc-400 font-medium max-w-2xl mx-auto mb-20">
          The IdiotPadel isn't trying to emulate anything digital. It's pure, unapologetic analog character designed to make your amp work harder.
        </p>

        {/* Signal Flow Diagram */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 w-full">
          {/* Guitar */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <Plug size={32} />
            </div>
            <span className="font-bold tracking-widest text-sm text-zinc-400 uppercase">Input</span>
          </div>

          {/* Signal Line 1 */}
          <div className="hidden md:block flex-1 h-[2px] bg-zinc-800 relative overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-zinc-400 to-transparent"
              animate={{ left: ["-100%", "200%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Pedal */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)] flex items-center justify-center text-black">
              <Zap size={40} className="fill-black" />
            </div>
            <span className="font-bold tracking-widest text-sm text-orange-500 uppercase">IdiotPadel</span>
          </div>

          {/* Signal Line 2 - Processed */}
          <div className="hidden md:block flex-1 h-[2px] bg-zinc-800 relative overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-orange-500 to-transparent"
              animate={{ left: ["-100%", "200%"] }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            {/* Wavy line simulation */}
            <svg className="absolute inset-0 w-full h-full text-orange-500/30" preserveAspectRatio="none" viewBox="0 0 100 20">
              <motion.path 
                d="M 0 10 Q 12.5 0, 25 10 T 50 10 T 75 10 T 100 10" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                animate={{ d: [
                  "M 0 10 Q 12.5 0, 25 10 T 50 10 T 75 10 T 100 10",
                  "M 0 10 Q 12.5 20, 25 10 T 50 10 T 75 10 T 100 10"
                ]}}
                transition={{ duration: 0.2, repeat: Infinity, repeatType: "mirror" }}
              />
            </svg>
          </div>

          {/* Output */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <Speaker size={32} />
            </div>
            <span className="font-bold tracking-widest text-sm text-zinc-400 uppercase">Output</span>
          </div>
        </div>
      </motion.div>

      {/* Abstract background waveform */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 pointer-events-none opacity-20">
         <div className="w-full h-full border-t border-orange-500/20" 
              style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(249,115,22,0.05) 20px)' }} />
      </div>

    </section>
  );
}
