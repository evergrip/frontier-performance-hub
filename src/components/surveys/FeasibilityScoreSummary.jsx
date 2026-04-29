import React from "react";

const RISK_COLORS = {
  green: { bg: "#dcfce7", text: "#166534", label: "Green" },
  yellow: { bg: "#fef9c3", text: "#854d0e", label: "Yellow" },
  orange: { bg: "#fed7aa", text: "#9a3412", label: "Orange" },
  red: { bg: "#fecaca", text: "#991b1b", label: "Red" },
};

function getScoreColor(pct) {
  if (pct >= 85) return RISK_COLORS.green;
  if (pct >= 65) return RISK_COLORS.yellow;
  if (pct >= 45) return RISK_COLORS.orange;
  return RISK_COLORS.red;
}

export default function FeasibilityScoreSummary({ sections, sectionScores, accentColor, textColor }) {
  const scoredSections = sections.filter(s => {
    const sc = sectionScores[s.id];
    return sc && sc.max > 0;
  });

  if (scoredSections.length === 0) return null;

  // Calculate overall
  let totalScore = 0, totalMax = 0;
  scoredSections.forEach(s => {
    totalScore += sectionScores[s.id].score;
    totalMax += sectionScores[s.id].max;
  });
  const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const overallColor = getScoreColor(overallPct);

  return (
    <div className="mb-4 p-3 rounded-lg border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: textColor }}>Feasibility Score</span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: overallColor.bg, color: overallColor.text }}
        >
          {overallPct}% — {overallColor.label}
        </span>
      </div>
      <div className="flex gap-1">
        {scoredSections.map(s => {
          const sc = sectionScores[s.id];
          const pct = Math.round((sc.score / sc.max) * 100);
          const color = getScoreColor(pct);
          return (
            <div
              key={s.id}
              className="flex-1 h-2 rounded-full"
              style={{ backgroundColor: color.bg }}
              title={`${s.title}: ${pct}%`}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: color.text }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}