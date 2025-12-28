
import React from 'react';
import { Step } from '../types';

interface PatternGridProps {
  steps: Step[];
  currentStepIndex: number;
  onToggleStep: (idx: number) => void;
  onPitchChange: (idx: number, pitch: number) => void;
}

export const PatternGrid: React.FC<PatternGridProps> = ({ steps, currentStepIndex, onToggleStep, onPitchChange }) => {
  return (
    <div className="grid grid-cols-8 md:grid-cols-16 gap-2 w-full p-4 bg-black/40 rounded-b-xl border border-white/5">
      {steps.map((step, idx) => (
        <div key={idx} className="flex flex-col items-center space-y-2 relative">
          <button
            onClick={() => onToggleStep(idx)}
            className={`w-full h-12 rounded-sm border transition-all duration-75 relative overflow-hidden ${
              step.active 
                ? 'bg-red-600 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
            } ${currentStepIndex === idx ? 'ring-2 ring-white/50 scale-105 z-10' : ''}`}
          >
            {/* Playhead highlight overlay */}
            {currentStepIndex === idx && (
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            )}
          </button>
          <input 
            type="number"
            value={step.pitch}
            onChange={(e) => onPitchChange(idx, parseInt(e.target.value))}
            className={`w-full bg-transparent border-b border-zinc-800 text-[10px] text-center mono transition-colors focus:outline-none focus:border-orange-500 ${
              currentStepIndex === idx ? 'text-white border-zinc-500' : 'text-zinc-400'
            }`}
            min="-12"
            max="12"
          />
        </div>
      ))}
    </div>
  );
};
