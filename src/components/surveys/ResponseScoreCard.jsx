import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

function getScoreColor(pct) {
  if (pct >= 75) return "text-green-600";
  if (pct >= 50) return "text-amber-600";
  return "text-red-600";
}

function getScoreBg(pct) {
  if (pct >= 75) return "bg-green-100 text-green-700";
  if (pct >= 50) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export default function ResponseScoreCard({ response, compact = false }) {
  const { total_score, max_possible_score, score_percentage, category_scores } = response;

  if (!max_possible_score && max_possible_score !== 0) return null;
  if (max_possible_score === 0) return null;

  const categories = Object.entries(category_scores || {});

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={getScoreBg(score_percentage)}>
          {score_percentage}% ({total_score}/{max_possible_score})
        </Badge>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-amber-50/30 border-amber-200/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700">Qualification Score</p>
          <div className="text-right">
            <span className={`text-2xl font-bold ${getScoreColor(score_percentage)}`}>{score_percentage}%</span>
            <p className="text-xs text-slate-500">{total_score} / {max_possible_score} points</p>
          </div>
        </div>

        <Progress value={score_percentage} className="h-2.5 mb-4" />

        {categories.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">By Section</p>
            {categories.map(([key, cat]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-32 truncate">{cat.title || key}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${cat.pct >= 75 ? 'bg-green-500' : cat.pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                    style={{ width: `${cat.pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-600 w-16 text-right">
                  {cat.score}/{cat.max} ({cat.pct}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}