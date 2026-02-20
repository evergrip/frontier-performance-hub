import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, FileText, ListChecks, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function FirefliesSection({ meeting }) {
  if (!meeting.fireflies_transcript_id) return null;

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-violet-50/50 border-violet-200">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <img src="https://app.fireflies.ai/favicon.ico" alt="" className="w-4 h-4" onError={e => e.target.style.display='none'} />
          Fireflies.ai Notes
        </h4>
        <div className="flex items-center gap-2">
          {meeting.fireflies_synced_at && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Synced {format(new Date(meeting.fireflies_synced_at), 'MMM d, h:mm a')}
            </span>
          )}
          {meeting.fireflies_transcript_url && (
            <a href={meeting.fireflies_transcript_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-violet-600 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> View Transcript
            </a>
          )}
        </div>
      </div>

      {meeting.fireflies_summary && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Summary
          </p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{meeting.fireflies_summary}</p>
        </div>
      )}

      {meeting.fireflies_action_items && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
            <ListChecks className="w-3 h-3" /> AI-Detected Action Items
          </p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{meeting.fireflies_action_items}</p>
        </div>
      )}

      {meeting.fireflies_minutes && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Meeting Outline
          </p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{meeting.fireflies_minutes}</p>
        </div>
      )}
    </div>
  );
}