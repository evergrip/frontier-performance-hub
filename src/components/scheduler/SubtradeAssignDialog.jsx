import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Wrench } from 'lucide-react';
import { format, eachDayOfInterval, getDay } from 'date-fns';
import { TRADE_LABELS, TRADE_COLORS } from './SubtradeManager';

export default function SubtradeAssignDialog({
  isOpen,
  onClose,
  projects,
  subtrades = [],
  onAssign
}) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSubtradeId, setSelectedSubtradeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeWeekdays, setIncludeWeekdays] = useState(true);
  const [includeSaturday, setIncludeSaturday] = useState(false);
  const [includeSunday, setIncludeSunday] = useState(false);
  const [notes, setNotes] = useState('');

  const targetDays = React.useMemo(() => {
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

  const selectedSubtrade = subtrades.find(s => s.id === selectedSubtradeId);

  const handleAssign = () => {
    const days = targetDays.map(d => format(d, 'yyyy-MM-dd'));
    onAssign({
      projectId: selectedProjectId,
      subtradeId: selectedSubtradeId,
      days,
      notes
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSelectedProjectId(''); setSelectedSubtradeId('');
    setStartDate(''); setEndDate('');
    setIncludeWeekdays(true); setIncludeSaturday(false); setIncludeSunday(false);
    setNotes('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-purple-600" /> Assign Subtrade to Project
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
            <Label className="text-sm font-medium">Subtrade</Label>
            <select value={selectedSubtradeId} onChange={(e) => setSelectedSubtradeId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md text-sm">
              <option value="">Select subtrade...</option>
              {subtrades.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({TRADE_LABELS[s.trade_type]})</option>
              ))}
            </select>
            {selectedSubtrade && (
              <Badge className={`mt-2 ${TRADE_COLORS[selectedSubtrade.trade_type]}`}>
                {TRADE_LABELS[selectedSubtrade.trade_type]} — {selectedSubtrade.name}
              </Badge>
            )}
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

          <div>
            <Label className="text-sm font-medium">Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Electrical rough-in" className="mt-1" />
          </div>

          {targetDays.length > 0 && selectedProjectId && selectedSubtradeId && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
              <strong>Summary:</strong> {selectedSubtrade?.name} → {projects.find(p => p.id === selectedProjectId)?.title} for {targetDays.length} day(s)
              <p className="text-xs text-purple-600 mt-1">Subtrades do not count toward staff hours or "unassigned" status.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedProjectId || !selectedSubtradeId || targetDays.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Assign to {targetDays.length} Days
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}