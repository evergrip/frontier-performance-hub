import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import QuestionEditor from "./QuestionEditor";

const QUESTION_TYPES = [
  { value: "radio", label: "Single Choice" },
  { value: "checkbox", label: "Multiple Choice" },
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "dropdown", label: "Dropdown" },
  { value: "number", label: "Number" },
  { value: "scale", label: "Scale" },
  { value: "rating", label: "Rating" },
  { value: "date", label: "Date" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL" },
  { value: "file_upload", label: "File Upload" },
];

function generateId() {
  return "q_" + Math.random().toString(36).substring(2, 9);
}

export default function SectionBlock({
  heading,
  questions,
  allQuestions,
  headings,
  followupRules,
  onUpdateHeading,
  onRemoveHeading,
  onUpdateQuestion,
  onRemoveQuestion,
  onMoveQuestion,
  onDuplicateQuestion,
  onAddQuestion,
  onUpdateFollowupRules,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const sectionQuestions = questions.filter(q => q.category_id === heading.id);
  
  // Calculate section score summary
  const scoreSummary = sectionQuestions.reduce((acc, q) => {
    const hasOptions = ["radio", "checkbox", "dropdown"].includes(q.type);
    if (hasOptions && q.option_scores) {
      const maxOptionScore = Math.max(0, ...Object.values(q.option_scores));
      acc.maxScore += maxOptionScore * (q.weight || 1);
    } else if (["rating", "scale", "number"].includes(q.type)) {
      const pts = q.points ?? (q.type === "rating" ? 5 : q.type === "scale" ? 10 : 1);
      acc.maxScore += pts * (q.weight || 1);
    }
    return acc;
  }, { maxScore: 0 });

  // Get followup rules for this section
  const sectionRules = (followupRules || []).filter(r => r.heading_id === heading.id);

  const handleAddQuestion = (type) => {
    const newQ = {
      id: generateId(),
      text: "",
      type,
      required: false,
      category_id: heading.id,
      options: ["radio", "checkbox", "dropdown"].includes(type) ? ["Option 1", "Option 2"] : undefined,
      allowed_file_types: type === "file_upload" ? ["image", "video", "audio"] : undefined,
      max_files: type === "file_upload" ? 5 : undefined,
    };
    onAddQuestion(newQ);
  };

  return (
    <div className="border-2 border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Input
                value={heading.title}
                onChange={e => onUpdateHeading("title", e.target.value)}
                placeholder="Section title (e.g. Planning)"
                className="font-semibold text-base bg-transparent border-none shadow-none px-0 h-8 focus-visible:ring-0"
              />
            </div>
            <Input
              value={heading.description || ""}
              onChange={e => onUpdateHeading("description", e.target.value)}
              placeholder="Section description (optional)"
              className="text-xs text-slate-500 bg-transparent border-none shadow-none px-0 h-6 focus-visible:ring-0 mt-0.5"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {scoreSummary.maxScore > 0 && (
              <Badge className="bg-amber-100 text-amber-800 text-xs font-semibold">
                Max {scoreSummary.maxScore} pts
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {sectionQuestions.length} {sectionQuestions.length === 1 ? 'question' : 'questions'}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 className="w-4 h-4 text-slate-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-400 hover:text-red-600"
              onClick={onRemoveHeading}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Section Settings (follow-up threshold) */}
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <SectionFollowupInline
              headingId={heading.id}
              rules={sectionRules}
              allFollowupRules={followupRules}
              questions={allQuestions}
              onUpdateRules={onUpdateFollowupRules}
            />
          </div>
        )}
      </div>

      {/* Questions */}
      {!collapsed && (
        <div className="p-4 space-y-3">
          {sectionQuestions.length === 0 && (
            <p className="text-sm text-slate-400 italic text-center py-4">
              No questions in this section yet. Add one below.
            </p>
          )}

          {sectionQuestions.map((q) => {
            const globalIndex = allQuestions.findIndex(aq => aq.id === q.id);
            return (
              <QuestionEditor
                key={q.id}
                question={q}
                index={globalIndex}
                totalCount={allQuestions.length}
                questionTypes={QUESTION_TYPES}
                onChange={(updated) => onUpdateQuestion(globalIndex, updated)}
                onRemove={() => onRemoveQuestion(globalIndex)}
                onMove={(dir) => onMoveQuestion(globalIndex, dir)}
                onDuplicate={() => onDuplicateQuestion(globalIndex)}
                allQuestions={allQuestions}
                headings={headings}
                hideSectionPicker
              />
            );
          })}

          {/* Add question buttons */}
          <div className="border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50/50">
            <p className="text-xs font-medium text-slate-500 mb-2">Add question to this section</p>
            <div className="flex flex-wrap gap-1.5">
              {QUESTION_TYPES.map(type => (
                <Button
                  key={type.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddQuestion(type.value)}
                  className="text-xs h-7"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {type.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline follow-up rule editor for a single section
function SectionFollowupInline({ headingId, rules, allFollowupRules, questions, onUpdateRules }) {
  const followupQuestions = questions.filter(q => q.is_followup);

  const addRule = () => {
    const newRule = {
      id: "sfr_" + Math.random().toString(36).substring(2, 9),
      heading_id: headingId,
      threshold_score: 0,
      followup_question_ids: [],
    };
    onUpdateRules([...allFollowupRules, newRule]);
  };

  const updateRule = (ruleId, updates) => {
    onUpdateRules(allFollowupRules.map(r => r.id === ruleId ? { ...r, ...updates } : r));
  };

  const removeRule = (ruleId) => {
    onUpdateRules(allFollowupRules.filter(r => r.id !== ruleId));
  };

  const toggleQuestionInRule = (ruleId, questionId) => {
    const rule = allFollowupRules.find(r => r.id === ruleId);
    const ids = rule.followup_question_ids || [];
    const updated = ids.includes(questionId) ? ids.filter(id => id !== questionId) : [...ids, questionId];
    updateRule(ruleId, { followup_question_ids: updated });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-slate-600">Follow-up Rules</Label>
        <Button variant="outline" size="sm" className="h-6 text-xs" onClick={addRule}>
          <Plus className="w-3 h-3 mr-1" /> Add Rule
        </Button>
      </div>
      <p className="text-[11px] text-slate-400">
        Show extra questions when the section score reaches a threshold.
      </p>

      {rules.length === 0 && (
        <p className="text-[11px] text-slate-400 italic">No follow-up rules for this section.</p>
      )}

      {rules.map(rule => (
        <div key={rule.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-amber-700 whitespace-nowrap">When score ≥</Label>
            <Input
              type="number"
              min={0}
              value={rule.threshold_score || ""}
              onChange={e => updateRule(rule.id, { threshold_score: parseFloat(e.target.value) || 0 })}
              className="h-7 w-20 text-xs"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-400 ml-auto"
              onClick={() => removeRule(rule.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <div>
            <Label className="text-[11px] text-amber-600">Show these follow-up questions:</Label>
            {followupQuestions.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic mt-1">Mark questions as "Follow-up" first.</p>
            ) : (
              <div className="space-y-1 mt-1">
                {followupQuestions.map(q => {
                  const selected = (rule.followup_question_ids || []).includes(q.id);
                  return (
                    <label key={q.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleQuestionInRule(rule.id, q.id)}
                        className="rounded border-slate-300"
                      />
                      <span className={selected ? "text-amber-800 font-medium" : "text-slate-500"}>
                        {q.text || "(Untitled)"}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}