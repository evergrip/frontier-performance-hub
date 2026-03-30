import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import moment from "moment";

export default function ProcessMapComments({ processMap, user }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const comments = (processMap.comments || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    setSending(true);

    const newComment = {
      user_id: user.id,
      user_name: user.full_name || user.email,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    await base44.entities.ProcessMap.update(processMap.id, {
      comments: [...(processMap.comments || []), newComment],
    });

    setText("");
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ["processMap", processMap.id] });
  };

  return (
    <div className="space-y-4">
      {user && (
        <div className="flex gap-2">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!text.trim() || sending} size="icon" className="shrink-0 self-end">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      )}

      {comments.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-8">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c, i) => (
            <div key={i} className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">{c.user_name || "Unknown"}</span>
                <span className="text-xs text-slate-400">{moment(c.timestamp).fromNow()}</span>
              </div>
              <p className="text-sm text-slate-600">{c.text}</p>
              {c.step_id && <span className="text-xs text-blue-500 mt-1 inline-block">Re: {c.step_id}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}