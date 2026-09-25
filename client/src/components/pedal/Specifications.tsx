import React from 'react';
import { Cpu, Power, ShieldCheck, Box, Gauge, Volume2 } from 'lucide-react';

export const Specifications: React.FC = () => {
  const specs = [
    { label: 'Circuit Topology', value: '100% Pure Analog High-Gain Fuzz / Overdrive', icon: Cpu },
    { label: 'Bypass Switching', value: 'Mechanical 3PDT True-Bypass (Zero tone loss when disengaged)', icon: ShieldCheck },
    { label: 'Power Requirements', value: '9V DC Center-Negative (Standard pedal power supply, 2.1mm)', icon: Power },
    { label: 'Battery Operation', value: 'Internal 9V Battery Snap with isolated compartment', icon: Power },
    { label: 'Current Draw', value: 'Ultra-low < 12mA (extended battery life)', icon: Gauge },
    { label: 'Input Impedance', value: '500k Ohm (Guitar pickup friendly)', icon: Volume2 },
    { label: 'Output Impedance', value: '10k Ohm (Drives long pedal chains cleanly)', icon: Volume2 },
    { label: 'Enclosure Material', value: 'Die-cast Aluminum Chassis (Hammond 1590B footprint)', icon: Box },
    { label: 'Finish', value: 'Powder-coated Matte Obsidian with Neon Orange screenprint', icon: Box },
    { label: 'Dimensions', value: '112 mm (L) × 60 mm (W) × 31 mm (H)', icon: Box },
    { label: 'Weight', value: '260 g (Rugged tour-grade road stability)', icon: Gauge },
    { label: 'Origin', value: 'Hand-assembled & bench-tested in Burdwan, India', icon: ShieldCheck },
  ];

  return (
    <section id="specs" className="py-28 bg-[#FFF8F1] border-t border-[#F0D3B8] relative overflow-hidden">
      {/* Background bloom */}
      <div className="absolute bottom-10 left-1/3 w-[500px] h-[300px] bg-[#FF5E1E]/10 blur-[150px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-mono-tech uppercase tracking-[0.25em] text-[#FF5E1E] font-bold block">
            Technical Data Sheet
          </span>
          <h2 className="text-3xl sm:text-5xl font-editorial font-normal tracking-tight text-[#2A1A12]">
            Hardware Specifications
          </h2>
          <p className="text-xs sm:text-sm text-[#8A6A54] font-light leading-relaxed">
            Every component specified for low noise, reliable road performance, and consistent musical harmonic response.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {specs.map((spec, i) => {
            const Icon = spec.icon;
            return (
              <div
                key={i}
                className="p-5 bg-white border border-[#F0D3B8] rounded-2xl flex items-start gap-4 shadow-[0_8px_40px_-20px_rgba(255,94,30,0.3)] hover:border-[#FF5E1E]/50 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] text-white shrink-0 border border-[#FF5E1E]/30 shadow-lg shadow-[#FF5E1E]/30">
                  <Icon size={18} />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-mono-tech text-[#8A6A54] uppercase tracking-wider block">
                    {spec.label}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#2A1A12] font-mono-tech">
                    {spec.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
