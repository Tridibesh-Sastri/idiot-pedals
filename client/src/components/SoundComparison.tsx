import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Square, Volume2 } from 'lucide-react';
import { AUDIO_PRESETS } from '../data';

export function SoundComparison() {
  const [activePreset, setActivePreset] = useState(AUDIO_PRESETS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBypassed, setIsBypassed] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return p + 0.5;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlayback = () => {
    if (progress >= 100) setProgress(0);
    setIsPlaying(!isPlaying);
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <section className="relative min-h-screen w-full bg-[#0B0E14] flex flex-col items-center justify-center py-28 border-t border-white/10 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#FF5E1E]/5 blur-[160px] rounded-full pointer-events-none" />

      <div className="max-w-6xl w-full mx-auto px-6 relative z-10">
        
        <div className="text-center mb-16 space-y-3">
          <span className="text-xs font-mono-tech uppercase tracking-[0.25em] text-[#FF5E1E] font-bold block">
            A/B Real-Time Comparison
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-editorial font-normal tracking-tight text-[#F6F4EE]">
            Hear the Difference.
          </h2>
          <p className="text-sm sm:text-base text-[#8E98A8] font-light leading-relaxed">
            Toggle between the dry signal and the IDIOT Pedals circuit in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Controls Side */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* A/B Switch */}
            <div className="bg-[#121722]/80 border border-white/10 p-8 rounded-3xl flex flex-col items-center justify-center backdrop-blur-xl shadow-xl">
              <span className="text-xs font-mono-tech tracking-[0.25em] text-[#8E98A8] uppercase mb-6">
                Signal Path
              </span>
              
              <div className="relative flex items-center bg-[#0B0E14] rounded-full p-1.5 w-full max-w-xs border border-white/15">
                <div 
                  className={`absolute h-[calc(100%-12px)] w-[calc(50%-6px)] rounded-full transition-all duration-300 ease-out ${
                    isBypassed ? 'left-1.5 bg-[#161C28]' : 'left-[calc(50%+3px)] bg-gradient-to-r from-[#FF7A00] to-[#FF4500] shadow-lg shadow-[#FF5E1E]/30 glow-neon-subtle'
                  }`} 
                />
                
                <button 
                  onClick={() => setIsBypassed(true)}
                  className={`relative z-10 flex-1 py-3 text-xs font-mono-tech font-bold tracking-widest uppercase transition-colors cursor-pointer ${
                    isBypassed ? 'text-[#F6F4EE]' : 'text-[#8E98A8] hover:text-white'
                  }`}
                >
                  Dry / Bypass
                </button>
                <button 
                  onClick={() => setIsBypassed(false)}
                  className={`relative z-10 flex-1 py-3 text-xs font-mono-tech font-bold tracking-widest uppercase transition-colors cursor-pointer ${
                    !isBypassed ? 'text-white' : 'text-[#8E98A8] hover:text-white'
                  }`}
                >
                  Neon Fuzz
                </button>
              </div>

              {/* Status Indicator */}
              <div className="mt-6 flex items-center gap-2.5 font-mono-tech">
                <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${!isBypassed ? 'bg-[#FF5E1E] shadow-[0_0_10px_#FF5E1E]' : 'bg-zinc-700'}`} />
                <span className="text-xs font-bold tracking-wider text-[#8E98A8] uppercase">
                  {!isBypassed ? 'Effect Engaged' : 'Bypassed'}
                </span>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono-tech tracking-[0.2em] text-[#8E98A8] uppercase mb-1">
                Audio Demos
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {AUDIO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setActivePreset(preset);
                      setProgress(0);
                    }}
                    className={`px-4 py-3 text-left rounded-2xl text-xs font-mono-tech transition-all border cursor-pointer ${
                      activePreset.id === preset.id 
                        ? 'bg-[#161C28] border-[#FF5E1E] text-[#F6F4EE] shadow-md glow-neon-subtle' 
                        : 'bg-[#121722]/60 border-white/10 text-[#8E98A8] hover:bg-[#161C28]/60 hover:text-white'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visualizer Side */}
          <div className="lg:col-span-7 bg-[#121722]/80 border border-white/10 rounded-3xl p-8 overflow-hidden relative backdrop-blur-xl shadow-2xl">
            <div className="mb-6">
              <h3 className="text-2xl font-editorial font-bold text-[#F6F4EE] mb-1">{activePreset.name}</h3>
              <p className="text-xs text-[#8E98A8] font-light">{activePreset.description}</p>
            </div>

            {/* Simulated Waveform / Oscilloscope */}
            <div className="h-48 w-full bg-[#080B0F] rounded-2xl border border-white/15 mb-6 relative overflow-hidden flex items-center shadow-inner">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(0deg, #FF5E1E 1px, transparent 1px), linear-gradient(90deg, #FF5E1E 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

              <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                <motion.path
                  d={
                    !isPlaying ? "M 0 96 L 1000 96" :
                    isBypassed 
                      ? "M 0 96 Q 50 20, 100 96 T 200 96 T 300 96 T 400 96 T 500 96 T 600 96 T 700 96 T 800 96 T 900 96 T 1000 96"
                      : "M 0 96 Q 25 10, 50 96 T 100 96 T 150 96 T 200 96 T 250 96 T 300 96 T 350 96 T 400 96 T 450 96 T 500 96 T 550 96 T 600 96 T 650 96 T 700 96 T 750 96 T 800 96 T 850 96 T 900 96 T 950 96 T 1000 96"
                  }
                  fill="none"
                  stroke={isBypassed ? "#8E98A8" : "#FF5E1E"}
                  strokeWidth={isBypassed ? "2" : "3.5"}
                  className="transition-all duration-300"
                  animate={isPlaying ? { x: [-100, 0] } : {}}
                  transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                  style={{ opacity: isPlaying ? 1 : 0.5 }}
                />
              </svg>

              <div 
                className="absolute top-0 bottom-0 w-px bg-[#FF5E1E] shadow-[0_0_10px_#FF5E1E] z-10"
                style={{ left: `${progress}%` }}
              />
            </div>

            {/* Transport Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={togglePlayback}
                  className="w-12 h-12 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white rounded-full flex items-center justify-center transition-all shadow-lg shadow-[#FF5E1E]/25 glow-neon-subtle cursor-pointer"
                >
                  {isPlaying ? <Square size={16} className="fill-white" /> : <Play size={16} className="fill-white ml-0.5" />}
                </button>
                <button 
                  onClick={stopPlayback}
                  className="w-10 h-10 text-[#8E98A8] hover:text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Square size={14} />
                </button>
              </div>

              <div className="flex items-center gap-3 w-44">
                <Volume2 size={16} className="text-[#FF5E1E]" />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#0B0E14] rounded-full appearance-none cursor-pointer accent-[#FF5E1E]"
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
