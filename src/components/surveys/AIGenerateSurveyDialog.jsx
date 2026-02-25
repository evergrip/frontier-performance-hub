import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const QUESTION_TYPES = [
  "text", "textarea", "radio", "checkbox", "dropdown",
  "number", "date", "rating", "scale", "email", "phone"
];

export default function AIGenerateSurveyDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [questionCount, setQuestionCount] = useState("8");
  const [generating, setGenerating] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Survey.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      onOpenChange(false);
      setPrompt("");
    },
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional survey designer. Create a survey based on this description:

"${prompt.trim()}"

Generate exactly ${questionCount} questions. Mix question types for a good survey experience.

Return a JSON object with:
- title: a clear survey title
- description: a 1-2 sentence description
- questions: array of question objects, each with:
  - id: unique string like "q_1", "q_2", etc.
  - text: the question text
  - type: one of: ${QUESTION_TYPES.join(", ")}
  - required: boolean (true for important questions)
  - options: array of strings (REQUIRED for radio, checkbox, dropdown types; omit for others)
  - description: optional helper text
  - min_value: for rating type use 1, for scale type use 1
  - max_value: for rating type use 5, for scale type use 10
  - min_label: for scale type (e.g. "Not at all likely")
  - max_label: for scale type (e.g. "Extremely likely")
  - placeholder: optional placeholder text for text/textarea/email/phone types

Guidelines:
- Start with easier questions, put sensitive ones later
- Use rating (1-5 stars) for satisfaction questions
- Use scale (1-10) for NPS-style questions
- Use radio for single-choice, checkbox for multi-choice
- Always include options array for radio/checkbox/dropdown
- Include at least one open-ended text/textarea question
- Make questions clear and unbiased`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                type: { type: "string" },
                required: { type: "boolean" },
                options: { type: "array", items: { type: "string" } },
                description: { type: "string" },
                min_value: { type: "number" },
                max_value: { type: "number" },
                min_label: { type: "string" },
                max_label: { type: "string" },
                placeholder: { type: "string" },
              },
            },
          },
        },
      },
    });

    setGenerating(false);

    const surveyData = {
      title: result.title,
      description: result.description,
      questions: result.questions,
      status: "draft",
      access_type: "link_only",
      share_token: generateToken(),
      allow_anonymous_responses: false,
      allow_multiple_responses: false,
      success_message: "Thank you for completing this survey!",
      styling: {},
    };

    createMutation.mutate(surveyData);
  };

  const isLoading = generating || createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#ea7924]" />
            AI Survey Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Describe your survey</Label>
            <Textarea
              placeholder="e.g. Customer satisfaction survey for a construction company, focusing on communication, quality of work, timeline adherence, and overall experience..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Number of questions</Label>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 questions</SelectItem>
                <SelectItem value="8">8 questions</SelectItem>
                <SelectItem value="10">10 questions</SelectItem>
                <SelectItem value="15">15 questions</SelectItem>
                <SelectItem value="20">20 questions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-slate-500">
            The AI will generate a complete survey with title, description, and questions. You can edit everything afterwards in the Survey Builder.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isLoading}
            className="bg-[#ea7924] hover:bg-[#d66a1f] gap-2"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate Survey</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}