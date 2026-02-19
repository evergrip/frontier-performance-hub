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
import { X, Plus, Loader2, Lock } from 'lucide-react';

const MEETING_TYPES = [
  { value: 'daily_operational', label: 'Daily Operational (Huddle)' },
  { value: 'weekly_tactical', label: 'Weekly Tactical' },
  { value: 'monthly_strategic', label: 'Monthly Strategic' },
  { value: 'quarterly_reset', label: 'Quarterly Reset/Reflect' },
];

const EMPTY_ACTION_ITEM = { description: '', assigned_to_user_id: '', due_date: '', is_completed: false };

export default function MeetingFormDialog({ open, onOpenChange, meeting, onSubmit, saving }) {
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
          related_client_id: '', related_lead_id: '', related_project_id: '',
          attendees: [], organizer_id: '', status: 'scheduled',
          is_private: false, visible_to_user_ids: [],
          action_items: [], outcome_summary: '', notes: '',
        });
      }
    }
  }, [open, meeting]);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

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

  const handleSubmit = () => {
    const data = { ...form };
    if (data.start_date) data.start_date = new Date(data.start_date).toISOString();
    if (data.end_date) data.end_date = new Date(data.end_date).toISOString();
    if (!data.related_client_id) delete data.related_client_id;
    if (!data.related_lead_id) delete data.related_lead_id;
    if (!data.related_project_id) delete data.related_project_id;
    onSubmit(data);
  };

  const getUserName = (id) => users.find(u => u.id === id)?.full_name || id;

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
                  {MEETING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date/Time *</Label>
              <Input type="datetime-local" value={form.start_date || ''} onChange={e => updateField('start_date', e.target.value)} />
            </div>
            <div>
              <Label>End Date/Time</Label>
              <Input type="datetime-local" value={form.end_date || ''} onChange={e => updateField('end_date', e.target.value)} />
            </div>
          </div>

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

          {/* Description */}
          <div>
            <Label>Agenda / Description</Label>
            <Textarea value={form.description || ''} onChange={e => updateField('description', e.target.value)} placeholder="Meeting agenda or purpose" rows={3} />
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
              <Select value={form.related_client_id || 'none'} onValueChange={v => updateField('related_client_id', v === 'none' ? '' : v)}>
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
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Action Items / Tasks</Label>
              <Button type="button" variant="outline" size="sm" onClick={addActionItem}>
                <Plus className="w-4 h-4 mr-1" /> Add Task
              </Button>
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