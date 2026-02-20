import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function WizardStepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center gap-2 py-4">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              i < currentStep 
                ? 'bg-green-500 text-white' 
                : i === currentStep 
                  ? 'bg-[#ea7924] text-white shadow-lg shadow-[#ea7924]/30' 
                  : 'bg-slate-200 text-slate-500'
            }`}>
              {i < currentStep ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
            </div>
            <span className={`text-sm hidden md:inline ${
              i === currentStep ? 'font-semibold text-slate-900' : 'text-slate-500'
            }`}>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 ${i < currentStep ? 'bg-green-500' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}