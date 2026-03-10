import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EVENT_OPTIONS = {
  lead: [
    { value: 'lead_status_change', label: 'Lead status changes' },
    { value: 'lead_converted', label: 'Lead is converted to pre-construction' },
    { value: 'lead_created', label: 'New lead is created' },
  ],
  sale: [
    { value: 'sale_status_change', label: 'Pre-construction stage changes' },
    { value: 'sale_created', label: 'New pre-construction sale is created' },
  ],
  project: [
    { value: 'project_status_change', label: 'Construction project status changes' },
    { value: 'project_created', label: 'New construction project is created' },
  ],
};

const LEAD_STATUSES = [
  { value: 'new_project_lead', label: 'New Project Lead' },
  { value: 'initial_video_consult', label: 'Initial Video Consult' },
  { value: 'initial_inperson_consultation', label: 'Initial In-Person Consultation' },
  { value: 'preconstruction_proposal', label: 'Preconstruction Proposal' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'converted', label: 'Converted' },
  { value: 'disqualified', label: 'Disqualified' },
];

const SALE_STATUSES = [
  { value: 'feasibility', label: 'Feasibility' },
  { value: 'design_material_selections', label: 'Design & Materials' },
  { value: 'engineering_permits', label: 'Engineering & Permits' },
  { value: 'pending_construction_sale', label: 'Pending Construction Sale' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

const PROJECT_STATUSES = [
  { value: 'awaiting_to_be_scheduled', label: 'Awaiting Scheduling' },
  { value: 'mobilization', label: 'Mobilization' },
  { value: 'active_construction', label: 'Active Construction' },
  { value: 'substantial_completion_closeout', label: 'Closeout' },
  { value: 'closed', label: 'Closed' },
];

function getStatusOptions(entityType) {
  if (entityType === 'lead') return LEAD_STATUSES;
  if (entityType === 'sale') return SALE_STATUSES;
  if (entityType === 'project') return PROJECT_STATUSES;
  return [];
}

export default function AlertRuleForm({ onSubmit, onCancel, initialData, allUsers, currentUser, isAdmin }) {
  const [entityType, setEntityType] = useState(initialData?.entity_type || 'lead');
  const [eventType, setEventType] = useState(initialData?.event_type || '');
  const [statusFrom, setStatusFrom] = useState(initialData?.filter_status_from || '');
  const [statusTo, setStatusTo] = useState(initialData?.filter_status_to || '');
  const [assignedToMe, setAssignedToMe] = useState(initialData?.filter_assigned_to_me || false);
  const [deliveryMode, setDeliveryMode] = useState(initialData?.delivery_mode || 'immediate');
  const [targetUserId, setTargetUserId] = useState(initialData?.user_id || currentUser?.id || '');

  // Reset event type when entity type changes
  useEffect(() => {
    if (!initialData) {
      setEventType('');
      setStatusFrom('');
      setStatusTo('');
    }
  }, [entityType]);

  const isStatusChangeEvent = eventType?.includes('status_change');
  const statusOptions = getStatusOptions(entityType);
  const targetUser = targetUserId === currentUser?.id ? currentUser : allUsers?.find(u => u.id === targetUserId);

  const handleSubmit = () => {
    if (!eventType) return;
    onSubmit({
      user_id: targetUser?.id || currentUser?.id,
      user_email: targetUser?.email || currentUser?.email,
      user_name: targetUser?.full_name || currentUser?.full_name,
      entity_type: entityType,
      event_type: eventType,
      filter_status_from: isStatusChangeEvent ? statusFrom : '',
      filter_status_to: isStatusChangeEvent ? statusTo : '',
      filter_assigned_to_me: assignedToMe,
      delivery_mode: deliveryMode,
      is_active: true,
    });
  };

  return (
    <div className="space-y-4">
      {/* Admin: choose who to alert */}
      {isAdmin && (
        <div className="space-y-2">
          <Label>Alert for user</Label>
          <Select value={targetUserId} onValueChange={setTargetUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={currentUser?.id}>{currentUser?.full_name} (me)</SelectItem>
              {allUsers?.filter(u => u.id !== currentUser?.id).map(u => (
                <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Watch for changes on</Label>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lead">Leads</SelectItem>
            <SelectItem value="sale">Pre-Construction Sales</SelectItem>
            <SelectItem value="project">Construction Projects</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>When this happens</Label>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger>
            <SelectValue placeholder="Select event..." />
          </SelectTrigger>
          <SelectContent>
            {EVENT_OPTIONS[entityType]?.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status filters for status change events */}
      {isStatusChangeEvent && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>From status (optional)</Label>
            <Select value={statusFrom} onValueChange={setStatusFrom}>
              <SelectTrigger>
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Any status</SelectItem>
                {statusOptions.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>To status (optional)</Label>
            <Select value={statusTo} onValueChange={setStatusTo}>
              <SelectTrigger>
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Any status</SelectItem>
                {statusOptions.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Switch checked={assignedToMe} onCheckedChange={setAssignedToMe} />
        <Label>Only for items assigned to {targetUserId !== currentUser?.id ? 'this user' : 'me'}</Label>
      </div>

      <div className="space-y-2">
        <Label>Delivery</Label>
        <Select value={deliveryMode} onValueChange={setDeliveryMode}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="immediate">Send immediately</SelectItem>
            <SelectItem value="daily_digest">Include in daily summary</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!eventType}>Create Alert</Button>
      </div>
    </div>
  );
}