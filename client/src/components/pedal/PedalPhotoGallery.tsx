import React, { useState } from 'react';
import { Camera, Check, Shield, Radio } from 'lucide-react';

interface AngleView {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  highlights: string[];
}

const ANGLES: AngleView[] = [
  {
    id: 'front',
    title: 'Front View',
    subtitle: 'Classic Enclosure & Authentic Controls',
    badge: 'Primary Face',
    description: 'Precision layout with tactile vintage GAIN, TONE, and VOL knobs, true-bypass 3PDT chrome footswitch, and high-visibility neon status LED.',
    highlights: ['Matte Obsidian & Neon Orange Screenprint', 'Custom Color-Coded Knob Pointers', 'Dual-Layer Screenprinted Typography'],
  },
  {
    id: 'angle',
    title: '45° Stage Angle',
    subtitle: 'Built for the Pedalboard',
    badge: 'Perspective',
    description: 'Compact 1590B die-cast enclosure engineered to fit tightly on crowded pedalboards while preserving easy foot access to the footswitch.',
    highlights: ['Beveled Ergonomic Slant', 'Recessed Potentiometer Mounts', 'Reinforced Chrome Switch Collar'],
  },
  {
    id: 'side',
    title: 'Side Profile & Jacks',
    subtitle: 'Isolated 1/4" Audio Input & Output',
    badge: 'Connectivity',
    description: 'Isolated high-grade Switchcraft-style audio jacks that guard against grounding hum and withstand thousands of plugging cycles on tour.',
    highlights: ['Standard 1/4" Mono In / Out', 'Right-angle Patch Cord Friendly', 'Reinforced Jack Nuts'],
  },
  {
    id: 'workbench',
    title: 'Workbench & Rig View',
    subtitle: 'Tested on Tube Amps & Solid State',
    badge: 'Lab Rig',
    description: 'Every single Neon Fuzz Box is assembled, hand-biased, and tone-checked on real tube amplifiers before leaving the Burdwan workshop.',
    highlights: ['Individually Hand-Tested', 'Includes Commemorative IDIOT Pick', 'Inspected by Chief Circuit Builder'],
  },
  {
    id: 'base',
    title: 'Backplate & Mounting',
    subtitle: 'Tour-Ready Aluminum Base',
    badge: 'Underbelly',
    description: 'Solid aluminum bottom plate with four non-slip neoprene feet. Easy screwdriver access for 9V battery changes or Velcro pedalboard mounting.',
    highlights: ['Four Rubber Isolation Feet', 'Dual 9V Battery & DC Power Support', 'Hand-Numbered Serial Stamp'],
  },
];

