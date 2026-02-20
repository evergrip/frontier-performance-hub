import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  CalendarCheck, ListChecks, Clock, TrendingUp, AlertTriangle,
  Calendar, CheckCircle2, Circle, ChevronRight, MessageSquare
} from 'lucide-react';
import { format, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ActionItemCompletionDialog from '../meetings/ActionItemCompletionDialog';

const DEPARTMENTS = ['sales', 'operations', 'finance', 'precon', 'projects'];

export default function MyMeetingsDashboard({ meetings, users, currentUser, onUpdateActionItem }) {
  const [statusReportOpen, setStatusReportOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [statusNote, setStatusNote] = useState('');
  const [viewScope, setViewScope] = useState('mine'); // 'mine', 'employee', 'department', 'company'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  if (!currentUser?.id) return null;

  // Determine which user IDs to show action items for
  const getTargetUserIds = () => {
    if (viewScope === 'mine') return [currentUser.id];
    if (viewScope === 'employee' && selectedUserId) return [selectedUserId];
    if (viewScope === 'department' && selectedDept) {
      return users.filter(u => u.department === selectedDept).map(u => u.id);
    }
    if (viewScope === 'company') return users.map(u => u.id);
    return [currentUser.id];
  };
  const targetUserIds = getTargetUserIds();

  // Get all action items for target users across all visible meetings
  const myActionItems = [];
  meetings.forEach(m => {
    (m.action_items || []).forEach((item, idx) => {
      if (targetUserIds.includes(item.assigned_to_user_id)) {
        myActionItems.push({ ...item, meetingId: m.id, meetingTitle: m.title, actionIndex: idx });
      }
    });
  });

  const pendingItems = myActionItems.filter(a => !a.is_completed);
  const completedItems = myActionItems.filter(a => a.is_completed);
  const today = startOfDay(new Date());
  const overdueItems = pendingItems.filter(a => a.due_date && isBefore(new Date(a.due_date), today));
  const dueSoonItems = pendingItems.filter(a => a.due_date && !isBefore(new Date(a.due_date), today) && isBefore(new Date(a.due_date), addDays(today, 7)));
  const completionRate = myActionItems.length > 0 ? (completedItems.length / myActionItems.length) * 100 : 0;

  // Upcoming meetings for target users (attendee or organizer)
  const upcomingMeetings = meetings
    .filter(m =>
      (m.status === 'scheduled' || m.status === 'in_progress') &&
      m.start_date &&
      isAfter(new Date(m.start_date), new Date()) &&
      (targetUserIds.includes(m.organizer_id) || (m.attendees || []).some(a => targetUserIds.includes(a)))
    )
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 5);

  const getUserName = (id) => users.find(u => u.id === id)?.full_name || 'Unknown';

  const scopeLabel = viewScope === 'mine' ? 'My' :
    viewScope === 'employee' ? (getUserName(selectedUserId) + "'s") :
    viewScope === 'department' ? (selectedDept ? selectedDept.charAt(0).toUpperCase() + selectedDept.slice(1) : 'Department') :
    'Company-Wide';

  const handleStatusReport = (item) => {
    setSelectedItem(item);
    setStatusNote('');
    setStatusReportOpen(true);
  };

  const handleMarkComplete = (item) => {
    onUpdateActionItem(item.meetingId, item.actionIndex, true);
  };

  const getDueBadge = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    if (isBefore(due, today)) return <Badge className="bg-red-100 text-red-700 text-xs">Overdue</Badge>;
    if (isBefore(due, addDays(today, 3))) return <Badge className="bg-amber-100 text-amber-700 text-xs">Due Soon</Badge>;
    return <Badge variant="outline" className="text-xs">{format(due, 'MMM d')}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-lg">{scopeLabel} Meetings & Action Items</CardTitle>
            </div>
            <Link to={createPageUrl('Meetings')}>
              <Button variant="ghost" size="sm" className="text-indigo-600">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={viewScope} onValueChange={(v) => { setViewScope(v); setSelectedUserId(''); setSelectedDept(''); }}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mine">My Items</SelectItem>
                  <SelectItem value="employee">By Employee</SelectItem>
                  <SelectItem value="department">By Department</SelectItem>
                  <SelectItem value="company">Company-Wide</SelectItem>
                </SelectContent>
              </Select>
              {viewScope === 'employee' && (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue placeholder="Select employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {viewScope === 'department' && (
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue placeholder="Select dept..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => (
                      <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Summary Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{pendingItems.length}</p>
            <p className="text-xs text-slate-500">Open Tasks</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${overdueItems.length > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <p className={`text-2xl font-bold ${overdueItems.length > 0 ? 'text-red-700' : 'text-green-700'}`}>{overdueItems.length}</p>
            <p className="text-xs text-slate-500">Overdue</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{dueSoonItems.length}</p>
            <p className="text-xs text-slate-500">Due This Week</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-indigo-700">{completionRate.toFixed(0)}%</p>
            <p className="text-xs text-slate-500">Completion Rate</p>
          </div>
        </div>

        <Tabs defaultValue="action_items">
          <TabsList className="w-full">
            <TabsTrigger value="action_items" className="flex-1">
              Action Items ({pendingItems.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-1">
              Upcoming Meetings ({upcomingMeetings.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">
              Completed ({completedItems.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Action Items */}
          <TabsContent value="action_items" className="mt-3">
            {pendingItems.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">No outstanding action items</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {pendingItems
                  .sort((a, b) => {
                    if (!a.due_date) return 1;
                    if (!b.due_date) return -1;
                    return new Date(a.due_date) - new Date(b.due_date);
                  })
                  .map((item, i) => {
                    const isOverdue = item.due_date && isBefore(new Date(item.due_date), today);
                    return (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                        <button onClick={() => handleMarkComplete(item)} className="mt-0.5 shrink-0">
                          <Circle className="w-5 h-5 text-slate-300 hover:text-green-500 transition-colors" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.description}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">from: {item.meetingTitle}</span>
                            {viewScope !== 'mine' && (
                              <span className="text-xs text-indigo-500 font-medium">{getUserName(item.assigned_to_user_id)}</span>
                            )}
                            {item.due_date && (
                              <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                Due: {format(new Date(item.due_date), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getDueBadge(item.due_date)}
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleStatusReport(item); }}>
                            Report
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* Upcoming Meetings */}
          <TabsContent value="upcoming" className="mt-3">
            {upcomingMeetings.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">No upcoming meetings</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {upcomingMeetings.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors">
                    <div className="bg-indigo-100 p-2 rounded-lg shrink-0">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.title}</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(m.start_date), 'EEE, MMM d · h:mm a')}
                        {m.location && ` · ${m.location}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-400">
                        {(m.attendees || []).length + 1} people
                      </p>
                      {(m.action_items || []).length > 0 && (
                        <p className="text-xs text-slate-500">
                          {(m.action_items || []).length} tasks
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Completed Items */}
          <TabsContent value="completed" className="mt-3">
            {completedItems.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">No completed items yet</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {completedItems
                  .sort((a, b) => {
                    if (!a.completed_date) return 1;
                    if (!b.completed_date) return -1;
                    return new Date(b.completed_date) - new Date(a.completed_date);
                  })
                  .slice(0, 10)
                  .map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-green-50 border-green-200">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-through text-slate-400">{item.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">from: {item.meetingTitle}</span>
                          {item.completed_date && (
                            <span className="text-xs text-green-600">Done: {format(new Date(item.completed_date), 'MMM d')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Status Report Dialog */}
      <Dialog open={statusReportOpen} onOpenChange={setStatusReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report on Action Item</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm font-medium">{selectedItem.description}</p>
                <p className="text-xs text-slate-500 mt-1">From: {selectedItem.meetingTitle}</p>
                {selectedItem.due_date && (
                  <p className="text-xs text-slate-500">Due: {format(new Date(selectedItem.due_date), 'MMM d, yyyy')}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Status Update</label>
                <Select value={statusNote ? 'custom' : ''} onValueChange={(v) => {
                  if (v === 'on_track') setStatusNote('On track — progressing as planned.');
                  else if (v === 'at_risk') setStatusNote('At risk — may miss deadline, need support.');
                  else if (v === 'blocked') setStatusNote('Blocked — waiting on dependencies.');
                  else if (v === 'done') setStatusNote('Complete.');
                }}>
                  <SelectTrigger><SelectValue placeholder="Quick status..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_track">✅ On Track</SelectItem>
                    <SelectItem value="at_risk">⚠️ At Risk</SelectItem>
                    <SelectItem value="blocked">🚫 Blocked</SelectItem>
                    <SelectItem value="done">✔️ Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={statusNote}
                onChange={e => setStatusNote(e.target.value)}
                placeholder="Add details about your progress..."
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusReportOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (selectedItem && statusNote.toLowerCase().includes('complete')) {
                onUpdateActionItem(selectedItem.meetingId, selectedItem.actionIndex, true);
              }
              setStatusReportOpen(false);
            }}>
              Save Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}