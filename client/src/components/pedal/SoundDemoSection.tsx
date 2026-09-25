import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2, Sliders, Zap } from 'lucide-react';
import { AudioSamplePreset } from '../../types';

const PRESETS: AudioSamplePreset[] = [
  {
    id: 'vintage-breakup',
    name: '60s Garage Fuzz',
    style: 'Classic Rock / Garage',
    description: 'Thick, singing harmonic saturation with touch-sensitive dynamics inspired by vintage analog clipping circuits.',
    riffType: 'riff',
    gainLevel: 75,
    toneLevel: 55,
    volLevel: 80,
  },
  {
    id: 'heavy-wool',
    name: 'Heavy Wool Chords',
    style: 'Desert Rock / Doom',
    description: 'Crushing low-end mass that retains chord clarity without turning into muddy mush on bass-heavy humbuckers.',
    riffType: 'chords',
    gainLevel: 90,
    toneLevel: 40,
    volLevel: 85,
  },
  {
    id: 'cutting-lead',
    name: 'Screaming Lead Solo',
    style: 'Psychedelic Blues',
    description: 'Sharp, soaring upper-register presence designed to punch straight through aggressive drum and bass mixes.',
    riffType: 'lead',
    gainLevel: 85,
    toneLevel: 80,
    volLevel: 90,
  },
  {
    id: 'clean-boost-push',
    name: 'Edge of Breakup',
    style: 'Indie / Neo-Soul',
    description: 'Dialed-back gain that pushes standard tube clean channels into organic analog compression and harmonic bloom.',
    riffType: 'garage',
    gainLevel: 35,
    toneLevel: 65,
    volLevel: 70,
  },
];

