import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, MapPin, Users, CheckCircle2, AlertCircle, Target, FileText, ClipboardCheck, XCircle, Paperclip, History, Link2, Pencil } from 'lucide-react';
import CalendarInviteButton from './CalendarInviteButton';
import { getScorecardAggregates } from './ScorecardAggregateBadge';
import { format } from 'date-fns';

const TYPE_LABELS = {
  daily_operational: 'Daily Operational',
  weekly_tactical: 'Weekly Tactical',
  monthly_strategic: 'Monthly Strategic',
  quarterly_reset: 'Quarterly Reset',
};

const SCORECARD_LABELS = {
  agenda_distributed_prior: 'Agenda distributed prior',
  clear_chairperson: 'Clear chairperson',
  started_with_review: 'Started with review of time, agenda & outcomes',
  senior_talks_last: 'Senior person talked last',
  started_on_time: 'Started on time',
  finished_on_time: 'Finished on time',
  stuck_to_agenda: 'Stuck to agenda',
  participants_focused: 'Participants focused',
  phones_off: 'Phones off',
  sufficient_notice: 'Sufficient notice given',
  participants_prepared: 'Participants came prepared',
  good_use_of_time: 'Good use of time',
};

export default function MeetingDetailDialog({ open, onOpenChange, meeting, users, kpis = [], onToggleActionItem, onOpenScorecard, allMeetings = [], onEdit, currentUser }) {
  if (!meeting) return null;

  const organizer = users.find(u => u.id === meeting.organizer_id);
  const getUserName = (id) => users.find(u => u.id === id)?.full_name || 'Unknown';
  const getKPIName = (id) => kpis.find(k => k.id === id)?.name || '';
  const hasAgenda = meeting.has_agenda || (meeting.description && meeting.description.trim().length > 0);
  const parentMeeting = meeting.parent_meeting_id ? allMeetings.find(m => m.id === meeting.parent_meeting_id) : null;
  const getFileName = (url) => { try { return decodeURIComponent(url.split('/').pop().split('?')[0]); } catch { return 'File'; } };

  // Punctuality
  const startedOnTime = meeting.actual_start_time && meeting.start_date
    ? new Date(meeting.actual_start_time) <= new Date(new Date(meeting.start_date).getTime() + 5 * 60000)
    : null;
  const finishedOnTime = meeting.actual_end_time && meeting.end_date
    ? new Date(meeting.actual_end_time) <= new Date(new Date(meeting.end_date).getTime() + 5 * 60000)
    : null;

  // Aggregated scorecards
  const agg = getScorecardAggregates(meeting);
  const scorecardKeys = Object.keys(SCORECARD_LABELS);
  const attendeeScorecards = meeting.attendee_scorecards || [];
  const myScorecard = currentUser ? attendeeScorecards.find(sc => sc.user_id === currentUser.id) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meeting.title}</DialogTitle>
          <div className="flex gap-2 mt-2 flex-wrap items-center">
            <Badge>{TYPE_LABELS[meeting.meeting_type]}</Badge>
            <Badge variant="outline">{meeting.status?.replace('_', ' ')}</Badge>
            <div className="ml-auto flex gap-2">
              <CalendarInviteButton meeting={meeting} users={users} />
              {onEdit && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { onOpenChange(false); onEdit(meeting); }}>
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
              )}
            </div>
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

          {/* Punctuality - actual times */}
          {(meeting.actual_start_time || meeting.actual_end_time) && (
            <div className="border rounded-lg p-3 bg-slate-50 space-y-1">
              <h4 className="font-medium text-sm mb-1">Punctuality</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                {meeting.actual_start_time && (
                  <div className="flex items-center gap-2">
                    {startedOnTime ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span>Actual start: {format(new Date(meeting.actual_start_time), 'h:mm a')}</span>
                    <Badge className={startedOnTime ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {startedOnTime ? 'On time' : 'Late start'}
                    </Badge>
                  </div>
                )}
                {meeting.actual_end_time && (
                  <div className="flex items-center gap-2">
                    {finishedOnTime ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span>Actual end: {format(new Date(meeting.actual_end_time), 'h:mm a')}</span>
                    <Badge className={finishedOnTime ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {finishedOnTime ? 'On time' : 'Ran over'}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parent meeting link */}
          {parentMeeting && (
            <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-blue-50 border border-blue-200">
              <Link2 className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800">Follow-up to: <strong>{parentMeeting.title}</strong>
                {parentMeeting.start_date && ` (${format(new Date(parentMeeting.start_date), 'MMM d, yyyy')})`}
              </span>
            </div>
          )}

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

          {/* Agenda Compliance */}
          <div className="flex items-center gap-2">
            <FileText className={`w-4 h-4 ${hasAgenda ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-sm font-medium ${hasAgenda ? 'text-green-700' : 'text-red-700'}`}>
              {hasAgenda ? 'Agenda provided' : 'No agenda — agenda required for all meetings'}
            </span>
          </div>

          {/* Description */}
          {meeting.description && (
            <div>
              <h4 className="font-medium text-sm mb-1">Agenda / Description</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{meeting.description}</p>
            </div>
          )}

          {/* Previous Business */}
          {(meeting.previous_business_items || []).length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" /> Previous Business
              </h4>
              <div className="space-y-2">
                {meeting.previous_business_items.map((item, idx) => {
                  const isOverdue = !item.is_completed && item.due_date && new Date(item.due_date) < new Date();
                  return (
                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border-l-4 border-blue-400 ${isOverdue ? 'bg-red-50 border-r border-t border-b border-r-red-200 border-t-red-200 border-b-red-200' : item.is_completed ? 'bg-green-50 border-r border-t border-b border-r-green-200 border-t-green-200 border-b-green-200' : 'bg-blue-50/40 border-r border-t border-b border-r-blue-100 border-t-blue-100 border-b-blue-100'}`}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${item.is_completed ? 'line-through text-slate-400' : ''}`}>{item.description}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                          <span>Assigned: {getUserName(item.assigned_to_user_id)}</span>
                          {item.due_date && <span className={isOverdue ? 'text-red-600 font-medium' : ''}>Due: {format(new Date(item.due_date), 'MMM d, yyyy')}</span>}
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
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
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
                          {item.linked_kpi_id && (
                            <span className="flex items-center gap-1 text-indigo-600">
                              <Target className="w-3 h-3" />
                              {getKPIName(item.linked_kpi_id)} (+{item.kpi_impact_value || 1})
                            </span>
                          )}
                        </div>
                        {item.completion_notes && (
                          <p className="text-xs text-slate-500 italic mt-1">"{item.completion_notes}"</p>
                        )}
                        {(item.file_urls || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.file_urls.map((url, fIdx) => (
                              <a key={fIdx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded">
                                <Paperclip className="w-3 h-3" /> {getFileName(url)}
                              </a>
                            ))}
                          </div>
                        )}
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

          {/* Effectiveness Scorecard */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#ea7924]" />
                Meeting Effectiveness Scorecard
              </h4>
              <Button variant="outline" size="sm" onClick={() => onOpenScorecard?.(meeting)}>
                {sc ? 'Edit Scorecard' : 'Fill Out Scorecard'}
              </Button>
            </div>

            {sc ? (
              <div className="space-y-2">
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  scorecardPct >= 80 ? 'bg-green-50' : scorecardPct >= 60 ? 'bg-amber-50' : 'bg-red-50'
                }`}>
                  <span className="text-sm font-medium">Score</span>
                  <span className={`text-lg font-bold ${
                    scorecardPct >= 80 ? 'text-green-600' : scorecardPct >= 60 ? 'text-amber-600' : 'text-red-600'
                  }`}>{scorecardScore}/{scorecardTotal} ({scorecardPct}%)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {scorecardKeys.map(key => (
                    <div key={key} className="flex items-center gap-2 text-xs py-1">
                      {sc[key] ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                      <span className={sc[key] ? 'text-slate-700' : 'text-slate-400'}>{SCORECARD_LABELS[key]}</span>
                    </div>
                  ))}
                </div>
                {sc.notes && (
                  <p className="text-xs text-slate-500 italic mt-2">"{sc.notes}"</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No scorecard submitted yet. Rate this meeting's effectiveness after it's complete.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}