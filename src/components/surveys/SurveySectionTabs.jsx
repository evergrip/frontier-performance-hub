import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function SurveySectionTabs({
  sections,
  activeSection,
  onSelectSection,
  sectionProgress,
  accentColor,
  headingFont,
  headingColor,
  cardBg,
  cardBorder,
  textColor,
}) {
  return (
    <div className="mb-6">
      {/* Desktop: horizontal tabs */}
      <div className="hidden sm:flex gap-1 flex-wrap">
        {sections.map((section, idx) => {
          const progress = sectionProgress[section.id] || { answered: 0, total: 0 };
          const isActive = activeSection === section.id;
          const isComplete = progress.total > 0 && progress.answered >= progress.total;
          const hasRequired = progress.total > 0;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelectSection(section.id)}
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border"
              style={{
                backgroundColor: isActive ? accentColor : cardBg,
                color: isActive ? '#fff' : textColor,
                borderColor: isActive ? accentColor : cardBorder,
                fontFamily: headingFont,
              }}
            >
              <span className="truncate max-w-[140px]">{section.title || `Section ${idx + 1}`}</span>
              {hasRequired && (
                isComplete ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: isActive ? '#fff' : '#22c55e' }} />
                ) : (
                  <span
                    className="text-xs shrink-0 px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : `${accentColor}15`,
                      color: isActive ? '#fff' : accentColor,
                    }}
                  >
                    {progress.answered}/{progress.total}
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile: scrollable chips */}
      <div className="sm:hidden overflow-x-auto pb-2 -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          {sections.map((section, idx) => {
            const progress = sectionProgress[section.id] || { answered: 0, total: 0 };
            const isActive = activeSection === section.id;
            const isComplete = progress.total > 0 && progress.answered >= progress.total;
            const hasRequired = progress.total > 0;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelectSection(section.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all border whitespace-nowrap"
                style={{
                  backgroundColor: isActive ? accentColor : cardBg,
                  color: isActive ? '#fff' : textColor,
                  borderColor: isActive ? accentColor : cardBorder,
                }}
              >
                {section.title || `Section ${idx + 1}`}
                {hasRequired && isComplete && (
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: isActive ? '#fff' : '#22c55e' }} />
                )}
                {hasRequired && !isComplete && (
                  <span
                    className="text-[10px] px-1 rounded-full"
                    style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : `${accentColor}15`,
                      color: isActive ? '#fff' : accentColor,
                    }}
                  >
                    {progress.answered}/{progress.total}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}