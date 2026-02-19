import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Plus, Paperclip, X, Loader2 } from 'lucide-react';

export default function ActionItemCompletionDialog({ open, onOpenChange, actionItem, users, onConfirm }) {
  const [notes, setNotes] = useState('');
  const [fileUrls, setFileUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [followUp, setFollowUp] = useState({ enabled: false, description: '', assigned_to_user_id: '', due_date: '' });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push(file_url);
    }
    setFileUrls(prev => [...prev, ...uploaded]);
    setUploading(false);
    e.target.value = '';
  };

  const removeFile = (idx) => setFileUrls(prev => prev.filter((_, i) => i !== idx));

  const getFileName = (url) => {
    try { return decodeURIComponent(url.split('/').pop().split('?')[0]); } catch { return 'File'; }
  };

  const handleConfirm = () => {
    onConfirm({
      notes,
      fileUrls,
      followUp: followUp.enabled ? {
        description: followUp.description,
        assigned_to_user_id: followUp.assigned_to_user_id,
        due_date: followUp.due_date,
      } : null,
    });
    resetState();
  };

  const handleSkip = () => {
    onConfirm({ notes: '', fileUrls: [], followUp: null });
    resetState();
  };

  const resetState = () => {
    setNotes('');
    setFileUrls([]);
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

          {/* File attachments */}
          <div>
            <Label className="text-sm">Attachments <span className="text-slate-400">(optional)</span></Label>
            <div className="mt-1 space-y-2">
              {fileUrls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded bg-slate-50 border text-sm">
                  <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate flex-1">
                    {getFileName(url)}
                  </a>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(idx)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-slate-300 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Attach files'}
                <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
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
          <Button onClick={handleConfirm} disabled={uploading}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}