import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, ListChecks, Clock, TrendingUp, FileText, Target, Timer, ClipboardCheck } from 'lucide-react';

export default function MeetingKPIStats({ meetings }) {
  const completedMeetings = meetings.filter(m => m.status === 'completed');
  const allActionItems = meetings.flatMap(m => m.action_items || []);
  const completedActionItems = allActionItems.filter(a => a.is_completed);
  const overdueActionItems = allActionItems.filter(a => !a.is_completed && a.due_date && new Date(a.due_date) < new Date());

  // On-time completion rate
  const completedWithDates = completedActionItems.filter(a => a.due_date && a.completed_date);
  const onTimeItems = completedWithDates.filter(a => new Date(a.completed_date) <= new Date(a.due_date));
  const onTimeRate = completedWithDates.length > 0 ? (onTimeItems.length / completedWithDates.length) * 100 : 0;

  // Overall completion rate
  const completionRate = allActionItems.length > 0 ? (completedActionItems.length / allActionItems.length) * 100 : 0;

  // Agenda compliance
  const meetingsWithAgenda = meetings.filter(m => m.has_agenda || (m.description && m.description.trim().length > 0));
  const agendaRate = meetings.length > 0 ? (meetingsWithAgenda.length / meetings.length) * 100 : 0;

  // Punctuality
  const meetingsWithActualStart = meetings.filter(m => m.actual_start_time && m.start_date);
  const meetingsStartedOnTime = meetingsWithActualStart.filter(m => 
    new Date(m.actual_start_time) <= new Date(new Date(m.start_date).getTime() + 5 * 60000)
  );
  const punctualityRate = meetingsWithActualStart.length > 0 ? (meetingsStartedOnTime.length / meetingsWithActualStart.length) * 100 : 0;

  // Effectiveness scorecard average
  const scorecardKeys = ['agenda_distributed_prior', 'clear_chairperson', 'started_with_review', 'senior_talks_last', 'started_on_time', 'finished_on_time', 'stuck_to_agenda', 'participants_focused', 'phones_off', 'sufficient_notice', 'participants_prepared', 'good_use_of_time'];
  const meetingsWithScorecard = meetings.filter(m => m.effectiveness_scorecard?.submitted_by);
  const avgScorecard = meetingsWithScorecard.length > 0
    ? meetingsWithScorecard.reduce((sum, m) => {
        const sc = m.effectiveness_scorecard;
        return sum + scorecardKeys.filter(k => sc[k]).length;
      }, 0) / meetingsWithScorecard.length
    : 0;
  const avgScorecardPct = meetingsWithScorecard.length > 0 ? Math.round((avgScorecard / scorecardKeys.length) * 100) : 0;

  // KPI-linked items
  const kpiLinkedItems = allActionItems.filter(a => a.linked_kpi_id);
  const kpiCompletedItems = kpiLinkedItems.filter(a => a.is_completed);

  const stats = [
    {
      title: 'Meetings Held',
      value: completedMeetings.length,
      subtitle: `${meetings.length} total scheduled`,
      icon: CalendarCheck,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Tasks Assigned',
      value: allActionItems.length,
      subtitle: `${completedActionItems.length} completed`,
      icon: ListChecks,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Completion Rate',
      value: `${completionRate.toFixed(0)}%`,
      subtitle: `${overdueActionItems.length} overdue`,
      icon: TrendingUp,
      color: completionRate >= 80 ? 'text-green-600' : completionRate >= 50 ? 'text-amber-600' : 'text-red-600',
      bg: completionRate >= 80 ? 'bg-green-50' : completionRate >= 50 ? 'bg-amber-50' : 'bg-red-50',
    },
    {
      title: 'On-Time Rate',
      value: `${onTimeRate.toFixed(0)}%`,
      subtitle: `${onTimeItems.length}/${completedWithDates.length} on time`,
      icon: Clock,
      color: onTimeRate >= 80 ? 'text-green-600' : onTimeRate >= 50 ? 'text-amber-600' : 'text-red-600',
      bg: onTimeRate >= 80 ? 'bg-green-50' : onTimeRate >= 50 ? 'bg-amber-50' : 'bg-red-50',
    },
    {
      title: 'Agenda Compliance',
      value: `${agendaRate.toFixed(0)}%`,
      subtitle: `${meetingsWithAgenda.length}/${meetings.length} have agendas`,
      icon: FileText,
      color: agendaRate >= 90 ? 'text-green-600' : agendaRate >= 70 ? 'text-amber-600' : 'text-red-600',
      bg: agendaRate >= 90 ? 'bg-green-50' : agendaRate >= 70 ? 'bg-amber-50' : 'bg-red-50',
    },
    {
      title: 'Punctuality',
      value: meetingsWithActualStart.length > 0 ? `${punctualityRate.toFixed(0)}%` : '—',
      subtitle: meetingsWithActualStart.length > 0 ? `${meetingsStartedOnTime.length}/${meetingsWithActualStart.length} started on time` : 'No data yet',
      icon: Timer,
      color: punctualityRate >= 80 ? 'text-green-600' : punctualityRate >= 50 ? 'text-amber-600' : 'text-red-600',
      bg: punctualityRate >= 80 ? 'bg-green-50' : punctualityRate >= 50 ? 'bg-amber-50' : 'bg-red-50',
    },
    {
      title: 'Effectiveness',
      value: meetingsWithScorecard.length > 0 ? `${avgScorecardPct}%` : '—',
      subtitle: `${meetingsWithScorecard.length} scorecard${meetingsWithScorecard.length !== 1 ? 's' : ''} submitted`,
      icon: ClipboardCheck,
      color: avgScorecardPct >= 80 ? 'text-green-600' : avgScorecardPct >= 60 ? 'text-amber-600' : 'text-red-600',
      bg: avgScorecardPct >= 80 ? 'bg-green-50' : avgScorecardPct >= 60 ? 'bg-amber-50' : 'bg-red-50',
    },
    {
      title: 'KPI-Linked Tasks',
      value: kpiLinkedItems.length,
      subtitle: `${kpiCompletedItems.length} completed → KPI updated`,
      icon: Target,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.title}</p>
                  <p className="text-xs text-slate-400">{stat.subtitle}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}