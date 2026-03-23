import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function GrossMarginReportDialog({ open, onOpenChange, project, currentUser }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    gross_margin_percent: project?.actual_margin || '',
    contract_value: project?.contract_value || '',
    actual_costs: project?.actual_costs || '',
    notes: ''
  });

  const submitMutation = useMutation({
    mutationFn: (data) => base44.entities.GrossMarginReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['gross-margin-reports']);
      toast.success('Gross margin report submitted');
      onOpenChange(false);
      setForm({ gross_margin_percent: '', contract_value: '', actual_costs: '', notes: '' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const marginPct = parseFloat(form.gross_margin_percent) || 0;
    const contractVal = parseFloat(form.contract_value) || 0;
    const actualCosts = parseFloat(form.actual_costs) || 0;
    const marginDollars = contractVal > 0 ? contractVal - actualCosts : 0;

    submitMutation.mutate({
      project_id: project.id,
      project_title: project.title,
      reporting_date: new Date().toISOString().split('T')[0],
      contract_value: contractVal,
      actual_costs: actualCosts,
      gross_margin_percent: marginPct,
      gross_margin_dollars: marginDollars,
      submitted_by: currentUser?.id,
      submitted_by_name: currentUser?.full_name || currentUser?.email,
      notes: form.notes
    });
  };

  // Recalculate margin when costs change
  const contractVal = parseFloat(form.contract_value) || 0;
  const actualCosts = parseFloat(form.actual_costs) || 0;
  const calcMargin = contractVal > 0 ? ((contractVal - actualCosts) / contractVal * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gross Margin Report</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-900">{project?.title}</p>
            <p className="text-xs text-slate-500">Report for {new Date().toLocaleDateString()}</p>
          </div>

          <div>
            <Label>Current Contract Value ($)</Label>
            <Input
              type="number"
              value={form.contract_value}
              onChange={(e) => setForm({ ...form, contract_value: e.target.value })}
              placeholder="750000"
              required
            />
          </div>

          <div>
            <Label>Actual Costs to Date ($)</Label>
            <Input
              type="number"
              value={form.actual_costs}
              onChange={(e) => setForm({ ...form, actual_costs: e.target.value })}
              placeholder="600000"
              required
            />
          </div>

          <div>
            <Label>Gross Margin (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.gross_margin_percent}
              onChange={(e) => setForm({ ...form, gross_margin_percent: e.target.value })}
              placeholder={calcMargin.toFixed(1)}
              required
            />
            {contractVal > 0 && actualCosts > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Calculated: {calcMargin.toFixed(1)}% (${(contractVal - actualCosts).toLocaleString()} margin)
              </p>
            )}
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any comments on current margin status..."
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitMutation.isPending}>
              Submit Report
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}