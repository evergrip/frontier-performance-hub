import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AllocationDialog({ isOpen, onClose, onConfirm, project, month, existingPercentage }) {
  const [percentage, setPercentage] = useState('');

  React.useEffect(() => {
    if (isOpen && existingPercentage != null) {
      setPercentage(String(existingPercentage));
    } else if (isOpen) {
      setPercentage('');
    }
  }, [isOpen, existingPercentage]);

  const totalAllocated = project?.monthly_work_allocations?.reduce((sum, a) => sum + (a.percentage || 0), 0) || 0;
  const currentSlot = existingPercentage || 0;
  const maxAllowed = 100 - totalAllocated + currentSlot;

  const handleConfirm = () => {
    const val = parseFloat(percentage);
    if (percentage === '' || val < 0 || val > 100) {
      alert('Please enter a percentage between 0 and 100');
      return;
    }
    if (val > maxAllowed) {
      alert(`This project already has ${totalAllocated - currentSlot}% allocated elsewhere. Maximum for this month is ${maxAllowed}%.`);
      return;
    }
    onConfirm(val);
    setPercentage('');
  };

  const handleClose = () => {
    setPercentage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingPercentage ? 'Edit' : 'Allocate'} {project?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="percentage">What % of this project's work is in {month}?</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="percentage"
                type="number"
                min="0"
                max="100"
                placeholder="e.g., 30"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                autoFocus
              />
              <span className="flex items-center text-slate-600">%</span>
            </div>
            {project?.contract_value && percentage && (
              <p className="text-sm text-slate-600 mt-2">
                ≈ ${(project.contract_value * (parseFloat(percentage) / 100)).toLocaleString()} of ${project.contract_value.toLocaleString()}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {totalAllocated - currentSlot}% allocated elsewhere · {maxAllowed}% max for this month
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Allocate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}