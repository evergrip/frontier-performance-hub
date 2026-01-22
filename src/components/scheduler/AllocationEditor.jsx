import React, { useState, useMemo } from 'react';
import { format, addMonths, startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AllocationEditor({ project, onSave }) {
  const currentDate = new Date();
  const monthsToShow = 12;
  const months = useMemo(() => Array.from({ length: monthsToShow }, (_, i) => addMonths(currentDate, i)), []);

  const [allocations, setAllocations] = useState(() => {
    const allocs = {};
    months.forEach(month => {
      const key = `${month.getFullYear()}-${month.getMonth() + 1}`;
      const existing = project.monthly_work_allocations?.find(a => a.year === month.getFullYear() && a.month === month.getMonth() + 1);
      allocs[key] = existing?.percentage || 0;
    });
    return allocs;
  });

  const totalPercentage = Object.values(allocations).reduce((sum, val) => sum + Number(val), 0);

  const handleChange = (year, month, value) => {
    const key = `${year}-${month}`;
    setAllocations(prev => ({
      ...prev,
      [key]: Math.max(0, Math.min(100, Number(value) || 0)),
    }));
  };

  const handleSave = () => {
    const newAllocations = months
      .map(month => ({
        year: month.getFullYear(),
        month: month.getMonth() + 1,
        percentage: Number(allocations[`${month.getFullYear()}-${month.getMonth() + 1}`]),
      }))
      .filter(a => a.percentage > 0);

    onSave(newAllocations);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {months.map(month => {
          const key = `${month.getFullYear()}-${month.getMonth() + 1}`;
          return (
            <div key={key} className="space-y-2">
              <Label className="text-xs text-slate-600">{format(month, 'MMM yyyy')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={allocations[key]}
                  onChange={(e) => handleChange(month.getFullYear(), month.getMonth() + 1, e.target.value)}
                  className="text-center"
                  placeholder="0"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`p-3 rounded-lg ${totalPercentage === 100 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <p className={`text-sm font-medium ${totalPercentage === 100 ? 'text-green-800' : 'text-amber-800'}`}>
          Total Allocation: {totalPercentage}%
          {totalPercentage === 100 && ' ✓'}
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => setAllocations({})}>
          Clear All
        </Button>
        <Button onClick={handleSave} disabled={totalPercentage === 0}>
          Save Allocations
        </Button>
      </div>
    </div>
  );
}