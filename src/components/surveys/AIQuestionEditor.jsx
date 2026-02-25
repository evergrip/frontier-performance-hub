import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, X } from "lucide-react";

const QUESTION_TYPES = [
  "text", "textarea", "radio", "checkbox", "dropdown",
  "number", "date", "rating", "scale", "email", "phone", "file_upload"
];

export default function AIQuestionEditor({ question, onApply }) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!instruction.trim()) return;
    setLoading(true);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a survey question editor. Here is the current question:

${JSON.stringify(question, null, 2)}

The user wants you to: "${instruction.trim()}"

Return the updated question as JSON. Keep the same "id". Only change what the user asked for.
Valid question types: ${QUESTION_TYPES.join(", ")}
If the type is radio/checkbox/dropdown, include an "options" array.
For rating: min_value=1, max_value=5. For scale: min_value=1, max_value=10 with min_label/max_label.`,
      response_json_schema: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          type: { type: "string" },
          required: { type: "boolean" },
          description: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          min_value: { type: "number" },
          max_value: { type: "number" },
          min_label: { type: "string" },
          max_label: { type: "string" },
          placeholder: { type: "string" },
        },
      },
    });

    // Preserve fields the AI shouldn't touch
    const updated = {
      ...question,
      ...result,
      id: question.id,
      image_url: question.image_url,
      video_url: question.video_url,
      logic_rules: question.logic_rules,
      allowed_file_types: result.type === "file_upload" ? (question.allowed_file_types || ["image", "video", "audio"]) : undefined,
      max_files: result.type === "file_upload" ? (question.max_files || 5) : undefined,
    };

    onApply(updated);
    setLoading(false);
    setInstruction("");
    setOpen(false);
  };

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-[#ea7924] hover:text-[#d66a1f] hover:bg-orange-50"
        onClick={() => setOpen(true)}
        title="AI Edit"
      >
        <Sparkles className="w-3.5 h-3.5" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <Sparkles className="w-4 h-4 text-[#ea7924] shrink-0" />
      <Input
        placeholder="e.g. Make it more formal, add more options, change to a scale..."
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        className="text-sm h-8 flex-1"
        autoFocus
        disabled={loading}
      />
      <Button
        size="sm"
        className="h-8 bg-[#ea7924] hover:bg-[#d66a1f] px-3"
        onClick={handleSubmit}
        disabled={!instruction.trim() || loading}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => { setOpen(false); setInstruction(""); }}
        disabled={loading}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}