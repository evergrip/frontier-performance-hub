import React from 'react';
import { Check, Building2 } from 'lucide-react';

export default function WizardStepNav({ steps, currentStep, onStepClick }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {steps.map((step, idx) => {
        const isActive = idx === currentStep;
        const isCompleted = idx < currentStep;
        const isDept = step.isDepartment;
        return (
          <button
            key={step.key}
            onClick={() => onStepClick(idx)}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              isActive
                ? isDept ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                : isCompleted
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              isActive ? (isDept ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white') : isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'
            }`}>
              {isCompleted ? <Check className="w-3 h-3" /> : isDept ? <Building2 className="w-3 h-3" /> : idx + 1}
            </div>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}