import React from "react";
import { CheckCircle2, AlertTriangle, Circle, Loader2 } from "lucide-react";

function getSectionStatus(progress, isRiskTriggered) {
  if (isRiskTriggered) return "risk";
  if (!progress || progress.total === 0) {
    if (progress?.answered > 0) return "in_progress";
    return "not_started";
  }
  if (progress.answered >= progress.total) return "complete";
  if (progress.answered > 0) return "in_progress";
  return "not_started";
}

function StatusIcon({ status, isActive }) {
  const color = isActive ? '#fff' : undefined;
  switch (status) {
    case "complete":
      return <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: color || '#22c55e' }} />;
    case "risk":
      return <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: color || '#ef4444' }} />;
    case "in_progress":
      return <Loader2 className="w-3.5 h-3.5 shrink-0" style={{ color: color || '#f59e0b' }} />;
    default:
      return <Circle className="w-3.5 h-3.5 shrink-0" style={{ color: color || '#94a3b8' }} />;
  }
}

export default function SurveySectionTabs({
  sections,
  activeSection,
  onSelectSection,
  sectionProgress,
  sectionScores,
  riskTriggeredSections,
  accentColor,
  headingFont,
  headingColor,
  cardBg,
  cardBorder,
  textColor,
}) {
  const triggeredSet = new Set(riskTriggeredSections || []);

  return (
    <div className="mb-6">
      {/* Desktop: horizontal tabs */}
      <div className="hidden sm:flex gap-1 flex-wrap">
        {sections.map((section, idx) => {
          const progress = sectionProgress[section.id] || { answered: 0, total: 0 };
          const isActive = activeSection === section.id;
          const isRiskTriggered = triggeredSet.has(section.title) || triggeredSet.has(section.id);
          const status = getSectionStatus(progress, isRiskTriggered);
          const hasRequired = progress.total > 0;

          // Score display for scored sections
          const scoreData = sectionScores?.[section.id];
          const scorePct = scoreData?.max > 0 ? Math.round((scoreData.score / scoreData.max) * 100) : null;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelectSection(section.id)}
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border"
              style={{
                backgroundColor: isActive ? accentColor : cardBg,
                color: isActive ? '#fff' : textColor,
                borderColor: isActive ? accentColor : isRiskTriggered ? '#ef4444' : cardBorder,
                fontFamily: headingFont,
              }}
            >
              <StatusIcon status={status} isActive={isActive} />
              <span className="truncate max-w-[140px]">{section.title || `Section ${idx + 1}`}</span>
              {hasRequired && status !== "complete" && status !== "risk" && (
                <span
                  className="text-xs shrink-0 px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : `${accentColor}15`,
                    color: isActive ? '#fff' : accentColor,
                  }}
                >
                  {progress.answered}/{progress.total}
                </span>
              )}
              {scorePct !== null && scorePct < 65 && !isActive && (
                <span className="text-[10px] px-1 py-0.5 rounded-full bg-red-100 text-red-600 font-bold shrink-0">
                  {scorePct}%
                </span>
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
            const isRiskTriggered = triggeredSet.has(section.title) || triggeredSet.has(section.id);
            const status = getSectionStatus(progress, isRiskTriggered);
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
                  borderColor: isActive ? accentColor : isRiskTriggered ? '#ef4444' : cardBorder,
                }}
              >
                <StatusIcon status={status} isActive={isActive} />
                {section.title || `Section ${idx + 1}`}
                {hasRequired && status !== "complete" && (
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