import React from 'react';
import { Sliders } from 'lucide-react';

export const ControlsOverview: React.FC = () => {
  const controls = [
    {
      label: 'GAIN',
      pointerColor: 'bg-[#FF5E1E]',
      shadowColor: '#FF5E1E',
      range: '7:00 to 5:00',
      description: 'Controls the saturation depth of the dual-stage analog diode clipping circuit.',
      sweetSpots: [
        { setting: '9:00', label: 'Warm Tweed Breakup (dynamic blues touch response)' },
        { setting: '12:00', label: 'Classic 70s Sustained Vintage Fuzz' },
        { setting: '4:00', label: 'Full Compressed Wall-of-Sound Saturation' },
      ],
    },
    {
      label: 'TONE',
      pointerColor: 'bg-amber-400',
      shadowColor: '#f59e0b',
      range: 'Tilt EQ Filter',
      description: 'Custom-tapered passive high-cut filter designed to eliminate harsh digital fizz while preserving punchy bass definition.',
      sweetSpots: [
        { setting: '10:00', label: 'Dark, velvety wool for bright Single Coils' },
        { setting: '1:00', label: 'Balanced mix-cutting bite for humbuckers' },
        { setting: '3:00', label: 'Razor-sharp harmonic overtones for lead soloing' },
      ],
    },
    {
      label: 'VOL',
      pointerColor: 'bg-[#FF7A00]',
      shadowColor: '#FF7A00',
      range: '+18dB Headroom',
      description: 'High-headroom master output. Unity gain sits around 11:00, leaving massive extra punch to slam your tube preamp.',
      sweetSpots: [
        { setting: '11:00', label: 'Unity Gain match' },
        { setting: '2:00', label: 'Solo Boost (+6dB push over rhythm level)' },
        { setting: '5:00', label: 'Preamp slam mode (drives amp front-end)' },
      ],
    },
  ];

  return (
    <section className="py-28 bg-[#0B0E14] border-t border-white/10 relative overflow-hidden">
      {/* Ambient background bloom */}
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[400px] bg-[#FF5E1E]/5 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#121722] border border-[#FF5E1E]/30 rounded-full text-xs font-mono-tech uppercase tracking-[0.25em] text-[#FF5E1E]">
            <Sliders size={13} className="text-[#FF5E1E]" />
            Operator Manual
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-editorial font-normal tracking-tight text-[#F6F4EE]">
            Three Controls. Infinite Character.
          </h2>
          <p className="text-sm sm:text-base text-[#8E98A8] font-light leading-relaxed">
            We refused to clutter the faceplate with gimmick switches. Every potentiometer has been calibrated with an audio taper that turns the entire sweep into a sweet spot.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {controls.map((ctrl) => (
            <div
              key={ctrl.label}
              className="bg-[#121722]/80 border border-white/10 rounded-3xl p-6 sm:p-8 hover:border-[#FF5E1E]/40 transition-all shadow-xl backdrop-blur-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#0B0E14] border-2 border-zinc-700 flex items-center justify-center relative shadow-inner">
                      <div className={`w-1 h-4 ${ctrl.pointerColor} rounded-full absolute top-1 shadow-[0_0_6px_currentColor]`} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-editorial font-bold text-[#F6F4EE]">{ctrl.label}</h3>
                      <span className="text-[10px] font-mono-tech text-[#8E98A8] uppercase tracking-widest">{ctrl.range}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono-tech text-[#FF5E1E] font-bold">16mm ALPHA</span>
                </div>

                <p className="text-xs sm:text-sm text-[#8E98A8] leading-relaxed mb-6 font-light">
                  {ctrl.description}
                </p>
              </div>

              {/* Sweet Spots */}
              <div className="bg-[#0B0E14] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-2">
                <span className="text-[10px] font-mono-tech text-[#FF5E1E] uppercase tracking-widest font-bold block mb-1">
                  Workbench Dial Settings:
                </span>
                {ctrl.sweetSpots.map((spot, i) => (
                  <div key={i} className="text-xs font-mono-tech flex items-start gap-2 text-[#8E98A8]">
                    <span className="text-[#F6F4EE] font-bold shrink-0">{spot.setting}:</span>
                    <span className="font-light">{spot.label}</span>
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
