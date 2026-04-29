import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Save, Upload, Layers, ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import QuestionEditor from "../components/surveys/QuestionEditor";
import ImportQuestionsDialog from "../components/surveys/ImportQuestionsDialog";
import SectionBlock from "../components/surveys/SectionBlock";
import UnassignedSection from "../components/surveys/UnassignedSection";

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

function generateId() {
  return "q_" + Math.random().toString(36).substring(2, 9);
}

function generateHeadingId() {
  return "h_" + Math.random().toString(36).substring(2, 9);
}

export default function SurveyBuilder() {
  const urlParams = new URLSearchParams(window.location.search);
  const surveyId = urlParams.get("id");
  const queryClient = useQueryClient();

  const { data: survey, isLoading } = useQuery({
    queryKey: ["survey", surveyId],
    queryFn: async () => {
      const surveys = await base44.entities.Survey.filter({ id: surveyId });
      return surveys[0];
    },
    enabled: !!surveyId,
  });

  const [questions, setQuestions] = useState([]);
  const [headings, setHeadings] = useState([]);
  const [followupRules, setFollowupRules] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (survey?.questions) setQuestions(survey.questions);
    if (survey?.headings) setHeadings(survey.headings);
    if (survey?.section_followup_rules) setFollowupRules(survey.section_followup_rules);
  }, [survey]);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Survey.update(surveyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      setHasChanges(false);
    },
  });

  // Question CRUD helpers
  const updateQuestion = (index, updated) => {
    setQuestions(prev => prev.map((q, i) => i === index ? updated : q));
    setHasChanges(true);
  };

  const removeQuestion = (index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const moveQuestion = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const copy = [...questions];
    [copy[index], copy[newIdx]] = [copy[newIdx], copy[index]];
    setQuestions(copy);
    setHasChanges(true);
  };

  const duplicateQuestion = (index) => {
    const copy = { ...questions[index], id: generateId() };
    const newArr = [...questions];
    newArr.splice(index + 1, 0, copy);
    setQuestions(newArr);
    setHasChanges(true);
  };

  const addQuestionToSection = (newQ) => {
    setQuestions(prev => [...prev, newQ]);
    setHasChanges(true);
  };

  const addUnassignedQuestion = (type) => {
    const newQ = {
      id: generateId(),
      text: "",
      type,
      required: false,
      options: ["radio", "checkbox", "dropdown", "ranking"].includes(type) ? ["Option 1", "Option 2"] : undefined,
      allowed_file_types: type === "file_upload" ? ["image", "video", "audio"] : undefined,
      max_files: type === "file_upload" ? 5 : undefined,
    };
    setQuestions(prev => [...prev, newQ]);
    setHasChanges(true);
  };

  // Heading CRUD helpers
  const addSection = () => {
    setHeadings(prev => [...prev, { id: generateHeadingId(), title: "", description: "" }]);
    setHasChanges(true);
  };

  const updateHeading = (index, key, value) => {
    setHeadings(prev => prev.map((h, i) => i === index ? { ...h, [key]: value } : h));
    setHasChanges(true);
  };

  const removeHeading = (index) => {
    const removedId = headings[index].id;
    // Unassign questions from this section
    setQuestions(prev => prev.map(q => q.category_id === removedId ? { ...q, category_id: "" } : q));
    setHeadings(prev => prev.filter((_, i) => i !== index));
    // Remove followup rules for this section
    setFollowupRules(prev => prev.filter(r => r.heading_id !== removedId));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate({ questions, headings, section_followup_rules: followupRules });
  };

  // Unassigned questions (no section)
  const unassignedQuestions = questions.filter(q => !q.category_id || !headings.find(h => h.id === q.category_id));

  // For large surveys, default all sections to collapsed so we don't render 600+ editors at once
  const isLargeSurvey = questions.length > 50;

  if (isLoading) {
    return <div className="max-w-4xl mx-auto p-6"><div className="animate-pulse h-8 bg-slate-200 rounded w-1/3 mb-4" /></div>;
  }

  if (!survey) {
    return <div className="max-w-4xl mx-auto p-6 text-center text-slate-500">Survey not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Surveys")}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{survey.title}</h1>
            <p className="text-sm text-slate-500">
              {headings.length} {headings.length === 1 ? 'section' : 'sections'} · {questions.length} questions
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-2" /> Import
          </Button>
          <Button variant="outline" onClick={addSection}>
            <Layers className="w-4 h-4 mr-2" /> Add Section
          </Button>
          <Button onClick={handleSave} className="bg-[#ea7924] hover:bg-[#d66a1f]" disabled={!hasChanges || saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Sections with their questions */}
      <div className="space-y-6 mb-6">
        {headings.map((heading, hIndex) => (
          <SectionBlock
            key={heading.id}
            heading={heading}
            questions={questions}
            allQuestions={questions}
            headings={headings}
            followupRules={followupRules}
            onUpdateHeading={(key, value) => updateHeading(hIndex, key, value)}
            onRemoveHeading={() => removeHeading(hIndex)}
            onUpdateQuestion={updateQuestion}
            onRemoveQuestion={removeQuestion}
            onMoveQuestion={moveQuestion}
            onDuplicateQuestion={duplicateQuestion}
            onAddQuestion={addQuestionToSection}
            onUpdateFollowupRules={(rules) => { setFollowupRules(rules); setHasChanges(true); }}
            defaultCollapsed={isLargeSurvey}
          />
        ))}
      </div>

      {/* Unassigned Questions */}
      {(unassignedQuestions.length > 0 || headings.length === 0) && (
        <div className="mb-6">
          <UnassignedSection
            unassignedQuestions={unassignedQuestions}
            questions={questions}
            headings={headings}
            isLargeSurvey={isLargeSurvey}
            updateQuestion={updateQuestion}
            removeQuestion={removeQuestion}
            moveQuestion={moveQuestion}
            duplicateQuestion={duplicateQuestion}
          />

          {/* Add unassigned question */}
          <Card className="border-dashed border-2 border-slate-300 bg-slate-50/50 mt-4">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 mb-2">
                {headings.length > 0 ? "Add unassigned question" : "Add a question"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUESTION_TYPES.map(type => (
                  <Button
                    key={type.value}
                    variant="outline"
                    size="sm"
                    onClick={() => addUnassignedQuestion(type.value)}
                    className="text-xs h-7"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {type.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state when no sections and no questions */}
      {headings.length === 0 && questions.length === 0 && (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="p-8 text-center">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-700 mb-1">Start building your survey</h3>
            <p className="text-sm text-slate-500 mb-4">
              Create sections to organize your questions, then add questions within each section.
            </p>
            <Button onClick={addSection} className="bg-[#ea7924] hover:bg-[#d66a1f]">
              <Plus className="w-4 h-4 mr-2" /> Create First Section
            </Button>
          </CardContent>
        </Card>
      )}

      <ImportQuestionsDialog
        open={showImport}
        onOpenChange={setShowImport}
        onImport={(imported) => {
          setQuestions(prev => [...prev, ...imported]);
          setHasChanges(true);
        }}
      />
    </div>
  );
}