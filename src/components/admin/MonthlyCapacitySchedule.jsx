import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Save, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function MonthlyCapacitySchedule({ settings, settingsId, onSave }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (settings?.monthly_capacity_schedule?.length > 0) {
      // Sort by date ascending
      const sorted = [...settings.monthly_capacity_schedule].sort((a, b) => {
        if (a.effective_year !== b.effective_year) return a.effective_year - b.effective_year;
        return a.effective_month - b.effective_month;
      });
      setEntries(sorted);
    } else {
      setEntries([]);
    }
  }, [settings]);

  const addEntry = () => {
    const now = new Date();
    setEntries([...entries, {
      effective_year: now.getFullYear(),
      effective_month: now.getMonth() + 1,
      monthly_capacity: '',
      notes: ''
    }]);
  };

  const removeEntry = (index) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index, field, value) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const handleSave = () => {
    const cleanEntries = entries
      .filter(e => e.effective_year && e.effective_month && e.monthly_capacity)
      .map(e => ({
        effective_year: Number(e.effective_year),
        effective_month: Number(e.effective_month),
        monthly_capacity: Number(e.monthly_capacity),
        notes: e.notes || ''
      }))
      .sort((a, b) => {
        if (a.effective_year !== b.effective_year) return a.effective_year - b.effective_year;
        return a.effective_month - b.effective_month;
      });

    onSave({ monthly_capacity_schedule: cleanEntries });
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Monthly Build Capacity Schedule
            </CardTitle>
            <CardDescription>
              Set your monthly build capacity. Add an entry whenever capacity changes (e.g., new hire, new crew).
              The dashboard uses the most recent entry on or before each month.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addEntry}>
            <Plus className="w-4 h-4 mr-1" /> Add Entry
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div key={index} className="flex gap-3 items-end p-3 rounded-lg border bg-slate-50">
                <div className="w-24">
                  <Label className="text-xs">Year</Label>
                  <Input
                    type="number"
                    value={entry.effective_year || ''}
                    onChange={(e) => updateEntry(index, 'effective_year', e.target.value)}
                    placeholder="2026"
                  />
                </div>
                <div className="w-24">
                  <Label className="text-xs">Month</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={entry.effective_month || ''}
                    onChange={(e) => updateEntry(index, 'effective_month', e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Monthly Capacity ($)</Label>
                  <Input
                    type="number"
                    value={entry.monthly_capacity || ''}
                    onChange={(e) => updateEntry(index, 'monthly_capacity', e.target.value)}
                    placeholder="300000"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Reason</Label>
                  <Input
                    value={entry.notes || ''}
                    onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                    placeholder="e.g., Hired new crew"
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeEntry(index)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}

            <div className="pt-2 px-1">
              <p className="text-xs text-slate-500">
                Current schedule: {entries.filter(e => e.effective_year && e.effective_month && e.monthly_capacity).map(e => 
                  `${monthNames[(e.effective_month || 1) - 1]} ${e.effective_year}: $${(Number(e.monthly_capacity) / 1000).toFixed(0)}K/mo`
                ).join(' → ')}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">
            No capacity schedule set. The dashboard will fall back to annual revenue target ÷ 12.
          </p>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Capacity Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}