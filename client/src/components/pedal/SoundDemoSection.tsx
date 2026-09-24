import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2, Sliders, Zap, Sparkles, Radio } from 'lucide-react';
import { AudioSamplePreset } from '../../types';

const PRESETS: AudioSamplePreset[] = [
  {
    id: 'vintage-breakup',
    name: '60s Garage Fuzz',
    style: 'Classic Rock / Garage',
    description: 'Thick, singing harmonic saturation with touch-sensitive dynamics inspired by early Dallas Arbiter & Tone Bender circuits.',
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
    description: 'Dialed-back gain that pushes standard tube clean channels into organic analog compression and bloom.',
    riffType: 'garage',
    gainLevel: 35,
    toneLevel: 65,
    volLevel: 70,
  },
];

/**
 * SoundDemoSection Component
 *
 * Real-time guitar tone test bench using the browser's native Web Audio API.
 * Synthesizes classic electric guitar riff sequences and processes them through
 * a simulated analog effects chain:
 * Oscillator -> WaveShaper (Diode Clipping) -> BiquadFilter (Tone Filter) -> Gain (Amp Envelope) -> Destination.
 */
export const SoundDemoSection: React.FC = () => {
  // Currently active audio preset (60s Garage, Heavy Wool, Screaming Lead, Edge of Breakup)
  const [activePreset, setActivePreset] = useState<AudioSamplePreset>(PRESETS[0]);
  // Playback state of the audio generator
  const [isPlaying, setIsPlaying] = useState(false);
  // Bypass toggle: false = Neon Fuzz circuit engaged; true = Clean guitar true bypass
  const [isBypassed, setIsBypassed] = useState(false);
  // Potentiometer levels (0 - 100)
  const [gain, setGain] = useState(75);
  const [tone, setTone] = useState(55);
  const [volume, setVolume] = useState(80);
  // Playhead position on the cathode-ray oscilloscope visualizer (0 - 100%)
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Web Audio Context & interval timer refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const activeNodesRef = useRef<{
    osc?: OscillatorNode;
    gainNode?: GainNode;
    filterNode?: BiquadFilterNode;
    distNode?: WaveShaperNode;
  }>({});

  /**
   * Generates a non-linear sigmoid clipping curve for the WaveShaperNode.
   * Models the soft-clipping saturation characteristic of germanium
   * and silicon diodes in vintage analog fuzz circuits.
   *
   * @param amount Degree of saturation (0 to 100)
   * @returns Float32Array containing 44,100 normalized transfer curve samples
   */
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

  /**
   * Initializes AudioContext and begins scheduled note playback
   */
  const startAudioSynth = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      // Note frequencies (E pentatonic / blues riff notes)
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

        // Waveform shape for electric guitar pluck
        osc.type = isBypassed ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(riffNotes[noteIndex % riffNotes.length], now);

        // Distortion shaping
        const distAmount = isBypassed ? 0 : (gain / 100) * 80 + 10;
        dist.curve = makeDistortionCurve(distAmount);
        dist.oversample = '4x';

        // Tone filter
        filter.type = 'lowpass';
        const cutoffFreq = isBypassed ? 3500 : 800 + (tone / 100) * 4500;
        filter.frequency.setValueAtTime(cutoffFreq, now);

        // Volume Envelope
        const masterVol = (volume / 100) * 0.18;
        noteGain.gain.setValueAtTime(0.01, now);
        noteGain.gain.exponentialRampToValueAtTime(masterVol, now + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + stepInterval / 1000 - 0.02);

        // Connect chain
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
      // Fallback for browsers with strict auto-play policies
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
    <section id="demo" className="py-24 bg-[#0B0B0A] border-t border-[#8C857A]/20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#171513] border border-[#8C857A]/30 rounded-full text-xs font-mono-tech uppercase tracking-widest text-[#8C857A] mb-4">
            <Zap size={14} className="text-[#D91E18]" />
            Live Tone Test Bench
          </div>
          <h2 className="text-3xl sm:text-5xl font-cinzel font-black tracking-tight text-[#F3EFE6] mb-4">
            Hear The Real Difference
          </h2>
          <p className="text-sm sm:text-base text-[#8C857A]">
            Listen to clean bypass tone vs. the rich analog saturation of the Neon Fuzz Box. Toggle parameters live to hear how the circuit breaks up.
          </p>
        </div>

        {/* Test Bench Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Preset selector & Controls */}
          <div className="lg:col-span-5 space-y-6">
            {/* Presets List */}
            <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#8C857A]/20">
                <span className="text-xs font-mono-tech uppercase tracking-wider text-[#F3EFE6] font-bold">
                  Preset Riffs
                </span>
                <span className="text-[11px] font-mono-tech text-[#8C857A]">
                  Select to test
                </span>
              </div>

              <div className="space-y-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full p-3.5 rounded-lg text-left transition-all border ${
                      activePreset.id === preset.id
                        ? 'bg-[#0B0B0A] border-[#D91E18] text-[#F3EFE6] shadow-md'
                        : 'bg-[#171513] border-transparent text-[#8C857A] hover:text-[#F3EFE6] hover:bg-[#0B0B0A]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#F3EFE6]">{preset.name}</span>
                      <span className="text-[10px] font-mono-tech text-[#8C857A] px-2 py-0.5 rounded bg-[#0B0B0A]">
                        {preset.style}
                      </span>
                    </div>
                    <p className="text-xs text-[#8C857A] line-clamp-1 mt-1">
                      {preset.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Circuit Knobs (GAIN, TONE, VOL) */}
            <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tech uppercase tracking-wider text-[#F3EFE6] font-bold flex items-center gap-2">
                  <Sliders size={14} className="text-[#D91E18]" />
                  Analog Circuit Controls
                </span>
                <span className="text-[11px] font-mono-tech text-[#8C857A]">
                  Interactive
                </span>
              </div>

              {/* GAIN Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#F3EFE6] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    GAIN (Saturation)
                  </span>
                  <span className="font-mono-tech text-[#8C857A]">{gain}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={gain}
                  onChange={(e) => setGain(Number(e.target.value))}
                  disabled={isBypassed}
                  className="w-full h-1.5 bg-[#0B0B0A] rounded-lg appearance-none cursor-pointer accent-[#D91E18] disabled:opacity-30"
                />
              </div>

              {/* TONE Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#F3EFE6] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    TONE (Harmonic Filter)
                  </span>
                  <span className="font-mono-tech text-[#8C857A]">{tone}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={tone}
                  onChange={(e) => setTone(Number(e.target.value))}
                  disabled={isBypassed}
                  className="w-full h-1.5 bg-[#0B0B0A] rounded-lg appearance-none cursor-pointer accent-[#D91E18] disabled:opacity-30"
                />
              </div>

              {/* VOL Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#F3EFE6] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    VOLUME (Master Output)
                  </span>
                  <span className="font-mono-tech text-[#8C857A]">{volume}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#0B0B0A] rounded-lg appearance-none cursor-pointer accent-[#D91E18]"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Oscilloscope Visualizer & A/B Bypass Switch */}
          <div className="lg:col-span-7 bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-8">
            {/* A/B Switch Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#0B0B0A] rounded-xl border border-[#8C857A]/30">
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    !isBypassed
                      ? 'bg-[#D91E18] shadow-[0_0_12px_#D91E18]'
                      : 'bg-zinc-700'
                  }`}
                />
                <div>
                  <div className="text-xs font-mono-tech text-[#8C857A] uppercase">
                    Signal Circuit Path
                  </div>
                  <div className="text-sm font-bold text-[#F3EFE6]">
                    {!isBypassed ? 'Neon Fuzz Engaged (Analog Clipping)' : 'True Bypass Clean Guitar'}
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex p-1 bg-[#171513] rounded-lg border border-[#8C857A]/30">
                <button
                  onClick={() => setIsBypassed(true)}
                  className={`px-3.5 py-1.5 text-xs font-mono-tech font-bold uppercase rounded transition-colors ${
                    isBypassed
                      ? 'bg-[#0B0B0A] text-[#F3EFE6] border border-[#8C857A]/40'
                      : 'text-[#8C857A] hover:text-[#F3EFE6]'
                  }`}
                >
                  Dry / Bypass
                </button>
                <button
                  onClick={() => setIsBypassed(false)}
                  className={`px-3.5 py-1.5 text-xs font-mono-tech font-bold uppercase rounded transition-colors ${
                    !isBypassed
                      ? 'bg-[#D91E18] text-white shadow-sm'
                      : 'text-[#8C857A] hover:text-[#F3EFE6]'
                  }`}
                >
                  Fuzz On
                </button>
              </div>
            </div>

            {/* Simulated Vintage Cathode Oscilloscope */}
            <div className="h-60 sm:h-72 bg-[#0B0B0A] rounded-xl border border-[#8C857A]/40 p-4 relative overflow-hidden flex flex-col justify-between">
              {/* Cathode Grid background */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(0deg, #F3EFE6 1px, transparent 1px), linear-gradient(90deg, #F3EFE6 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Screen Top Details */}
              <div className="relative z-10 flex justify-between text-[11px] font-mono-tech text-[#8C857A]">
                <span>BENCH ANALYZER • CH1</span>
                <span className={isPlaying ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>
                  {isPlaying ? '● REAL-TIME WAVEFORM' : 'STANDBY'}
                </span>
                <span>44.1 kHz / ANALOG</span>
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
                    stroke={isBypassed ? '#8C857A' : '#D91E18'}
                    strokeWidth={isBypassed ? '2' : '3.5'}
                    strokeLinecap="round"
                    className="transition-all duration-200"
                  />
                </svg>

                {/* Vertical Playhead Cursor */}
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-white/70 shadow-[0_0_8px_white] transition-all"
                  style={{ left: `${playbackProgress}%` }}
                />
              </div>

              {/* Bottom Screen Readout */}
              <div className="relative z-10 flex justify-between items-center text-[10px] font-mono-tech text-[#8C857A] pt-2 border-t border-[#8C857A]/15">
                <span>PRESET: {activePreset.name.toUpperCase()}</span>
                <span>
                  GAIN: {gain}% | TONE: {tone}% | VOL: {volume}%
                </span>
                <span className="text-[#D91E18] font-bold">
                  {!isBypassed ? 'SATURATED' : 'CLEAN'}
                </span>
              </div>
            </div>

            {/* Transport Bar Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleTogglePlay}
                  className="flex-1 sm:flex-none px-6 py-3.5 bg-[#D91E18] hover:bg-[#b51712] text-white font-mono-tech font-bold uppercase rounded-lg flex items-center justify-center gap-2 text-xs transition-colors shadow-lg shadow-[#D91E18]/30"
                >
                  {isPlaying ? (
                    <>
                      <Square size={16} className="fill-white" />
                      Pause Demo
                    </>
                  ) : (
                    <>
                      <Play size={16} className="fill-white" />
                      Play Tone Sample
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsBypassed(!isBypassed)}
                  className="px-4 py-3.5 bg-[#0B0B0A] hover:bg-[#171513] text-[#F3EFE6] border border-[#8C857A]/30 rounded-lg text-xs font-mono-tech font-bold uppercase transition-colors"
                >
                  {isBypassed ? 'Engage Fuzz' : 'Bypass'}
                </button>
              </div>

              <div className="text-xs text-[#8C857A] flex items-center gap-2">
                <Volume2 size={16} className="text-[#D91E18]" />
                <span>Audio synthesized using Web Audio API analog modeling</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
