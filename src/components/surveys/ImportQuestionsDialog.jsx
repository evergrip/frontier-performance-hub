import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Sparkles, Check } from "lucide-react";

const TYPE_LABELS = {
  text: "Short Text",
  textarea: "Long Text",
  radio: "Single Choice",
  checkbox: "Multiple Choice",
  dropdown: "Dropdown",
  number: "Number",
  date: "Date",
  rating: "Rating",
  scale: "Scale",
  email: "Email",
  phone: "Phone",
  url: "URL",
};

function generateId() {
  return "q_" + Math.random().toString(36).substring(2, 9);
}

export default function ImportQuestionsDialog({ open, onOpenChange, onImport }) {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setParsed(null);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a survey question parser. Parse the following pasted text into structured survey questions.

For each question:
- Detect the best question type from: text, textarea, radio, checkbox, dropdown, number, date, rating, scale, email, phone, url
- If the question has listed options (indented, bulleted, lettered, numbered sub-items), extract those as "options" and set type to radio (single choice) or checkbox (multiple choice)
- If it says "select all" or "check all", use checkbox
- If it asks for a rating or score out of 5, use rating
- If it asks for a rating/score out of 10, use scale
- If it asks for an email address, use email
- If it asks for a phone number, use phone
- If it asks for a website/URL, use url
- If it asks for a number/amount/quantity, use number
- If it asks for a date, use date
- If the answer would be a long paragraph, use textarea
- Default to text for short open-ended questions
- Set required to true if the question seems important/mandatory

Here is the pasted text:
"""
${rawText}
"""

Return a JSON object with a "questions" array. Each question object should have:
- text: the question text (cleaned up)
- type: one of the types listed above
- required: boolean
- options: array of strings (only for radio, checkbox, dropdown) — omit if not applicable`,
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                type: { type: "string" },
                required: { type: "boolean" },
                options: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
    });

    setParsed(result.questions || []);
    setLoading(false);
  };

  const handleImport = () => {
    if (!parsed) return;
    const questions = parsed.map(q => ({
      id: generateId(),
      text: q.text,
      type: q.type || "text",
      required: q.required || false,
      options: q.options && q.options.length > 0 ? q.options : undefined,
    }));
    onImport(questions);
    setParsed(null);
    setRawText("");
    onOpenChange(false);
  };

  const handleClose = (v) => {
    if (!v) {
      setParsed(null);
      setRawText("");
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" /> Import Questions
          </DialogTitle>
        </DialogHeader>

        {!parsed ? (
          <div className="space-y-4">
            <div>
              <Label>Paste your questions below</Label>
              <p className="text-xs text-slate-500 mb-2">
                One question per line. Add options as indented lines, bullets, or numbered sub-items under each question.
              </p>
              <Textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                rows={12}
                placeholder={`Example:\n1. How satisfied are you with our service?\n   - Very satisfied\n   - Satisfied\n   - Neutral\n   - Dissatisfied\n\n2. What is your email address?\n\n3. Please describe your experience in detail.\n\n4. On a scale of 1-10, how likely are you to recommend us?\n\n5. Which features do you use? (select all that apply)\n   - Dashboard\n   - Reports\n   - Scheduling\n   - Surveys`}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                onClick={handleParse}
                disabled={!rawText.trim() || loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {loading ? "Analyzing..." : "Parse Questions"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              <Sparkles className="w-4 h-4 inline text-purple-500 mr-1" />
              Found <strong>{parsed.length}</strong> questions. Review before importing:
            </p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {parsed.map((q, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-3 border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{q.text}</p>
                      {q.options && q.options.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {q.options.map((opt, oi) => (
                            <Badge key={oi} variant="outline" className="text-[10px] font-normal">{opt}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                        {TYPE_LABELS[q.type] || q.type}
                      </Badge>
                      {q.required && <Badge className="bg-red-100 text-red-600 text-[10px]">Required</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setParsed(null)}>
                Back to Edit
              </Button>
              <Button onClick={handleImport} className="bg-[#ea7924] hover:bg-[#d66a1f]">
                <Check className="w-4 h-4 mr-2" />
                Import {parsed.length} Questions
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}