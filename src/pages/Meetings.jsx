import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, CalendarDays, AlertTriangle, ListChecks, ClipboardList, HelpCircle } from 'lucide-react';
import MeetingFormDialog from '../components/meetings/MeetingFormDialog';
import MeetingCard from '../components/meetings/MeetingCard';
import MeetingDetailDialog from '../components/meetings/MeetingDetailDialog';
import MeetingKPIStats from '../components/meetings/MeetingKPIStats';
import MeetingEffectivenessScorecard from '../components/meetings/MeetingEffectivenessScorecard';
import ImportActionItemsDialog from '../components/meetings/ImportActionItemsDialog';
import ActionItemCompletionDialog from '../components/meetings/ActionItemCompletionDialog';
import FirefliesSyncDialog from '../components/meetings/FirefliesSyncDialog';
import { generateOccurrences } from '../components/meetings/RecurrenceConfig';
import { getGoogleCalendarUrl } from '../components/meetings/CalendarInviteButton';
import AllActionItemsView from '../components/meetings/AllActionItemsView';
import AgendaTemplatesTab from '@/components/meetings/AgendaTemplatesTab';
import MeetingWalkthrough from '@/components/meetings/MeetingWalkthrough';
import MeetingReminderPopup from '@/components/meetings/MeetingReminderPopup';

