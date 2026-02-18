import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CalendarOff, X } from 'lucide-react';
import { format, eachDayOfInterval, getDay, isWithinInterval } from 'date-fns';

export default function BulkAssignDialog({
  isOpen,
  onClose,
  projects,
  users,
  holidays = [],
  assignments = [],
  unavailabilities = [],
  onBulkAssign
}) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeWeekdays, setIncludeWeekdays] = useState(true);
  const [includeSaturday, setIncludeSaturday] = useState(false);
  const [includeSunday, setIncludeSunday] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [holidayOverrides, setHolidayOverrides] = useState({});
  const [holidayNotes, setHolidayNotes] = useState({});
  const [conflicts, setConflicts] = useState([]);
  const [showConflicts, setShowConflicts] = useState(false);

  const holidayDates = useMemo(() => {
    return new Set(holidays.map(h => h.date));
  }, [holidays]);

  const getHolidayName = (dateStr) => {
    const h = holidays.find(h => h.date === dateStr);
    return h?.name || 'Holiday';
  };

  const targetDays = useMemo(() => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (start > end) return [];

    const allDays = eachDayOfInterval({ start, end });
    return allDays.filter(day => {
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

  const toggleEmployee = (userId) => {
    setSelectedEmployees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const isEmployeeUnavailable = (employeeId, dateStr) => {
    return unavailabilities.some(u =>
      u.employee_id === employeeId &&
      dateStr >= u.start_date &&
      dateStr <= u.end_date
    );
  };

  const getEmployeeDayHours = (employeeId, dateStr) => {
    return assignments
      .filter(a =>
        a.assignment_date === dateStr &&
        a.employee_assignments?.some(ea => ea.employee_id === employeeId)
      )
      .reduce((total, a) => {
        const emp = a.employee_assignments.find(ea => ea.employee_id === employeeId);
        return total + (emp?.hours || 0);
      }, 0);
  };

  const handleAssign = () => {
    const conflictList = [];

    for (const day of workingDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      for (const empId of selectedEmployees) {
        if (isEmployeeUnavailable(empId, dateStr)) {
          const emp = users.find(u => u.id === empId);
          const reason = unavailabilities.find(u =>
            u.employee_id === empId && dateStr >= u.start_date && dateStr <= u.end_date
          )?.reason;
          conflictList.push({
            type: 'unavailable',
            employee: emp?.full_name,
            date: dateStr,
            reason
          });
          continue;
        }

        const existingHours = getEmployeeDayHours(empId, dateStr);
        if (existingHours + hoursPerDay > 8) {
          const emp = users.find(u => u.id === empId);
          conflictList.push({
            type: 'overtime',
            employee: emp?.full_name,
            date: dateStr,
            existingHours,
            newHours: hoursPerDay
          });
        }
      }
    }

    if (conflictList.length > 0) {
      setConflicts(conflictList);
      setShowConflicts(true);
      return;
    }

    executeBulkAssign();
  };

  const executeBulkAssign = () => {
    onBulkAssign({
      projectId: selectedProjectId,
      employees: selectedEmployees,
      days: workingDays.map(d => format(d, 'yyyy-MM-dd')),
      hoursPerDay,
      holidayNotes,
      skipUnavailable: true
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSelectedProjectId('');
    setStartDate('');
    setEndDate('');
    setIncludeWeekdays(true);
    setIncludeSaturday(false);
    setIncludeSunday(false);
    setSelectedEmployees([]);
    setHoursPerDay(8);
    setHolidayOverrides({});
    setHolidayNotes({});
    setConflicts([]);
    setShowConflicts(false);
  };

  const constructionUsers = users.filter(u => u.departments?.includes('construction'));

  return (
    <>
      <Dialog open={isOpen && !showConflicts} onOpenChange={() => { resetForm(); onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Assign Project to Days</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Project Selection */}
            <div>
              <Label className="text-sm font-medium">Project</Label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              >
                <option value="">Select project...</option>
                {projects.filter(p => p.status !== 'closed' && p.status !== 'awaiting_to_be_scheduled').map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
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

            {/* Day Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Days to Include</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={includeWeekdays} onCheckedChange={setIncludeWeekdays} />
                  Mon - Fri
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={includeSaturday} onCheckedChange={setIncludeSaturday} />
                  Saturday
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={includeSunday} onCheckedChange={setIncludeSunday} />
                  Sunday
                </label>
              </div>
            </div>

            {/* Holidays in range */}
            {holidaysInRange.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                  <CalendarOff className="w-4 h-4" />
                  {holidaysInRange.length} holiday(s) in selected range (auto-skipped)
                </p>
                {holidaysInRange.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  return (
                    <div key={dateStr} className="flex items-center gap-2 ml-6">
                      <Checkbox
                        checked={!!holidayOverrides[dateStr]}
                        onCheckedChange={(checked) => {
                          setHolidayOverrides(prev => ({ ...prev, [dateStr]: checked }));
                          if (!checked) {
                            setHolidayNotes(prev => { const n = { ...prev }; delete n[dateStr]; return n; });
                          }
                        }}
                      />
                      <span className="text-xs text-amber-700">
                        Override: {getHolidayName(dateStr)} ({format(day, 'EEE, MMM d')})
                      </span>
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

            {/* Hours */}
            <div className="w-32">
              <Label className="text-sm font-medium">Hours/Day</Label>
              <Input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(parseFloat(e.target.value) || 8)}
                className="mt-1"
              />
            </div>

            {/* Employee Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Employees ({selectedEmployees.length} selected)
              </Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {constructionUsers.map(user => (
                  <label key={user.id} className="flex items-center gap-2 text-sm p-1 hover:bg-slate-50 rounded">
                    <Checkbox
                      checked={selectedEmployees.includes(user.id)}
                      onCheckedChange={() => toggleEmployee(user.id)}
                    />
                    {user.full_name}
                  </label>
                ))}
                {constructionUsers.length === 0 && (
                  <p className="text-xs text-slate-500 col-span-2">No construction employees found</p>
                )}
              </div>
            </div>

            {/* Summary */}
            {selectedProjectId && workingDays.length > 0 && selectedEmployees.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <strong>Summary:</strong> Assigning {selectedEmployees.length} employee(s) to{' '}
                {projects.find(p => p.id === selectedProjectId)?.title} for {workingDays.length} day(s) at {hoursPerDay}h/day
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedProjectId || workingDays.length === 0 || selectedEmployees.length === 0 ||
                Object.entries(holidayOverrides).some(([k, v]) => v && !holidayNotes[k])}
            >
              Assign to {workingDays.length} Days
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflicts Dialog */}
      <Dialog open={showConflicts} onOpenChange={() => setShowConflicts(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Assignment Conflicts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {conflicts.map((c, i) => (
              <div key={i} className="text-sm p-2 bg-amber-50 rounded border border-amber-100">
                {c.type === 'overtime' ? (
                  <span><strong>{c.employee}</strong> on {c.date}: already has {c.existingHours}h + {c.newHours}h = {c.existingHours + c.newHours}h (overtime)</span>
                ) : (
                  <span><strong>{c.employee}</strong> on {c.date}: unavailable ({c.reason})</span>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConflicts(false)}>Go Back</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => { setShowConflicts(false); executeBulkAssign(); }}>
              Proceed Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}