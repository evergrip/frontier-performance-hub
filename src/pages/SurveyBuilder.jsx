import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, Trash2, ArrowLeft, Copy, ChevronUp, ChevronDown, Image, Video, Save, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import QuestionEditor from "../components/surveys/QuestionEditor";
import ImportQuestionsDialog from "../components/surveys/ImportQuestionsDialog";
import HeadingsEditor from "../components/surveys/HeadingsEditor";

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
];

function generateId() {
  return "q_" + Math.random().toString(36).substring(2, 9);
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
  const [hasChanges, setHasChanges] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (survey?.questions) {
      setQuestions(survey.questions);
    }
    if (survey?.headings) {
      setHeadings(survey.headings);
    }
  }, [survey]);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Survey.update(surveyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      setHasChanges(false);
    },
  });

  const addQuestion = (type) => {
    const newQ = {
      id: generateId(),
      text: "",
      type,
      required: false,
      options: ["radio", "checkbox", "dropdown"].includes(type) ? ["Option 1", "Option 2"] : undefined,
      allowed_file_types: type === "file_upload" ? ["image", "video", "audio"] : undefined,
      max_files: type === "file_upload" ? 5 : undefined,
    };
    setQuestions(prev => [...prev, newQ]);
    setHasChanges(true);
  };

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

  const handleSave = () => {
    saveMutation.mutate({ questions, headings });
  };

  if (isLoading) {
    return <div className="max-w-4xl mx-auto p-6"><div className="animate-pulse h-8 bg-slate-200 rounded w-1/3 mb-4" /></div>;
  }

  if (!survey) {
    return <div className="max-w-4xl mx-auto p-6 text-center text-slate-500">Survey not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Surveys")}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{survey.title}</h1>
            <p className="text-sm text-slate-500">{questions.length} questions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-2" /> Import
          </Button>
          <Button onClick={handleSave} className="bg-[#ea7924] hover:bg-[#d66a1f]" disabled={!hasChanges || saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Questions"}
          </Button>
        </div>
      </div>

      {/* Section Headings */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <HeadingsEditor
            headings={headings}
            onChange={(h) => { setHeadings(h); setHasChanges(true); }}
          />
        </CardContent>
      </Card>

      <div className="space-y-4 mb-6">
        {questions.map((q, index) => (
          <QuestionEditor
            key={q.id}
            question={q}
            index={index}
            totalCount={questions.length}
            questionTypes={QUESTION_TYPES}
            onChange={(updated) => updateQuestion(index, updated)}
            onRemove={() => removeQuestion(index)}
            onMove={(dir) => moveQuestion(index, dir)}
            onDuplicate={() => duplicateQuestion(index)}
            allQuestions={questions}
            headings={headings}
          />
        ))}
      </div>

      <Card className="border-dashed border-2 border-slate-300 bg-slate-50/50">
        <CardContent className="p-6">
          <p className="text-sm font-medium text-slate-600 mb-3">Add a question</p>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map(type => (
              <Button
                key={type.value}
                variant="outline"
                size="sm"
                onClick={() => addQuestion(type.value)}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                {type.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

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