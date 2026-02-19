import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, MapPin, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const TYPE_LABELS = {
  daily_operational: 'Daily Operational',
  weekly_tactical: 'Weekly Tactical',
  monthly_strategic: 'Monthly Strategic',
  quarterly_reset: 'Quarterly Reset',
};

export default function MeetingDetailDialog({ open, onOpenChange, meeting, users, onToggleActionItem }) {
  if (!meeting) return null;

  const organizer = users.find(u => u.id === meeting.organizer_id);
  const getUserName = (id) => users.find(u => u.id === id)?.full_name || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meeting.title}</DialogTitle>
          <div className="flex gap-2 mt-2">
            <Badge>{TYPE_LABELS[meeting.meeting_type]}</Badge>
            <Badge variant="outline">{meeting.status?.replace('_', ' ')}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {meeting.start_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{format(new Date(meeting.start_date), 'MMM d, yyyy h:mm a')}</span>
              </div>
            )}
            {meeting.end_date && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Ends {format(new Date(meeting.end_date), 'h:mm a')}</span>
              </div>
            )}
            {meeting.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{meeting.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span>Organized by {organizer?.full_name || 'Unknown'}</span>
            </div>
          </div>

          {/* Attendees */}
          {(meeting.attendees || []).length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Attendees</h4>
              <div className="flex flex-wrap gap-2">
                {meeting.attendees.map(id => (
                  <Badge key={id} variant="secondary">{getUserName(id)}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {meeting.description && (
            <div>
              <h4 className="font-medium text-sm mb-1">Agenda / Description</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{meeting.description}</p>
            </div>
          )}

          {/* Action Items */}
          {(meeting.action_items || []).length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Action Items</h4>
              <div className="space-y-2">
                {meeting.action_items.map((item, idx) => {
                  const isOverdue = !item.is_completed && item.due_date && new Date(item.due_date) < new Date();
                  return (
                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${isOverdue ? 'bg-red-50 border-red-200' : item.is_completed ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                      <Checkbox
                        checked={item.is_completed}
                        onCheckedChange={() => onToggleActionItem(meeting, idx)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${item.is_completed ? 'line-through text-slate-400' : ''}`}>
                          {item.description}
                        </p>
                        <div className="flex gap-3 mt-1 text-xs text-slate-500">
                          <span>Assigned: {getUserName(item.assigned_to_user_id)}</span>
                          {item.due_date && (
                            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              Due: {format(new Date(item.due_date), 'MMM d, yyyy')}
                            </span>
                          )}
                          {item.completed_date && (
                            <span className="text-green-600">
                              Done: {format(new Date(item.completed_date), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                      {isOverdue && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      {item.is_completed && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Outcome Summary */}
          {meeting.outcome_summary && (
            <div>
              <h4 className="font-medium text-sm mb-1">Outcome Summary</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{meeting.outcome_summary}</p>
            </div>
          )}

          {/* Notes */}
          {meeting.notes && (
            <div>
              <h4 className="font-medium text-sm mb-1">Notes</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{meeting.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}