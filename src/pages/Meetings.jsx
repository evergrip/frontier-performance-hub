import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import MeetingFormDialog from '../components/meetings/MeetingFormDialog';
import MeetingCard from '../components/meetings/MeetingCard';
import MeetingDetailDialog from '../components/meetings/MeetingDetailDialog';
import MeetingKPIStats from '../components/meetings/MeetingKPIStats';

export default function Meetings() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [detailMeeting, setDetailMeeting] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addToCalendar, setAddToCalendar] = useState(true);
  const [calendarSyncing, setCalendarSyncing] = useState(false);

  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list('-created_date'),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Meeting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setFormOpen(false);
      setEditingMeeting(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Meeting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setFormOpen(false);
      setEditingMeeting(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Meeting.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meetings'] }),
  });

  const syncToCalendar = async (meetingId) => {
    setCalendarSyncing(true);
    try {
      const response = await base44.functions.invoke('createCalendarEvent', { meeting_id: meetingId });
      if (response.data?.success) {
        toast.success('Meeting added to Google Calendar');
      } else {
        toast.error('Failed to sync to calendar');
      }
    } catch (err) {
      toast.error('Could not add to Google Calendar');
    } finally {
      setCalendarSyncing(false);
    }
  };

  const handleSubmit = async (data) => {
    if (editingMeeting) {
      updateMutation.mutate({ id: editingMeeting.id, data }, {
        onSuccess: async (result) => {
          if (addToCalendar) await syncToCalendar(editingMeeting.id);
        }
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: async (result) => {
          if (addToCalendar && result?.id) await syncToCalendar(result.id);
        }
      });
    }
  };

  const handleEdit = (meeting) => {
    setEditingMeeting(meeting);
    setFormOpen(true);
  };

  const handleDelete = (meeting) => {
    if (confirm(`Delete "${meeting.title}"?`)) {
      deleteMutation.mutate(meeting.id);
    }
  };

  const handleToggleActionItem = (meeting, actionIndex) => {
    const items = [...(meeting.action_items || [])];
    items[actionIndex] = {
      ...items[actionIndex],
      is_completed: !items[actionIndex].is_completed,
      completed_date: !items[actionIndex].is_completed ? new Date().toISOString().split('T')[0] : null,
    };
    updateMutation.mutate({ id: meeting.id, data: { action_items: items } });
    // Update detail dialog state
    if (detailMeeting?.id === meeting.id) {
      setDetailMeeting({ ...meeting, action_items: items });
    }
  };

  const filtered = meetings.filter(m => {
    if (typeFilter !== 'all' && m.meeting_type !== typeFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (searchQuery && !m.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const upcoming = filtered.filter(m => m.status === 'scheduled' || m.status === 'in_progress')
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  const past = filtered.filter(m => m.status === 'completed' || m.status === 'cancelled' || m.status === 'rescheduled')
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Meetings</h1>
          <p className="text-slate-500">Track meetings, action items, and outcomes</p>
        </div>
        <Button onClick={() => { setEditingMeeting(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Schedule Meeting
        </Button>
      </div>

      {/* KPI Stats */}
      <MeetingKPIStats meetings={meetings} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="daily_operational">Daily Operational</SelectItem>
            <SelectItem value="weekly_tactical">Weekly Tactical</SelectItem>
            <SelectItem value="monthly_strategic">Monthly Strategic</SelectItem>
            <SelectItem value="quarterly_reset">Quarterly Reset</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Meeting Lists */}
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {upcoming.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No upcoming meetings</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcoming.map(m => (
                <div key={m.id} onClick={() => setDetailMeeting(m)} className="cursor-pointer">
                  <MeetingCard meeting={m} users={users} onEdit={handleEdit} onDelete={handleDelete} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {past.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No past meetings</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {past.map(m => (
                <div key={m.id} onClick={() => setDetailMeeting(m)} className="cursor-pointer">
                  <MeetingCard meeting={m} users={users} onEdit={handleEdit} onDelete={handleDelete} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No meetings found</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map(m => (
                <div key={m.id} onClick={() => setDetailMeeting(m)} className="cursor-pointer">
                  <MeetingCard meeting={m} users={users} onEdit={handleEdit} onDelete={handleDelete} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <MeetingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        meeting={editingMeeting}
        onSubmit={handleSubmit}
        saving={createMutation.isPending || updateMutation.isPending || calendarSyncing}
        addToCalendar={addToCalendar}
        setAddToCalendar={setAddToCalendar}
      />
      <MeetingDetailDialog
        open={!!detailMeeting}
        onOpenChange={(open) => !open && setDetailMeeting(null)}
        meeting={detailMeeting}
        users={users}
        onToggleActionItem={handleToggleActionItem}
      />
    </div>
  );
}