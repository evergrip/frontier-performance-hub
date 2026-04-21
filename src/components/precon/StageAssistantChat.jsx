import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const QUICK_ACTIONS = [
  { label: 'Generate draft', prompt: 'Generate a complete draft for this deliverable form based on the available project context.' },
  { label: 'Check risks', prompt: 'Review this stage and all prior stages for any risks, inconsistencies, or missing items.' },
  { label: 'Compare budgets', prompt: 'Compare the budget figures across all financial stages and flag any significant drift.' },
  { label: 'Suggest next actions', prompt: 'Based on the current project state, what should I focus on next?' },
];

function buildContext(stage, progress, leadData, clientData, saleData, allProgress, stages) {
  const stageOrderMap = {};
  (stages || []).forEach(s => { stageOrderMap[s.id] = s.stage_order; });

  const priorStages = (allProgress || [])
    .filter(p => {
      const order = stageOrderMap[p.stage_id];
      return order && order < stage.stage_order && p.form_data && Object.keys(p.form_data).length > 0;
    })
    .sort((a, b) => (stageOrderMap[a.stage_id] || 0) - (stageOrderMap[b.stage_id] || 0))
    .map(p => {
      const s = (stages || []).find(st => st.id === p.stage_id);
      return `Stage ${stageOrderMap[p.stage_id]} (${s?.stage_name || 'Unknown'}): Status=${p.status || 'not_started'}, Form Data=${JSON.stringify(p.form_data)}`;
    });

  return [
    `CURRENT STAGE: #${stage.stage_order} — ${stage.stage_name}`,
    stage.purpose ? `Purpose: ${stage.purpose}` : '',
    stage.main_deliverable ? `Deliverable: ${stage.main_deliverable}` : '',
    stage.ai_prompt_template ? `AI Template: ${stage.ai_prompt_template}` : '',
    stage.raci_responsible ? `Responsible: ${stage.raci_responsible}` : '',
    stage.validation_rules ? `Validation: ${stage.validation_rules}` : '',
    `Current Status: ${progress?.status || 'not_started'}`,
    progress?.form_data ? `Current Form Data: ${JSON.stringify(progress.form_data)}` : 'No form data yet.',
    '',
    `PROJECT: ${leadData?.title || 'Unknown'}`,
    clientData ? `Client: ${clientData.contact_name || ''}${clientData.email ? ` (${clientData.email})` : ''}` : '',
    leadData?.estimated_precon_value ? `Est. Pre-Con: $${leadData.estimated_precon_value.toLocaleString()}` : '',
    leadData?.estimated_construction_value ? `Est. Construction: $${leadData.estimated_construction_value.toLocaleString()}` : '',
    saleData ? `Sale: ${saleData.title} (Status: ${saleData.status})` : '',
    '',
    priorStages.length > 0 ? `PRIOR STAGES DATA:\n${priorStages.join('\n')}` : 'No prior stage data available.',
  ].filter(Boolean).join('\n');
}

export default function StageAssistantChat({ stage, progress, leadData, clientData, saleData, allProgress, stages }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const context = buildContext(stage, progress, leadData, clientData, saleData, allProgress, stages);

    const systemPrompt = `You are the Frontier Pre-Con Co-Pilot — an AI assistant embedded in Stage ${stage.stage_order}: "${stage.stage_name}" of the pre-construction process.

CONTEXT:
${context}

RULES:
- You help draft deliverables, check risks, compare budgets, and suggest next actions.
- Use S.V.I.C. (Simple, Visual, Intelligent, Clear) language for any client-facing content.
- Be specific — reference actual data from the form fields and prior stages.
- When generating drafts, produce content ready to paste into form fields.
- When checking risks, compare against prior stages' data and flag discrepancies >5%.
- NEVER claim to auto-complete a stage or make changes — you only suggest.
- Keep responses concise and actionable.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nUser: ${text}`,
    });

    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="border border-indigo-200 rounded-lg bg-gradient-to-b from-indigo-50/50 to-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-100/50 border-b border-indigo-200">
        <Bot className="w-4 h-4 text-indigo-600" />
        <span className="text-xs font-semibold text-indigo-800">Pre-Con Co-Pilot</span>
        <span className="text-[10px] text-indigo-500 ml-auto">Stage {stage.stage_order}</span>
      </div>

      {/* Quick actions */}
      {messages.length === 0 && (
        <div className="p-3 space-y-2">
          <p className="text-xs text-slate-500">Ask me anything about this stage, or try:</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.prompt)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div ref={scrollRef} className="max-h-72 overflow-y-auto p-3 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-lg px-3 py-2 text-xs ${
                msg.role === 'user'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}>
                {msg.role === 'user' ? (
                  <p>{msg.content}</p>
                ) : (
                  <ReactMarkdown className="prose prose-xs prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_code]:text-[10px] [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:rounded">
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-400 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="p-2 border-t border-slate-100">
        <div className="flex gap-1.5">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the Co-Pilot..."
            rows={1}
            className="text-xs min-h-[32px] resize-none"
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0 bg-indigo-600 hover:bg-indigo-700"
            disabled={!input.trim() || loading}
            onClick={() => sendMessage(input)}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}