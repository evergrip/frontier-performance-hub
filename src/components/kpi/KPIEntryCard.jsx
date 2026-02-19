import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, TrendingUp, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

export default function KPIEntryCard({ entry, kpi, onExplain }) {
  if (!kpi) return null;

  const getStatusColor = () => {
    if (!entry.target_value_at_entry) return 'slate';
    const pct = (entry.actual_value / entry.target_value_at_entry) * 100;
    if (pct >= 100) return 'green';
    if (pct >= 75) return 'amber';
    return 'red';
  };

  const statusColor = getStatusColor();
  const StatusIcon = entry.is_flagged ? AlertTriangle : entry.actual_value >= (entry.target_value_at_entry || 0) ? CheckCircle : TrendingUp;

  return (
    <Card className={entry.is_flagged ? 'border-red-300 bg-red-50' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CardTitle className="text-lg">{kpi.name}</CardTitle>
              <Badge variant="outline" className="text-[10px]">{kpi.category}</Badge>
              <Badge variant="outline" className="text-[10px]">{kpi.type}</Badge>
              {entry.is_flagged && <Badge variant="destructive" className="gap-1 text-[10px]"><AlertTriangle className="w-3 h-3" />Flagged</Badge>}
            </div>
            <CardDescription>
              {format(new Date(entry.reporting_period_start_date), 'MMM d')} – {format(new Date(entry.reporting_period_end_date), 'MMM d, yyyy')}
            </CardDescription>

            <div className="mt-4 flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-sm text-slate-500">Actual</p>
                <p className={`text-2xl font-bold ${statusColor === 'green' ? 'text-green-600' : statusColor === 'amber' ? 'text-amber-600' : statusColor === 'red' ? 'text-red-600' : 'text-slate-600'}`}>
                  {entry.actual_value}{kpi.measurement_unit === 'percentage' ? '%' : kpi.measurement_unit === 'USD' ? ' $' : ''}
                </p>
              </div>
              {entry.target_value_at_entry > 0 && (
                <>
                  <div>
                    <p className="text-sm text-slate-500">Target</p>
                    <p className="text-2xl font-bold text-slate-900">{entry.target_value_at_entry}{kpi.measurement_unit === 'percentage' ? '%' : kpi.measurement_unit === 'USD' ? ' $' : ''}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Achievement</p>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-5 h-5 ${statusColor === 'green' ? 'text-green-500' : statusColor === 'amber' ? 'text-amber-500' : statusColor === 'red' ? 'text-red-500' : 'text-slate-500'}`} />
                      <p className={`text-2xl font-bold ${statusColor === 'green' ? 'text-green-600' : statusColor === 'amber' ? 'text-amber-600' : statusColor === 'red' ? 'text-red-600' : 'text-slate-600'}`}>
                        {Math.round((entry.actual_value / entry.target_value_at_entry) * 100)}%
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {entry.is_flagged && (
              <div className="mt-4 p-3 bg-white rounded-lg border">
                {entry.explanation_provided ? (
                  <div>
                    <p className="text-sm font-medium text-slate-900 mb-1">Explanation:</p>
                    <p className="text-sm text-slate-600">{entry.explanation_provided}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-amber-600 font-medium">Explanation required</p>
                    <Button size="sm" variant="outline" onClick={() => onExplain(entry)}>Add Explanation</Button>
                  </div>
                )}
              </div>
            )}

            {entry.reviewed_by && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-1">Manager Feedback:</p>
                <p className="text-sm text-slate-600">{entry.manager_notes}</p>
                <p className="text-xs text-slate-500 mt-1">Reviewed on {format(new Date(entry.reviewed_date), 'MMM d, yyyy')}</p>
              </div>
            )}
          </div>

          {entry.explanation_provided && (
            <Button variant="ghost" size="sm" onClick={() => onExplain(entry)}>
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}