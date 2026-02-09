import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import MessageBubble from '../components/kpi/MessageBubble';
import { toast } from 'sonner';

export default function KPIAgentChat() {
  const [user, setUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Create a new conversation
        const conv = await base44.agents.createConversation({
          agent_name: 'kpi_assistant',
          metadata: {
            name: 'KPI Setup Session',
            description: `KPI configuration session for ${currentUser.full_name}`
          }
        });
        
        setConversation(conv);
        setMessages(conv.messages || []);
        
        // Subscribe to updates
        const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
          setMessages(data.messages);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        toast.error('Failed to start chat session');
      }
    };
    
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !conversation || sending) return;
    
    const message = input.trim();
    setInput('');
    setSending(true);
    
    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: message
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={createPageUrl('KPIDefinitions')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">KPI Assistant</h1>
            <p className="text-sm text-slate-600">Get help creating and configuring KPIs</p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Ready to help!</h3>
              <p className="text-slate-600 max-w-md">
                I can guide you through creating KPIs, explain different types, 
                and help you configure the perfect metrics for your team.
              </p>
              <div className="mt-6 grid gap-2">
                <button
                  onClick={() => setInput("I want to track revenue moving from preconstruction to construction")}
                  className="px-4 py-2 text-sm bg-slate-50 hover:bg-slate-100 rounded-lg text-left"
                >
                  💰 Track revenue transitions
                </button>
                <button
                  onClick={() => setInput("How do I create a scorecard for daily job site checks?")}
                  className="px-4 py-2 text-sm bg-slate-50 hover:bg-slate-100 rounded-lg text-left"
                >
                  ✅ Create a scorecard KPI
                </button>
                <button
                  onClick={() => setInput("What's the difference between calculated and manual KPIs?")}
                  className="px-4 py-2 text-sm bg-slate-50 hover:bg-slate-100 rounded-lg text-left"
                >
                  ❓ Learn about KPI types
                </button>
              </div>
            </div>
          )}
          
          {messages.map((message, idx) => (
            <MessageBubble key={idx} message={message} />
          ))}
          
          {sending && (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about creating KPIs..."
              disabled={!conversation || sending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || !conversation || sending}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  );
}