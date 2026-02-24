import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, Trash2, Lock, Users } from "lucide-react";
import moment from "moment";

export default function ChatSessionList({ sessions, activeSessionId, onSelect, onCreate, onDelete }) {
  return (
    <div className="border-b pb-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chat Sessions</p>
        <Button variant="outline" size="sm" onClick={onCreate} className="h-7 text-xs gap-1">
          <Plus className="w-3 h-3" /> New Chat
        </Button>
      </div>
      {sessions.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-2">No sessions yet — start a new chat</p>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                s.id === activeSessionId
                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                  : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <MessageCircle className="w-3 h-3" />
              {s.title || `Chat ${moment(s.created_date).format("MMM D")}`}
              {(s.shared_with?.length > 0) && <Users className="w-3 h-3 text-blue-500" />}
              <span
                className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
                onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
              >
                <Trash2 className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}