import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, CheckCircle2, XCircle } from 'lucide-react';
import CampaignPreview from './CampaignPreview';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  planning: { label: 'Planning', color: 'bg-blue-100 text-blue-700' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  paused: { label: 'Paused', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

export default function CampaignDetailDialog({ campaign, open, onOpenChange, onUpdate }) {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingTask, setUpdatingTask] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    await base44.entities.MarketingCampaign.update(campaign.id, { status: newStatus });
    onUpdate();
    setUpdatingStatus(false);
  };

  const handleTaskStatusChange = async (taskIndex, newStatus) => {
    setUpdatingTask(taskIndex);
    const tasks = [...(campaign.tasks || [])];
    tasks[taskIndex] = { ...tasks[taskIndex], status: newStatus };
    await base44.entities.MarketingCampaign.update(campaign.id, { tasks });
    onUpdate();
    setUpdatingTask(null);
  };

  const handleTaskAssign = async (taskIndex, userId) => {
    const tasks = [...(campaign.tasks || [])];
    tasks[taskIndex] = { ...tasks[taskIndex], assigned_to_user_id: userId };
    await base44.entities.MarketingCampaign.update(campaign.id, { tasks });
    onUpdate();
  };

  const st = statusConfig[campaign.status] || statusConfig.draft;
  const tasksCompleted = (campaign.tasks || []).filter(t => t.status === 'done').length;
  const totalTasks = (campaign.tasks || []).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">{campaign.name}</DialogTitle>
              <p className="text-sm text-slate-500 mt-1">{campaign.objective}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={st.color}>{st.label}</Badge>
              <Select value={campaign.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
                <SelectTrigger className="w-36 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{(campaign.content_calendar || []).length}</p>
            <p className="text-xs text-slate-500">Content Pieces</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{tasksCompleted}/{totalTasks}</p>
            <p className="text-xs text-slate-500">Tasks Done</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{(campaign.channels || []).length}</p>
            <p className="text-xs text-slate-500">Channels</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{campaign.budget ? `$${campaign.budget.toLocaleString()}` : '—'}</p>
            <p className="text-xs text-slate-500">Budget</p>
          </div>
        </div>

        {/* Task Management Quick Section */}
        {totalTasks > 0 && (
          <div className="border rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-sm mb-3">Task Progress</h3>
            <div className="w-full h-2 bg-slate-100 rounded-full mb-3">
              <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0}%` }} />
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(campaign.tasks || []).map((task, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Select value={task.status || 'todo'} onValueChange={(v) => handleTaskStatusChange(i, v)} disabled={updatingTask === i}>
                    <SelectTrigger className="w-28 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className={`flex-1 truncate ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>{task.title}</span>
                  <Select value={task.assigned_to_user_id || ''} onValueChange={(v) => handleTaskAssign(i, v)}>
                    <SelectTrigger className="w-32 h-7 text-xs">
                      <SelectValue placeholder="Assign..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Campaign Preview */}
        <CampaignPreview 
          campaign={campaign} 
          brief={{ name: campaign.name, objective: campaign.objective }} 
          channels={campaign.channels || []} 
        />
      </DialogContent>
    </Dialog>
  );
}