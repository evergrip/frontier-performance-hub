import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, RefreshCw, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function IndividualResponseInsight({ survey, response, onInsightChange }) {
  const [insight, setInsight] = useState(response.ai_insight || null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(!!response.ai_insight);

  const generateInsight = async () => {
    setLoading(true);
    setOpen(true);

    try {
    const questions = survey.questions || [];
    const headings = survey.headings || [];

    const responseData = questions
      .filter(q => {
        const a = response.responses?.[q.id];
        return a !== undefined && a !== null && a !== "";
      })
      .map(q => {
        const heading = headings.find(h => h.id === q.category_id);
        return {
          section: heading?.title || "General",
          question: q.text,
          answer: response.responses[q.id],
          type: q.type,
        };
      });

    const scoreInfo = response.max_possible_score > 0
      ? `\nQualification Score: ${response.total_score}/${response.max_possible_score} (${response.score_percentage}%)\nCategory Scores: ${JSON.stringify(response.category_scores || {})}`
      : "";

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a sales preparation analyst for a home improvement company called Frontier Building Group. Analyze this individual survey response and provide actionable insights for the sales team.

Survey: "${survey.title}"
Respondent: ${response.respondent_name || "Unknown"} (${response.respondent_email || "no email"})
${scoreInfo}

Response Data:
${JSON.stringify(responseData, null, 2)}

Provide a focused analysis with these sections:
1. **Client Profile Summary** — Who is this person? What do they want? 2-3 sentences.
2. **Key Pain Points & Motivations** — What matters most to them based on their answers? What past experiences shaped their expectations?
3. **Budget & Timeline Readiness** — Assess their investment readiness and urgency.
4. **Decision-Making Dynamics** — Who are the decision makers? What's the authority structure?
5. **Pillar Alignment** — Which of our core pillars (risk, design, permits, construction, communication, process) resonate most?
6. **Red Flags & Concerns** — Any warning signs or areas that need careful handling?
7. **Meeting Preparation Tips** — 3-5 specific talking points or strategies for the sales meeting with this client.

Use markdown formatting. Be specific, reference their actual answers, and keep it actionable.`,
      model: "claude_sonnet_4_6",
    });

    setInsight(result);

    // Persist to the response entity
    await base44.entities.SurveyResponse.update(response.id, {
      ai_insight: result,
      ai_insight_generated_at: new Date().toISOString(),
    });
    if (onInsightChange) onInsightChange(response.id, result);
    } catch (error) {
      console.error('AI insight generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={generateInsight}
        disabled={loading}
        className="text-purple-600 border-purple-200 hover:bg-purple-50"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 mr-1" />
        )}
        AI Analysis
      </Button>
    );
  }

  return (
    <Card className="mt-4 border-purple-200 bg-purple-50/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-purple-700">AI Response Analysis</span>
          </div>
          <div className="flex items-center gap-1">
            {insight && (
              <Button variant="ghost" size="sm" onClick={generateInsight} disabled={loading} className="h-7 text-purple-600">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { setOpen(false); }} className="h-7 text-slate-400">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {loading && !insight && (
          <div className="text-center py-6">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Analyzing this response...</p>
          </div>
        )}

        {insight && (
          <div className="prose prose-sm prose-slate max-w-none">
            <ReactMarkdown>{insight}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}