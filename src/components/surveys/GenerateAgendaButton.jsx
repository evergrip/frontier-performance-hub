import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarPlus, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function GenerateAgendaButton({ survey, response }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agenda, setAgenda] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setAgenda("");

    const questions = survey.questions || [];
    const headings = survey.headings || [];
    const categoryScores = response.category_scores || {};

    // Build a summary of the response
    const responseSummary = questions.map(q => {
      const answer = response.responses?.[q.id];
      if (answer === undefined || answer === null || answer === "") return null;
      const heading = headings.find(h => h.id === q.category_id);
      return {
        section: heading?.title || "General",
        question: q.text,
        answer: Array.isArray(answer) ? answer.join(", ") : String(answer),
      };
    }).filter(Boolean);

    const scoreSummary = Object.entries(categoryScores).map(([key, cat]) => {
      return `${cat.title || key}: ${cat.score}/${cat.max} (${cat.pct}%)`;
    }).join("\n");

    const prompt = `You are preparing a sales call agenda using the Sandler Selling System methodology.

CONTEXT:
A potential lead filled out our Pain Indicator Survey. Here are their responses and scores:

OVERALL SCORE: ${response.total_score}/${response.max_possible_score} (${response.score_percentage}%)

SECTION SCORES:
${scoreSummary || "No section scores available"}

DETAILED RESPONSES:
${responseSummary.map(r => `[${r.section}] Q: ${r.question}\nA: ${r.answer}`).join("\n\n")}

RESPONDENT: ${response.respondent_name || "Unknown"} (${response.respondent_email || "no email"})

INSTRUCTIONS:
Using the Sandler Selling Method, create a structured meeting agenda for the first sales call. Remember:
- People need multiple "pains" before a sale is possible
- A "pain" is the gap between where they are now and where they want to be
- Pains can be positive (gaining pleasure) or negative (avoiding pain/loss)

Based on the survey responses, identify:
1. Areas where the lead's needs strongly match our strengths (high scores)
2. Areas where there are gaps or potential pain points (low scores)
3. Key questions to explore each pain deeper using the Sandler pain funnel

Structure the agenda as:
1. **Rapport Building** - Personal connection points based on their responses
2. **Up-Front Contract** - Set expectations for the meeting
3. **Pain Discovery** - For each identified pain area, list specific questions to explore:
   - Surface pain (what's happening?)
   - Impact (what does this cost/mean?)
   - Personal impact (how does this affect YOU?)
4. **Budget Discussion** - Based on their project scope
5. **Decision Process** - Next steps framework
6. **Summary & Next Steps**

Keep it practical and specific to their actual responses. Use markdown formatting.`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setAgenda(result);
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(agenda);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Agenda copied to clipboard");
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-xs gap-1.5"
        onClick={() => { setOpen(true); if (!agenda) handleGenerate(); }}
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        Generate Sales Agenda
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-amber-500" />
              Sandler Sales Call Agenda
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm text-slate-500">Analyzing pain indicators and generating agenda...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    For: {response.respondent_name || "Unknown"} — Score: {response.score_percentage}%
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Regenerate
                  </Button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border">
                <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap text-sm">
                  {agenda}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}