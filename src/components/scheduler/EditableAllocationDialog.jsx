import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function EditableAllocationDialog({ isOpen, onClose, onConfirm, onRemove, project, month, currentPercentage }) {
  const [percentage, setPercentage] = useState('');
  const isEditing = currentPercentage > 0;

  useEffect(() => {
    if (isOpen && currentPercentage > 0) {
      setPercentage(String(currentPercentage));
    } else if (isOpen) {
      setPercentage('');
    }
  }, [isOpen, currentPercentage]);

  const handleConfirm = () => {
    const val = parseFloat(percentage);
    if (percentage === '' || val < 0 || val > 100) {
      alert('Please enter a percentage between 0 and 100');
      return;
    }
    onConfirm(val);
    setPercentage('');
  };

  const handleRemove = () => {
    onRemove();
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
          <DialogTitle>{isEditing ? 'Edit' : 'Allocate'} {project?.title}</DialogTitle>
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
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          {isEditing && (
            <Button variant="destructive" onClick={handleRemove}>
              Remove
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              {isEditing ? 'Update' : 'Allocate'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}