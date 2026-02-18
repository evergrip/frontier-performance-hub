import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarOff } from 'lucide-react';
import { format, eachDayOfInterval, getDay } from 'date-fns';

export default function BulkAssignDialog({
  isOpen,
  onClose,
  projects,
  holidays = [],
  onBulkAssign
}) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeWeekdays, setIncludeWeekdays] = useState(true);
  const [includeSaturday, setIncludeSaturday] = useState(false);
  const [includeSunday, setIncludeSunday] = useState(false);
  const [holidayOverrides, setHolidayOverrides] = useState({});
  const [holidayNotes, setHolidayNotes] = useState({});

  const holidayDates = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);
  const getHolidayName = (dateStr) => holidays.find(h => h.date === dateStr)?.name || 'Holiday';

  const targetDays = useMemo(() => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (start > end) return [];
    return eachDayOfInterval({ start, end }).filter(day => {
      const dow = getDay(day);
      if (dow >= 1 && dow <= 5 && includeWeekdays) return true;
      if (dow === 6 && includeSaturday) return true;
      if (dow === 0 && includeSunday) return true;
      return false;
    });
  }, [startDate, endDate, includeWeekdays, includeSaturday, includeSunday]);

  const holidaysInRange = useMemo(() => {
    return targetDays.filter(day => holidayDates.has(format(day, 'yyyy-MM-dd')));
  }, [targetDays, holidayDates]);

  const workingDays = useMemo(() => {
    return targetDays.filter(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      if (holidayDates.has(dateStr) && !holidayOverrides[dateStr]) return false;
      return true;
    });
  }, [targetDays, holidayDates, holidayOverrides]);

  const handleAssign = () => {
    onBulkAssign({
      projectId: selectedProjectId,
      days: workingDays.map(d => format(d, 'yyyy-MM-dd')),
      holidayNotes
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSelectedProjectId(''); setStartDate(''); setEndDate('');
    setIncludeWeekdays(true); setIncludeSaturday(false); setIncludeSunday(false);
    setHolidayOverrides({}); setHolidayNotes({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Project to Days</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <p className="text-xs text-slate-500">This schedules a project to active days. Use "Assign Employee" or "Assign Subtrade" to assign people afterwards.</p>

          <div>
            <Label className="text-sm font-medium">Project</Label>
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md text-sm">
              <option value="">Select project...</option>
              {projects.filter(p => p.status !== 'closed' && p.status !== 'awaiting_to_be_scheduled').map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium">End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Days to Include</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={includeWeekdays} onCheckedChange={setIncludeWeekdays} /> Mon - Fri
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={includeSaturday} onCheckedChange={setIncludeSaturday} /> Saturday
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={includeSunday} onCheckedChange={setIncludeSunday} /> Sunday
              </label>
            </div>
          </div>

          {holidaysInRange.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                <CalendarOff className="w-4 h-4" /> {holidaysInRange.length} holiday(s) in range (auto-skipped)
              </p>
              {holidaysInRange.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                return (
                  <div key={dateStr} className="flex items-center gap-2 ml-6">
                    <Checkbox
                      checked={!!holidayOverrides[dateStr]}
                      onCheckedChange={(checked) => {
                        setHolidayOverrides(prev => ({ ...prev, [dateStr]: checked }));
                        if (!checked) setHolidayNotes(prev => { const n = { ...prev }; delete n[dateStr]; return n; });
                      }}
                    />
                    <span className="text-xs text-amber-700">Override: {getHolidayName(dateStr)} ({format(day, 'EEE, MMM d')})</span>
                    {holidayOverrides[dateStr] && (
                      <Input
                        placeholder="Reason for working on holiday (required)"
                        value={holidayNotes[dateStr] || ''}
                        onChange={(e) => setHolidayNotes(prev => ({ ...prev, [dateStr]: e.target.value }))}
                        className="text-xs h-7 flex-1"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {selectedProjectId && workingDays.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>Summary:</strong> Scheduling {projects.find(p => p.id === selectedProjectId)?.title} for {workingDays.length} day(s)
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedProjectId || workingDays.length === 0 ||
              Object.entries(holidayOverrides).some(([k, v]) => v && !holidayNotes[k])}
          >
            Schedule {workingDays.length} Days
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}