import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { XCircle } from 'lucide-react';

export default function LoseProjectDialog({ open, onOpenChange, onSave, sale }) {
  const [finalValue, setFinalValue] = useState('');
  const [reason, setReason] = useState('');

  const handleSave = () => {
    const finalValueNum = parseFloat(finalValue);
    if (isNaN(finalValueNum) || finalValueNum < 0) {
      alert('Please enter a valid final preconstruction value');
      return;
    }
    if (!reason.trim()) {
      alert('Please provide a reason for losing this project');
      return;
    }
    onSave(finalValueNum, reason);
    setFinalValue('');
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Mark Project as Lost
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            This will mark "{sale?.title}" as lost and remove it from the active pipeline.
          </div>

          <div className="space-y-2">
            <Label>Final Pre-Construction Value *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={finalValue}
              onChange={(e) => setFinalValue(e.target.value)}
            />
            <p className="text-xs text-slate-500">Enter the total value of work completed before losing this project</p>
          </div>

          <div className="space-y-2">
            <Label>Reason for Loss *</Label>
            <Textarea
              placeholder="Explain why this project was lost..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-red-500 hover:bg-red-600">
            Mark as Lost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}