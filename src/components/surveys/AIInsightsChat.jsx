import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, User, Sparkles, Share2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import ChatSessionList from "./ChatSessionList";
import ChatShareDialog from "./ChatShareDialog";

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
  const [currentUser, setCurrentUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const dataContext = useRef(null);
  if (!dataContext.current) {
    dataContext.current = JSON.stringify(buildDataContext(survey, responses), null, 2);
  }

  // Load user and sessions
  useEffect(() => {
    const init = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const allSessions = await base44.entities.SurveyInsightsChat.filter(
        { survey_id: survey.id },
        "-created_date"
      );

      // Show only sessions owned by user or shared with them
      const mySessions = allSessions.filter(s =>
        s.owner_id === user.id || (s.shared_with || []).includes(user.id)
      );
      setSessions(mySessions);
      setSessionsLoaded(true);

      if (mySessions.length > 0) {
        setActiveSessionId(mySessions[0].id);
        setMessages(mySessions[0].messages || []);
      }
    };
    init();
  }, [survey.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const isOwner = activeSession?.owner_id === currentUser?.id;
  const isReadOnly = activeSession && !isOwner;

  const createSession = async () => {
    const session = await base44.entities.SurveyInsightsChat.create({
      survey_id: survey.id,
      title: `Chat ${sessions.length + 1}`,
      messages: [],
      owner_id: currentUser.id,
      shared_with: [],
    });
    setSessions(prev => [session, ...prev]);
    setActiveSessionId(session.id);
    setMessages([]);
  };

  const selectSession = (id) => {
    const session = sessions.find(s => s.id === id);
    setActiveSessionId(id);
    setMessages(session?.messages || []);
  };

  const deleteSession = async (id) => {
    const session = sessions.find(s => s.id === id);
    if (session?.owner_id !== currentUser?.id) return;
    if (!confirm("Delete this chat session?")) return;
    await base44.entities.SurveyInsightsChat.delete(id);
    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
        setMessages(remaining[0].messages || []);
      } else {
        setActiveSessionId(null);
        setMessages([]);
      }
    }
  };

  const saveMessages = async (newMessages) => {
    if (!activeSessionId) return;
    await base44.entities.SurveyInsightsChat.update(activeSessionId, { messages: newMessages });
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: newMessages } : s));
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || isReadOnly) return;

    // Auto-create session if none exists
    let sessionId = activeSessionId;
    if (!sessionId) {
      const session = await base44.entities.SurveyInsightsChat.create({
        survey_id: survey.id,
        title: text.length > 40 ? text.substring(0, 40) + "..." : text,
        messages: [],
        owner_id: currentUser.id,
        shared_with: [],
      });
      setSessions(prev => [session, ...prev]);
      setActiveSessionId(session.id);
      sessionId = session.id;
    }

    const userMsg = { role: "user", content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
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

    const assistantMsg = { role: "assistant", content: result, timestamp: new Date().toISOString() };
    const allMessages = [...newMessages, assistantMsg];
    setMessages(allMessages);
    setLoading(false);

    // Persist
    await base44.entities.SurveyInsightsChat.update(sessionId, { messages: allMessages });
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: allMessages } : s));

    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleShareUpdate = (updatedSession) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  const suggestedQuestions = [
    "What's the most common sentiment across responses?",
    "Which questions had the lowest engagement?",
    "What patterns do you see in the open-ended answers?",
    "Are there any concerning trends in the data?",
  ];

  if (!sessionsLoaded) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[550px]">
      {/* Session list */}
      <div className="px-4 pt-3">
        <ChatSessionList
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={selectSession}
          onCreate={createSession}
          onDelete={deleteSession}
        />
      </div>

      {/* Share button for active session */}
      {activeSession && isOwner && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShareOpen(true)}>
            <Share2 className="w-3 h-3" /> Share Access
            {activeSession.shared_with?.length > 0 && (
              <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 text-[10px] ml-1">
                {activeSession.shared_with.length}
              </span>
            )}
          </Button>
          {isReadOnly && (
            <span className="text-xs text-slate-400 italic">Read-only (shared with you)</span>
          )}
        </div>
      )}
      {isReadOnly && (
        <div className="px-4 pb-2">
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
            Read-only — this chat was shared with you
          </span>
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && !activeSessionId && (
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

        {messages.length === 0 && activeSessionId && (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-medium mb-1">Start your conversation</p>
            <p className="text-xs text-slate-400 mb-4">Ask a question about the survey data</p>
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
        {isReadOnly ? (
          <p className="text-xs text-slate-400 text-center py-1">You have read-only access to this chat</p>
        ) : (
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
        )}
      </div>

      {activeSession && (
        <ChatShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          session={activeSession}
          onUpdate={handleShareUpdate}
        />
      )}
    </div>
  );
}