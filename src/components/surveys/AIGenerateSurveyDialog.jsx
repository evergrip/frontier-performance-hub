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
  const [questionCount, setQuestionCount] = useState("auto");
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
      prompt: `You are an expert survey designer specializing in qualification scoring and lead assessment (Sandler methodology). Create a comprehensive, fully-featured survey based on this description:

"${prompt.trim()}"

${questionCount === 'auto' ? 'Generate as many questions as needed to thoroughly cover the topic. Use your judgment on the optimal number.' : `Generate approximately ${questionCount} questions (including follow-up questions).`}

You MUST generate ALL of the following:

1. SECTIONS (headings): Group questions into logical sections/categories. Each section needs a unique id (like "h_1"), title, description, and max_score (the maximum points achievable in that section).

2. QUESTIONS: Each question must belong to a section (via category_id matching a heading id). Include:
   - id: unique string like "q_1", "q_2"
   - text: clear question text
   - type: one of ${QUESTION_TYPES.join(", ")}
   - category_id: the heading id this question belongs to
   - required: boolean
   - options: array of strings (REQUIRED for radio, checkbox, dropdown)
   - option_scores: object mapping each option text to a numeric point value (REQUIRED for radio, checkbox, dropdown). Higher scores = stronger indicator. Example: {"Strongly Agree": 10, "Agree": 7, "Neutral": 4, "Disagree": 1, "Strongly Disagree": 0}
   - points: max points for rating/scale/number types
   - weight: multiplier (default 1, use 2 for critical questions)
   - description: helper text
   - min_value, max_value, min_label, max_label: for scale type
   - placeholder: for text types
   - is_followup: boolean (true ONLY for follow-up questions that should be hidden by default)
   - logic_rules: array of conditional show/skip rules. Each rule: {condition_question_id, operator (equals/not_equals/greater_than/less_than/is_answered), value, logic_type (show/skip)}

3. SECTION FOLLOW-UP RULES (section_followup_rules): For sections where high scores indicate a pain point or important topic, create rules that reveal follow-up questions when the section score exceeds a threshold. Each rule:
   - heading_id: the section id
   - threshold_score: score that triggers the follow-up
   - followup_question_ids: array of question ids (these questions must have is_followup: true)

4. WELCOME PAGE: welcome_page_content (HTML string with a warm intro) and welcome_page_button_text.

5. THANK YOU PAGE: thank_you_page_content (HTML string thanking the respondent and explaining next steps).

6. SUCCESS MESSAGE: A brief thank-you message string.

Guidelines:
- Start sections with easier questions, put sensitive/probing ones later
- Use rating (1-5 stars) for satisfaction, scale (1-10) for importance/priority
- Use radio for single-choice with scored options, checkbox for multi-choice
- Every scored question (radio/checkbox/dropdown) MUST have option_scores
- Include 1-2 follow-up questions per section for when scores are high
- Set threshold_score for follow-up rules to about 60-70% of the section max_score
- Follow-up questions should probe deeper (e.g. "On a scale of 1-10, how important is it that we discuss [topic] as a core agenda item?")
- Use logic_rules sparingly — only when a question naturally depends on another
- Make the welcome page engaging and the thank you page appreciative`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          headings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                max_score: { type: "number" },
              },
            },
          },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                type: { type: "string" },
                category_id: { type: "string" },
                required: { type: "boolean" },
                options: { type: "array", items: { type: "string" } },
                option_scores: { type: "object" },
                points: { type: "number" },
                weight: { type: "number" },
                description: { type: "string" },
                min_value: { type: "number" },
                max_value: { type: "number" },
                min_label: { type: "string" },
                max_label: { type: "string" },
                placeholder: { type: "string" },
                is_followup: { type: "boolean" },
                logic_rules: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      condition_question_id: { type: "string" },
                      operator: { type: "string" },
                      value: { type: "string" },
                      logic_type: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          section_followup_rules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                heading_id: { type: "string" },
                threshold_score: { type: "number" },
                followup_question_ids: { type: "array", items: { type: "string" } },
              },
            },
          },
          welcome_page_content: { type: "string" },
          welcome_page_button_text: { type: "string" },
          thank_you_page_content: { type: "string" },
          success_message: { type: "string" },
        },
      },
      model: "claude_sonnet_4_6",
    });

    setGenerating(false);

    const surveyData = {
      title: result.title,
      description: result.description,
      headings: result.headings || [],
      questions: result.questions || [],
      section_followup_rules: result.section_followup_rules || [],
      status: "draft",
      access_type: "link_only",
      share_token: generateToken(),
      allow_anonymous_responses: false,
      allow_multiple_responses: false,
      welcome_page_enabled: !!(result.welcome_page_content),
      welcome_page_content: result.welcome_page_content || "",
      welcome_page_button_text: result.welcome_page_button_text || "Start Survey",
      thank_you_page_content: result.thank_you_page_content || "",
      success_message: result.success_message || "Thank you for completing this survey!",
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
                <SelectItem value="auto">AI Optimized</SelectItem>
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