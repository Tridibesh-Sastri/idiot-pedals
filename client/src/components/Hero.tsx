import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'motion/react';
import { useRef, useEffect } from 'react';
import { PedalModel } from './PedalModel';
import { ChevronDown } from 'lucide-react';

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 0, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);

  // Floating animation state
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const rotationX = useTransform(smoothMouseY, [-1, 1], [40, 80]);
  const rotationY = useTransform(smoothMouseX, [-1, 1], [-20, 20]);
  const rotationZ = useTransform(smoothMouseX, [-1, 1], [-40, -20]);

  return (
    <section ref={containerRef} className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-zinc-950 perspective-1000">
      
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero content */}
      <motion.div 
        className="relative z-10 flex flex-col md:flex-row items-center justify-between w-full max-w-7xl mx-auto px-6 h-full"
        style={{ y, opacity, scale }}
      >
        <div className="flex-1 flex flex-col items-start justify-center pt-20 md:pt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white mb-4">
              IDIOT<span className="text-orange-500">PEDALS</span>
            </h1>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-400 mb-2">Cheap price.</h2>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-300 mb-8">Serious tone.</h2>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <button className="px-8 py-4 bg-orange-500 hover:bg-orange-400 text-black font-black tracking-widest uppercase rounded-full transition-colors">
              Hear the difference
            </button>
            <button className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold tracking-widest uppercase border border-zinc-800 rounded-full transition-colors">
              Explore Inside
            </button>
          </motion.div>
        </div>

        <div className="flex-1 h-full flex items-center justify-center mt-20 md:mt-0 perspective-1000">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 0 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: [0, -15, 0] 
            }}
            transition={{ 
              opacity: { duration: 1.2, ease: "easeOut" },
              scale: { duration: 1.2, ease: "easeOut" },
              y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.2 }
            }}
          >
             <PedalModel 
               rotationX={rotationX}
               rotationY={rotationY}
               rotationZ={rotationZ}
             />
          </motion.div>
        </div>
      </motion.div>

      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-zinc-500 flex flex-col items-center gap-2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="text-xs font-bold tracking-widest uppercase">Scroll to explore</span>
        <ChevronDown size={20} />
      </motion.div>
    </section>
  );
}
