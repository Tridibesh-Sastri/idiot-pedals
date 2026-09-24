import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { PedalModel } from './PedalModel';
import { PEDAL_COMPONENTS } from '../data';

export function ExplodedView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Stage progress mappings (0 to 1)
  const explodeProgress = useTransform(scrollYProgress, [0, 0.4], [0, 1]);
  const rotationX = useTransform(scrollYProgress, [0, 1], [60, 45]);
  const rotationZ = useTransform(scrollYProgress, [0, 1], [-30, -10]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [1, 1.2, 1.2, 1]);

  return (
    <section ref={containerRef} className="relative h-[400vh] w-full bg-zinc-950 border-t border-zinc-900">
      
      {/* Pinned Content */}
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden perspective-1000">
        
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="absolute top-12 left-0 w-full text-center z-20 px-6">
          <motion.h2 
            className="text-4xl md:text-5xl font-black tracking-tighter text-white"
            style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
          >
            What happens inside?
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
              // Calculate specific scroll windows for each text block based on index
              const start = 0.3 + (index * 0.1);
              const peak = 0.35 + (index * 0.1);
              const end = 0.4 + (index * 0.1);
              
              const opacity = useTransform(
                scrollYProgress, 
                [start, peak, end], 
                [0, 1, 0]
              );
              
              const y = useTransform(
                scrollYProgress, 
                [start, peak, end], 
                [50, 0, -50]
              );

              // Alternate left/right positioning
              const isLeft = index % 2 === 0;

              return (
                <motion.div 
                  key={comp.id}
                  style={{ opacity, y }}
                  className={`absolute top-1/2 -translate-y-1/2 w-80 p-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl ${isLeft ? 'left-8 md:left-24' : 'right-8 md:right-24'}`}
                >
                  <h3 className="text-2xl font-black text-white mb-2">{comp.name}</h3>
                  <p className="text-zinc-400 text-sm mb-4">{comp.description}</p>
                  
                  <div className="space-y-2">
                    {comp.technicalSpecs.map((spec, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-orange-500 rounded-full" />
                        <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase">{spec}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
            
            {/* Final Stage - Signal Path */}
            <motion.div
              style={{ 
                opacity: useTransform(scrollYProgress, [0.8, 0.9], [0, 1]),
                y: useTransform(scrollYProgress, [0.8, 0.9], [50, 0])
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl text-center"
            >
               <h3 className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-6">
                 Pure Analog Signal Path.
               </h3>
               <p className="text-xl text-zinc-400 font-medium">
                 No digital conversion. No latency. Just raw, unadulterated tone.
               </p>
               <button className="mt-10 px-8 py-4 bg-white hover:bg-zinc-200 text-black font-black tracking-widest uppercase rounded-full transition-colors">
                 Join the Waitlist
               </button>
            </motion.div>

          </div>
        </div>
      </div>
    </section>
  );
}
