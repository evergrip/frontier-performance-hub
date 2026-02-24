import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AIInsightsPanel({ survey, responses }) {
  const [insights, setInsights] = useState(survey?.ai_insights || null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    const questions = survey.questions || [];

    // Build a structured summary of responses for the AI
    const dataSummary = questions.map(q => {
      const answers = responses.map(r => r.responses?.[q.id]).filter(a => a !== undefined && a !== null && a !== "");
      let summary = { question: q.text, type: q.type, response_count: answers.length };

      if (["radio", "dropdown"].includes(q.type)) {
        const counts = {};
        answers.forEach(a => { counts[a] = (counts[a] || 0) + 1; });
        summary.distribution = counts;
      } else if (q.type === "checkbox") {
        const counts = {};
        answers.forEach(arr => { (Array.isArray(arr) ? arr : []).forEach(a => { counts[a] = (counts[a] || 0) + 1; }); });
        summary.distribution = counts;
      } else if (["rating", "scale", "number"].includes(q.type)) {
        const nums = answers.map(Number).filter(n => !isNaN(n));
        summary.average = nums.length > 0 ? (nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(1) : null;
        summary.min = nums.length > 0 ? Math.min(...nums) : null;
        summary.max = nums.length > 0 ? Math.max(...nums) : null;
      } else if (["text", "textarea"].includes(q.type)) {
        summary.sample_answers = answers.slice(0, 20).map(String);
      }
      return summary;
    });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a survey data analyst. Analyze these survey results and provide insights.

Survey: "${survey.title}"
Total responses: ${responses.length}

Question data:
${JSON.stringify(dataSummary, null, 2)}

Provide a comprehensive analysis with these sections:
1. **Overall Summary** - A natural language summary of the survey findings and overall sentiment (2-3 paragraphs)
2. **Key Themes from Open-Ended Responses** - Summarize text/textarea answers into major themes with supporting quotes
3. **Notable Correlations & Patterns** - Identify interesting patterns or correlations between different questions
4. **Actionable Recommendations** - 3-5 specific recommendations based on the data

Use markdown formatting. Be specific and reference actual data points.`,
    });

    setInsights(result);
    setLoading(false);
  };

  if (!insights && !loading) {
    return (
      <Card className="border-dashed border-2 border-purple-200 bg-purple-50/30">
        <CardContent className="p-8 text-center">
          <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 mb-2">AI-Powered Insights</h3>
          <p className="text-sm text-slate-500 mb-4">
            Get theme analysis, correlations, and sentiment summary from your survey responses
          </p>
          <Button
            onClick={generateInsights}
            disabled={responses.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Insights
          </Button>
          {responses.length === 0 && (
            <p className="text-xs text-slate-400 mt-2">Need at least 1 response to generate insights</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-purple-200 bg-purple-50/30">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600">Analyzing {responses.length} responses...</p>
          <p className="text-xs text-slate-400 mt-1">This may take a moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-slate-800">AI Insights</h3>
          </div>
          <Button variant="outline" size="sm" onClick={generateInsights}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
          </Button>
        </div>
        <div className="prose prose-sm prose-slate max-w-none">
          <ReactMarkdown>{insights}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}