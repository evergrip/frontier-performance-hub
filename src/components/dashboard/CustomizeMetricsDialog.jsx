import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const METRIC_OPTIONS = [
  { key: 'totalRevenue', label: 'Total Revenue' },
  { key: 'preconRevenue', label: 'Pre-Construction Revenue' },
  { key: 'constructionRevenue', label: 'Construction Revenue' },
  { key: 'activeProjects', label: 'Active Projects' },
  { key: 'activeSales', label: 'Active Pre-Con Sales' },
  { key: 'activeLeads', label: 'Active Leads' },
  { key: 'grossProfit', label: 'Total Gross Profit' },
  { key: 'margins', label: 'Gross Margin %' },
  { key: 'conversionRate', label: 'Lead Conversion Rate' },
  { key: 'winRate', label: 'Win Rate (After Proposal)' },
];

export default function CustomizeMetricsDialog({ open, onOpenChange, visibleMetrics, setVisibleMetrics }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Select which metrics to display on your dashboard:</p>
          <div className="grid grid-cols-2 gap-4">
            {METRIC_OPTIONS.map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={visibleMetrics[key]}
                  onCheckedChange={(checked) => setVisibleMetrics({ ...visibleMetrics, [key]: checked })}
                />
                <Label htmlFor={key} className="cursor-pointer">{label}</Label>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}