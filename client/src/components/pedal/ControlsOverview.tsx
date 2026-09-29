import React from "react";
import { Sliders } from "lucide-react";

interface Control {
  label: string;
  pointerColor: string;
  /** Optional: the Gain card has no spec line under its label. */
  range?: string;
  description: string;
}

export const ControlsOverview: React.FC = () => {
  const controls: Control[] = [
    {
      label: "GAIN",
      pointerColor: "bg-[#FF5E1E]",
      description:
        "Controls the saturation depth of the dual-stage analog diode clipping circuit.",
    },
    {
      label: "TONE",
      pointerColor: "bg-amber-400",
      range: "Tilt EQ Filter",
      description:
        "Tone inspired from Big muff Pi, classic mid scoop, bass and treble control with a single knob.",
    },
    {
      label: "VOL",
      pointerColor: "bg-[#FF7A00]",
      range: "+18dB Headroom",
      description: "Just a volume knob.",
    },
  ];

  return (
    <section className="py-28 bg-[#FFF8F1] border-t border-[#F0D3B8] relative overflow-hidden">
      {/* Ambient background bloom */}
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[400px] bg-[#FF5E1E]/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-[#FF5E1E]/30 rounded-full text-xs font-mono-tech uppercase tracking-[0.25em] text-[#FF5E1E] shadow-sm">
            <Sliders size={13} className="text-[#FF5E1E]" />
            Operator Manual
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-editorial font-normal tracking-tight text-[#2A1A12]">
            Simple and Efficient
          </h2>
          <p className="text-sm sm:text-base text-[#8A6A54] font-light leading-relaxed">
            Forget complex features, just turn on and dial your tone!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {controls.map((ctrl) => (
            <div
              key={ctrl.label}
              className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 hover:border-[#FF5E1E]/50 transition-all shadow-[0_8px_40px_-16px_rgba(255,94,30,0.25)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#F0D3B8] mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#FFF1E6] border-2 border-[#E4C3A5] flex items-center justify-center relative shadow-inner">
                      <div
                        className={`w-1 h-4 ${ctrl.pointerColor} rounded-full absolute top-1 shadow-[0_0_6px_currentColor]`}
                      />
                    </div>
                    <div>
                      <h3 className="text-2xl font-editorial font-bold text-[#2A1A12]">
                        {ctrl.label}
                      </h3>
                      {ctrl.range && (
                        <span className="text-[10px] font-mono-tech text-[#8A6A54] uppercase tracking-widest">
                          {ctrl.range}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#8A6A54] leading-relaxed font-light">
                  {ctrl.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
