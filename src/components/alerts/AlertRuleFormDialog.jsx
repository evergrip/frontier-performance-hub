import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const LEAD_STATUSES = [
  { value: 'new_project_lead', label: 'New Project Lead' },
  { value: 'initial_video_consult', label: 'Initial Video Consult' },
  { value: 'initial_inperson_consultation', label: 'Initial In-Person Consultation' },
  { value: 'preconstruction_proposal', label: 'Preconstruction Proposal' },
  { value: 'followup', label: 'Follow-Up' },
  { value: 'converted', label: 'Converted' },
  { value: 'disqualified', label: 'Disqualified' },
];

const SALE_STATUSES = [
  { value: 'feasibility', label: 'Feasibility' },
  { value: 'design_material_selections', label: 'Design & Material Selections' },
  { value: 'engineering_permits', label: 'Engineering & Permits' },
  { value: 'pending_construction_sale', label: 'Pending Construction Sale' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

const PROJECT_STATUSES = [
  { value: 'awaiting_to_be_scheduled', label: 'Awaiting Scheduling' },
  { value: 'mobilization', label: 'Mobilization' },
  { value: 'active_construction', label: 'Active Construction' },
  { value: 'substantial_completion_closeout', label: 'Substantial Completion / Closeout' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_MAP = {
  Lead: LEAD_STATUSES,
  Sale: SALE_STATUSES,
  Project: PROJECT_STATUSES,
};

export default function AlertRuleFormDialog({ open, onClose, onSave, editRule, users, currentUser }) {
  const [form, setForm] = useState({
    name: '',
    entity_type: 'Lead',
    event_type: 'any_status_change',
    from_status: '',
    to_status: '',
    only_my_records: false,
    delivery_method: 'immediate',
    target_user_id: '',
  });

  useEffect(() => {
    if (editRule) {
      setForm({
        name: editRule.name || '',
        entity_type: editRule.entity_type || 'Lead',
        event_type: editRule.event_type || 'any_status_change',
        from_status: editRule.from_status || '',
        to_status: editRule.to_status || '',
        only_my_records: editRule.only_my_records || false,
        delivery_method: editRule.delivery_method || 'immediate',
        target_user_id: editRule.user_id || '',
      });
    } else {
      setForm({
        name: '',
        entity_type: 'Lead',
        event_type: 'any_status_change',
        from_status: '',
        to_status: '',
        only_my_records: false,
        delivery_method: 'immediate',
        target_user_id: currentUser?.id || '',
      });
    }
  }, [editRule, open, currentUser]);

  const handleSave = () => {
    const targetUser = form.target_user_id && form.target_user_id !== currentUser?.id
      ? users.find(u => u.id === form.target_user_id)
      : currentUser;

    onSave({
      ...form,
      user_id: targetUser?.id,
      user_email: targetUser?.email,
      user_name: targetUser?.full_name,
      is_active: true,
    });
  };

  const statuses = STATUS_MAP[form.entity_type] || [];
  const isAdmin = currentUser?.role === 'admin';
  const showStatusFilters = form.event_type === 'status_change';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editRule ? 'Edit Alert Rule' : 'New Alert Rule'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Alert Name</Label>
            <Input
              placeholder="e.g., Lead converted to precon"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {isAdmin && (
            <div>
              <Label>Alert For</Label>
              <Select value={form.target_user_id} onValueChange={(v) => setForm({ ...form, target_user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Watch</Label>
            <Select value={form.entity_type} onValueChange={(v) => setForm({ ...form, entity_type: v, from_status: '', to_status: '' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Lead">Leads</SelectItem>
                <SelectItem value="Sale">Pre-Construction Sales</SelectItem>
                <SelectItem value="Project">Construction Projects</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Trigger When</Label>
            <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v, from_status: '', to_status: '' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any_status_change">Any status change</SelectItem>
                <SelectItem value="status_change">Specific status change</SelectItem>
                <SelectItem value="record_created">New record created</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showStatusFilters && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From Status <span className="text-xs text-slate-400">(optional)</span></Label>
                <Select value={form.from_status || '_any'} onValueChange={(v) => setForm({ ...form, from_status: v === '_any' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_any">Any</SelectItem>
                    {statuses.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Status <span className="text-xs text-slate-400">(optional)</span></Label>
                <Select value={form.to_status || '_any'} onValueChange={(v) => setForm({ ...form, to_status: v === '_any' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_any">Any</SelectItem>
                    {statuses.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Only my records</Label>
            <Switch
              checked={form.only_my_records}
              onCheckedChange={(v) => setForm({ ...form, only_my_records: v })}
            />
          </div>

          <div>
            <Label>Delivery</Label>
            <Select value={form.delivery_method} onValueChange={(v) => setForm({ ...form, delivery_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate email</SelectItem>
                <SelectItem value="daily_digest">Daily digest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{editRule ? 'Save Changes' : 'Create Alert'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}