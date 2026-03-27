import React from 'react';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';

const SECTIONS = [
  'Site & Zoning Analysis',
  'Structural & Building Condition',
  'Utility & Service Assessment',
  'Budget Analysis',
  'Regulatory & Permit Pathway',
  'Risk Assessment',
  'Recommendations & Next Steps'
];

export default function BuilderSidebar({ activeSection, setActiveSection, sectionStats }) {
  return (
    <div className="w-64 shrink-0 hidden lg:block">
      <div className="sticky top-[140px] space-y-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">Report Sections</p>
        {SECTIONS.map((section, idx) => {
          const stats = sectionStats[section] || { total: 0, included: 0, complete: 0 };
          const isActive = section === activeSection;
          const allDone = stats.included > 0 && stats.complete === stats.included;

          return (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-white shadow-md border text-slate-900'
                  : 'text-slate-600 hover:bg-white/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  allDone ? 'bg-green-100 text-green-700' :
                  isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {allDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-slate-900' : ''}`}>{section}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {stats.complete}/{stats.included} complete
                  </p>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { SECTIONS };