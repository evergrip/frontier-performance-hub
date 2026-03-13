import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, Clock, MapPin, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format, differenceInMinutes, differenceInHours, isPast } from 'date-fns';

export default function MeetingReminderPopup({ meetings, currentUser, onMarkComplete, onStartMeeting }) {
  const [dismissed, setDismissed] = useState({});
  const [open, setOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);

  const now = new Date();

  // Upcoming meetings within 60 minutes where user is organizer or attendee
  const upcomingSoon = meetings.filter(m => {
    if (m.status !== 'scheduled') return false;
    if (!m.start_date) return false;
    const start = new Date(m.start_date);
    if (isPast(start)) return false;
    const minsUntil = differenceInMinutes(start, now);
    if (minsUntil > 60 || minsUntil < 0) return false;
    const isInvolved = m.organizer_id === currentUser?.id || (m.attendees || []).includes(currentUser?.id);
    return isInvolved && !dismissed[m.id];
  });

  // Past meetings still "scheduled" where user is organizer — need completing
  const needsCompletion = meetings.filter(m => {
    if (m.status !== 'scheduled' && m.status !== 'in_progress') return false;
    if (!m.start_date) return false;
    const start = new Date(m.start_date);
    if (!isPast(start)) return false;
    const hoursAgo = differenceInHours(now, start);
    if (hoursAgo < 1) return false; // give at least 1 hour buffer
    return m.organizer_id === currentUser?.id && !dismissed[`complete_${m.id}`];
  });

  const handleDismiss = (id) => {
    setDismissed(prev => ({ ...prev, [id]: true }));
  };

  const handleDismissCompletion = (id) => {
    setDismissed(prev => ({ ...prev, [`complete_${id}`]: true }));
  };

  const getTimeUntil = (startDate) => {
    const mins = differenceInMinutes(new Date(startDate), now);
    if (mins <= 1) return 'Starting now';
    if (mins < 60) return `In ${mins} min`;
    return `In ${Math.round(mins / 60)}h`;
  };

  const getTimeSince = (startDate) => {
    const hours = differenceInHours(now, new Date(startDate));
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (upcomingSoon.length === 0 && needsCompletion.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {/* Upcoming meeting reminders */}
      {upcomingSoon.map(m => (
        <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50 animate-in fade-in slide-in-from-top-2">
          <div className="bg-blue-100 p-2 rounded-lg shrink-0">
            <Bell className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-blue-900 truncate">{m.title}</p>
              <Badge className="bg-blue-200 text-blue-800 text-xs shrink-0">{getTimeUntil(m.start_date)}</Badge>
            </div>
            <p className="text-xs text-blue-700 mt-0.5">
              {format(new Date(m.start_date), 'h:mm a')}
              {m.location && ` · ${m.location}`}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {m.organizer_id === currentUser?.id && (
              <Button size="sm" variant="default" className="text-xs h-7 bg-blue-600 hover:bg-blue-700"
                onClick={() => onStartMeeting(m)}>
                Start
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400 hover:text-blue-600"
              onClick={() => handleDismiss(m.id)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}

      {/* Complete meeting reminders */}
      {needsCompletion.map(m => (
        <div key={`complete_${m.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 animate-in fade-in slide-in-from-top-2">
          <div className="bg-amber-100 p-2 rounded-lg shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-amber-900 truncate">{m.title}</p>
              <Badge className="bg-amber-200 text-amber-800 text-xs shrink-0">{getTimeSince(m.start_date)}</Badge>
            </div>
            <p className="text-xs text-amber-700 mt-0.5">
              This meeting needs to be completed. Please update outcomes and action items.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="default" className="text-xs h-7 bg-amber-600 hover:bg-amber-700"
              onClick={() => onMarkComplete(m)}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-400 hover:text-amber-600"
              onClick={() => handleDismissCompletion(m.id)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}