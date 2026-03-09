import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function ScoringEditor({ question, headings = [], onChange }) {
  const [expanded, setExpanded] = useState(false);
  const hasOptions = ["radio", "checkbox", "dropdown"].includes(question.type);
  const isScoreable = hasOptions || ["rating", "scale", "number"].includes(question.type);

  if (!isScoreable) return null;

  const optionScores = question.option_scores || {};
  const hasScores = hasOptions ? Object.keys(optionScores).length > 0 : (question.points > 0);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-amber-800 cursor-pointer">Scoring</Label>
          {hasScores && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Active</Badge>}
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-amber-600" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-600" />}
      </div>

      {expanded && (
        <div className="space-y-3 pt-1">
          {/* Category assignment */}
          {headings.length > 0 && (
            <div>
              <Label className="text-xs text-amber-700">Section</Label>
              <Select
                value={question.category_id || "none"}
                onValueChange={v => onChange({ ...question, category_id: v === "none" ? "" : v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select section..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No section</SelectItem>
                  {headings.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Weight */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs text-amber-700">Weight Multiplier</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={question.weight ?? 1}
                onChange={e => onChange({ ...question, weight: parseFloat(e.target.value) || 1 })}
                className="h-8 text-xs"
              />
            </div>
            {!hasOptions && (
              <div className="flex-1">
                <Label className="text-xs text-amber-700">Max Points</Label>
                <Input
                  type="number"
                  min={0}
                  value={question.points ?? (question.type === "rating" ? 5 : question.type === "scale" ? 10 : 1)}
                  onChange={e => onChange({ ...question, points: parseInt(e.target.value) || 0 })}
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>

          {/* Per-option scoring */}
          {hasOptions && (
            <div>
              <Label className="text-xs text-amber-700">Points per Option</Label>
              <div className="space-y-1.5 mt-1">
                {(question.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 flex-1 truncate">{opt}</span>
                    <Input
                      type="number"
                      min={0}
                      value={optionScores[opt] ?? ""}
                      onChange={e => {
                        const newScores = { ...optionScores };
                        if (e.target.value === "") {
                          delete newScores[opt];
                        } else {
                          newScores[opt] = parseInt(e.target.value) || 0;
                        }
                        onChange({ ...question, option_scores: newScores });
                      }}
                      placeholder="0"
                      className="w-20 h-7 text-xs text-right"
                    />
                    <span className="text-[10px] text-amber-600 w-6">pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}