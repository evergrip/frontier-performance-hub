import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

    let result;
    try {
      // Truncate prompt to avoid exceeding token limits
      const userPrompt = prompt.trim().substring(0, 8000);

      result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert survey designer. Create a survey based on this description. IMPORTANT: You MUST include a "title" field in your response.

"${userPrompt}"

${questionCount === 'auto' ? 'Generate as many questions as needed.' : `Generate approximately ${questionCount} questions.`}

Generate ALL of the following:
1. title: A clear survey title (REQUIRED)
2. description: Survey description
3. headings: Sections with id (h_1, h_2...), title, description, max_score
4. questions: Each with id (q_1, q_2...), text, type (${QUESTION_TYPES.join(", ")}), category_id, required, options (for radio/checkbox/dropdown), option_scores (map option text to points), points (for rating/scale), weight (default 1), description, is_followup (true if hidden by default), logic_rules
5. section_followup_rules: Rules to reveal follow-up questions when section score exceeds threshold_score
6. welcome_page_content: HTML welcome message
7. welcome_page_button_text
8. thank_you_page_content: HTML thank you message
9. success_message

Guidelines:
- Every radio/checkbox/dropdown MUST have option_scores
- Include 1-2 follow-up questions per section (is_followup: true)
- Set threshold_score to ~60-70% of section max_score
- Use logic_rules sparingly`,
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
        model: "gemini_3_pro",
      });
    } catch (err) {
      console.error("AI generation error:", err);
      setGenerating(false);
      toast.error("AI generation failed: " + (err?.message || "The request may have timed out. Try a shorter prompt."));
      return;
    }

    setGenerating(false);

    console.log("AI result:", JSON.stringify(result).substring(0, 500));

    if (!result || (!result.title && !result.questions?.length)) {
      toast.error("AI generation returned empty results. Please try again with a shorter prompt.");
      return;
    }

    const surveyData = {
      title: result.title || "Generated Survey",
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

    createMutation.mutate(surveyData, {
      onError: (err) => {
        toast.error("Failed to save survey: " + (err?.message || "Unknown error"));
      },
    });
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
            The AI will generate a fully-featured survey including scored sections, per-option point values, follow-up rules triggered by section scores, conditional logic, and welcome/thank-you pages. Uses a premium AI model (extra credits). You can edit everything afterwards in the Survey Builder.
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