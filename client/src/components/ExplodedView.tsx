import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { PedalModel } from './PedalModel';
import { PEDAL_COMPONENTS } from '../data';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { ArrowRight, Cpu } from 'lucide-react';

export function ExplodedView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const { showToast } = useToast();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const explodeProgress = useTransform(scrollYProgress, [0, 0.4], [0, 1]);
  const rotationX = useTransform(scrollYProgress, [0, 1], [60, 45]);
  const rotationZ = useTransform(scrollYProgress, [0, 1], [-30, -10]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [1, 1.15, 1.15, 1]);

  const handleQuickAdd = () => {
    addItem();
    showToast('Neon Fuzz Box added to workbench cart!');
  };

  return (
    <section ref={containerRef} className="relative h-[360vh] w-full bg-[#080B0F] border-t border-white/10">
      
      {/* Pinned Content Viewport */}
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden perspective-1000">
        
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#FF5E1E]/10 blur-[160px] rounded-full pointer-events-none" />

        <div className="absolute top-10 left-0 w-full text-center z-20 px-6">
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#121722] border border-[#FF5E1E]/30 rounded-full text-xs font-mono-tech uppercase tracking-[0.25em] text-[#FF5E1E] mb-3"
            style={{ opacity: useTransform(scrollYProgress, [0, 0.12], [1, 0]) }}
          >
            <Cpu size={13} />
            Chassis Internal Architecture
          </motion.div>
          <motion.h2 
            className="text-3xl md:text-5xl lg:text-6xl font-editorial font-normal tracking-tight text-[#F6F4EE]"
            style={{ opacity: useTransform(scrollYProgress, [0, 0.12], [1, 0]) }}
          >
            What Happens Inside?
          </motion.h2>
        </div>

        {/* The 3D Model */}
        <div className="relative z-10 flex items-center justify-center">
          <PedalModel 
            explodeProgress={explodeProgress} 
            rotationX={rotationX}
            rotationZ={rotationZ}
            scale={scale}
          />
        </div>

        {/* Text descriptions revealing on scroll */}
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="w-full max-w-7xl mx-auto h-full relative">
            
            {/* Component Descriptions */}
            {PEDAL_COMPONENTS.map((comp, index) => {
              const start = 0.25 + (index * 0.12);
              const peak = 0.30 + (index * 0.12);
              const end = 0.38 + (index * 0.12);
              
              const opacity = useTransform(
                scrollYProgress, 
                [start, peak, end], 
                [0, 1, 0]
              );
              
              const y = useTransform(
                scrollYProgress, 
                [start, peak, end], 
                [40, 0, -40]
              );

              const isLeft = index % 2 === 0;

              return (
                <motion.div 
                  key={comp.id}
                  style={{ opacity, y }}
                  className={`absolute top-1/2 -translate-y-1/2 w-80 sm:w-96 p-6 sm:p-7 bg-[#121722]/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl glow-neon-subtle ${isLeft ? 'left-6 md:left-20' : 'right-6 md:right-20'}`}
                >
                  <span className="text-[10px] font-mono-tech text-[#FF5E1E] uppercase tracking-[0.25em] font-bold block mb-1">
                    INTERNAL COMPONENT #{index + 1}
                  </span>
                  <h3 className="text-2xl font-editorial font-bold text-[#F6F4EE] mb-2">{comp.name}</h3>
                  <p className="text-[#8E98A8] text-xs sm:text-sm font-light leading-relaxed mb-4">{comp.description}</p>
                  
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    {comp.technicalSpecs.map((spec, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-[#FF5E1E] rounded-full shadow-[0_0_6px_#FF5E1E]" />
                        <span className="text-[11px] font-mono-tech font-semibold tracking-wider text-[#F6F4EE] uppercase">{spec}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
            
            {/* Final Stage - Signal Path */}
            <motion.div
              style={{ 
                opacity: useTransform(scrollYProgress, [0.78, 0.88], [0, 1]),
                y: useTransform(scrollYProgress, [0.78, 0.88], [40, 0])
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl text-center px-4 pointer-events-auto"
            >
              <span className="text-xs font-mono-tech tracking-[0.3em] text-[#FF5E1E] uppercase font-bold block mb-3">
                100% ANALOG SIGNAL INTEGRITY
              </span>
              <h3 className="text-3xl sm:text-5xl md:text-6xl font-editorial font-normal tracking-tight text-[#F6F4EE] mb-4">
                Pure Analog Signal Path.
              </h3>
              <p className="text-sm sm:text-base text-[#8E98A8] font-light max-w-xl mx-auto leading-relaxed mb-8">
                No digital conversion. No latency. Zero surface-mount disposable chips. Just raw, unadulterated tone handcrafted in Kolkata.
              </p>
              <button 
                onClick={handleQuickAdd}
                className="px-8 py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white font-mono-tech font-bold tracking-[0.2em] uppercase rounded-full transition-all shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Buy Neon Fuzz Box — ₹2,499</span>
                <ArrowRight size={14} />
              </button>
            </motion.div>

          </div>
        </div>
      </div>
    </section>
  );
}
