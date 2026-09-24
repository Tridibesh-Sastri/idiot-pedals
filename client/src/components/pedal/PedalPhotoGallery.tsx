import React, { useState } from 'react';
import { Camera, ZoomIn, Check, Shield, Layers, Radio } from 'lucide-react';
import { IdiotPedalsLogo } from '../common/IdiotPedalsLogo';

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
    subtitle: 'Classic Ivory Enclosure & Authentic Controls',
    badge: 'Primary Face',
    description: 'Precision layout with tactile vintage GAIN, TONE, and VOL knobs, true-bypass 3PDT chrome footswitch, and high-visibility red status LED.',
    highlights: ['Warm Ivory (#F3EFE6) Matte Finish', 'Custom Color-Coded Knob Pointers', 'Dual-Layer Screenprinted Typography'],
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
    description: 'Every single Neon Fuzz Box is assembled, hand-biased, and tone-checked on real tube amplifiers before leaving the Kolkata workshop.',
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
    <section className="py-20 bg-[#0B0B0A] border-t border-[#8C857A]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#171513] border border-[#8C857A]/30 rounded-full text-xs font-mono-tech uppercase tracking-widest text-[#8C857A] mb-4">
            <Camera size={14} className="text-[#D91E18]" />
            Physical Hardware Showcase
          </div>
          <h2 className="text-3xl sm:text-5xl font-cinzel font-black tracking-tight text-[#F3EFE6] mb-4">
            Details Matter. Built With Care.
          </h2>
          <p className="text-sm sm:text-base text-[#8C857A]">
            No plastic housing. No fragile surface-mount disposable chips. The Neon Fuzz Box is built inside a heavy-duty die-cast aluminum enclosure meant to survive real tours.
          </p>
        </div>

        {/* Interactive Hardware Viewer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Main Visual Display Stage */}
          <div className="lg:col-span-7 bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 sm:p-10 relative overflow-hidden flex flex-col items-center justify-center min-h-[460px] shadow-2xl">
            {/* Subtle background workshop glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#5A3A27]/20 blur-[100px] pointer-events-none rounded-full" />

            {/* Badge */}
            <div className="absolute top-6 left-6 flex items-center gap-2">
              <span className="px-2.5 py-1 bg-[#0B0B0A]/80 border border-[#8C857A]/40 text-[#F3EFE6] text-xs font-mono-tech tracking-wider uppercase rounded">
                {activeAngle.badge}
              </span>
              <span className="text-xs text-[#8C857A] font-mono-tech">100% ANALOG CIRCUIT</span>
            </div>

            {/* Interactive Toggle Switch on Canvas */}
            <button
              onClick={() => setIsPedalEngaged(!isPedalEngaged)}
              className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 bg-[#0B0B0A] border border-[#8C857A]/30 hover:border-[#D91E18] text-xs font-medium text-[#F3EFE6] rounded transition-colors group"
            >
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  isPedalEngaged
                    ? 'bg-[#D91E18] shadow-[0_0_8px_#D91E18]'
                    : 'bg-zinc-700'
                }`}
              />
              <span className="text-[11px] uppercase tracking-wider text-[#8C857A] group-hover:text-white">
                {isPedalEngaged ? 'Stomp: Active' : 'Stomp: Bypass'}
              </span>
            </button>

            {/* HIGH-FIDELITY PEDAL RENDER CARD */}
            <div className="relative my-8 transition-transform duration-300 hover:scale-[1.02]">
              {/* Ground Shadow */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-52 h-8 bg-black/70 blur-xl rounded-full" />

              {/* Physical Pedal Enclosure in Authentic Warm Ivory (#F3EFE6) */}
              <div className="w-56 sm:w-64 bg-[#F3EFE6] text-[#0B0B0A] rounded-2xl p-6 shadow-2xl border-2 border-[#D6CFC0] relative flex flex-col justify-between h-[390px] select-none">
                {/* Vintage metallic rim highlight */}
                <div className="absolute inset-0 rounded-2xl border border-white/60 pointer-events-none" />

                {/* 4 Corner Chassis Hex Screws */}
                <div className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-[#BDB5A4] border border-[#7D7667]" />
                <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#BDB5A4] border border-[#7D7667]" />
                <div className="absolute bottom-2.5 left-2.5 w-2 h-2 rounded-full bg-[#BDB5A4] border border-[#7D7667]" />
                <div className="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full bg-[#BDB5A4] border border-[#7D7667]" />

                {/* Left & Right Jack Indicators */}
                <div className="absolute top-28 -left-3.5 w-3.5 h-8 bg-gradient-to-r from-zinc-400 to-zinc-600 rounded-l border border-zinc-500 shadow-md">
                  <div className="text-[7px] -rotate-90 text-white font-mono-tech font-bold translate-y-2">IN</div>
                </div>
                <div className="absolute top-28 -right-3.5 w-3.5 h-8 bg-gradient-to-l from-zinc-400 to-zinc-600 rounded-r border border-zinc-500 shadow-md">
                  <div className="text-[7px] rotate-90 text-white font-mono-tech font-bold translate-y-2">OUT</div>
                </div>

                {/* Knobs Section: GAIN, TONE, VOL */}
                <div>
                  <div className="flex justify-between items-center px-1 pt-1">
                    {/* GAIN KNOB */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#171513] border-2 border-zinc-700 shadow-lg relative flex items-center justify-center">
                        <div className="w-1 h-4 bg-sky-400 rounded-full absolute top-1 -rotate-45 shadow-[0_0_5px_#38bdf8]" />
                        <div className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-600" />
                      </div>
                      <span className="text-[10px] font-black tracking-widest text-[#0B0B0A] uppercase mt-2">
                        GAIN
                      </span>
                    </div>

                    {/* TONE KNOB */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#171513] border-2 border-zinc-700 shadow-lg relative flex items-center justify-center">
                        <div className="w-1 h-4 bg-amber-500 rounded-full absolute top-1 rotate-15 shadow-[0_0_5px_#f59e0b]" />
                        <div className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-600" />
                      </div>
                      <span className="text-[10px] font-black tracking-widest text-[#0B0B0A] uppercase mt-2">
                        TONE
                      </span>
                    </div>

                    {/* VOL KNOB */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#171513] border-2 border-zinc-700 shadow-lg relative flex items-center justify-center">
                        <div className="w-1 h-4 bg-yellow-400 rounded-full absolute top-1 rotate-60 shadow-[0_0_5px_#facc15]" />
                        <div className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-600" />
                      </div>
                      <span className="text-[10px] font-black tracking-widest text-[#0B0B0A] uppercase mt-2">
                        VOL
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center Graphic Branding: IDIOT Pedals */}
                <div className="text-center my-auto flex flex-col items-center justify-center">
                  <div className="text-4xl sm:text-5xl font-cinzel font-black tracking-wider text-[#0B0B0A] leading-none">
                    IDIOT
                  </div>
                  <div className="text-3xl sm:text-4xl font-script font-bold text-[#D91E18] -mt-1 -rotate-6 tracking-wide drop-shadow-sm">
                    Pedals
                  </div>
                  <div className="text-[8px] font-mono-tech font-bold tracking-widest text-[#8C857A] uppercase mt-1">
                    NEON FUZZ BOX
                  </div>
                </div>

                {/* Bottom Section: Red LED (Left), Footswitch (Center) */}
                <div className="flex items-center justify-between px-2 pt-2 border-t border-[#8C857A]/20">
                  {/* Glowing Red LED */}
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-4 h-4 rounded-full border border-red-950 transition-all duration-300 relative ${
                        isPedalEngaged
                          ? 'bg-[#FF2E2E] shadow-[0_0_18px_#FF2E2E,0_0_32px_rgba(217,30,24,0.9)]'
                          : 'bg-[#401212] shadow-inner'
                      }`}
                    >
                      {isPedalEngaged && (
                        <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full opacity-90" />
                      )}
                    </div>
                    <span className="text-[7px] font-mono-tech font-bold text-black/60 uppercase">
                      {isPedalEngaged ? 'ACTIVE' : 'TRUE BYPASS'}
                    </span>
                  </div>

                  {/* Chrome 3PDT Footswitch */}
                  <button
                    onClick={() => setIsPedalEngaged(!isPedalEngaged)}
                    className="w-14 h-14 rounded-full border-4 border-[#CBC5B6] bg-[#DDD6C8] flex items-center justify-center shadow-inner hover:scale-105 active:scale-95 transition-transform"
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

            {/* Live interactive prompt */}
            <p className="text-xs text-[#8C857A] flex items-center gap-1.5 mt-2">
              <Radio size={14} className={isPedalEngaged ? 'text-[#D91E18] animate-pulse' : 'text-zinc-600'} />
              <span>Tap footswitch or button to toggle True-Bypass LED</span>
            </p>
          </div>

          {/* Angle Switcher & Detailed Specs List */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-mono-tech uppercase tracking-widest text-[#D91E18] font-bold">
                Inspect Hardware
              </span>
              <h3 className="text-2xl font-bold tracking-tight text-[#F3EFE6]">
                {activeAngle.title}
              </h3>
              <p className="text-sm text-[#8C857A]">
                {activeAngle.description}
              </p>
            </div>

            {/* Highlights bullet points */}
            <div className="p-4 bg-[#171513] border border-[#8C857A]/25 rounded-lg space-y-2.5">
              <span className="text-xs font-mono-tech text-[#F3EFE6] font-semibold uppercase tracking-wider block mb-2">
                Engineering Highlights
              </span>
              {activeAngle.highlights.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-[#F3EFE6]">
                  <Check size={14} className="text-[#D91E18] shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Angle Select Buttons */}
            <div className="space-y-2">
              <span className="text-xs font-mono-tech text-[#8C857A] uppercase tracking-wider block">
                Select View Angle:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ANGLES.map((angle) => (
                  <button
                    key={angle.id}
                    onClick={() => setActiveAngle(angle)}
                    className={`px-3 py-2.5 rounded text-left text-xs font-medium transition-all border ${
                      activeAngle.id === angle.id
                        ? 'bg-[#171513] border-[#D91E18] text-[#F3EFE6] shadow-sm'
                        : 'bg-[#0B0B0A] border-[#8C857A]/25 text-[#8C857A] hover:border-[#8C857A]/50 hover:text-[#F3EFE6]'
                    }`}
                  >
                    <div className="font-semibold">{angle.title}</div>
                    <div className="text-[10px] opacity-75">{angle.badge}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Warranty badge */}
            <div className="flex items-center gap-3 pt-2 text-xs text-[#8C857A]">
              <Shield size={16} className="text-[#D91E18]" />
              <span>Lifetime repair guarantee on solder joints & pot assemblies.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