export default function Meetings() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [detailMeeting, setDetailMeeting] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [scorecardMeeting, setScorecardMeeting] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importTargetForm, setImportTargetForm] = useState(null);
  const [completionDialog, setCompletionDialog] = useState(null); // { meeting, actionIndex }
  const [firefliesSyncMeeting, setFirefliesSyncMeeting] = useState(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);

  useState(() => {
    base44.auth.me().then(u => setCurrentUser(u));
  });

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

  const { data: kpis = [] } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => base44.entities.KPI.list(),
    initialData: [],
  });

  const { data: meetingTypes = [] } = useQuery({
    queryKey: ['meetingTypes'],
    queryFn: () => base44.entities.MeetingType.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Meeting.create(data),
    onSuccess: (createdMeeting, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setFormOpen(false);
      setEditingMeeting(null);
      // Auto-open Google Calendar event creator
      const meetingData = { ...variables, ...(createdMeeting || {}) };
      const gcalUrl = getGoogleCalendarUrl(meetingData, users);
      window.open(gcalUrl, '_blank');
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

  const handleSubmit = async (data) => {
    if (editingMeeting) {
      updateMutation.mutate({ id: editingMeeting.id, data });
    } else if (data.recurrence?.enabled && data.recurrence?.frequency && data.start_date && data.recurrence?.end_date) {
      // Generate recurring meeting instances using the recurrence engine
      const seriesId = `series_${Date.now()}`;
      const startDate = new Date(data.start_date);
      const endDate = data.end_date ? new Date(data.end_date) : null;
      const durationMs = endDate ? endDate.getTime() - startDate.getTime() : 60 * 60 * 1000;

      const occurrences = generateOccurrences(data.recurrence, data.start_date);

      const instances = occurrences.map((occDate, i) => {
        const instanceEnd = new Date(occDate.getTime() + durationMs);
        const { recurrence, ...rest } = data;
        return {
          ...rest,
          start_date: occDate.toISOString(),
          end_date: instanceEnd.toISOString(),
          recurring_series_id: seriesId,
          is_recurring: i === 0,
          recurrence_pattern: i === 0 ? recurrence.frequency : undefined,
          action_items: data.action_items?.map(item => ({ ...item, is_completed: false, completed_date: null })) || [],
        };
      });

      if (instances.length > 0) {
        await base44.entities.Meeting.bulkCreate(instances);
        // Open Google Calendar for the first occurrence
        const gcalUrl = getGoogleCalendarUrl(instances[0], users);
        window.open(gcalUrl, '_blank');
      }
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setFormOpen(false);
      setEditingMeeting(null);
    } else {
      // Strip recurrence config from single meeting
      const { recurrence, ...cleanData } = data;
      createMutation.mutate(cleanData);
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

  const handleToggleActionItem = async (meeting, actionIndex) => {
    const items = [...(meeting.action_items || [])];
    const wasCompleted = items[actionIndex].is_completed;
    const isNowCompleted = !wasCompleted;

    if (isNowCompleted) {
      // Open the completion dialog instead of immediately marking complete
      setCompletionDialog({ meeting, actionIndex });
      return;
    }

    // Uncompleting — just toggle directly
    items[actionIndex] = {
      ...items[actionIndex],
      is_completed: false,
      completed_date: null,
      completion_notes: '',
    };
    updateMutation.mutate({ id: meeting.id, data: { action_items: items } });
    if (detailMeeting?.id === meeting.id) {
      setDetailMeeting({ ...meeting, action_items: items });
    }
  };

  const handleCompletionConfirm = async ({ notes, fileUrls, followUp }) => {
    if (!completionDialog) return;
    const { meeting, actionIndex } = completionDialog;
    const items = [...(meeting.action_items || [])];

    items[actionIndex] = {
      ...items[actionIndex],
      is_completed: true,
      completed_date: new Date().toISOString().split('T')[0],
      completion_notes: notes || '',
      file_urls: fileUrls || [],
    };

    // Add follow-up as a new action item if provided
    if (followUp && followUp.description) {
      items.push({
        description: followUp.description,
        assigned_to_user_id: followUp.assigned_to_user_id || items[actionIndex].assigned_to_user_id,
        due_date: followUp.due_date || '',
        is_completed: false,
        completed_date: null,
        linked_kpi_id: '',
        kpi_impact_value: 1,
      });
    }

    updateMutation.mutate({ id: meeting.id, data: { action_items: items } });

    // If completing an action item that has a linked KPI, create a KPI entry
    const actionItem = items[actionIndex];
    if (actionItem.linked_kpi_id) {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      await base44.entities.KPIEntry.create({
        kpi_id: actionItem.linked_kpi_id,
        user_id: actionItem.assigned_to_user_id,
        reporting_period_start_date: periodStart,
        reporting_period_end_date: periodEnd,
        actual_value: actionItem.kpi_impact_value || 1,
        source_meeting_id: meeting.id,
        source_action_item_description: actionItem.description,
        manual_entry: false,
      });
    }

    if (detailMeeting?.id === meeting.id) {
      setDetailMeeting({ ...meeting, action_items: items });
    }
    setCompletionDialog(null);
  };

  // Handle importing action items from previous meetings into the form
  const formDialogRef = React.useRef(null);
  const [pendingImportItems, setPendingImportItems] = useState(null);

  const handleOpenImportActions = (currentFormData) => {
    setImportTargetForm(currentFormData);
    setImportDialogOpen(true);
  };

  const handleImportItems = (items) => {
    setPendingImportItems(items);
    setImportDialogOpen(false);
  };

  const handleScorecardSubmit = (scorecardData) => {
    if (!scorecardMeeting) return;
    // scorecardData now contains { attendee_scorecards: [...] }
    updateMutation.mutate(
      { id: scorecardMeeting.id, data: scorecardData },
      { onSuccess: () => setScorecardMeeting(null) }
    );
  };

  // Filter out private meetings the current user shouldn't see
  const visibleMeetings = meetings.filter(m => {
    if (!m.is_private) return true;
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (m.organizer_id === currentUser.id) return true;
    if ((m.attendees || []).includes(currentUser.id)) return true;
    if ((m.visible_to_user_ids || []).includes(currentUser.id)) return true;
    return false;
  });

  const filtered = visibleMeetings.filter(m => {
    if (typeFilter !== 'all' && m.meeting_type !== typeFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (searchQuery && !m.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const upcoming = filtered.filter(m => m.status === 'scheduled' || m.status === 'in_progress')
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  const past = filtered.filter(m => m.status === 'completed' || m.status === 'cancelled' || m.status === 'rescheduled')
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  const noAgenda = filtered.filter(m => !(m.has_agenda || (m.agenda_html && m.agenda_html.replace(/<[^>]*>/g, '').trim()) || (m.description && m.description.trim())))
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Meetings</h1>
          <p className="text-slate-500">Track meetings, action items, and outcomes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setWalkthroughOpen(true)}>
            <HelpCircle className="w-4 h-4 mr-2" /> How It Works
          </Button>
          <Button onClick={() => { setEditingMeeting(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Meeting Reminders */}
      {currentUser && (
        <MeetingReminderPopup
          meetings={visibleMeetings}
          currentUser={currentUser}
          onMarkComplete={(meeting) => {
            updateMutation.mutate({ id: meeting.id, data: { status: 'completed' } });
          }}
          onStartMeeting={(meeting) => {
            updateMutation.mutate({ id: meeting.id, data: { status: 'in_progress', actual_start_time: new Date().toISOString() } });
          }}
        />
      )}

      {/* KPI Stats */}
      <MeetingKPIStats meetings={visibleMeetings} />

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
            {meetingTypes.filter(t => t.is_active !== false).map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
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
          <TabsTrigger value="action_items" className="gap-1">
            <ListChecks className="w-3 h-3" /> Action Items
          </TabsTrigger>
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1">
            <ClipboardList className="w-3 h-3" /> Templates
          </TabsTrigger>
          {currentUser?.role === 'admin' && (
            <TabsTrigger value="no_agenda" className="text-red-600">
              <AlertTriangle className="w-3 h-3 mr-1" /> No Agenda ({noAgenda.length})
            </TabsTrigger>
          )}
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
                  <MeetingCard meeting={m} users={users} meetingTypes={meetingTypes} onEdit={handleEdit} onDelete={handleDelete}
                    currentUserId={currentUser?.id}
                    onQuickStart={(mtg) => updateMutation.mutate({ id: mtg.id, data: { status: 'in_progress', actual_start_time: new Date().toISOString() } })}
                    onQuickComplete={(mtg) => { setDetailMeeting(mtg); }}
                  />
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
                  <MeetingCard meeting={m} users={users} meetingTypes={meetingTypes} onEdit={handleEdit} onDelete={handleDelete}
                    currentUserId={currentUser?.id}
                    onQuickStart={(mtg) => updateMutation.mutate({ id: mtg.id, data: { status: 'in_progress', actual_start_time: new Date().toISOString() } })}
                    onQuickComplete={(mtg) => { setDetailMeeting(mtg); }}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="action_items" className="mt-4">
          <AllActionItemsView
            meetings={visibleMeetings}
            users={users}
            onToggleActionItem={handleToggleActionItem}
          />
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
                  <MeetingCard meeting={m} users={users} meetingTypes={meetingTypes} onEdit={handleEdit} onDelete={handleDelete} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <AgendaTemplatesTab />
        </TabsContent>

        {currentUser?.role === 'admin' && (
          <TabsContent value="no_agenda" className="mt-4">
            {noAgenda.length === 0 ? (
              <div className="text-center py-12 text-green-500">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">All meetings have agendas!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {noAgenda.map(m => (
                  <div key={m.id} onClick={() => setDetailMeeting(m)} className="cursor-pointer">
                    <MeetingCard meeting={m} users={users} meetingTypes={meetingTypes} onEdit={handleEdit} onDelete={handleDelete} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <MeetingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        meeting={editingMeeting}
        onSubmit={handleSubmit}
        saving={createMutation.isPending || updateMutation.isPending}
        onOpenImportActions={handleOpenImportActions}
        pendingImportItems={pendingImportItems}
        onImportItemsConsumed={() => setPendingImportItems(null)}
        allMeetings={meetings}
      />
      <ImportActionItemsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        meetings={meetings}
        users={users}
        currentMeeting={editingMeeting}
        onImport={handleImportItems}
      />
      <MeetingDetailDialog
        open={!!detailMeeting}
        onOpenChange={(open) => !open && setDetailMeeting(null)}
        meeting={detailMeeting}
        users={users}
        kpis={kpis}
        meetingTypes={meetingTypes}
        allMeetings={meetings}
        currentUser={currentUser}
        onToggleActionItem={handleToggleActionItem}
        onOpenScorecard={(m) => { setDetailMeeting(null); setScorecardMeeting(m); }}
        onEdit={handleEdit}
        onSyncFireflies={(m) => { setDetailMeeting(null); setFirefliesSyncMeeting(m); }}
      />
      <FirefliesSyncDialog
        open={!!firefliesSyncMeeting}
        onOpenChange={(open) => !open && setFirefliesSyncMeeting(null)}
        meeting={firefliesSyncMeeting}
        onSynced={() => { queryClient.invalidateQueries({ queryKey: ['meetings'] }); setFirefliesSyncMeeting(null); }}
      />
      <ActionItemCompletionDialog
        open={!!completionDialog}
        onOpenChange={(open) => !open && setCompletionDialog(null)}
        actionItem={completionDialog ? completionDialog.meeting.action_items[completionDialog.actionIndex] : null}
        users={users}
        onConfirm={handleCompletionConfirm}
      />
      <MeetingWalkthrough
        open={walkthroughOpen}
        onOpenChange={setWalkthroughOpen}
      />
      <MeetingEffectivenessScorecard
        open={!!scorecardMeeting}
        onOpenChange={(open) => !open && setScorecardMeeting(null)}
        meeting={scorecardMeeting}
        currentUser={currentUser}
        onSubmit={handleScorecardSubmit}
        saving={updateMutation.isPending}
      />
    </div>
  );
}