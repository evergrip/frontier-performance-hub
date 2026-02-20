import React from 'react';
import { Check } from 'lucide-react';

export default function WizardStepper({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-[#ea7924] text-white ring-4 ring-orange-100' : 'bg-slate-200 text-slate-500'}
              `}>
                {isCompleted ? <Check className="w-5 h-5" /> : i + 1}
              </div>
              <span className={`text-xs mt-1.5 font-medium max-w-[80px] text-center ${isCurrent ? 'text-[#ea7924]' : 'text-slate-400'}`}>
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mx-1 ${i < currentStep ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}