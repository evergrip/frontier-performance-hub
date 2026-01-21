import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

export default function ProjectedCompletionDialog({ open, onOpenChange, onSave, currentMonth, currentYear }) {
  const [month, setMonth] = useState(currentMonth || new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear || new Date().getFullYear());

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const currentYearValue = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYearValue + i);

  const handleSave = () => {
    onSave(month, year);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            Update Projected Completion
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Projected Completion Month</Label>
            <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Projected Completion Year</Label>
            <Select value={year.toString()} onValueChange={(val) => setYear(parseInt(val))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}