export const SoundDemoSection: React.FC = () => {
  const [activePreset, setActivePreset] = useState<AudioSamplePreset>(PRESETS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);
  const [gain, setGain] = useState(75);
  const [tone, setTone] = useState(55);
  const [volume, setVolume] = useState(80);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  const makeDistortionCurve = (amount: number) => {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  };

  const startAudioSynth = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const riffNotes =
        activePreset.riffType === 'riff'
          ? [164.81, 196.0, 220.0, 246.94, 293.66, 329.63, 293.66, 220.0]
          : activePreset.riffType === 'chords'
          ? [110.0, 146.83, 164.81, 130.81, 164.81, 196.0, 110.0, 164.81]
          : activePreset.riffType === 'lead'
          ? [329.63, 392.0, 440.0, 493.88, 587.33, 659.25, 587.33, 440.0]
          : [196.0, 246.94, 293.66, 392.0, 329.63, 293.66, 246.94, 196.0];

      let noteIndex = 0;
      const stepInterval = 280;

      const scheduleNote = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
        const currentCtx = audioCtxRef.current;
        const now = currentCtx.currentTime;

        const osc = currentCtx.createOscillator();
        const noteGain = currentCtx.createGain();
        const filter = currentCtx.createBiquadFilter();
        const dist = currentCtx.createWaveShaper();

        osc.type = isBypassed ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(riffNotes[noteIndex % riffNotes.length], now);

        const distAmount = isBypassed ? 0 : (gain / 100) * 80 + 10;
        dist.curve = makeDistortionCurve(distAmount);
        dist.oversample = '4x';

        filter.type = 'lowpass';
        const cutoffFreq = isBypassed ? 3500 : 800 + (tone / 100) * 4500;
        filter.frequency.setValueAtTime(cutoffFreq, now);

        const masterVol = (volume / 100) * 0.18;
        noteGain.gain.setValueAtTime(0.01, now);
        noteGain.gain.exponentialRampToValueAtTime(masterVol, now + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + stepInterval / 1000 - 0.02);

        osc.connect(dist);
        dist.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(currentCtx.destination);

        osc.start(now);
        osc.stop(now + stepInterval / 1000);

        noteIndex++;
      };

      scheduleNote();
      const intervalId = window.setInterval(() => {
        scheduleNote();
        setPlaybackProgress((p) => (p >= 100 ? 0 : p + 4));
      }, stepInterval);

      timerRef.current = intervalId;
    } catch {
      // Fallback
    }
  };

  const stopAudioSynth = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setPlaybackProgress(0);
  };

  useEffect(() => {
    if (isPlaying) {
      stopAudioSynth();
      startAudioSynth();
    }
    return () => {
      stopAudioSynth();
    };
  }, [isPlaying, isBypassed, activePreset]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAudioSynth();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };

  const handleSelectPreset = (preset: AudioSamplePreset) => {
    setActivePreset(preset);
    setGain(preset.gainLevel);
    setTone(preset.toneLevel);
    setVolume(preset.volLevel);
  };

  return (
    <section id="demo" className="py-28 bg-[#FFF8F1] border-t border-[#F0D3B8] relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-[#FF5E1E]/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-[#FF5E1E]/30 rounded-full text-xs font-mono-tech uppercase tracking-[0.25em] text-[#FF5E1E] shadow-sm">
            <Zap size={13} className="text-[#FF5E1E]" />
            Live Tone Test Bench
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-editorial font-normal tracking-tight text-[#2A1A12]">
            Hear The Real Difference
          </h2>
          <p className="text-sm sm:text-base text-[#8A6A54] font-light leading-relaxed">
            Listen to clean bypass tone vs. the rich analog saturation of the Neon Fuzz Box. Adjust potentiometers live to hear the diode stage clip.
          </p>
        </div>

        {/* Test Bench Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Preset selector & Controls */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Presets List */}
            <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0D3B8]">
                <span className="text-xs font-mono-tech uppercase tracking-[0.2em] text-[#2A1A12] font-bold">
                  Preset Riffs
                </span>
                <span className="text-[11px] font-mono-tech text-[#8A6A54]">
                  Click to Audition
                </span>
              </div>

              <div className="space-y-2.5">
                {PRESETS.map((preset) => {
                  const isActive = activePreset.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`w-full p-4 rounded-2xl text-left transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-white border-[#FF5E1E] text-[#2A1A12] shadow-lg shadow-[#FF5E1E]/15 glow-neon-subtle'
                          : 'bg-[#FFF1E6] border-[#F0D3B8] text-[#8A6A54] hover:text-[#2A1A12] hover:bg-[#FFE8D3] hover:border-[#F0D3B8]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-mono-tech font-bold ${isActive ? 'text-[#FF5E1E]' : 'text-[#2A1A12]'}`}>
                          {preset.name}
                        </span>
                        <span className="text-[10px] font-mono-tech text-[#8A6A54] px-2 py-0.5 rounded-full bg-[#FFF1E6] border border-[#F0D3B8]">
                          {preset.style}
                        </span>
                      </div>
                      <p className="text-xs text-[#8A6A54] line-clamp-1 mt-1.5 font-light">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Circuit Knobs (GAIN, TONE, VOL) */}
            <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 shadow-xl space-y-6 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tech uppercase tracking-[0.2em] text-[#2A1A12] font-bold flex items-center gap-2">
                  <Sliders size={14} className="text-[#FF5E1E]" />
                  Analog Potentiometers
                </span>
                <span className="text-[11px] font-mono-tech text-[#FF5E1E]">
                  Interactive
                </span>
              </div>

              {/* GAIN Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono-tech">
                  <span className="font-semibold text-[#2A1A12] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FF5E1E] shadow-[0_0_6px_#FF5E1E]" />
                    GAIN (Saturation)
                  </span>
                  <span className="text-[#FF5E1E] font-bold">{gain}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={gain}
                  onChange={(e) => setGain(Number(e.target.value))}
                  disabled={isBypassed}
                  className="w-full h-2 bg-[#FFF1E6] rounded-full appearance-none cursor-pointer accent-[#FF5E1E] disabled:opacity-30"
                />
              </div>

              {/* TONE Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono-tech">
                  <span className="font-semibold text-[#2A1A12] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    TONE (Harmonic Cutoff)
                  </span>
                  <span className="text-amber-400 font-bold">{tone}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={tone}
                  onChange={(e) => setTone(Number(e.target.value))}
                  disabled={isBypassed}
                  className="w-full h-2 bg-[#FFF1E6] rounded-full appearance-none cursor-pointer accent-amber-400 disabled:opacity-30"
                />
              </div>

              {/* VOL Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono-tech">
                  <span className="font-semibold text-[#2A1A12] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FF7A00]" />
                    VOLUME (Master Output)
                  </span>
                  <span className="text-[#FF7A00] font-bold">{volume}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-2 bg-[#FFF1E6] rounded-full appearance-none cursor-pointer accent-[#FF7A00]"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Oscilloscope Visualizer & A/B Bypass Switch */}
          <div className="lg:col-span-7 bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8 backdrop-blur-xl">
            
            {/* A/B Switch Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-[#FFF1E6] rounded-2xl border border-[#F0D3B8]">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    !isBypassed
                      ? 'bg-[#FF5E1E] shadow-[0_0_12px_#FF5E1E]'
                      : 'bg-[#E4C3A5]'
                  }`}
                />
                <div>
                  <div className="text-xs font-mono-tech text-[#8A6A54] uppercase tracking-widest">
                    Signal Circuit Path
                  </div>
                  <div className="text-sm font-mono-tech font-bold text-[#2A1A12]">
                    {!isBypassed ? 'Neon Fuzz Engaged (Diode Saturated)' : '3PDT True-Bypass Clean Guitar'}
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex p-1 bg-white rounded-full border border-[#F0D3B8]">
                <button
                  onClick={() => setIsBypassed(true)}
                  className={`px-4 py-1.5 text-xs font-mono-tech font-bold uppercase rounded-full transition-all cursor-pointer ${
                    isBypassed
                      ? 'bg-[#FFF1E6] text-[#2A1A12] border border-[#F0D3B8] shadow-sm'
                      : 'text-[#8A6A54] hover:text-[#2A1A12]'
                  }`}
                >
                  Clean / Bypass
                </button>
                <button
                  onClick={() => setIsBypassed(false)}
                  className={`px-4 py-1.5 text-xs font-mono-tech font-bold uppercase rounded-full transition-all cursor-pointer ${
                    !isBypassed
                      ? 'bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white shadow-md glow-neon-subtle'
                      : 'text-[#8A6A54] hover:text-[#2A1A12]'
                  }`}
                >
                  Fuzz On
                </button>
              </div>
            </div>

            {/* Simulated Vintage Cathode Oscilloscope */}
            <div className="h-64 sm:h-72 bg-[#080B0F] rounded-2xl border border-[#F0D3B8] p-5 relative overflow-hidden flex flex-col justify-between shadow-inner">
              
              {/* Cathode Grid background */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(0deg, #FF5E1E 1px, transparent 1px), linear-gradient(90deg, #FF5E1E 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Screen Top Details */}
              <div className="relative z-10 flex justify-between text-[11px] font-mono-tech text-[#8A6A54]">
                <span>BENCH ANALYZER • CH1</span>
                <span className={isPlaying ? 'text-[#FF5E1E] font-bold flex items-center gap-1.5' : 'text-[#C4A488]'}>
                  <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#FF5E1E] animate-ping' : 'bg-[#E4C3A5]'}`} />
                  {isPlaying ? 'REAL-TIME WAVEFORM' : 'STANDBY'}
                </span>
                <span>44.1 kHz / DSP</span>
              </div>

              {/* Dynamic Waveform Canvas SVG */}
              <div className="relative z-10 w-full h-36 flex items-center">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 120">
                  <path
                    d={
                      !isPlaying
                        ? 'M 0 60 L 1000 60'
                        : isBypassed
                        ? 'M 0 60 Q 60 20, 125 60 T 250 60 T 375 60 T 500 60 T 625 60 T 750 60 T 875 60 T 1000 60'
                        : 'M 0 60 Q 30 5, 60 60 T 120 60 T 180 60 T 240 60 T 300 60 T 360 60 T 420 60 T 480 60 T 540 60 T 600 60 T 660 60 T 720 60 T 780 60 T 840 60 T 900 60 T 960 60 T 1000 60'
                    }
                    fill="none"
                    stroke={isBypassed ? '#C09A7A' : '#FF5E1E'}
                    strokeWidth={isBypassed ? '2' : '3.5'}
                    strokeLinecap="round"
                    className="transition-all duration-200"
                  />
                </svg>

                {/* Vertical Playhead Cursor */}
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-[#FF5E1E] shadow-[0_0_8px_#FF5E1E] transition-all"
                  style={{ left: `${playbackProgress}%` }}
                />
              </div>

              {/* Bottom Screen Readout */}
              <div className="relative z-10 flex justify-between items-center text-[10px] font-mono-tech text-[#8A6A54] pt-2 border-t border-[#F0D3B8]">
                <span>PRESET: {activePreset.name.toUpperCase()}</span>
                <span>
                  GAIN: {gain}% | TONE: {tone}% | VOL: {volume}%
                </span>
                <span className="text-[#FF5E1E] font-bold">
                  {!isBypassed ? 'SATURATED' : 'CLEAN'}
                </span>
              </div>
            </div>

            {/* Transport Bar Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleTogglePlay}
                  className="flex-1 sm:flex-none px-7 py-3.5 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 text-xs transition-all shadow-lg shadow-[#FF5E1E]/25 glow-neon-subtle cursor-pointer"
                >
                  {isPlaying ? (
                    <>
                      <Square size={14} className="fill-white" />
                      <span>Pause Demo</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} className="fill-white" />
                      <span>Play Tone Sample</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsBypassed(!isBypassed)}
                  className="px-5 py-3.5 bg-[#FFF1E6] hover:bg-white text-[#2A1A12] border border-[#F0D3B8] rounded-full text-xs font-mono-tech font-bold uppercase transition-colors cursor-pointer"
                >
                  {isBypassed ? 'Engage Fuzz' : 'Bypass'}
                </button>
              </div>

              <div className="text-xs font-mono-tech text-[#8A6A54] flex items-center gap-2">
                <Volume2 size={15} className="text-[#FF5E1E]" />
                <span>Web Audio API analog diode synthesis</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
