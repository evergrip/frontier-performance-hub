import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, ExternalLink, Calendar, Clock, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function FirefliesSyncDialog({ open, onOpenChange, meeting, onSynced }) {
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (open) {
      loadTranscripts();
      setSelectedId(meeting?.fireflies_transcript_id || null);
    }
  }, [open]);

  const loadTranscripts = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('syncFireflies', {});
    if (res.data?.transcripts) {
      setTranscripts(res.data.transcripts);
    }
    setLoading(false);
  };

  const handleSync = async () => {
    if (!selectedId || !meeting) return;
    setSyncing(true);
    await base44.functions.invoke('syncFireflies', {
      meeting_id: meeting.id,
      transcript_id: selectedId,
    });
    setSyncing(false);
    onSynced?.();
    onOpenChange(false);
  };

  const filtered = transcripts.filter(t =>
    !searchQuery || (t.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Link Fireflies.ai Transcript
          </DialogTitle>
          {meeting && (
            <p className="text-sm text-slate-500">
              Select a Fireflies transcript to link to <strong>"{meeting.title}"</strong>
            </p>
          )}
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search transcripts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              <span className="ml-2 text-sm text-slate-500">Loading Fireflies transcripts...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>No transcripts found</p>
              <p className="text-xs mt-1">Make sure your Fireflies API key is configured correctly</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedId === t.id
                      ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-300'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{t.title || 'Untitled'}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        {t.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(t.date), 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                        {t.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {Math.round(t.duration / 60)}m
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1.5">
                        {t.has_summary && <Badge variant="secondary" className="text-[10px] py-0">Summary</Badge>}
                        {t.has_action_items && <Badge variant="secondary" className="text-[10px] py-0">Action Items</Badge>}
                      </div>
                    </div>
                    {selectedId === t.id && (
                      <Check className="w-5 h-5 text-violet-600 shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSync}
            disabled={!selectedId || syncing}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {syncing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Link Transcript
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}