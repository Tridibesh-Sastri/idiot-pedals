import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Volume2, Settings2 } from 'lucide-react';
import { AUDIO_PRESETS } from '../data';

export function SoundComparison() {
  const [activePreset, setActivePreset] = useState(AUDIO_PRESETS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBypassed, setIsBypassed] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);

  // In a real implementation, we would use Web Audio API or HTMLAudioElement
  // Here we simulate the playback state for the prototype
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
    <section className="relative min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center py-32 border-t border-zinc-900">
      
      <div className="max-w-6xl w-full mx-auto px-6">
        
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-4">
            Hear the Difference.
          </h2>
          <p className="text-xl text-zinc-400 font-medium">
            Toggle between the dry signal and the IdiotPadel circuit in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Controls Side */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            {/* A/B Switch */}
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl flex flex-col items-center justify-center">
              <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-8">Signal Path</span>
              
              <div className="relative flex items-center bg-zinc-950 rounded-full p-2 w-full max-w-xs shadow-inner border border-zinc-800/50">
                <div 
                  className={`absolute h-[calc(100%-16px)] w-[calc(50%-8px)] rounded-full transition-all duration-300 ease-out ${isBypassed ? 'left-2 bg-zinc-800' : 'left-[calc(50%+4px)] bg-orange-600 shadow-[0_0_20px_rgba(249,115,22,0.4)]'}`} 
                />
                
                <button 
                  onClick={() => setIsBypassed(true)}
                  className={`relative z-10 flex-1 py-4 text-sm font-black tracking-widest uppercase transition-colors ${isBypassed ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'}`}
                >
                  Dry / Bypass
                </button>
                <button 
                  onClick={() => setIsBypassed(false)}
                  className={`relative z-10 flex-1 py-4 text-sm font-black tracking-widest uppercase transition-colors ${!isBypassed ? 'text-black' : 'text-zinc-500 hover:text-zinc-400'}`}
                >
                  IdiotPadel
                </button>
              </div>

              {/* Status Indicator */}
              <div className="mt-8 flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full transition-all duration-300 ${!isBypassed ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-zinc-700'}`} />
                <span className="text-sm font-bold tracking-widest text-zinc-400 uppercase">
                  {!isBypassed ? 'Effect Engaged' : 'Bypassed'}
                </span>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2">Audio Demos</span>
              <div className="grid grid-cols-2 gap-2">
                {AUDIO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setActivePreset(preset);
                      setProgress(0);
                    }}
                    className={`px-4 py-3 text-left rounded-lg text-sm font-bold transition-all border ${
                      activePreset.id === preset.id 
                        ? 'bg-zinc-800 border-zinc-700 text-white' 
                        : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visualizer Side */}
          <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-500 to-transparent pointer-events-none" />
            
            <div className="mb-8">
              <h3 className="text-2xl font-black text-white mb-2">{activePreset.name}</h3>
              <p className="text-zinc-400">{activePreset.description}</p>
            </div>

            {/* Simulated Waveform / Oscilloscope */}
            <div className="h-48 w-full bg-zinc-950 rounded-xl border border-zinc-800 mb-8 relative overflow-hidden flex items-center">
              
              {/* Grid Lines */}
              <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)', backgroundSize: '20px 20px' }} />

              {/* Waveform SVG */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <motion.path
                  d={
                    !isPlaying ? "M 0 96 L 1000 96" :
                    isBypassed 
                      ? "M 0 96 Q 50 20, 100 96 T 200 96 T 300 96 T 400 96 T 500 96 T 600 96 T 700 96 T 800 96 T 900 96 T 1000 96"
                      : "M 0 96 Q 25 10, 50 96 T 100 96 T 150 96 T 200 96 T 250 96 T 300 96 T 350 96 T 400 96 T 450 96 T 500 96 T 550 96 T 600 96 T 650 96 T 700 96 T 750 96 T 800 96 T 850 96 T 900 96 T 950 96 T 1000 96"
                  }
                  fill="none"
                  stroke={isBypassed ? "#a1a1aa" : "#f97316"}
                  strokeWidth={isBypassed ? "2" : "4"}
                  className="transition-all duration-300"
                  animate={isPlaying ? { x: [-100, 0] } : {}}
                  transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                  style={{ opacity: isPlaying ? 1 : 0.5 }}
                />
              </svg>

              {/* Progress Line */}
              <div 
                className="absolute top-0 bottom-0 w-px bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10"
                style={{ left: `${progress}%` }}
              />
            </div>

            {/* Transport Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={togglePlayback}
                  className="w-14 h-14 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full flex items-center justify-center transition-colors border border-zinc-700"
                >
                  {isPlaying ? <Square size={20} className="fill-white" /> : <Play size={20} className="fill-white ml-1" />}
                </button>
                <button 
                  onClick={stopPlayback}
                  className="w-12 h-12 text-zinc-500 hover:text-zinc-300 rounded-full flex items-center justify-center transition-colors"
                >
                  <Square size={16} />
                </button>
              </div>

              <div className="flex items-center gap-4 w-48">
                <Volume2 size={20} className="text-zinc-500" />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-400"
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
