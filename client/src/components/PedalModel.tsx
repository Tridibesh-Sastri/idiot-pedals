import React from 'react';
import { motion, MotionValue, useTransform } from 'motion/react';

interface PedalModelProps {
  explodeProgress?: MotionValue<number>;
  yOffset?: MotionValue<number> | number;
  rotationX?: MotionValue<number> | number;
  rotationY?: MotionValue<number> | number;
  rotationZ?: MotionValue<number> | number;
  scale?: MotionValue<number> | number;
  isEngaged?: boolean;
  onToggleEngage?: () => void;
  interactive?: boolean;
}

export function PedalModel({
  explodeProgress,
  yOffset = 0,
  rotationX = 55,
  rotationY = 0,
  rotationZ = -25,
  scale = 1,
  isEngaged = true,
  onToggleEngage,
  interactive = true,
}: PedalModelProps) {
  const fakeProgress = {
    get: () => 0,
    onChange: () => () => {},
    on: () => () => {},
  } as unknown as MotionValue<number>;
  const progress = explodeProgress || fakeProgress;

  const knobsZ = useTransform(progress, [0, 1], [32, 260]);
  const enclosureTopZ = useTransform(progress, [0, 1], [16, 130]);
  const pcbZ = useTransform(progress, [0, 1], [0, 0]);
  const enclosureBottomZ = useTransform(progress, [0, 1], [-16, -130]);
  const jacksZ = useTransform(progress, [0, 1], [0, 0]);
  const jacksX = useTransform(progress, [0, 1], [0, 65]);

  return (
    <motion.div
      className="relative w-56 h-88 preserve-3d select-none"
      style={{
        rotateX: rotationX,
        rotateY: rotationY,
        rotateZ: rotationZ,
        y: yOffset,
        scale: scale,
      }}
    >
      {/* GROUND SHADOW */}
      <motion.div
        className="absolute inset-0 bg-black/80 blur-2xl rounded-2xl"
        style={{ z: -55, scale: 1.15 }}
      />

      {/* BOTTOM ENCLOSURE BASE */}
      <motion.div
        className="absolute inset-0 bg-[#0E131C] border-2 border-white/10 rounded-xl shadow-2xl preserve-3d"
        style={{ z: enclosureBottomZ }}
      >
        {/* Rubber Feet at 4 corners */}
        <div className="absolute top-3 left-3 w-4 h-4 bg-zinc-900 rounded-full border border-black shadow" />
        <div className="absolute top-3 right-3 w-4 h-4 bg-zinc-900 rounded-full border border-black shadow" />
        <div className="absolute bottom-3 left-3 w-4 h-4 bg-zinc-900 rounded-full border border-black shadow" />
        <div className="absolute bottom-3 right-3 w-4 h-4 bg-zinc-900 rounded-full border border-black shadow" />

        {/* Interior cavity */}
        <div className="absolute inset-3 bg-[#0B0E14] rounded-lg" style={{ transform: 'translateZ(6px)' }} />
      </motion.div>

      {/* INTERNAL CIRCUIT BOARD (PCB) */}
      <motion.div
        className="absolute inset-4 bg-[#0A1F16] border-2 border-[#1E5C38] rounded-md preserve-3d shadow-xl"
        style={{ z: pcbZ }}
      >
        {/* Copper Traces Simulation */}
        <div className="absolute inset-2 opacity-35 bg-[repeating-linear-gradient(45deg,#FF5E1E_0px,#FF5E1E_1px,transparent_1px,transparent_14px)]" />

        {/* Dual Op-Amp / Analog Diode Clipping Stage */}
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 w-14 h-20 bg-zinc-950 border border-zinc-700 flex flex-col items-center justify-center rounded-sm shadow-md"
          style={{ transform: 'translateZ(5px)' }}
        >
          <div className="text-[7px] text-[#FF5E1E] font-mono-tech font-bold tracking-wider">JRC4558D</div>
          <div className="text-[5px] text-zinc-500 font-mono-tech">DIODE CLIP</div>
          {/* Chip IC legs */}
          <div className="absolute -left-1 top-2 w-1 h-1 bg-zinc-400" />
          <div className="absolute -left-1 top-6 w-1 h-1 bg-zinc-400" />
          <div className="absolute -left-1 top-10 w-1 h-1 bg-zinc-400" />
          <div className="absolute -left-1 top-14 w-1 h-1 bg-zinc-400" />
          <div className="absolute -right-1 top-2 w-1 h-1 bg-zinc-400" />
          <div className="absolute -right-1 top-6 w-1 h-1 bg-zinc-400" />
          <div className="absolute -right-1 top-10 w-1 h-1 bg-zinc-400" />
          <div className="absolute -right-1 top-14 w-1 h-1 bg-zinc-400" />
        </div>

        {/* Vintage Capacitors & Resistors */}
        <div
          className="absolute top-6 left-5 w-4 h-7 bg-amber-700 rounded-sm border border-amber-900 shadow"
          style={{ transform: 'translateZ(6px)' }}
        />
        <div
          className="absolute top-6 right-5 w-4 h-7 bg-amber-700 rounded-sm border border-amber-900 shadow"
          style={{ transform: 'translateZ(6px)' }}
        />
        <div
          className="absolute bottom-20 left-6 w-5 h-9 bg-orange-700 rounded-full border border-orange-900 shadow-md"
          style={{ transform: 'translateZ(8px)' }}
        />
        <div
          className="absolute bottom-20 right-6 w-5 h-9 bg-orange-700 rounded-full border border-orange-900 shadow-md"
          style={{ transform: 'translateZ(8px)' }}
        />
        {/* 9V Battery Terminal */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 w-10 h-10 bg-zinc-900 rounded-full border-2 border-zinc-600 flex items-center justify-center"
          style={{ transform: 'translateZ(6px)' }}
        >
          <div className="w-4 h-4 rounded-full bg-zinc-700" />
        </div>
      </motion.div>

      {/* 1/4" AUDIO JACKS */}
      <motion.div
        className="absolute top-24 -left-5 w-5 h-12 bg-gradient-to-r from-zinc-500 to-zinc-700 rounded-l-md border-y-2 border-l-2 border-zinc-400 shadow-xl"
        style={{ z: jacksZ, x: useTransform(jacksX, (x) => -x) }}
      >
        <div className="absolute inset-y-2 right-1 w-1.5 bg-zinc-900 rounded-full" />
      </motion.div>
      <motion.div
        className="absolute top-24 -right-5 w-5 h-12 bg-gradient-to-l from-zinc-500 to-zinc-700 rounded-r-md border-y-2 border-r-2 border-zinc-400 shadow-xl"
        style={{ z: jacksZ, x: jacksX }}
      >
        <div className="absolute inset-y-2 left-1 w-1.5 bg-zinc-900 rounded-full" />
      </motion.div>

      {/* TOP ENCLOSURE CHASSIS (MATTE OBSIDIAN WITH NEON ORANGE) */}
      <motion.div
        className="absolute inset-0 bg-[#161C28] rounded-2xl shadow-2xl border border-white/15 flex flex-col items-center justify-between p-6 preserve-3d overflow-hidden"
        style={{ z: enclosureTopZ }}
      >
        {/* 4 Corner Screws */}
        <div className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-zinc-500 border border-zinc-700 flex items-center justify-center" />
        <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-zinc-500 border border-zinc-700 flex items-center justify-center" />
        <div className="absolute bottom-2.5 left-2.5 w-2 h-2 rounded-full bg-zinc-500 border border-zinc-700 flex items-center justify-center" />
        <div className="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full bg-zinc-500 border border-zinc-700 flex items-center justify-center" />

        {/* Top Control Area: GAIN | TONE | VOL */}
        <div className="w-full flex justify-between px-1 pt-2">
          {/* GAIN */}
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center relative">
              <div className="absolute -top-1 w-0.5 h-1 bg-[#FF5E1E]" />
              <div className="absolute -bottom-1 w-0.5 h-1 bg-white/40" />
            </div>
            <span className="text-[10px] font-mono-tech font-bold tracking-widest text-[#FF5E1E] uppercase mt-2">
              GAIN
            </span>
          </div>

          {/* TONE */}
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center relative">
              <div className="absolute -top-1 w-0.5 h-1 bg-amber-400" />
              <div className="absolute -bottom-1 w-0.5 h-1 bg-white/40" />
            </div>
            <span className="text-[10px] font-mono-tech font-bold tracking-widest text-amber-400 uppercase mt-2">
              TONE
            </span>
          </div>

          {/* VOL */}
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center relative">
              <div className="absolute -top-1 w-0.5 h-1 bg-[#FF7A00]" />
              <div className="absolute -bottom-1 w-0.5 h-1 bg-white/40" />
            </div>
            <span className="text-[10px] font-mono-tech font-bold tracking-widest text-[#FF7A00] uppercase mt-2">
              VOL
            </span>
          </div>
        </div>

        {/* Center/Lower Brand: IDIOT Pedals */}
        <div className="flex flex-col items-center justify-center my-auto pt-3">
          <div className="text-3xl font-editorial font-bold tracking-wider text-[#F6F4EE] leading-none uppercase">
            IDIOT
          </div>
          <div className="text-2xl font-script font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-[#FF4500] -mt-1 -rotate-4 tracking-wide">
            Pedals
          </div>
          <div className="text-[7px] font-mono-tech font-bold tracking-[0.25em] text-[#8E98A8] uppercase mt-1">
            NEON FUZZ BOX
          </div>
        </div>

        {/* Bottom Area: Red LED (Left) + Heavy Switch Nut (Center) */}
        <div className="w-full flex items-center justify-between px-2 pb-2">
          {/* Glowing Status LED */}
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-3.5 h-3.5 rounded-full border border-red-950 transition-all duration-300 relative ${
                isEngaged
                  ? 'bg-[#FF5E1E] shadow-[0_0_16px_#FF5E1E,0_0_30px_rgba(255,94,30,0.8)]'
                  : 'bg-[#401212] shadow-inner'
              }`}
            >
              {isEngaged && (
                <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full opacity-80" />
              )}
            </div>
            <span className="text-[7px] font-mono-tech font-bold tracking-wider text-[#8E98A8] uppercase">
              {isEngaged ? 'ON' : 'BYPASS'}
            </span>
          </div>

          {/* Chrome Hex Nut for Footswitch */}
          <div className="w-14 h-14 rounded-full border-4 border-zinc-700 bg-zinc-800 flex items-center justify-center shadow-inner">
            <div className="w-9 h-9 rounded-full border border-zinc-500 bg-zinc-700" />
          </div>

          <div className="w-6" />
        </div>
      </motion.div>

      {/* KNOBS & FOOTSWITCH LAYER */}
      <motion.div
        className="absolute inset-0 pointer-events-none preserve-3d"
        style={{ z: knobsZ }}
      >
        {/* GAIN KNOB */}
        <div
          className="absolute top-7 left-6 w-11 h-11 bg-zinc-950 rounded-full shadow-2xl border-2 border-zinc-700 flex items-center justify-center preserve-3d"
          style={{ transform: 'translateZ(12px)' }}
        >
          <div className="w-1 h-4 bg-[#FF5E1E] absolute top-1 rounded-full shadow-[0_0_6px_#FF5E1E] -rotate-45" />
        </div>

        {/* TONE KNOB */}
        <div
          className="absolute top-7 left-1/2 -translate-x-1/2 w-11 h-11 bg-zinc-950 rounded-full shadow-2xl border-2 border-zinc-700 flex items-center justify-center preserve-3d"
          style={{ transform: 'translateZ(12px)' }}
        >
          <div className="w-1 h-4 bg-amber-400 absolute top-1 rounded-full shadow-[0_0_6px_#f59e0b] rotate-15" />
        </div>

        {/* VOL KNOB */}
        <div
          className="absolute top-7 right-6 w-11 h-11 bg-zinc-950 rounded-full shadow-2xl border-2 border-zinc-700 flex items-center justify-center preserve-3d"
          style={{ transform: 'translateZ(12px)' }}
        >
          <div className="w-1 h-4 bg-[#FF7A00] absolute top-1 rounded-full shadow-[0_0_6px_#FF7A00] rotate-45" />
        </div>

        {/* 3PDT CHROME FOOTSWITCH */}
        <div
          onClick={interactive ? onToggleEngage : undefined}
          className={`absolute bottom-7 left-1/2 -translate-x-1/2 w-11 h-11 bg-gradient-to-b from-zinc-300 via-zinc-500 to-zinc-600 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.6)] border-2 border-zinc-400 flex items-center justify-center preserve-3d transition-transform ${
            interactive ? 'pointer-events-auto cursor-pointer active:scale-90 hover:brightness-110' : ''
          }`}
          style={{ transform: 'translateZ(20px)' }}
          title={interactive ? 'Click to stomp footswitch' : undefined}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-400 via-zinc-200 to-zinc-500 border border-zinc-300 shadow-inner flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-zinc-300 border border-zinc-500 shadow-sm" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
