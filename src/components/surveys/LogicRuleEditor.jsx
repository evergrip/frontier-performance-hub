import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, GitBranch } from "lucide-react";

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "is_answered", label: "Is answered" },
  { value: "is_not_answered", label: "Is not answered" },
];

export default function LogicRuleEditor({ question, allQuestions, currentIndex, onChange }) {
  const rules = question.logic_rules || [];
  const previousQuestions = allQuestions.filter((_, i) => i < currentIndex);

  const addRule = () => {
    const newRules = [...rules, {
      condition_question_id: previousQuestions[0]?.id || "",
      operator: "equals",
      value: "",
      logic_type: "show",
    }];
    onChange({ ...question, logic_rules: newRules });
  };

  const updateRule = (ruleIndex, field, value) => {
    const newRules = rules.map((r, i) => i === ruleIndex ? { ...r, [field]: value } : r);
    onChange({ ...question, logic_rules: newRules });
  };

  const removeRule = (ruleIndex) => {
    onChange({ ...question, logic_rules: rules.filter((_, i) => i !== ruleIndex) });
  };

  const getQuestionLabel = (qId) => {
    const q = allQuestions.find(q => q.id === qId);
    return q ? (q.text || "Untitled").substring(0, 40) : "Unknown";
  };

  const getConditionQuestionOptions = (qId) => {
    const q = allQuestions.find(q => q.id === qId);
    if (q && ["radio", "dropdown", "checkbox"].includes(q.type)) {
      return q.options || [];
    }
    return [];
  };

  if (previousQuestions.length === 0) return null;

  return (
    <div className="bg-amber-50/50 rounded-lg p-3 space-y-2 border border-amber-200/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-amber-600" />
          <Label className="text-xs font-medium text-amber-800">Logic Rules</Label>
        </div>
        <Button variant="ghost" size="sm" onClick={addRule} className="h-6 text-xs text-amber-700">
          <Plus className="w-3 h-3 mr-1" /> Add Rule
        </Button>
      </div>

      {rules.length === 0 && (
        <p className="text-xs text-amber-600/70">No rules — this question always shows</p>
      )}

      {rules.map((rule, ri) => {
        const condOptions = getConditionQuestionOptions(rule.condition_question_id);
        const needsValue = !["is_answered", "is_not_answered"].includes(rule.operator);

        return (
          <div key={ri} className="flex flex-wrap items-center gap-2 bg-white/80 rounded p-2 border border-amber-200/50">
            <Select value={rule.logic_type} onValueChange={v => updateRule(ri, "logic_type", v)}>
              <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="show">Show if</SelectItem>
                <SelectItem value="skip">Skip if</SelectItem>
              </SelectContent>
            </Select>

            <Select value={rule.condition_question_id} onValueChange={v => updateRule(ri, "condition_question_id", v)}>
              <SelectTrigger className="w-40 h-7 text-xs"><SelectValue placeholder="Question..." /></SelectTrigger>
              <SelectContent>
                {previousQuestions.map(q => (
                  <SelectItem key={q.id} value={q.id}>
                    {(q.text || "Untitled").substring(0, 35)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={rule.operator} onValueChange={v => updateRule(ri, "operator", v)}>
              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPERATORS.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {needsValue && (
              condOptions.length > 0 ? (
                <Select value={rule.value} onValueChange={v => updateRule(ri, "value", v)}>
                  <SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder="Value..." /></SelectTrigger>
                  <SelectContent>
                    {condOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={rule.value || ""} onChange={e => updateRule(ri, "value", e.target.value)} placeholder="Value..." className="w-28 h-7 text-xs" />
              )
            )}

            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeRule(ri)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        );
      })}

      {rules.length > 0 && (
        <p className="text-[10px] text-amber-600/60">
          Tip: Use {`{{q_id}}`} in question text to pipe in previous answers
        </p>
      )}
    </div>
  );
}