import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Plus, Trash2, CalendarOff, UserX, Clock, AlertTriangle, Users, ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, eachDayOfInterval, getDay } from 'date-fns';

const REASON_LABELS = {
  holiday: 'Holiday', sick: 'Sick', no_show: 'No Show',
  early_dismissal: 'Early Dismissal', reduced_duties: 'Reduced Duties',
  injury: 'Injury', vacation: 'Vacation', other: 'Other'
};

function ScheduledDaysStaffOverview({ projectName, projectScheduledDays, assignments, selectedProjectId, users, subtrades }) {
  const [expanded, setExpanded] = useState(false);

  const dayStaffMap = useMemo(() => {
    return projectScheduledDays.map(dateStr => {
      const dayAssignment = assignments.find(a => a.project_id === selectedProjectId && a.assignment_date === dateStr);
      const staffList = (dayAssignment?.employee_assignments || []).map(ea => {
        const user = users.find(u => u.id === ea.employee_id);
        return { name: user?.full_name || 'Unknown', hours: ea.hours || 0 };
      });
      const subList = (dayAssignment?.subtrade_assignments || []).map(sa => {
        const sub = subtrades.find(s => s.id === sa.subtrade_id);
        return { name: sub?.name || 'Unknown', notes: sa.notes || '' };
      });
      return { date: dateStr, staffCount: staffList.length, staff: staffList, subCount: subList.length, subs: subList };
    });
  }, [projectScheduledDays, assignments, selectedProjectId, users, subtrades]);

  const totalUnstaffed = dayStaffMap.filter(d => d.staffCount === 0).length;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <Label className="text-xs font-medium text-slate-600">
            Scheduled Days for {projectName} ({projectScheduledDays.length})
          </Label>
        </div>
        <div className="flex items-center gap-3">
          {totalUnstaffed > 0 && (
            <Badge className="bg-amber-100 text-amber-800 text-[10px]">{totalUnstaffed} unstaffed</Badge>
          )}
          <button onClick={() => setExpanded(!expanded)} className="p-0.5 hover:bg-slate-200 rounded">
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>
      </div>

      {!expanded && (
        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
          {dayStaffMap.map(d => (
            <Popover key={d.date}>
              <PopoverTrigger asChild>
                <button
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-normal cursor-pointer hover:bg-slate-100 transition-colors ${
                    d.staffCount === 0 ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {format(new Date(d.date + 'T00:00:00'), 'EEE, MMM d')}
                  <span className="ml-1 text-slate-400">
                    <Users className="w-2 h-2 inline" />{d.staffCount}
                    {d.subCount > 0 && <> <Wrench className="w-2 h-2 inline" />{d.subCount}</>}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-3" side="top" align="start">
                <p className="font-semibold text-xs text-slate-900 mb-1">{format(new Date(d.date + 'T00:00:00'), 'EEEE, MMM d')}</p>
                {d.staff.length > 0 && (
                  <div className="mb-1.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Staff ({d.staffCount})</p>
                    {d.staff.map((s, i) => (
                      <div key={i} className="text-xs flex justify-between"><span>{s.name}</span><span className="text-slate-400">{s.hours}h</span></div>
                    ))}
                  </div>
                )}
                {d.subs.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Subs ({d.subCount})</p>
                    {d.subs.map((s, i) => (
                      <div key={i} className="text-xs">{s.name}{s.notes && <span className="text-slate-400 ml-1">— {s.notes}</span>}</div>
                    ))}
                  </div>
                )}
                {d.staffCount === 0 && d.subCount === 0 && (
                  <p className="text-xs text-amber-600">No staff or subs assigned</p>
                )}
              </PopoverContent>
            </Popover>
          ))}
        </div>
      )}

      {expanded && (
        <div className="max-h-48 overflow-y-auto border rounded-md divide-y bg-white">
          {dayStaffMap.map(d => (
            <div key={d.date} className={`px-3 py-1.5 text-xs ${d.staffCount === 0 && d.subCount === 0 ? 'bg-amber-50' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{format(new Date(d.date + 'T00:00:00'), 'EEE, MMM d')}</span>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span><Users className="w-2.5 h-2.5 inline mr-0.5" />{d.staffCount}</span>
                  {d.subCount > 0 && <span><Wrench className="w-2.5 h-2.5 inline mr-0.5" />{d.subCount}</span>}
                </div>
              </div>
              {d.staffCount === 0 && d.subCount === 0 ? (
                <span className="text-amber-600 flex items-center gap-1 mt-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" /> No staff or subs assigned
                </span>
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {d.staff.map((s, i) => (
                    <Badge key={`s${i}`} variant="secondary" className="text-[10px] px-1.5 py-0">{s.name} ({s.hours}h)</Badge>
                  ))}
                  {d.subs.map((s, i) => (
                    <Badge key={`sub${i}`} className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0"><Wrench className="w-2 h-2 mr-0.5 inline" />{s.name}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EmployeeProjectAssignDialog({
  isOpen,
  onClose,
  projects,
  users,
  holidays = [],
  assignments = [],
  unavailabilities = [],
  subtrades = [],
  onAssign,
  onOverrunExtend
}) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [dateBlocks, setDateBlocks] = useState([{ startDate: '', endDate: '', hours: 8, includeWeekdays: true, includeSaturday: false, includeSunday: false }]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [showOverrunDialog, setShowOverrunDialog] = useState(false);
  const [overrunExplanation, setOverrunExplanation] = useState('');
  const [overrunDays, setOverrunDays] = useState([]);

  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);
  const holidayNames = useMemo(() => {
    const map = {};
    holidays.forEach(h => { map[h.date] = h.name; });
    return map;
  }, [holidays]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const constructionUsers = users.filter(u => u.departments?.includes('construction'));

  // Scheduled days for the selected project
  const projectScheduledDays = useMemo(() => {
    if (!selectedProjectId) return [];
    return assignments
      .filter(a => a.project_id === selectedProjectId)
      .map(a => a.assignment_date)
      .sort();
  }, [selectedProjectId, assignments]);

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
        if ((dow >= 1 && dow <= 5 && block.includeWeekdays) || (dow === 6 && block.includeSaturday) || (dow === 0 && block.includeSunday)) {
          daysList.push({ date: format(day, 'yyyy-MM-dd'), hours: block.hours, blockIdx });
        }
      });
    });
    return daysList;
  }, [dateBlocks]);

  const dayAnalysis = useMemo(() => {
    if (!selectedEmployeeId) return [];
    const targetDate = selectedProject?.target_completion_date;
    return allTargetDays.map(d => {
      const isHoliday = holidaySet.has(d.date);
      const unavail = isEmployeeUnavailable(selectedEmployeeId, d.date);
      const existingJob = getEmployeeJobOnDay(selectedEmployeeId, d.date);
      const existingHours = getEmployeeDayHours(selectedEmployeeId, d.date);
      const totalHours = existingHours + d.hours;
      const isOverrun = targetDate ? d.date > targetDate : false;
      return {
        ...d, isHoliday, holidayName: holidayNames[d.date], unavail, existingJob,
        existingHours, totalHours, hasOvertime: totalHours > 8,
        hasConflict: !!unavail || isHoliday, isOverrun
      };
    });
  }, [allTargetDays, selectedEmployeeId, assignments, unavailabilities, holidays, selectedProject]);

  const overrunCount = dayAnalysis.filter(d => d.isOverrun).length;

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
    // Check overrun first
    const overrunDaysList = dayAnalysis.filter(d => d.isOverrun && !d.unavail);
    if (overrunDaysList.length > 0) {
      setOverrunDays(overrunDaysList);
      setOverrunExplanation('');
      setShowOverrunDialog(true);
      return;
    }

    // Then check other conflicts
    const problemDays = dayAnalysis.filter(d => d.hasConflict || d.hasOvertime);
    if (problemDays.length > 0) {
      setConflicts(problemDays);
      setShowConflicts(true);
      return;
    }
    executeAssign();
  };

  const handleOverrunConfirm = () => {
    // Extend project and log overrun
    const latestOverrunDate = overrunDays.reduce((max, d) => d.date > max ? d.date : max, overrunDays[0].date);
    if (onOverrunExtend) {
      onOverrunExtend({
        projectId: selectedProjectId,
        employeeId: selectedEmployeeId,
        originalDate: selectedProject?.target_completion_date,
        newDate: latestOverrunDate,
        explanation: overrunExplanation
      });
    }
    setShowOverrunDialog(false);

    // Now check remaining conflicts (non-overrun)
    const problemDays = dayAnalysis.filter(d => (d.hasConflict || d.hasOvertime) && !d.isOverrun);
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
    setSelectedProjectId(''); setSelectedEmployeeId('');
    setDateBlocks([{ startDate: '', endDate: '', hours: 8, includeWeekdays: true, includeSaturday: false, includeSunday: false }]);
    setConflicts([]); setShowConflicts(false);
    setShowOverrunDialog(false); setOverrunExplanation(''); setOverrunDays([]);
  };

  const employeeName = constructionUsers.find(u => u.id === selectedEmployeeId)?.full_name;
  const projectName = projects.find(p => p.id === selectedProjectId)?.title;

  return (
    <>
      <Dialog open={isOpen && !showConflicts && !showOverrunDialog} onOpenChange={() => { resetForm(); onClose(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Employee to Project</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Project</Label>
                <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md text-sm">
                  <option value="">Select project...</option>
                  {projects.filter(p => p.status !== 'closed' && p.status !== 'awaiting_to_be_scheduled').map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.target_completion_date ? `(due ${format(new Date(p.target_completion_date + 'T00:00:00'), 'MMM d')})` : ''}
                    </option>
                  ))}
                </select>
                {selectedProject && (
                  <div className="mt-1 space-y-1">
                    {selectedProject.target_completion_date && (
                      <p className="text-xs text-slate-500">
                        Target completion: {format(new Date(selectedProject.target_completion_date + 'T00:00:00'), 'MMM d, yyyy')}
                      </p>
                    )}
                    {selectedProject.start_date && (
                      <p className="text-xs text-slate-500">
                        Start: {format(new Date(selectedProject.start_date + 'T00:00:00'), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                )}
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

            {/* Scheduled days for selected project with staffing info */}
            {selectedProjectId && projectScheduledDays.length > 0 && (
              <ScheduledDaysStaffOverview
                projectName={projectName}
                projectScheduledDays={projectScheduledDays}
                assignments={assignments}
                selectedProjectId={selectedProjectId}
                users={users}
                constructionUsers={constructionUsers}
              />
            )}
            {selectedProjectId && projectScheduledDays.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                No days have been scheduled for this project yet. Use "Schedule Days" first.
              </div>
            )}

            {/* Overrun pre-emptive warning */}
            {overrunCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>{overrunCount} day(s)</strong> extend beyond the project's target completion date ({selectedProject?.target_completion_date ? format(new Date(selectedProject.target_completion_date + 'T00:00:00'), 'MMM d, yyyy') : 'N/A'}).
                  You will be asked for an explanation before proceeding.
                </div>
              </div>
            )}

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
                      <input type="checkbox" checked={block.includeWeekdays} onChange={(e) => updateBlock(idx, 'includeWeekdays', e.target.checked)} className="rounded" /> Mon-Fri
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={block.includeSaturday} onChange={(e) => updateBlock(idx, 'includeSaturday', e.target.checked)} className="rounded" /> Sat
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={block.includeSunday} onChange={(e) => updateBlock(idx, 'includeSunday', e.target.checked)} className="rounded" /> Sun
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
                      d.unavail ? 'bg-rose-50' : d.isOverrun ? 'bg-red-50' : d.isHoliday ? 'bg-amber-50' : d.hasOvertime ? 'bg-orange-50' : 'bg-white'
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
                        {d.isOverrun && (
                          <Badge className="bg-red-100 text-red-800 text-[10px]">
                            <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Past target date
                          </Badge>
                        )}
                        {d.hasOvertime && (
                          <Badge className="bg-orange-100 text-orange-800 text-[10px]">{d.totalHours}h total</Badge>
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
                        {!d.hasConflict && !d.hasOvertime && !d.existingJob && !d.isOverrun && (
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
                  <span className="text-rose-600 ml-1">({dayAnalysis.filter(d => d.unavail).length} day(s) will be skipped — unavailable)</span>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!selectedProjectId || !selectedEmployeeId || dayAnalysis.length === 0}>
              Assign {dayAnalysis.filter(d => !d.unavail).length} Days
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overrun Dialog */}
      <Dialog open={showOverrunDialog} onOpenChange={() => setShowOverrunDialog(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Project Timeline Overrun
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              <strong>{overrunDays.length} day(s)</strong> for <strong>{employeeName}</strong> extend beyond <strong>{projectName}</strong>'s target completion date of{' '}
              <strong>{selectedProject?.target_completion_date ? format(new Date(selectedProject.target_completion_date + 'T00:00:00'), 'MMM d, yyyy') : 'N/A'}</strong>.
            </p>
            <div className="bg-red-50 rounded-lg p-3 text-xs space-y-1 max-h-32 overflow-y-auto">
              {overrunDays.map((d, i) => (
                <div key={i} className="flex justify-between">
                  <span>{format(new Date(d.date + 'T00:00:00'), 'EEE, MMM d, yyyy')}</span>
                  <span className="text-red-600">{d.hours}h</span>
                </div>
              ))}
            </div>
            <div>
              <Label className="text-sm font-medium">Explanation (required)</Label>
              <Textarea
                value={overrunExplanation}
                onChange={(e) => setOverrunExplanation(e.target.value)}
                placeholder="Why does this project need to be extended?"
                className="mt-1"
                rows={3}
              />
            </div>
            <p className="text-xs text-slate-500">
              The project's target completion date will be extended to{' '}
              <strong>{overrunDays.length > 0 ? format(new Date(overrunDays[overrunDays.length - 1].date + 'T00:00:00'), 'MMM d, yyyy') : ''}</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrunDialog(false)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={!overrunExplanation.trim()}
              onClick={handleOverrunConfirm}
            >
              Extend Project & Assign
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