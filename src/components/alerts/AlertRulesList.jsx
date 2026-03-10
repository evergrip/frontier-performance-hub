import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, Bell, Mail, Target, Briefcase, Building2 } from 'lucide-react';

const ENTITY_ICONS = {
  Lead: Target,
  Sale: Briefcase,
  Project: Building2,
};

const ENTITY_LABELS = {
  Lead: 'Leads',
  Sale: 'Pre-Construction',
  Project: 'Projects',
};

const EVENT_LABELS = {
  any_status_change: 'Any status change',
  status_change: 'Specific status change',
  record_created: 'New record created',
};

const STATUS_LABELS = {
  new_project_lead: 'New Project Lead',
  initial_video_consult: 'Initial Video Consult',
  initial_inperson_consultation: 'In-Person Consultation',
  preconstruction_proposal: 'Precon Proposal',
  followup: 'Follow-Up',
  converted: 'Converted',
  disqualified: 'Disqualified',
  feasibility: 'Feasibility',
  design_material_selections: 'Design & Materials',
  engineering_permits: 'Engineering & Permits',
  pending_construction_sale: 'Pending Construction Sale',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
  awaiting_to_be_scheduled: 'Awaiting Scheduling',
  mobilization: 'Mobilization',
  active_construction: 'Active Construction',
  substantial_completion_closeout: 'Closeout',
  closed: 'Closed',
};

export default function AlertRulesList({ rules, onEdit, onDelete, onToggle, isAdmin }) {
  if (!rules || rules.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium">No alert rules yet</p>
        <p className="text-sm">Create your first alert to get notified about important changes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => {
        const Icon = ENTITY_ICONS[rule.entity_type] || Bell;
        const statusDesc = rule.event_type === 'status_change'
          ? `${rule.from_status ? STATUS_LABELS[rule.from_status] || rule.from_status : 'Any'} → ${rule.to_status ? STATUS_LABELS[rule.to_status] || rule.to_status : 'Any'}`
          : null;

        return (
          <Card key={rule.id} className={`transition-opacity ${!rule.is_active ? 'opacity-50' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">{rule.name || 'Unnamed Alert'}</span>
                      <Badge variant="secondary" className="text-xs">
                        {ENTITY_LABELS[rule.entity_type]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {rule.delivery_method === 'immediate' ? '⚡ Immediate' : '📋 Daily Digest'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {EVENT_LABELS[rule.event_type]}
                      {statusDesc && <span className="ml-1">({statusDesc})</span>}
                      {rule.only_my_records && <span className="ml-1">· Only my records</span>}
                    </p>
                    {isAdmin && rule.user_name && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        <Mail className="w-3 h-3 inline mr-1" />{rule.user_name} ({rule.user_email})
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={() => onToggle(rule)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => onEdit(rule)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(rule)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}