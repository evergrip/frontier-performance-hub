import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, UserX } from 'lucide-react';
import { format } from 'date-fns';

const REASON_LABELS = {
  holiday: 'Holiday',
  sick: 'Sick',
  no_show: 'No Show',
  early_dismissal: 'Early Dismissal',
  reduced_duties: 'Reduced Duties',
  injury: 'Injury',
  vacation: 'Vacation',
  other: 'Other'
};

const REASON_COLORS = {
  holiday: 'bg-blue-100 text-blue-800',
  sick: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-800',
  early_dismissal: 'bg-amber-100 text-amber-800',
  reduced_duties: 'bg-orange-100 text-orange-800',
  injury: 'bg-rose-100 text-rose-800',
  vacation: 'bg-green-100 text-green-800',
  other: 'bg-slate-100 text-slate-800'
};

export default function StaffUnavailabilityManager({ isOpen, onClose, users = [] }) {
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [hoursAvailable, setHoursAvailable] = useState('');
  const [notes, setNotes] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const queryClient = useQueryClient();

  const { data: unavailabilities = [] } = useQuery({
    queryKey: ['unavailabilities'],
    queryFn: () => base44.entities.EmployeeUnavailability.list('-start_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeUnavailability.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unavailabilities'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeUnavailability.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unavailabilities'] }),
  });

  const resetForm = () => {
    setEmployeeId('');
    setStartDate('');
    setEndDate('');
    setReason('');
    setHoursAvailable('');
    setNotes('');
  };

  const handleAdd = () => {
    if (!employeeId || !startDate || !endDate || !reason) return;
    const data = {
      employee_id: employeeId,
      start_date: startDate,
      end_date: endDate,
      reason,
      notes
    };
    if (hoursAvailable !== '' && (reason === 'reduced_duties' || reason === 'early_dismissal')) {
      data.hours_available = parseFloat(hoursAvailable);
    }
    createMutation.mutate(data);
  };

  const constructionUsers = users.filter(u => u.departments?.includes('construction'));
  const filtered = filterEmployee === 'all'
    ? unavailabilities
    : unavailabilities.filter(u => u.employee_id === filterEmployee);

  const getEmployeeName = (id) => users.find(u => u.id === id)?.full_name || 'Unknown';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-rose-500" />
            Staff Unavailability
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add form */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">Add Unavailability</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Employee</Label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Select employee...</option>
                  {constructionUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Reason</Label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Select reason...</option>
                  {Object.entries(REASON_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            {(reason === 'reduced_duties' || reason === 'early_dismissal') && (
              <div className="w-40">
                <Label className="text-xs">Hours Available</Label>
                <Input
                  type="number"
                  min="0"
                  max="8"
                  step="0.5"
                  value={hoursAvailable}
                  onChange={(e) => setHoursAvailable(e.target.value)}
                  placeholder="e.g. 4"
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                className="mt-1 h-16"
              />
            </div>
            <Button onClick={handleAdd} disabled={!employeeId || !startDate || !endDate || !reason} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Unavailability
            </Button>
          </div>

          {/* Filter and list */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Label className="text-xs text-slate-500">Filter by:</Label>
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="all">All Employees</option>
                {constructionUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>

            {filtered.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No unavailability records</p>
            )}
            {filtered.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{getEmployeeName(u.employee_id)}</p>
                    <Badge className={REASON_COLORS[u.reason]}>{REASON_LABELS[u.reason]}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {format(new Date(u.start_date + 'T00:00:00'), 'MMM d, yyyy')}
                    {u.start_date !== u.end_date && ` - ${format(new Date(u.end_date + 'T00:00:00'), 'MMM d, yyyy')}`}
                    {u.hours_available != null && u.hours_available > 0 && ` · ${u.hours_available}h available`}
                  </p>
                  {u.notes && <p className="text-xs text-slate-400">{u.notes}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(u.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}