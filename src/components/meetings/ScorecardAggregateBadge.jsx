import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SCORECARD_KEYS = [
  'agenda_distributed_prior', 'clear_chairperson', 'started_with_review',
  'senior_talks_last', 'started_on_time', 'finished_on_time',
  'stuck_to_agenda', 'participants_focused', 'phones_off',
  'sufficient_notice', 'participants_prepared', 'good_use_of_time',
];

export function getScorecardAggregates(meeting) {
  const scorecards = meeting.attendee_scorecards || [];
  // Include legacy scorecard if it exists and no attendee scorecards yet
  const legacy = meeting.effectiveness_scorecard;
  const allCards = scorecards.length > 0 ? scorecards : (legacy?.submitted_by ? [legacy] : []);
  
  if (allCards.length === 0) return null;

  const total = SCORECARD_KEYS.length;
  const avgPerCard = allCards.map(sc => {
    const yesCount = SCORECARD_KEYS.filter(k => sc[k]).length;
    return (yesCount / total) * 100;
  });
  const avgScore = Math.round(avgPerCard.reduce((a, b) => a + b, 0) / avgPerCard.length);

  // Per-question averages
  const questionAvg = {};
  SCORECARD_KEYS.forEach(key => {
    const yesCount = allCards.filter(sc => sc[key]).length;
    questionAvg[key] = Math.round((yesCount / allCards.length) * 100);
  });

  // All attendees who should fill out (organizer + attendees)
  const allParticipantIds = [
    meeting.organizer_id,
    ...(meeting.attendees || [])
  ].filter(Boolean);
  const uniqueParticipants = [...new Set(allParticipantIds)];
  const submittedUserIds = scorecards.map(sc => sc.user_id);
  const pendingUserIds = uniqueParticipants.filter(id => !submittedUserIds.includes(id));

  return {
    avgScore,
    submittedCount: allCards.length,
    totalExpected: uniqueParticipants.length,
    pendingUserIds,
    questionAvg,
  };
}

export default function ScorecardAggregateBadge({ meeting }) {
  const agg = getScorecardAggregates(meeting);
  if (!agg) return null;

  const color = agg.avgScore >= 80 ? 'bg-green-100 text-green-800' : agg.avgScore >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`gap-1 ${color}`}>
            <ClipboardCheck className="w-3 h-3" />
            {agg.avgScore}% ({agg.submittedCount}/{agg.totalExpected})
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Avg effectiveness: {agg.avgScore}%</p>
          <p className="text-xs">{agg.submittedCount} of {agg.totalExpected} scorecards submitted</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}