import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Eye } from 'lucide-react';
import AlertEmailPreview from './AlertEmailPreview';

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

const STATUS_MAP = { Lead: LEAD_STATUSES, Sale: SALE_STATUSES, Project: PROJECT_STATUSES };
const ENTITY_LABELS = { Lead: 'Leads', Sale: 'Pre-Construction Sales', Project: 'Construction Projects' };

const EMPTY_TRIGGER = { entity_type: 'Lead', event_type: 'any_status_change', from_status: '', to_status: '' };

export default function AlertRuleFormDialog({ open, onClose, onSave, editRule, users, currentUser }) {
  const [tab, setTab] = useState('triggers');
  const [form, setForm] = useState({
    name: '',
    triggers: [{ ...EMPTY_TRIGGER }],
    only_my_records: false,
    delivery_method: 'immediate',
    email_subject_template: '',
    email_intro_text: '',
    target_user_id: '',
  });

  useEffect(() => {
    if (!open) return;
    setTab('triggers');
    if (editRule) {
      // Support legacy single-trigger rules
      const triggers = editRule.triggers && editRule.triggers.length > 0
        ? editRule.triggers
        : [{
            entity_type: editRule.entity_type || 'Lead',
            event_type: editRule.event_type || 'any_status_change',
            from_status: editRule.from_status || '',
            to_status: editRule.to_status || '',
          }];
      setForm({
        name: editRule.name || '',
        triggers,
        only_my_records: editRule.only_my_records || false,
        delivery_method: editRule.delivery_method || 'immediate',
        email_subject_template: editRule.email_subject_template || '',
        email_intro_text: editRule.email_intro_text || '',
        target_user_id: editRule.user_id || '',
      });
    } else {
      setForm({
        name: '',
        triggers: [{ ...EMPTY_TRIGGER }],
        only_my_records: false,
        delivery_method: 'immediate',
        email_subject_template: '',
        email_intro_text: '',
        target_user_id: currentUser?.id || '',
      });
    }
  }, [editRule, open, currentUser]);

  const updateTrigger = (idx, field, value) => {
    const updated = [...form.triggers];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'entity_type') {
      updated[idx].from_status = '';
      updated[idx].to_status = '';
    }
    if (field === 'event_type' && value !== 'status_change') {
      updated[idx].from_status = '';
      updated[idx].to_status = '';
    }
    setForm({ ...form, triggers: updated });
  };

  const addTrigger = () => {
    setForm({ ...form, triggers: [...form.triggers, { ...EMPTY_TRIGGER }] });
  };

  const removeTrigger = (idx) => {
    if (form.triggers.length <= 1) return;
    setForm({ ...form, triggers: form.triggers.filter((_, i) => i !== idx) });
  };

  const handleSave = () => {
    const targetUser = form.target_user_id && form.target_user_id !== currentUser?.id
      ? users.find(u => u.id === form.target_user_id)
      : currentUser;

    onSave({
      name: form.name,
      triggers: form.triggers,
      only_my_records: form.only_my_records,
      delivery_method: form.delivery_method,
      email_subject_template: form.email_subject_template,
      email_intro_text: form.email_intro_text,
      user_id: targetUser?.id,
      user_email: targetUser?.email,
      user_name: targetUser?.full_name,
      is_active: true,
    });
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editRule ? 'Edit Alert Rule' : 'New Alert Rule'}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="triggers" className="flex-1">Triggers</TabsTrigger>
            <TabsTrigger value="email" className="flex-1">Email Settings</TabsTrigger>
            <TabsTrigger value="preview" className="flex-1"><Eye className="w-3.5 h-3.5 mr-1" />Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="triggers" className="space-y-4 mt-4">
            <div>
              <Label>Alert Name</Label>
              <Input
                placeholder="e.g., Pipeline updates digest"
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
              <Label className="mb-2 block">Trigger Conditions</Label>
              <p className="text-xs text-slate-400 mb-3">Add multiple conditions — you'll be alerted when ANY of them match.</p>
              <div className="space-y-3">
                {form.triggers.map((trigger, idx) => {
                  const statuses = STATUS_MAP[trigger.entity_type] || [];
                  const showStatusFilters = trigger.event_type === 'status_change';
                  return (
                    <div key={idx} className="border rounded-lg p-3 bg-slate-50 space-y-3 relative">
                      {form.triggers.length > 1 && (
                        <Button
                          variant="ghost" size="icon"
                          className="absolute top-2 right-2 h-7 w-7 text-slate-400 hover:text-red-500"
                          onClick={() => removeTrigger(idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {idx > 0 && (
                        <div className="text-xs font-semibold text-orange-500 uppercase">OR</div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Watch</Label>
                          <Select value={trigger.entity_type} onValueChange={(v) => updateTrigger(idx, 'entity_type', v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Lead">Leads</SelectItem>
                              <SelectItem value="Sale">Pre-Construction Sales</SelectItem>
                              <SelectItem value="Project">Construction Projects</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">When</Label>
                          <Select value={trigger.event_type} onValueChange={(v) => updateTrigger(idx, 'event_type', v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any_status_change">Any status change</SelectItem>
                              <SelectItem value="status_change">Specific status change</SelectItem>
                              <SelectItem value="record_created">New record created</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {showStatusFilters && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">From <span className="text-slate-400">(optional)</span></Label>
                            <Select value={trigger.from_status || '_any'} onValueChange={(v) => updateTrigger(idx, 'from_status', v === '_any' ? '' : v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_any">Any</SelectItem>
                                {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">To <span className="text-slate-400">(optional)</span></Label>
                            <Select value={trigger.to_status || '_any'} onValueChange={(v) => updateTrigger(idx, 'to_status', v === '_any' ? '' : v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_any">Any</SelectItem>
                                {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={addTrigger}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Condition
              </Button>
            </div>

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
                  <SelectItem value="immediate">Immediate email (one per event)</SelectItem>
                  <SelectItem value="daily_digest">Daily digest (all events in one email)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div>
              <Label>Email Subject</Label>
              <Input
                placeholder={form.delivery_method === 'daily_digest' ? 'Daily Alert Digest — {count} updates' : 'Alert: {event}'}
                value={form.email_subject_template}
                onChange={(e) => setForm({ ...form, email_subject_template: e.target.value })}
              />
              <p className="text-xs text-slate-400 mt-1">
                Leave blank for default. Use <code className="bg-slate-100 px-1 rounded">{'{event}'}</code> for the event description
                {form.delivery_method === 'daily_digest' && <>, <code className="bg-slate-100 px-1 rounded">{'{count}'}</code> for number of updates</>}.
              </p>
            </div>
            <div>
              <Label>Intro Text</Label>
              <Textarea
                placeholder="Optional custom intro paragraph for the email..."
                value={form.email_intro_text}
                onChange={(e) => setForm({ ...form, email_intro_text: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-slate-400 mt-1">Appears at the top of the email body. Leave blank for default.</p>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <AlertEmailPreview
              deliveryMethod={form.delivery_method}
              subjectTemplate={form.email_subject_template}
              introText={form.email_intro_text}
              triggers={form.triggers}
              alertName={form.name}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{editRule ? 'Save Changes' : 'Create Alert'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}