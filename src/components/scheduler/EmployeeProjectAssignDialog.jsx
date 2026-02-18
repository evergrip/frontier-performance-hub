import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Trash2, CalendarOff, UserX, Clock } from 'lucide-react';
import { format, eachDayOfInterval, getDay } from 'date-fns';

const REASON_LABELS = {
  holiday: 'Holiday', sick: 'Sick', no_show: 'No Show',
  early_dismissal: 'Early Dismissal', reduced_duties: 'Reduced Duties',
  injury: 'Injury', vacation: 'Vacation', other: 'Other'
};

export default function EmployeeProjectAssignDialog({
  isOpen,
  onClose,
  projects,
  users,
  holidays = [],
  assignments = [],
  unavailabilities = [],
  onAssign
}) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [dateBlocks, setDateBlocks] = useState([{ startDate: '', endDate: '', hours: 8, includeWeekdays: true, includeSaturday: false, includeSunday: false }]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [conflicts, setConflicts] = useState([]);

  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);
  const holidayNames = useMemo(() => {
    const map = {};
    holidays.forEach(h => { map[h.date] = h.name; });
    return map;
  }, [holidays]);

  const constructionUsers = users.filter(u => u.departments?.includes('construction'));

  const getEmployeeDayHours = (employeeId, dateStr) => {
    return assignments
      .filter(a => a.assignment_date === dateStr && a.employee_assignments?.some(ea => ea.employee_id === employeeId))
      .reduce((total, a) => {
        const emp = a.employee_assignments.find(ea => ea.employee_id === employeeId);
        return total + (emp?.hours || 0);
      }, 0);
  };

  const isEmployeeUnavailable = (employeeId, dateStr) => {
    return unavailabilities.find(u =>
      u.employee_id === employeeId && dateStr >= u.start_date && dateStr <= u.end_date
    );
  };

  const getEmployeeJobOnDay = (employeeId, dateStr) => {
    const matchingAssignment = assignments.find(a =>
      a.assignment_date === dateStr && a.employee_assignments?.some(ea => ea.employee_id === employeeId)
    );
    if (!matchingAssignment) return null;
    const project = projects.find(p => p.id === matchingAssignment.project_id);
    const empData = matchingAssignment.employee_assignments.find(ea => ea.employee_id === employeeId);
    return { projectTitle: project?.title || 'Unknown', hours: empData?.hours || 0 };
  };

  const allTargetDays = useMemo(() => {
    const daysList = [];
    dateBlocks.forEach((block, blockIdx) => {
      if (!block.startDate || !block.endDate) return;
      const start = new Date(block.startDate + 'T00:00:00');
      const end = new Date(block.endDate + 'T00:00:00');
      if (start > end) return;

      eachDayOfInterval({ start, end }).forEach(day => {
        const dow = getDay(day);
        const isWeekday = dow >= 1 && dow <= 5;
        const isSat = dow === 6;
        const isSun = dow === 0;
        if ((isWeekday && block.includeWeekdays) || (isSat && block.includeSaturday) || (isSun && block.includeSunday)) {
          daysList.push({ date: format(day, 'yyyy-MM-dd'), hours: block.hours, blockIdx });
        }
      });
    });
    return daysList;
  }, [dateBlocks]);

  const dayAnalysis = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return allTargetDays.map(d => {
      const isHoliday = holidaySet.has(d.date);
      const unavail = isEmployeeUnavailable(selectedEmployeeId, d.date);
      const existingJob = getEmployeeJobOnDay(selectedEmployeeId, d.date);
      const existingHours = getEmployeeDayHours(selectedEmployeeId, d.date);
      const totalHours = existingHours + d.hours;
      return {
        ...d,
        isHoliday,
        holidayName: holidayNames[d.date],
        unavail,
        existingJob,
        existingHours,
        totalHours,
        hasOvertime: totalHours > 8,
        hasConflict: !!unavail || isHoliday
      };
    });
  }, [allTargetDays, selectedEmployeeId, assignments, unavailabilities, holidays]);

  const addBlock = () => {
    setDateBlocks(prev => [...prev, { startDate: '', endDate: '', hours: 8, includeWeekdays: true, includeSaturday: false, includeSunday: false }]);
  };

  const removeBlock = (idx) => {
    setDateBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  const updateBlock = (idx, field, value) => {
    setDateBlocks(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };

  const handleAssign = () => {
    const problemDays = dayAnalysis.filter(d => d.hasConflict || d.hasOvertime);
    if (problemDays.length > 0) {
      setConflicts(problemDays);
      setShowConflicts(true);
      return;
    }
    executeAssign();
  };

  const executeAssign = () => {
    const validDays = dayAnalysis.filter(d => !d.unavail);
    onAssign({
      projectId: selectedProjectId,
      employeeId: selectedEmployeeId,
      days: validDays.map(d => ({ date: d.date, hours: d.hours }))
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSelectedProjectId('');
    setSelectedEmployeeId('');
    setDateBlocks([{ startDate: '', endDate: '', hours: 8, includeWeekdays: true, includeSaturday: false, includeSunday: false }]);
    setConflicts([]);
    setShowConflicts(false);
  };

  const employeeName = constructionUsers.find(u => u.id === selectedEmployeeId)?.full_name;
  const projectName = projects.find(p => p.id === selectedProjectId)?.title;

  return (
    <>
      <Dialog open={isOpen && !showConflicts} onOpenChange={() => { resetForm(); onClose(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Employee to Project</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Project & Employee */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Project</Label>
                <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md text-sm">
                  <option value="">Select project...</option>
                  {projects.filter(p => p.status !== 'closed' && p.status !== 'awaiting_to_be_scheduled').map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium">Employee</Label>
                <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md text-sm">
                  <option value="">Select employee...</option>
                  {constructionUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Blocks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Date Ranges</Label>
                <Button variant="outline" size="sm" onClick={addBlock}>
                  <Plus className="w-3 h-3 mr-1" /> Add Range
                </Button>
              </div>

              {dateBlocks.map((block, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-3 space-y-2 border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Range {idx + 1}</span>
                    {dateBlocks.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBlock(idx)}>
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Start</Label>
                      <Input type="date" value={block.startDate} onChange={(e) => updateBlock(idx, 'startDate', e.target.value)} className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">End</Label>
                      <Input type="date" value={block.endDate} onChange={(e) => updateBlock(idx, 'endDate', e.target.value)} className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Hours/Day</Label>
                      <Input type="number" min="0.5" max="24" step="0.5" value={block.hours} onChange={(e) => updateBlock(idx, 'hours', parseFloat(e.target.value) || 8)} className="mt-1 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={block.includeWeekdays} onChange={(e) => updateBlock(idx, 'includeWeekdays', e.target.checked)} className="rounded" />
                      Mon-Fri
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={block.includeSaturday} onChange={(e) => updateBlock(idx, 'includeSaturday', e.target.checked)} className="rounded" />
                      Sat
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={block.includeSunday} onChange={(e) => updateBlock(idx, 'includeSunday', e.target.checked)} className="rounded" />
                      Sun
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Day-by-day preview */}
            {selectedEmployeeId && dayAnalysis.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Day Preview — {employeeName} ({dayAnalysis.length} days)
                </Label>
                <div className="max-h-52 overflow-y-auto border rounded-lg divide-y">
                  {dayAnalysis.map((d, i) => (
                    <div key={i} className={`px-3 py-2 text-xs flex items-center justify-between ${
                      d.unavail ? 'bg-rose-50' : d.isHoliday ? 'bg-amber-50' : d.hasOvertime ? 'bg-orange-50' : 'bg-white'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium w-24">{format(new Date(d.date + 'T00:00:00'), 'EEE, MMM d')}</span>
                        <span className="text-slate-500">{d.hours}h</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.existingJob && (
                          <Badge variant="outline" className="text-[10px]">
                            <Clock className="w-2.5 h-2.5 mr-1" />
                            {d.existingJob.projectTitle} ({d.existingJob.hours}h)
                          </Badge>
                        )}
                        {d.hasOvertime && (
                          <Badge className="bg-orange-100 text-orange-800 text-[10px]">
                            {d.totalHours}h total
                          </Badge>
                        )}
                        {d.isHoliday && (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                            <CalendarOff className="w-2.5 h-2.5 mr-1" /> {d.holidayName}
                          </Badge>
                        )}
                        {d.unavail && (
                          <Badge className="bg-rose-100 text-rose-800 text-[10px]">
                            <UserX className="w-2.5 h-2.5 mr-1" /> {REASON_LABELS[d.unavail.reason] || d.unavail.reason}
                          </Badge>
                        )}
                        {!d.hasConflict && !d.hasOvertime && !d.existingJob && (
                          <span className="text-green-600">✓</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {selectedProjectId && selectedEmployeeId && dayAnalysis.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <strong>Summary:</strong> {employeeName} → {projectName} for {dayAnalysis.length} day(s) across {dateBlocks.filter(b => b.startDate && b.endDate).length} range(s).
                {dayAnalysis.some(d => d.unavail) && (
                  <span className="text-rose-600 ml-1">
                    ({dayAnalysis.filter(d => d.unavail).length} day(s) will be skipped — unavailable)
                  </span>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedProjectId || !selectedEmployeeId || dayAnalysis.length === 0}
            >
              Assign {dayAnalysis.filter(d => !d.unavail).length} Days
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflicts Dialog */}
      <Dialog open={showConflicts} onOpenChange={() => setShowConflicts(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Assignment Conflicts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {conflicts.map((c, i) => (
              <div key={i} className="text-xs p-2 bg-amber-50 rounded border border-amber-100">
                <strong>{format(new Date(c.date + 'T00:00:00'), 'EEE, MMM d')}</strong>:{' '}
                {c.unavail && <span>Unavailable ({REASON_LABELS[c.unavail.reason]})</span>}
                {c.isHoliday && <span>Holiday ({c.holidayName})</span>}
                {c.hasOvertime && !c.unavail && !c.isHoliday && <span>Overtime ({c.totalHours}h total)</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Unavailable days will be automatically skipped. Holidays and overtime days will be included if you proceed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConflicts(false)}>Go Back</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => { setShowConflicts(false); executeAssign(); }}>
              Proceed Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}