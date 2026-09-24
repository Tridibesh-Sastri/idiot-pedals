import React from 'react';
import { Sliders, Zap, ShieldAlert, Cpu } from 'lucide-react';

export const ControlsOverview: React.FC = () => {
  const controls = [
    {
      label: 'GAIN',
      pointerColor: 'bg-sky-400',
      shadowColor: '#38bdf8',
      range: '7:00 to 5:00',
      description: 'Controls the saturation depth of the dual-stage analog clipping circuit.',
      sweetSpots: [
        { setting: '9:00', label: 'Warm Tweed Breakup (dynamic blues response)' },
        { setting: '12:00', label: 'Classic 70s Sustained Fuzz' },
        { setting: '4:00', label: 'Full Compressed Wall-of-Sound Fuzz' },
      ],
    },
    {
      label: 'TONE',
      pointerColor: 'bg-amber-500',
      shadowColor: '#f59e0b',
      range: 'Tilt EQ Filter',
      description: 'Custom-tapered passive high-cut filter designed to eliminate harsh digital fizz while preserving punchy bass definition.',
      sweetSpots: [
        { setting: '10:00', label: 'Dark, velvety wool for bright Single Coils' },
        { setting: '1:00', label: 'Balanced mix-cutting bite' },
        { setting: '3:00', label: 'Razor-sharp harmonic overtones for lead soloing' },
      ],
    },
    {
      label: 'VOL',
      pointerColor: 'bg-yellow-400',
      shadowColor: '#facc15',
      range: '+18dB Boost',
      description: 'High-headroom master output. Unity gain sits around 11:00, leaving massive extra punch to slam your tube preamp.',
      sweetSpots: [
        { setting: '11:00', label: 'Unity Gain match' },
        { setting: '2:00', label: 'Solo Boost (+6dB push over rhythm level)' },
        { setting: '5:00', label: 'Preamp slam mode' },
      ],
    },
  ];

  return (
    <section className="py-20 bg-[#0B0B0A] border-t border-[#8C857A]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#171513] border border-[#8C857A]/30 rounded-full text-xs font-mono-tech uppercase tracking-widest text-[#8C857A] mb-4">
            <Sliders size={14} className="text-[#D91E18]" />
            Operator Manual
          </div>
          <h2 className="text-3xl sm:text-5xl font-cinzel font-black tracking-tight text-[#F3EFE6] mb-4">
            Three Controls. Infinite Character.
          </h2>
          <p className="text-sm sm:text-base text-[#8C857A]">
            We refused to clutter the faceplate with gimmick switches. Every pot has been calibrated with an audio taper that turns the entire sweep into a sweet spot.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {controls.map((ctrl) => (
            <div
              key={ctrl.label}
              className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 hover:border-[#8C857A]/50 transition-all shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#8C857A]/20 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0B0B0A] border-2 border-zinc-700 flex items-center justify-center relative shadow-inner">
                      <div className={`w-1 h-3.5 ${ctrl.pointerColor} rounded-full absolute top-1`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black font-cinzel text-[#F3EFE6]">{ctrl.label}</h3>
                      <span className="text-[10px] font-mono-tech text-[#8C857A] uppercase">{ctrl.range}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono-tech text-[#D91E18] font-bold">16mm ALPHA POT</span>
                </div>

                <p className="text-xs sm:text-sm text-[#8C857A] leading-relaxed mb-6">
                  {ctrl.description}
                </p>
              </div>

              {/* Sweet Spots */}
              <div className="bg-[#0B0B0A] p-4 rounded-xl border border-[#8C857A]/20 space-y-2">
                <span className="text-[10px] font-mono-tech text-[#F3EFE6] uppercase tracking-wider font-bold block mb-1">
                  Workbench Dial Settings:
                </span>
                {ctrl.sweetSpots.map((spot, i) => (
                  <div key={i} className="text-xs flex items-start gap-2 text-[#8C857A]">
                    <span className="font-mono-tech text-white font-bold shrink-0">{spot.setting}:</span>
                    <span>{spot.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