export const PedalPhotoGallery: React.FC = () => {
  const [activeAngle, setActiveAngle] = useState(ANGLES[0]);
  const [isPedalEngaged, setIsPedalEngaged] = useState(true);

  return (
    <section className="py-28 bg-[#0B0E14] border-t border-white/10 relative overflow-hidden">
      {/* Glow backdrop */}
      <div className="absolute top-1/2 left-10 w-[500px] h-[500px] bg-[#FF5E1E]/5 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#121722] border border-[#FF5E1E]/30 rounded-full text-xs font-mono-tech uppercase tracking-[0.25em] text-[#FF5E1E]">
            <Camera size={13} className="text-[#FF5E1E]" />
            Hardware Showcase
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-editorial font-normal tracking-tight text-[#F6F4EE]">
            Details Matter. Built With Care.
          </h2>
          <p className="text-sm sm:text-base text-[#8E98A8] font-light leading-relaxed">
            No plastic housing. No fragile surface-mount disposable chips. The Neon Fuzz Box is crafted inside a heavy-duty die-cast aluminum enclosure meant to survive real tours.
          </p>
        </div>

        {/* Interactive Hardware Viewer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Main Visual Display Stage */}
          <div className="lg:col-span-7 bg-[#121722]/80 border border-white/10 rounded-3xl p-6 sm:p-10 relative overflow-hidden flex flex-col items-center justify-center min-h-[480px] shadow-2xl backdrop-blur-xl">
            
            {/* Badge */}
            <div className="absolute top-6 left-6 flex items-center gap-2.5">
              <span className="px-3 py-1 bg-[#0B0E14] border border-white/15 text-[#F6F4EE] text-xs font-mono-tech tracking-widest uppercase rounded-full">
                {activeAngle.badge}
              </span>
              <span className="text-xs text-[#8E98A8] font-mono-tech">100% ANALOG</span>
            </div>

            {/* Interactive Toggle Switch on Canvas */}
            <button
              onClick={() => setIsPedalEngaged(!isPedalEngaged)}
              className="absolute top-6 right-6 flex items-center gap-2 px-3.5 py-1.5 bg-[#0B0E14] border border-white/15 hover:border-[#FF5E1E] text-xs font-mono-tech text-[#F6F4EE] rounded-full transition-all cursor-pointer group"
            >
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  isPedalEngaged
                    ? 'bg-[#FF5E1E] shadow-[0_0_8px_#FF5E1E]'
                    : 'bg-zinc-700'
                }`}
              />
              <span className="text-[11px] uppercase tracking-wider text-[#8E98A8] group-hover:text-white">
                {isPedalEngaged ? 'Stomp: Active' : 'Stomp: Bypass'}
              </span>
            </button>

            {/* HIGH-FIDELITY PEDAL RENDER CARD */}
            <div className="relative my-8 transition-transform duration-300 hover:scale-[1.02]">
              {/* Ground Shadow */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-52 h-8 bg-black/80 blur-xl rounded-full" />

              {/* Physical Pedal Enclosure */}
              <div className="w-56 sm:w-64 bg-[#161C28] text-[#F6F4EE] rounded-3xl p-6 shadow-2xl border border-white/15 relative flex flex-col justify-between h-[390px] select-none">
                
                {/* 4 Corner Screws */}
                <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-400" />
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-400" />
                <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-400" />
                <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-400" />

                {/* Left & Right Jack Indicators */}
                <div className="absolute top-28 -left-3.5 w-3.5 h-8 bg-gradient-to-r from-zinc-600 to-zinc-800 rounded-l border border-zinc-500 shadow-md">
                  <div className="text-[7px] -rotate-90 text-white font-mono-tech font-bold translate-y-2">IN</div>
                </div>
                <div className="absolute top-28 -right-3.5 w-3.5 h-8 bg-gradient-to-l from-zinc-600 to-zinc-800 rounded-r border border-zinc-500 shadow-md">
                  <div className="text-[7px] rotate-90 text-white font-mono-tech font-bold translate-y-2">OUT</div>
                </div>

                {/* Knobs Section: GAIN, TONE, VOL */}
                <div>
                  <div className="flex justify-between items-center px-1 pt-1">
                    {/* GAIN KNOB */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#0B0E14] border-2 border-zinc-700 shadow-lg relative flex items-center justify-center">
                        <div className="w-1 h-4 bg-[#FF5E1E] rounded-full absolute top-1 -rotate-45 shadow-[0_0_6px_#FF5E1E]" />
                        <div className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-600" />
                      </div>
                      <span className="text-[10px] font-mono-tech font-bold tracking-widest text-[#FF5E1E] uppercase mt-2">
                        GAIN
                      </span>
                    </div>

                    {/* TONE KNOB */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#0B0E14] border-2 border-zinc-700 shadow-lg relative flex items-center justify-center">
                        <div className="w-1 h-4 bg-amber-400 rounded-full absolute top-1 rotate-15 shadow-[0_0_6px_#f59e0b]" />
                        <div className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-600" />
                      </div>
                      <span className="text-[10px] font-mono-tech font-bold tracking-widest text-amber-400 uppercase mt-2">
                        TONE
                      </span>
                    </div>

                    {/* VOL KNOB */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#0B0E14] border-2 border-zinc-700 shadow-lg relative flex items-center justify-center">
                        <div className="w-1 h-4 bg-[#FF7A00] rounded-full absolute top-1 rotate-60 shadow-[0_0_6px_#FF7A00]" />
                        <div className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-600" />
                      </div>
                      <span className="text-[10px] font-mono-tech font-bold tracking-widest text-[#FF7A00] uppercase mt-2">
                        VOL
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center Graphic Branding */}
                <div className="text-center my-auto flex flex-col items-center justify-center">
                  <div className="text-3xl sm:text-4xl font-editorial font-black tracking-wider text-[#F6F4EE] leading-none uppercase">
                    IDIOT
                  </div>
                  <div className="text-2xl sm:text-3xl font-script font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-[#FF4500] -mt-0.5 -rotate-4 tracking-wide">
                    Pedals
                  </div>
                  <div className="text-[8px] font-mono-tech font-bold tracking-[0.25em] text-[#8E98A8] uppercase mt-1">
                    NEON FUZZ BOX
                  </div>
                </div>

                {/* Bottom Section */}
                <div className="flex items-center justify-between px-2 pt-2 border-t border-white/10">
                  {/* Glowing LED */}
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-4 h-4 rounded-full border border-red-950 transition-all duration-300 relative ${
                        isPedalEngaged
                          ? 'bg-[#FF5E1E] shadow-[0_0_16px_#FF5E1E,0_0_30px_rgba(255,94,30,0.8)]'
                          : 'bg-[#401212] shadow-inner'
                      }`}
                    >
                      {isPedalEngaged && (
                        <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full opacity-90" />
                      )}
                    </div>
                    <span className="text-[7px] font-mono-tech font-bold text-[#8E98A8] uppercase">
                      {isPedalEngaged ? 'ACTIVE' : 'BYPASS'}
                    </span>
                  </div>

                  {/* Chrome 3PDT Footswitch */}
                  <button
                    onClick={() => setIsPedalEngaged(!isPedalEngaged)}
                    className="w-14 h-14 rounded-full border-4 border-zinc-700 bg-zinc-800 flex items-center justify-center shadow-inner hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    title="Click to engage / bypass"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-zinc-400 via-zinc-200 to-zinc-300 border-2 border-zinc-400 flex items-center justify-center shadow-md">
                      <div className="w-6 h-6 rounded-full bg-zinc-300 border border-zinc-500 shadow-inner" />
                    </div>
                  </button>

                  <div className="w-6" />
                </div>
              </div>
            </div>

            {/* Prompt */}
            <p className="text-xs font-mono-tech text-[#8E98A8] flex items-center gap-2 mt-2">
              <Radio size={14} className={isPedalEngaged ? 'text-[#FF5E1E] animate-pulse' : 'text-zinc-600'} />
              <span>Tap footswitch to engage / bypass LED</span>
            </p>
          </div>

          {/* Angle Switcher & Detailed Specs List */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-mono-tech uppercase tracking-[0.25em] text-[#FF5E1E] font-bold">
                Inspect Hardware
              </span>
              <h3 className="text-2xl sm:text-3xl font-editorial font-bold tracking-tight text-[#F6F4EE]">
                {activeAngle.title}
              </h3>
              <p className="text-sm text-[#8E98A8] leading-relaxed font-light">
                {activeAngle.description}
              </p>
            </div>

            {/* Highlights bullet points */}
            <div className="p-5 bg-[#121722]/80 border border-white/10 rounded-2xl space-y-3 backdrop-blur-xl">
              <span className="text-xs font-mono-tech text-[#F6F4EE] font-semibold uppercase tracking-wider block mb-1">
                Engineering Highlights
              </span>
              {activeAngle.highlights.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs font-mono-tech text-[#F6F4EE]">
                  <Check size={14} className="text-[#FF5E1E] shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Angle Select Buttons */}
            <div className="space-y-2">
              <span className="text-xs font-mono-tech text-[#8E98A8] uppercase tracking-wider block">
                Select View Angle:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {ANGLES.map((angle) => (
                  <button
                    key={angle.id}
                    onClick={() => setActiveAngle(angle)}
                    className={`px-3.5 py-3 rounded-xl text-left text-xs font-mono-tech transition-all border cursor-pointer ${
                      activeAngle.id === angle.id
                        ? 'bg-[#161C28] border-[#FF5E1E] text-[#F6F4EE] shadow-md glow-neon-subtle'
                        : 'bg-[#0B0E14] border-white/10 text-[#8E98A8] hover:border-white/20 hover:text-[#F6F4EE]'
                    }`}
                  >
                    <div className="font-semibold">{angle.title}</div>
                    <div className="text-[10px] opacity-70">{angle.badge}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Warranty badge */}
            <div className="flex items-center gap-3 pt-2 text-xs font-mono-tech text-[#8E98A8]">
              <Shield size={16} className="text-[#FF5E1E]" />
              <span>Lifetime repair guarantee on solder joints & pot assemblies.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
