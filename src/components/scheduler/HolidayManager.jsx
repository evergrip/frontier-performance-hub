import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, CalendarOff } from 'lucide-react';
import { format } from 'date-fns';

export default function HolidayManager({ isOpen, onClose }) {
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list('-date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Holiday.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setNewDate('');
      setNewName('');
      setNewNotes('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Holiday.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
  });

  const handleAdd = () => {
    if (!newDate || !newName) return;
    createMutation.mutate({ date: newDate, name: newName, notes: newNewNotes || '' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-red-500" />
            Manage Company Holidays
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Holiday Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Christmas Day"
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAdd}
                disabled={!newDate || !newName}
                size="sm"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            {holidays.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No holidays configured</p>
            )}
            {holidays.map(holiday => (
              <div key={holiday.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <p className="font-medium text-sm text-slate-900">{holiday.name}</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(holiday.date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(holiday.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-100"
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