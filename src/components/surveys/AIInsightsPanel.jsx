import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw, MessageCircle, FileText, Pencil, Save, X, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import ReactQuill from "react-quill";
import AIInsightsChat from "./AIInsightsChat";

export default function AIInsightsPanel({ survey, responses, onExportPdf }) {
  const [insights, setInsights] = useState(survey?.ai_insights || null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState(survey?.ai_insights ? "report" : "report");
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    const questions = survey.questions || [];

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

    await base44.entities.Survey.update(survey.id, {
      ai_insights: result,
      ai_insights_generated_at: new Date().toISOString(),
      ai_insights_response_count: responses.length,
    });
  };

  const startEditing = () => {
    // Convert markdown to basic HTML for rich editor
    const html = markdownToHtml(insights || "");
    setEditContent(html);
    setEditing(true);
  };

  const saveEdits = async () => {
    setSaving(true);
    // Convert HTML back to markdown-ish text for storage
    const cleaned = htmlToMarkdown(editContent);
    setInsights(cleaned);
    await base44.entities.Survey.update(survey.id, { ai_insights: cleaned });
    setEditing(false);
    setSaving(false);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditContent("");
  };

  if (!insights && !loading) {
    return (
      <Card className="border-dashed border-2 border-purple-200 bg-purple-50/30">
        <CardContent className="p-8 text-center">
          <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 mb-2">AI-Powered Insights</h3>
          <p className="text-sm text-slate-500 mb-4">
            Generate an analysis report, then ask follow-up questions in an interactive chat
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
      <CardContent className="p-0">
        {/* View toggle header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView("report")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeView === "report" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Report
            </button>
            <button
              onClick={() => setActiveView("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeView === "chat" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Ask Questions
            </button>
          </div>
          {activeView === "report" && (
            <div className="flex items-center gap-2">
              {!editing && (
                <>
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={generateInsights}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
                  </Button>
                  {onExportPdf && (
                    <Button variant="outline" size="sm" onClick={onExportPdf}>
                      <Download className="w-3.5 h-3.5 mr-1" /> PDF
                    </Button>
                  )}
                </>
              )}
              {editing && (
                <>
                  <Button variant="outline" size="sm" onClick={cancelEditing}>
                    <X className="w-3.5 h-3.5 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={saveEdits} disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                    Save
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Report view */}
        {activeView === "report" && !editing && (
          <div className="p-6 pt-2">
            <div className="prose prose-sm prose-slate max-w-none">
              <ReactMarkdown>{insights}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Edit view */}
        {activeView === "report" && editing && (
          <div className="p-4 pt-2">
            <ReactQuill
              value={editContent}
              onChange={setEditContent}
              theme="snow"
              modules={{
                toolbar: [
                  [{ header: [1, 2, 3, false] }],
                  ["bold", "italic", "underline"],
                  [{ list: "ordered" }, { list: "bullet" }],
                  ["blockquote"],
                  ["clean"],
                ],
              }}
              style={{ minHeight: "300px" }}
            />
          </div>
        )}

        {/* Chat view */}
        {activeView === "chat" && (
          <AIInsightsChat survey={survey} responses={responses} initialInsights={insights} />
        )}
      </CardContent>
    </Card>
  );
}

// Simple markdown -> HTML converter for the editor
function markdownToHtml(md) {
  if (!md) return "";
  let html = md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>");
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");
  // Convert remaining newlines to <p>
  html = html.split("\n\n").map(p => {
    if (p.startsWith("<h") || p.startsWith("<ul") || p.startsWith("<blockquote")) return p;
    return `<p>${p.replace(/\n/g, "<br>")}</p>`;
  }).join("");
  return html;
}

// Simple HTML -> markdown converter for storage
function htmlToMarkdown(html) {
  if (!html) return "";
  let md = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/g, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/g, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/g, "### $1\n\n")
    .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
    .replace(/<b>(.*?)<\/b>/g, "**$1**")
    .replace(/<em>(.*?)<\/em>/g, "*$1*")
    .replace(/<i>(.*?)<\/i>/g, "*$1*")
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/g, "> $1\n")
    .replace(/<ul[^>]*>(.*?)<\/ul>/gs, (_, inner) => {
      return inner.replace(/<li[^>]*>(.*?)<\/li>/g, "- $1\n") + "\n";
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gs, function(_, inner) {
      let i = 0;
      return inner.replace(/<li[^>]*>(.*?)<\/li>/g, function(__, content) { i++; return `${i}. ${content}\n`; }) + "\n";
    })
    .replace(/<li[^>]*>(.*?)<\/li>/g, "- $1\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gs, "$1\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return md;
}