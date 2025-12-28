
import React from 'react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  unit?: string;
}

export const Knob: React.FC<KnobProps> = ({ label, value, min, max, onChange, unit = "" }) => {
  return (
    <div className="flex flex-col items-center space-y-1">
      <div className="text-[10px] uppercase font-bold text-gray-500 tracking-tighter">{label}</div>
      <div className="relative group flex items-center justify-center">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          step={(max - min) / 100}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-16 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
        />
      </div>
      <div className="mono text-[11px] text-orange-400">
        {value.toFixed(1)}{unit}
      </div>
    </div>
  );
};
