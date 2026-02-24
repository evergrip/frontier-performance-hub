import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

function buildDataContext(survey, responses) {
  const questions = survey.questions || [];
  return questions.map(q => {
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
}

export default function AIInsightsChat({ survey, responses, initialInsights }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const dataContext = useRef(null);
  if (!dataContext.current) {
    dataContext.current = JSON.stringify(buildDataContext(survey, responses), null, 2);
  }

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const conversationHistory = newMessages.map(m =>
      `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
    ).join("\n\n");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a helpful survey data analyst having a conversation about survey results. 
Answer the user's question based on the survey data below. Be specific, reference actual data points and numbers.
Use markdown formatting for clarity. Keep answers focused and concise.

Survey: "${survey.title}"
Total responses: ${responses.length}

Question data:
${dataContext.current}

${initialInsights ? `Previously generated AI insights:\n${initialInsights}\n` : ""}

Conversation so far:
${conversationHistory}

Provide a helpful, data-driven response to the user's latest question.`,
    });

    setMessages(prev => [...prev, { role: "assistant", content: result }]);
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    "What's the most common sentiment across responses?",
    "Which questions had the lowest engagement?",
    "What patterns do you see in the open-ended answers?",
    "Are there any concerning trends in the data?",
  ];

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-medium mb-1">Ask anything about your survey results</p>
            <p className="text-xs text-slate-400 mb-6">I have access to all {responses.length} responses and can analyze patterns, trends, and insights</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full border border-purple-200 hover:bg-purple-100 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              msg.role === "user"
                ? "bg-slate-800 text-white"
                : "bg-white border border-slate-200"
            }`}>
              {msg.role === "user" ? (
                <p className="text-sm">{msg.content}</p>
              ) : (
                <div className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-600" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t p-3 bg-slate-50/50">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the survey results..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            size="icon"
            className="bg-purple-600 hover:bg-purple-700 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}