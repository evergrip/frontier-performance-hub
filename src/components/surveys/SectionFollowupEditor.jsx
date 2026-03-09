import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Zap } from "lucide-react";

function generateRuleId() {
  return "sfr_" + Math.random().toString(36).substring(2, 9);
}

export default function SectionFollowupEditor({ rules = [], headings = [], questions = [], onChange }) {
  const followupQuestions = questions.filter(q => q.is_followup);

  const addRule = () => {
    onChange([...rules, {
      id: generateRuleId(),
      heading_id: "",
      threshold_score: 0,
      followup_question_ids: [],
    }]);
  };

  const updateRule = (index, updates) => {
    onChange(rules.map((r, i) => i === index ? { ...r, ...updates } : r));
  };

  const removeRule = (index) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  const toggleQuestionInRule = (ruleIndex, questionId) => {
    const rule = rules[ruleIndex];
    const ids = rule.followup_question_ids || [];
    const updated = ids.includes(questionId)
      ? ids.filter(id => id !== questionId)
      : [...ids, questionId];
    updateRule(ruleIndex, { followup_question_ids: updated });
  };

  if (headings.length === 0) {
    return (
      <div className="text-xs text-slate-400 italic py-2">
        Add sections first to create section-based follow-up rules.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Section Score Follow-ups
          </Label>
          <p className="text-xs text-slate-500 mt-0.5">
            Show follow-up questions when a section's score meets a threshold
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addRule}>
          <Plus className="w-3 h-3 mr-1" /> Add Rule
        </Button>
      </div>

      {followupQuestions.length === 0 && rules.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          No follow-up questions found. Mark questions as "Follow-up question" in the question editor to use them here.
        </div>
      )}

      {rules.map((rule, i) => {
        const heading = headings.find(h => h.id === rule.heading_id);
        const availableFollowups = followupQuestions.filter(q => 
          !rule.heading_id || q.category_id === rule.heading_id || !q.category_id
        );

        return (
          <Card key={rule.id || i} className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-700 text-[10px]">Rule {i + 1}</Badge>
                  {heading && <span className="text-xs text-slate-500">→ {heading.title}</span>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeRule(i)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-600">When section</Label>
                  <Select
                    value={rule.heading_id || "none"}
                    onValueChange={v => updateRule(i, { heading_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select section..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select section...</SelectItem>
                      {headings.map(h => (
                        <SelectItem key={h.id} value={h.id}>{h.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Score reaches or exceeds</Label>
                  <Input
                    type="number"
                    min={0}
                    value={rule.threshold_score || ""}
                    onChange={e => updateRule(i, { threshold_score: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 10"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-600 mb-1 block">Then show these follow-up questions:</Label>
                {availableFollowups.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No follow-up questions available. Mark questions as "Follow-up question" first.</p>
                ) : (
                  <div className="space-y-1">
                    {availableFollowups.map(q => {
                      const selected = (rule.followup_question_ids || []).includes(q.id);
                      return (
                        <label key={q.id} className="flex items-center gap-2 cursor-pointer text-xs p-1.5 rounded hover:bg-white/50">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleQuestionInRule(i, q.id)}
                            className="rounded border-slate-300"
                          />
                          <span className={selected ? "text-amber-800 font-medium" : "text-slate-600"}>
                            {q.text || "(Untitled question)"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}