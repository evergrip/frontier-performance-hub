import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trash2, Mail, Clock } from 'lucide-react';

const ENTITY_LABELS = { lead: 'Lead', sale: 'Pre-Construction', project: 'Project' };

const EVENT_LABELS = {
  lead_status_change: 'Status changes',
  lead_converted: 'Converted to pre-construction',
  lead_created: 'New lead created',
  sale_status_change: 'Stage changes',
  sale_created: 'New sale created',
  project_status_change: 'Status changes',
  project_created: 'New project created',
};

const ENTITY_COLORS = {
  lead: 'bg-purple-100 text-purple-800',
  sale: 'bg-blue-100 text-blue-800',
  project: 'bg-emerald-100 text-emerald-800',
};

export default function AlertRuleCard({ rule, onToggle, onDelete, userName }) {
  return (
    <div className={`p-4 border rounded-lg transition-all ${rule.is_active ? 'bg-white' : 'bg-slate-50 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Badge className={ENTITY_COLORS[rule.entity_type]}>
              {ENTITY_LABELS[rule.entity_type]}
            </Badge>
            <span className="text-sm font-medium text-slate-900">
              {EVENT_LABELS[rule.event_type] || rule.event_type}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            {rule.filter_status_from && (
              <span>From: <strong>{rule.filter_status_from.replace(/_/g, ' ')}</strong></span>
            )}
            {rule.filter_status_to && (
              <span>To: <strong>{rule.filter_status_to.replace(/_/g, ' ')}</strong></span>
            )}
            {rule.filter_assigned_to_me && <span>Only my items</span>}
            {userName && rule.user_name && rule.user_name !== userName && (
              <span>For: <strong>{rule.user_name}</strong></span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            {rule.delivery_mode === 'immediate' ? (
              <><Mail className="w-3 h-3" /> Immediate email</>
            ) : (
              <><Clock className="w-3 h-3" /> Daily digest</>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Switch checked={rule.is_active} onCheckedChange={() => onToggle(rule)} />
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => onDelete(rule)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}