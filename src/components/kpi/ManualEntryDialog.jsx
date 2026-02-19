import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function ManualEntryDialog({ open, onOpenChange, kpi, user, onSubmit, isSubmitting }) {
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');

  const handleSubmit = () => {
    if (!kpi || !user) return;
    let actualValue = 0;
    if (kpi.response_type === 'yes_no') {
      actualValue = answer === 'yes' ? 1 : 0;
    } else {
      actualValue = parseFloat(answer) || 0;
    }

    const isFlagged = kpi.threshold_comparison && kpi.threshold_value != null
      ? checkThreshold(actualValue, kpi.threshold_value, kpi.threshold_comparison)
      : false;

    onSubmit({
      actual_value: actualValue,
      is_flagged: isFlagged,
      explanation_provided: isFlagged ? explanation : '',
      manual_entry: true
    });
    setAnswer('');
    setExplanation('');
  };

  const checkThreshold = (val, threshold, comparison) => {
    switch (comparison) {
      case 'less_than': return val < threshold;
      case 'greater_than': return val > threshold;
      case 'equal_to': return val === threshold;
      case 'not_equal_to': return val !== threshold;
      default: return false;
    }
  };

  if (!kpi) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log KPI Entry</DialogTitle>
          <DialogDescription>{kpi.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
            {kpi.question || kpi.description || 'Enter your value for this period'}
          </div>

          {kpi.target_value > 0 && (
            <div className="flex gap-2">
              <Badge variant="outline">Target: {kpi.target_value} {kpi.measurement_unit}</Badge>
              <Badge variant="outline">{kpi.reporting_period_type}</Badge>
            </div>
          )}

          {kpi.response_type === 'yes_no' ? (
            <div className="flex gap-3">
              <Button variant={answer === 'yes' ? 'default' : 'outline'} onClick={() => setAnswer('yes')} className="flex-1">Yes</Button>
              <Button variant={answer === 'no' ? 'default' : 'outline'} onClick={() => setAnswer('no')} className="flex-1">No</Button>
            </div>
          ) : (
            <div>
              <Label>Value</Label>
              <Input type="number" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={`Enter ${kpi.measurement_unit || 'value'}...`} className="mt-1" />
            </div>
          )}

          {kpi.explanation_required_on_flag && (
            <div>
              <Label className="text-xs text-slate-500">Explanation (if needed)</Label>
              <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Provide context if below target..." rows={3} className="mt-1" />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!answer || isSubmitting}>Submit Entry</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}