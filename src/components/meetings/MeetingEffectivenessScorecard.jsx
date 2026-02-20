import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, XCircle, ClipboardCheck, Loader2 } from 'lucide-react';

const SCORECARD_ITEMS = [
  { key: 'agenda_distributed_prior', label: 'Agenda was distributed prior to the meeting' },
  { key: 'clear_chairperson', label: 'Meeting had a clear chairperson' },
  { key: 'started_with_review', label: 'Started with a review of time, agenda & intended outcomes' },
  { key: 'senior_talks_last', label: 'Most senior person talked last (not first) about ideas' },
  { key: 'started_on_time', label: 'Meeting started on time' },
  { key: 'finished_on_time', label: 'Meeting finished on time' },
  { key: 'stuck_to_agenda', label: 'Meeting stuck to the agenda vs. introducing new topics' },
  { key: 'participants_focused', label: 'Participants were focused and not multi-tasking' },
  { key: 'phones_off', label: 'Participants respected one another and had phones off' },
  { key: 'sufficient_notice', label: 'Meeting was planned with sufficient notice' },
  { key: 'participants_prepared', label: 'Participants came prepared for the meeting' },
  { key: 'good_use_of_time', label: 'Meeting was a good use of time and contribution to the company' },
];

export default function MeetingEffectivenessScorecard({ open, onOpenChange, meeting, currentUser, onSubmit, saving }) {
  const [scorecard, setScorecard] = useState({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && meeting && currentUser) {
      // Check if this user already submitted a scorecard
      const existingCards = meeting.attendee_scorecards || [];
      const myCard = existingCards.find(sc => sc.user_id === currentUser.id);
      // Fallback to legacy scorecard if same user
      const legacy = meeting.effectiveness_scorecard;
      const existing = myCard || (legacy?.submitted_by === currentUser.id ? legacy : {});
      const initial = {};
      SCORECARD_ITEMS.forEach(item => {
        initial[item.key] = existing[item.key] || false;
      });
      setScorecard(initial);
      setNotes(existing.notes || '');
    }
  }, [open, meeting, currentUser]);

  const score = SCORECARD_ITEMS.filter(item => scorecard[item.key]).length;
  const total = SCORECARD_ITEMS.length;
  const pct = Math.round((score / total) * 100);

  const handleSubmit = () => {
    // Build the per-attendee scorecard entry
    const myEntry = {
      ...scorecard,
      notes,
      user_id: currentUser?.id,
      submitted_date: new Date().toISOString(),
    };
    // Merge into existing attendee_scorecards array
    const existingCards = [...(meeting.attendee_scorecards || [])];
    const existingIdx = existingCards.findIndex(sc => sc.user_id === currentUser?.id);
    if (existingIdx >= 0) {
      existingCards[existingIdx] = myEntry;
    } else {
      existingCards.push(myEntry);
    }
    onSubmit({ attendee_scorecards: existingCards });
  };

  const scoreColor = pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = pct >= 80 ? 'bg-green-50' : pct >= 60 ? 'bg-amber-50' : 'bg-red-50';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#ea7924]" />
            Meeting Effectiveness Scorecard
          </DialogTitle>
          {meeting && <p className="text-sm text-slate-500 mt-1">{meeting.title}</p>}
        </DialogHeader>

        <div className="space-y-1">
          {SCORECARD_ITEMS.map((item) => (
            <div
              key={item.key}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                scorecard[item.key] ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => setScorecard(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
            >
              <span className="text-sm pr-4">{item.label}</span>
              {scorecard[item.key] ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-slate-300 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Score summary */}
        <div className={`flex items-center justify-between p-4 rounded-lg ${scoreBg}`}>
          <span className="font-medium text-sm">Effectiveness Score</span>
          <span className={`text-2xl font-bold ${scoreColor}`}>{score}/{total} ({pct}%)</span>
        </div>

        <div>
          <Label>Additional Notes</Label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any comments about the meeting effectiveness..."
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Scorecard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}