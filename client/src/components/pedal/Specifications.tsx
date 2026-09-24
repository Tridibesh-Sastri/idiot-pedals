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
    { label: 'Finish', value: 'Powder-coated Warm Ivory with dual-coat screen printing', icon: Box },
    { label: 'Dimensions', value: '112 mm (L) × 60 mm (W) × 31 mm (H)', icon: Box },
    { label: 'Weight', value: '260 g (Rugged tour-grade road stability)', icon: Gauge },
    { label: 'Origin', value: 'Hand-assembled & bench-tested in Kolkata, India', icon: ShieldCheck },
  ];

  return (
    <section className="py-20 bg-[#171513]/50 border-t border-[#8C857A]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-mono-tech uppercase tracking-widest text-[#D91E18] font-bold block mb-2">
            Technical Data Sheet
          </span>
          <h2 className="text-3xl sm:text-4xl font-cinzel font-black tracking-tight text-[#F3EFE6] mb-3">
            Hardware Specifications
          </h2>
          <p className="text-xs sm:text-sm text-[#8C857A]">
            Every component specified for low noise, reliable road performance, and consistent musical harmonic response.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {specs.map((spec, i) => {
            const Icon = spec.icon;
            return (
              <div
                key={i}
                className="p-4 bg-[#0B0B0A] border border-[#8C857A]/20 rounded-xl flex items-start gap-3.5"
              >
                <div className="p-2 rounded-lg bg-[#171513] text-[#D91E18] shrink-0 border border-[#8C857A]/20">
                  <Icon size={16} />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-mono-tech text-[#8C857A] uppercase tracking-wider block">
                    {spec.label}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#F3EFE6]">
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
