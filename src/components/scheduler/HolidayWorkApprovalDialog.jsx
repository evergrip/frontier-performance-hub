import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

export default function HolidayWorkApprovalDialog({ isOpen, onClose, holidayName, date, onApprove }) {
  const [reason, setReason] = useState('');

  const handleApprove = () => {
    if (!reason.trim()) return;
    onApprove(reason.trim());
    setReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-600 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Holiday Work Approval
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <strong>{date}</strong> is designated as <strong>{holidayName}</strong>.
            Assigning work on this day requires approval and a reason.
          </div>
          <div>
            <Label className="text-sm">Reason for holiday work</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why work is needed on this holiday..."
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleApprove}
            disabled={!reason.trim()}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Approve & Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}