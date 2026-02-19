import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Plus } from 'lucide-react';

export default function ActionItemCompletionDialog({ open, onOpenChange, actionItem, users, onConfirm }) {
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState({ enabled: false, description: '', assigned_to_user_id: '', due_date: '' });

  const handleConfirm = () => {
    onConfirm({
      notes,
      followUp: followUp.enabled ? {
        description: followUp.description,
        assigned_to_user_id: followUp.assigned_to_user_id,
        due_date: followUp.due_date,
      } : null,
    });
    setNotes('');
    setFollowUp({ enabled: false, description: '', assigned_to_user_id: '', due_date: '' });
  };

  const handleSkip = () => {
    onConfirm({ notes: '', followUp: null });
    setNotes('');
    setFollowUp({ enabled: false, description: '', assigned_to_user_id: '', due_date: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Complete Action Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task being completed */}
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm">
            <p className="font-medium text-green-800">{actionItem?.description}</p>
          </div>

          {/* Optional notes */}
          <div>
            <Label className="text-sm">Completion Notes <span className="text-slate-400">(optional)</span></Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes about how this was completed, results, etc."
              rows={2}
            />
          </div>

          {/* Follow-up task */}
          <div className="border rounded-lg p-3 space-y-3 bg-slate-50">
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-[#ea7924] transition-colors"
              onClick={() => setFollowUp(prev => ({ ...prev, enabled: !prev.enabled }))}
            >
              <Plus className={`w-4 h-4 transition-transform ${followUp.enabled ? 'rotate-45' : ''}`} />
              {followUp.enabled ? 'Remove follow-up task' : 'Add a follow-up task'}
            </button>

            {followUp.enabled && (
              <div className="space-y-2">
                <Input
                  value={followUp.description}
                  onChange={e => setFollowUp(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Follow-up task description"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={followUp.assigned_to_user_id || ''} onValueChange={v => setFollowUp(prev => ({ ...prev, assigned_to_user_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Assign to..." /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={followUp.due_date}
                    onChange={e => setFollowUp(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="ghost" onClick={handleSkip}>Skip</Button>
          <Button onClick={handleConfirm}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}