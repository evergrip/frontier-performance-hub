import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Loader2, Lock, Target, AlertTriangle, Download, Mic } from 'lucide-react';
import RecurrenceConfig from './RecurrenceConfig';
import ParentMeetingPicker from './ParentMeetingPicker';
import PreviousBusinessSection from './PreviousBusinessSection';
import MeetingMaterials from './MeetingMaterials';
import MeetingAgendaEditor from './MeetingAgendaEditor';

const EMPTY_ACTION_ITEM = { description: '', assigned_to_user_id: '', due_date: '', is_completed: false, linked_kpi_id: '', kpi_impact_value: 1 };

export default function MeetingFormDialog({ open, onOpenChange, meeting, onSubmit, saving, onOpenImportActions, pendingImportItems, onImportItemsConsumed, allMeetings = [] }) {
  const [form, setForm] = useState({});

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: [],
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => base44.entities.KPI.list(),
    initialData: [],
  });

  const { data: meetingTypes = [] } = useQuery({
    queryKey: ['meetingTypes'],
    queryFn: () => base44.entities.MeetingType.list(),
    initialData: [],
  });

  const activeMeetingTypes = meetingTypes
    .filter(t => t.is_active !== false)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const { data: companySettings = [] } = useQuery({
    queryKey: ['companySettings'],
    queryFn: () => base44.entities.CompanySettings.list(),
    initialData: [],
  });

  const minNoticeHours = companySettings[0]?.minimum_meeting_notice_hours || 24;

  useEffect(() => {
    if (open) {
      if (meeting) {
        setForm({
          ...meeting,
          start_date: meeting.start_date ? meeting.start_date.slice(0, 16) : '',
          end_date: meeting.end_date ? meeting.end_date.slice(0, 16) : '',
        });
      } else {
        setForm({
          title: '', description: '', meeting_type: 'weekly_tactical',
          start_date: '', end_date: '', location: '',
          parent_meeting_id: '',
          related_client_id: '', related_lead_id: '', related_project_id: '',
          attendees: [], organizer_id: '', status: 'scheduled',
          is_private: false, visible_to_user_ids: [],
          previous_business_items: [], action_items: [], outcome_summary: '', notes: '',
          recurrence: { enabled: false, frequency: '', interval: 1, days_of_week: [], monthly_type: 'day_of_month', day_of_month: 1, nth_ordinal: 1, nth_day_of_week: null, end_date: '' },
        });
      }
    }
  }, [open, meeting]);

  const getDefaultDuration = (typeValue) => {
    const mt = meetingTypes.find(t => t.value === typeValue);
    return mt?.default_duration_minutes || 60;
  };

  const computeEndDate = (startStr, durationMinutes) => {
    if (!startStr) return '';
    const start = new Date(startStr);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    // Format as local datetime-local string
    const pad = (n) => String(n).padStart(2, '0');
    return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
  };

  const updateField = (field, value) => setForm(prev => {
    const next = { ...prev, [field]: value };
    // Auto-fill end date when start date changes
    if (field === 'start_date' && value) {
      const duration = getDefaultDuration(prev.meeting_type);
      next.end_date = computeEndDate(value, duration);
    }
    // Auto-fill end date when meeting type changes (if start already set)
    if (field === 'meeting_type' && prev.start_date) {
      const duration = getDefaultDuration(value);
      next.end_date = computeEndDate(prev.start_date, duration);
    }
    return next;
  });

  const addActionItem = () => {
    updateField('action_items', [...(form.action_items || []), { ...EMPTY_ACTION_ITEM }]);
  };

  const updateActionItem = (index, field, value) => {
    const items = [...(form.action_items || [])];
    items[index] = { ...items[index], [field]: value };
    updateField('action_items', items);
  };

  const removeActionItem = (index) => {
    updateField('action_items', (form.action_items || []).filter((_, i) => i !== index));
  };

  // Handle parent meeting selection and auto-import previous business
  const handleParentSelect = (parentId) => {
    updateField('parent_meeting_id', parentId);
    if (parentId) {
      const parent = allMeetings.find(m => m.id === parentId);
      if (parent) {
        const outstanding = (parent.action_items || [])
          .filter(a => !a.is_completed)
          .map(a => ({
            description: a.description,
            assigned_to_user_id: a.assigned_to_user_id,
            due_date: a.due_date,
            is_completed: false,
            linked_kpi_id: a.linked_kpi_id || '',
            kpi_impact_value: a.kpi_impact_value || 1,
            source_meeting_id: parentId,
          }));
        // Also carry forward incomplete previous business from parent
        const outstandingPrev = (parent.previous_business_items || [])
          .filter(a => !a.is_completed)
          .map(a => ({
            ...a,
            is_completed: false,
            source_meeting_id: a.source_meeting_id || parentId,
          }));
        updateField('previous_business_items', [...outstandingPrev, ...outstanding]);
      }
    } else {
      updateField('previous_business_items', []);
    }
  };

  const updatePrevBusinessItem = (index, field, value) => {
    const items = [...(form.previous_business_items || [])];
    items[index] = { ...items[index], [field]: value };
    updateField('previous_business_items', items);
  };

  const removePrevBusinessItem = (index) => {
    updateField('previous_business_items', (form.previous_business_items || []).filter((_, i) => i !== index));
  };

  const toggleVisibleTo = (userId) => {
    const current = form.visible_to_user_ids || [];
    if (current.includes(userId)) {
      updateField('visible_to_user_ids', current.filter(id => id !== userId));
    } else {
      updateField('visible_to_user_ids', [...current, userId]);
    }
  };

  const toggleAttendee = (userId) => {
    const current = form.attendees || [];
    if (current.includes(userId)) {
      updateField('attendees', current.filter(id => id !== userId));
    } else {
      updateField('attendees', [...current, userId]);
    }
  };

  // Auto-inject scorecard action items when meeting goes to completed
  const ensureScorecardTasks = (data) => {
    const SCORECARD_DESCRIPTION = 'Fill out meeting effectiveness scorecard';
    const items = [...(data.action_items || [])];
    // Get all participant IDs (organizer + attendees)
    const participantIds = [...new Set([data.organizer_id, ...(data.attendees || [])].filter(Boolean))];
    
    // Check which participants already have a scorecard task
    const existingScorecardUserIds = items
      .filter(a => a.description === SCORECARD_DESCRIPTION)
      .map(a => a.assigned_to_user_id);
    
    // Add scorecard tasks for any participant who doesn't have one
    const today = new Date().toISOString().split('T')[0];
    const twoDaysOut = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    participantIds.forEach(userId => {
      if (!existingScorecardUserIds.includes(userId)) {
        items.push({
          description: SCORECARD_DESCRIPTION,
          assigned_to_user_id: userId,
          due_date: twoDaysOut,
          is_completed: false,
        });
      }
    });
    data.action_items = items;
  };

  const handleSubmit = () => {
    const data = { ...form };
    if (data.start_date) data.start_date = new Date(data.start_date).toISOString();
    if (data.end_date) data.end_date = new Date(data.end_date).toISOString();
    if (data.actual_start_time) data.actual_start_time = new Date(data.actual_start_time).toISOString();
    else delete data.actual_start_time;
    if (data.actual_end_time) data.actual_end_time = new Date(data.actual_end_time).toISOString();
    else delete data.actual_end_time;
    if (!data.related_client_id) delete data.related_client_id;
    if (!data.related_lead_id) delete data.related_lead_id;
    if (!data.related_project_id) delete data.related_project_id;
    // Auto-set has_agenda based on whether agenda sections, agenda html, or description is filled
    data.has_agenda = !!((data.agenda_sections && data.agenda_sections.length > 0) || (data.agenda_html && data.agenda_html.replace(/<[^>]*>/g, '').trim().length > 0) || (data.description && data.description.trim().length > 0));
    // Clean parent_meeting_id
    if (!data.parent_meeting_id) delete data.parent_meeting_id;
    // Clean KPI links on action items
    if (data.action_items) {
      data.action_items = data.action_items.map(item => {
        const cleaned = { ...item };
        if (!cleaned.linked_kpi_id) {
          delete cleaned.linked_kpi_id;
          delete cleaned.kpi_impact_value;
        }
        return cleaned;
      });
    }
    // Auto-add scorecard tasks when meeting is completed
    if (data.status === 'completed') {
      ensureScorecardTasks(data);
    }
    onSubmit(data);
  };

  // Consume imported action items from parent
  useEffect(() => {
    if (pendingImportItems && pendingImportItems.length > 0) {
      setForm(prev => ({
        ...prev,
        action_items: [...(prev.action_items || []), ...pendingImportItems],
      }));
      onImportItemsConsumed?.();
    }
  }, [pendingImportItems]);

  const getUserName = (id) => users.find(u => u.id === id)?.full_name || id;

  // Check if meeting is scheduled with insufficient notice
  const hasInsufficientNotice = (() => {
    if (!form.start_date) return false;
    const startTime = new Date(form.start_date).getTime();
    const now = Date.now();
    const hoursUntilMeeting = (startTime - now) / (1000 * 60 * 60);
    return hoursUntilMeeting < minNoticeHours && hoursUntilMeeting > 0;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meeting ? 'Edit Meeting' : 'Schedule Meeting'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title || ''} onChange={e => updateField('title', e.target.value)} placeholder="Meeting title" />
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={form.meeting_type || ''} onValueChange={v => updateField('meeting_type', v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {activeMeetingTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label} ({t.default_duration_minutes || 60}m)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scheduled Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Scheduled Start *</Label>
              <Input type="datetime-local" value={form.start_date || ''} onChange={e => updateField('start_date', e.target.value)} />
            </div>
            <div>
              <Label>Scheduled End</Label>
              <Input type="datetime-local" value={form.end_date || ''} onChange={e => updateField('end_date', e.target.value)} />
            </div>
          </div>

          {/* Insufficient notice warning */}
          {hasInsufficientNotice && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>This meeting is scheduled with less than {minNoticeHours} hours' notice. Best practice is to give participants sufficient time to prepare.</span>
            </div>
          )}

          {/* Actual Start/End Time (for completed meetings) */}
          {(form.status === 'completed' || form.status === 'in_progress') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Actual Start Time</Label>
                <Input type="datetime-local" value={form.actual_start_time ? form.actual_start_time.slice(0, 16) : ''} onChange={e => updateField('actual_start_time', e.target.value)} />
              </div>
              <div>
                <Label>Actual End Time</Label>
                <Input type="datetime-local" value={form.actual_end_time ? form.actual_end_time.slice(0, 16) : ''} onChange={e => updateField('actual_end_time', e.target.value)} />
              </div>
            </div>
          )}

          {/* Location & Organizer */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Location</Label>
              <Input value={form.location || ''} onChange={e => updateField('location', e.target.value)} placeholder="Room or link" />
            </div>
            <div>
              <Label>Organizer *</Label>
              <Select value={form.organizer_id || ''} onValueChange={v => updateField('organizer_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select organizer" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Parent meeting link */}
          {!meeting && (
            <ParentMeetingPicker
              meetings={allMeetings}
              meetingType={form.meeting_type}
              parentMeetingId={form.parent_meeting_id || ''}
              onParentSelect={handleParentSelect}
              users={users}
            />
          )}

          {/* Recurrence */}
          {!meeting && (
            <RecurrenceConfig
              recurrence={form.recurrence}
              onChange={v => updateField('recurrence', v)}
            />
          )}

          {/* Status */}
          <div>
            <Label>Status</Label>
            <Select value={form.status || 'scheduled'} onValueChange={v => updateField('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="rescheduled">Rescheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rich Agenda & Minutes Editor */}
          <MeetingAgendaEditor
            agendaHtml={form.agenda_html || ''}
            minutesHtml={form.minutes_html || ''}
            agendaTemplateId={form.agenda_template_id || ''}
            agendaSections={form.agenda_sections || []}
            meetingType={form.meeting_type}
            meetingTitle={form.title}
            onAgendaChange={v => updateField('agenda_html', v)}
            onMinutesChange={v => updateField('minutes_html', v)}
            onTemplateSelect={v => updateField('agenda_template_id', v)}
            onAgendaSectionsChange={v => updateField('agenda_sections', v)}
            showMinutes={form.status === 'completed' || form.status === 'in_progress' || !!meeting}
          />

          {/* Plain text description (kept for backward compat / quick notes) */}
          <div>
            <Label>Quick Description / Notes</Label>
            <Textarea value={form.description || ''} onChange={e => updateField('description', e.target.value)} placeholder="Optional plain-text summary" rows={2} />
          </div>

          {/* Attendees */}
          <div>
            <Label>Attendees</Label>
            <div className="flex flex-wrap gap-2 mt-1 mb-2">
              {(form.attendees || []).map(id => (
                <Badge key={id} variant="secondary" className="gap-1">
                  {getUserName(id)}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => toggleAttendee(id)} />
                </Badge>
              ))}
            </div>
            <Select onValueChange={v => toggleAttendee(v)}>
              <SelectTrigger><SelectValue placeholder="Add attendee..." /></SelectTrigger>
              <SelectContent>
                {users.filter(u => !(form.attendees || []).includes(u.id)).map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fireflies AI Notetaker */}
          <div className="border rounded-lg p-4 space-y-2 bg-violet-50 border-violet-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-violet-600" />
                <Label className="text-base font-semibold">Fireflies.ai Notetaker</Label>
              </div>
              <Switch checked={form.invite_fireflies || false} onCheckedChange={v => updateField('invite_fireflies', v)} />
            </div>
            <p className="text-xs text-slate-500">When enabled, <strong>fred@fireflies.ai</strong> will be added as a guest to auto-transcribe and summarize the meeting.</p>
          </div>

          {/* Privacy Settings */}
          <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                <Label className="text-base font-semibold">Private Meeting</Label>
              </div>
              <Switch checked={form.is_private || false} onCheckedChange={v => updateField('is_private', v)} />
            </div>
            <p className="text-xs text-slate-500">Private meetings are only visible to admins, the organizer, attendees, and anyone you add below.</p>

            {form.is_private && (
              <div>
                <Label>Additional People Who Can See This Meeting</Label>
                <div className="flex flex-wrap gap-2 mt-1 mb-2">
                  {(form.visible_to_user_ids || []).map(id => (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {getUserName(id)}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => toggleVisibleTo(id)} />
                    </Badge>
                  ))}
                </div>
                <Select onValueChange={v => toggleVisibleTo(v)}>
                  <SelectTrigger><SelectValue placeholder="Add person..." /></SelectTrigger>
                  <SelectContent>
                    {users.filter(u => !(form.visible_to_user_ids || []).includes(u.id)).map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Related Entities */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Related Client</Label>
              <Select value={form.related_client_id || 'none'} onValueChange={v => {
                updateField('related_client_id', v === 'none' ? '' : v);
                updateField('related_project_id', '');
              }}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name || c.contact_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Related Project</Label>
              <Select value={form.related_project_id || 'none'} onValueChange={v => updateField('related_project_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(form.related_client_id ? projects.filter(p => p.client_id === form.related_client_id) : projects).map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meeting Materials */}
          <MeetingMaterials
            materials={form.materials || []}
            onChange={(materials) => updateField('materials', materials)}
          />

          {/* Previous Business */}
          <PreviousBusinessSection
            items={form.previous_business_items || []}
            users={users}
            kpis={kpis}
            onUpdate={updatePrevBusinessItem}
            onRemove={removePrevBusinessItem}
          />

          {/* Action Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Action Items / Tasks</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenImportActions?.(form)}>
                  <Download className="w-4 h-4 mr-1" /> Import from Previous
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addActionItem}>
                  <Plus className="w-4 h-4 mr-1" /> Add Task
                </Button>
              </div>
            </div>
            {(form.action_items || []).map((item, idx) => (
              <div key={idx} className="border rounded-lg p-3 mb-2 space-y-2 bg-slate-50">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input value={item.description} onChange={e => updateActionItem(idx, 'description', e.target.value)} placeholder="Task description" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeActionItem(idx)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={item.assigned_to_user_id || ''} onValueChange={v => updateActionItem(idx, 'assigned_to_user_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Assign to..." /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={item.due_date || ''} onChange={e => updateActionItem(idx, 'due_date', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={item.linked_kpi_id || 'none'} onValueChange={v => updateActionItem(idx, 'linked_kpi_id', v === 'none' ? '' : v)}>
                    <SelectTrigger className="text-xs">
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-indigo-500" />
                        <SelectValue placeholder="Link KPI..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No KPI Link</SelectItem>
                      {kpis.filter(k => k.is_active !== false).map(k => (
                        <SelectItem key={k.id} value={k.id}>{k.name} ({k.category})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {item.linked_kpi_id && (
                    <Input
                      type="number"
                      value={item.kpi_impact_value || 1}
                      onChange={e => updateActionItem(idx, 'kpi_impact_value', parseFloat(e.target.value) || 0)}
                      placeholder="Impact value"
                      className="text-xs"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Outcome Summary */}
          <div>
            <Label>Outcome Summary</Label>
            <Textarea value={form.outcome_summary || ''} onChange={e => updateField('outcome_summary', e.target.value)} placeholder="Key decisions or outcomes" rows={2} />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => updateField('notes', e.target.value)} placeholder="Additional notes" rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.title || !form.meeting_type || !form.start_date || !form.organizer_id}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {meeting ? 'Update Meeting' : 'Create Meeting'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}