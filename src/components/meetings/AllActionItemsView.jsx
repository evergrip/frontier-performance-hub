import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, AlertCircle, Search, Filter, Target, Paperclip } from 'lucide-react';
import { format, isBefore, startOfDay, addDays } from 'date-fns';

export default function AllActionItemsView({ meetings, users, onToggleActionItem }) {
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');

  const today = startOfDay(new Date());

  // Collect all action items across meetings
  const allItems = [];
  meetings.forEach(m => {
    (m.action_items || []).forEach((item, idx) => {
      allItems.push({
        ...item,
        meetingId: m.id,
        meetingTitle: m.title,
        meetingDate: m.start_date,
        actionIndex: idx,
      });
    });
  });

  // Filter
  const filtered = allItems.filter(item => {
    if (statusFilter === 'pending' && item.is_completed) return false;
    if (statusFilter === 'completed' && !item.is_completed) return false;
    if (statusFilter === 'overdue' && (item.is_completed || !item.due_date || !isBefore(new Date(item.due_date), today))) return false;
    if (assigneeFilter !== 'all' && item.assigned_to_user_id !== assigneeFilter) return false;
    if (search && !item.description?.toLowerCase().includes(search.toLowerCase()) && !item.meetingTitle?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Sort: overdue first, then by due date
  const sorted = filtered.sort((a, b) => {
    if (!a.is_completed && !b.is_completed) {
      const aOverdue = a.due_date && isBefore(new Date(a.due_date), today);
      const bOverdue = b.due_date && isBefore(new Date(b.due_date), today);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    }
    return a.is_completed ? 1 : -1;
  });

  const getUserName = (id) => users.find(u => u.id === id)?.full_name || 'Unassigned';

  // Get unique assignees for filter
  const assigneeIds = [...new Set(allItems.map(a => a.assigned_to_user_id).filter(Boolean))];

  const pendingCount = allItems.filter(a => !a.is_completed).length;
  const overdueCount = allItems.filter(a => !a.is_completed && a.due_date && isBefore(new Date(a.due_date), today)).length;
  const completedCount = allItems.filter(a => a.is_completed).length;

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        <Badge className="bg-slate-100 text-slate-700">{allItems.length} total</Badge>
        <Badge className="bg-amber-100 text-amber-700">{pendingCount} pending</Badge>
        <Badge className={`${overdueCount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {overdueCount} overdue
        </Badge>
        <Badge className="bg-green-100 text-green-700">{completedCount} completed</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search action items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Assignees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {assigneeIds.map(id => (
              <SelectItem key={id} value={id}>{getUserName(id)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items list */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {sorted.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">No action items match your filters</p>
        ) : (
          sorted.map((item, i) => {
            const isOverdue = !item.is_completed && item.due_date && isBefore(new Date(item.due_date), today);
            const isDueSoon = !item.is_completed && item.due_date && !isBefore(new Date(item.due_date), today) && isBefore(new Date(item.due_date), addDays(today, 3));
            return (
              <div key={`${item.meetingId}-${item.actionIndex}`} className={`flex items-start gap-3 p-3 rounded-lg border ${isOverdue ? 'bg-red-50 border-red-200' : item.is_completed ? 'bg-green-50 border-green-200' : isDueSoon ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                <Checkbox
                  checked={item.is_completed}
                  onCheckedChange={() => {
                    const meeting = meetings.find(m => m.id === item.meetingId);
                    if (meeting) onToggleActionItem(meeting, item.actionIndex);
                  }}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.is_completed ? 'line-through text-slate-400' : ''}`}>{item.description}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                    <span className="font-medium">{getUserName(item.assigned_to_user_id)}</span>
                    <span className="text-slate-400">from: {item.meetingTitle}</span>
                    {item.due_date && (
                      <span className={isOverdue ? 'text-red-600 font-medium' : isDueSoon ? 'text-amber-600 font-medium' : ''}>
                        Due: {format(new Date(item.due_date), 'MMM d, yyyy')}
                      </span>
                    )}
                    {item.completed_date && (
                      <span className="text-green-600">Done: {format(new Date(item.completed_date), 'MMM d')}</span>
                    )}
                    {item.linked_kpi_id && (
                      <span className="flex items-center gap-1 text-indigo-600">
                        <Target className="w-3 h-3" /> KPI-linked
                      </span>
                    )}
                  </div>
                  {item.completion_notes && (
                    <p className="text-xs text-slate-500 italic mt-1">"{item.completion_notes}"</p>
                  )}
                  {(item.file_urls || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.file_urls.map((url, fIdx) => (
                        <a key={fIdx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded">
                          <Paperclip className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {isOverdue && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                {item.is_completed && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}