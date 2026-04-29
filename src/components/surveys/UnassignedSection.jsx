import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import QuestionEditor from "./QuestionEditor";

const QUESTION_TYPES = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "radio", label: "Single Choice" },
  { value: "checkbox", label: "Multiple Choice" },
  { value: "dropdown", label: "Dropdown" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "rating", label: "Rating (1-5)" },
  { value: "scale", label: "Scale (1-10)" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL" },
  { value: "file_upload", label: "File Upload" },
  { value: "ranking", label: "Ranking (Drag to Order)" },
];

export default function UnassignedSection({
  unassignedQuestions,
  questions,
  headings,
  isLargeSurvey,
  updateQuestion,
  removeQuestion,
  moveQuestion,
  duplicateQuestion,
}) {
  const [expanded, setExpanded] = useState(!isLargeSurvey);

  if (headings.length === 0) {
    // No sections — show all questions directly (small survey behavior)
    return (
      <div className="space-y-3">
        {unassignedQuestions.map((q) => {
          const globalIndex = questions.findIndex(aq => aq.id === q.id);
          return (
            <QuestionEditor
              key={q.id}
              question={q}
              index={globalIndex}
              totalCount={questions.length}
              questionTypes={QUESTION_TYPES}
              onChange={(updated) => updateQuestion(globalIndex, updated)}
              onRemove={() => removeQuestion(globalIndex)}
              onMove={(dir) => moveQuestion(globalIndex, dir)}
              onDuplicate={() => duplicateQuestion(globalIndex)}
              allQuestions={questions}
              headings={headings}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-3 hover:bg-slate-50 rounded-lg px-2 py-1 -ml-2 transition-colors"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        <h2 className="text-sm font-semibold text-slate-600">Unassigned Questions</h2>
        <Badge variant="outline" className="text-xs">{unassignedQuestions.length}</Badge>
        <p className="text-xs text-slate-400">— these questions are not in any section</p>
      </button>

      {expanded && (
        <div className="space-y-3">
          {unassignedQuestions.map((q) => {
            const globalIndex = questions.findIndex(aq => aq.id === q.id);
            return (
              <QuestionEditor
                key={q.id}
                question={q}
                index={globalIndex}
                totalCount={questions.length}
                questionTypes={QUESTION_TYPES}
                onChange={(updated) => updateQuestion(globalIndex, updated)}
                onRemove={() => removeQuestion(globalIndex)}
                onMove={(dir) => moveQuestion(globalIndex, dir)}
                onDuplicate={() => duplicateQuestion(globalIndex)}
                allQuestions={questions}
                headings={headings}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}