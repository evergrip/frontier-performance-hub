import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, CheckCircle2, Circle, Pencil, Trash2, Lock, FileText, Target, Repeat, ClipboardCheck } from 'lucide-react';
import CalendarInviteButton from './CalendarInviteButton';
import ScorecardAggregateBadge, { getScorecardAggregates } from './ScorecardAggregateBadge';
import { format } from 'date-fns';

const TYPE_LABELS = {
  daily_operational: 'Daily Operational',
  weekly_tactical: 'Weekly Tactical',
  monthly_strategic: 'Monthly Strategic',
  quarterly_reset: 'Quarterly Reset',
};

const TYPE_COLORS = {
  daily_operational: 'bg-blue-100 text-blue-800',
  weekly_tactical: 'bg-purple-100 text-purple-800',
  monthly_strategic: 'bg-amber-100 text-amber-800',
  quarterly_reset: 'bg-emerald-100 text-emerald-800',
};

const STATUS_COLORS = {
  scheduled: 'bg-sky-100 text-sky-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rescheduled: 'bg-orange-100 text-orange-800',
};

export default function MeetingCard({ meeting, users, onEdit, onDelete }) {
  const organizer = users.find(u => u.id === meeting.organizer_id);
  const attendeeNames = (meeting.attendees || []).map(id => users.find(u => u.id === id)?.full_name || 'Unknown');
  const actionItems = meeting.action_items || [];
  const completedItems = actionItems.filter(a => a.is_completed);
  const overdueItems = actionItems.filter(a => !a.is_completed && a.due_date && new Date(a.due_date) < new Date());

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{meeting.title}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge className={TYPE_COLORS[meeting.meeting_type]}>
                {TYPE_LABELS[meeting.meeting_type] || meeting.meeting_type}
              </Badge>
              <Badge className={STATUS_COLORS[meeting.status]}>
                {meeting.status?.replace('_', ' ')}
              </Badge>
              {meeting.is_private && (
                <Badge variant="outline" className="gap-1 text-slate-600">
                  <Lock className="w-3 h-3" /> Private
                </Badge>
              )}
              {!(meeting.has_agenda || (meeting.description && meeting.description.trim())) && (
                <Badge className="bg-red-100 text-red-700 gap-1">
                  <FileText className="w-3 h-3" /> No Agenda
                </Badge>
              )}
              {meeting.recurring_series_id && (
                <Badge variant="outline" className="gap-1 text-indigo-600">
                  <Repeat className="w-3 h-3" /> Recurring
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <CalendarInviteButton meeting={meeting} users={users} variant="ghost" size="sm" />
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(meeting); }}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(meeting); }}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Date & Time */}
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          {meeting.start_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(meeting.start_date), 'MMM d, yyyy')}
            </div>
          )}
          {meeting.start_date && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(new Date(meeting.start_date), 'h:mm a')}
              {meeting.end_date && ` – ${format(new Date(meeting.end_date), 'h:mm a')}`}
            </div>
          )}
          {meeting.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {meeting.location}
            </div>
          )}
        </div>

        {/* Organizer & Attendees */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{organizer?.full_name || 'Unknown'}</span>
          {attendeeNames.length > 0 && (
            <span className="text-slate-500">+ {attendeeNames.length} attendee{attendeeNames.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Action Items Summary */}
        {actionItems.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Action Items</span>
              <span className="text-slate-500">{completedItems.length}/{actionItems.length} complete</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${actionItems.length > 0 ? (completedItems.length / actionItems.length) * 100 : 0}%` }}
              />
            </div>
            {overdueItems.length > 0 && (
              <p className="text-xs text-red-600 font-medium">{overdueItems.length} overdue task{overdueItems.length !== 1 ? 's' : ''}</p>
            )}
            {actionItems.some(a => a.linked_kpi_id) && (
              <div className="flex items-center gap-1 text-xs text-indigo-600 mt-1">
                <Target className="w-3 h-3" />
                {actionItems.filter(a => a.linked_kpi_id).length} KPI-linked task{actionItems.filter(a => a.linked_kpi_id).length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Scorecard Summary */}
        {(() => {
          const agg = getScorecardAggregates(meeting);
          if (!agg) return null;
          const color = agg.avgScore >= 80 ? 'text-green-600' : agg.avgScore >= 60 ? 'text-amber-600' : 'text-red-600';
          const bg = agg.avgScore >= 80 ? 'bg-green-50' : agg.avgScore >= 60 ? 'bg-amber-50' : 'bg-red-50';
          return (
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-[#ea7924]" />
                  Effectiveness
                </span>
                <span className={`font-bold ${color}`}>{agg.avgScore}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                <div className={`h-2 rounded-full transition-all ${agg.avgScore >= 80 ? 'bg-green-500' : agg.avgScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${agg.avgScore}%` }} />
              </div>
              <p className="text-xs text-slate-500">{agg.submittedCount}/{agg.totalExpected} scorecards submitted{agg.pendingUserIds.length > 0 ? ` • ${agg.pendingUserIds.length} pending` : ''}</p>
            </div>
          );
        })()}

        {/* Outcome Summary */}
        {meeting.outcome_summary && (
          <div className="border-t pt-3 mt-3">
            <p className="text-sm text-slate-600 line-clamp-2">{meeting.outcome_summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}