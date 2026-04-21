import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock, ShieldAlert, TrendingUp, X, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ALERT_ICONS = {
  overdue: Clock,
  missing_fields: ShieldAlert,
  missing_approval: ShieldAlert,
  budget_drift: TrendingUp,
  risk: AlertTriangle,
  suggestion: Bot,
};

const SEVERITY_STYLES = {
  high: 'border-red-200 bg-red-50',
  medium: 'border-amber-200 bg-amber-50',
  low: 'border-blue-200 bg-blue-50',
};

const SEVERITY_ICON_STYLES = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-blue-500',
};

export default function CopilotAlertsBanner({ leadId }) {
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ['copilot-alerts', leadId],
    queryFn: async () => {
      const all = await base44.entities.PreconCopilotAlert.list('-created_date', 200);
      return all.filter(a => a.lead_id === leadId && !a.is_dismissed);
    },
    enabled: !!leadId,
    staleTime: 60000,
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => base44.entities.PreconCopilotAlert.update(id, { is_dismissed: true }),
    onSuccess: () => queryClient.invalidateQueries(['copilot-alerts', leadId]),
  });

  if (alerts.length === 0) return null;

  const sorted = [...alerts].sort((a, b) => {
    const sev = { high: 0, medium: 1, low: 2 };
    return (sev[a.severity] || 2) - (sev[b.severity] || 2);
  });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 mb-1">
        <Bot className="w-4 h-4 text-indigo-600" />
        <span className="text-xs font-semibold text-indigo-800">Co-Pilot Alerts</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-medium">{alerts.length}</span>
      </div>
      {sorted.slice(0, 5).map(alert => {
        const Icon = ALERT_ICONS[alert.alert_type] || AlertTriangle;
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.low}`}
          >
            <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${SEVERITY_ICON_STYLES[alert.severity] || 'text-blue-500'}`} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800">{alert.message}</p>
              {alert.suggestion && (
                <p className="text-slate-500 mt-0.5">{alert.suggestion}</p>
              )}
            </div>
            <button
              onClick={() => dismissMutation.mutate(alert.id)}
              className="shrink-0 p-0.5 hover:bg-white/50 rounded"
              title="Dismiss"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        );
      })}
      {alerts.length > 5 && (
        <p className="text-[10px] text-slate-400 pl-6">+{alerts.length - 5} more alerts</p>
      )}
    </div>
  );
}