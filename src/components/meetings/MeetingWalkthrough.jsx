import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, CalendarDays, FileText, Users, ListChecks, 
  CheckCircle2, BarChart3, ChevronLeft, ChevronRight, HelpCircle,
  Mic, Star
} from 'lucide-react';

const WALKTHROUGH_STEPS = [
  {
    icon: ClipboardList,
    title: '1. Create an Agenda Template',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    content: [
      'Go to the **Templates** tab on this page.',
      'Click **New Template** and give it a name (e.g., "Weekly Team Sync").',
      'Optionally link it to a specific meeting type.',
      'Add structured sections like Discussion Topics, Checklists, Action Review, Text Input, Notes, or Time-Boxed items.',
      'Each section can have a title, description, suggested duration, and default items.',
      'Save the template — it\'s now reusable for any future meeting.',
    ],
  },
  {
    icon: CalendarDays,
    title: '2. Schedule a Meeting',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    content: [
      'Click **Schedule Meeting** at the top of the Meetings page.',
      'Fill in the **Title**, **Meeting Type**, **Start Date/Time**, and **Organizer**.',
      'The end time auto-calculates based on the meeting type\'s default duration.',
      'Add a **Location** (room name or video link).',
      'Select **Attendees** from the team.',
      'Optionally link the meeting to a **Client** or **Project** for tracking.',
    ],
  },
  {
    icon: FileText,
    title: '3. Apply an Agenda Template',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    content: [
      'In the meeting form, find the **Agenda** section.',
      'Use the **template dropdown** to select one of your saved templates.',
      'The template\'s structured sections will populate automatically.',
      'Fill in the sections — add discussion points, check off prep items, type notes.',
      'You can also use **AI Generate** to auto-create an agenda based on the meeting context.',
      'Alternatively, use the rich text editor for a free-form agenda.',
    ],
  },
  {
    icon: Users,
    title: '4. Link Previous Meeting & Carry Forward Items',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    content: [
      'When creating a follow-up meeting, select a **Parent Meeting** in the form.',
      'Outstanding action items from the parent will auto-import as **Previous Business**.',
      'You can also click **Import from Previous** to pull tasks from any past meeting.',
      'This creates a chain of meeting accountability.',
    ],
  },
  {
    icon: Mic,
    title: '5. During the Meeting',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    content: [
      'Change the meeting status to **In Progress** when it starts.',
      'Fill in **Actual Start Time** to track punctuality.',
      'If Fireflies.ai is enabled, it will auto-transcribe the meeting.',
      'Use the **Minutes** tab in the agenda editor to take real-time notes.',
      'Upload any **Materials** (files or links) shared during the meeting.',
    ],
  },
  {
    icon: ListChecks,
    title: '6. Add Action Items & Assign Tasks',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    content: [
      'Scroll to **Action Items / Tasks** in the meeting form.',
      'Click **Add Task** for each follow-up item.',
      'Assign each task to a team member and set a **due date**.',
      'Optionally **link a KPI** to the task — when completed, it auto-updates the KPI.',
      'Tasks appear in the **Action Items** tab for easy tracking across all meetings.',
    ],
  },
  {
    icon: CheckCircle2,
    title: '7. Complete the Meeting',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    content: [
      'Set the status to **Completed** and fill in the **Actual End Time**.',
      'Write an **Outcome Summary** capturing key decisions.',
      'The system auto-creates **scorecard tasks** for each attendee.',
      'Attendees will be asked to fill out a meeting effectiveness scorecard.',
      'A Google Calendar event link is automatically generated when creating meetings.',
    ],
  },
  {
    icon: Star,
    title: '8. Rate Meeting Effectiveness',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    content: [
      'After completion, each attendee gets a **scorecard task**.',
      'Open the meeting and click **Fill Scorecard** to rate the meeting.',
      'Score criteria like: started on time, stuck to agenda, good use of time, etc.',
      'Aggregated scores appear on the meeting detail view.',
      'These metrics feed into the **KPI stats** at the top of the Meetings page.',
    ],
  },
  {
    icon: BarChart3,
    title: '9. Track Performance Over Time',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    content: [
      'The **KPI Stats** bar at the top shows meeting health metrics.',
      'Track: meetings held, tasks assigned, completion rate, on-time rate, agenda compliance.',
      'Use the **Action Items** tab to monitor outstanding tasks across all meetings.',
      'The **No Agenda** tab (admin only) flags meetings missing agendas.',
      'Fireflies integration provides AI summaries and transcripts for completed meetings.',
    ],
  },
];

export default function MeetingWalkthrough({ open, onOpenChange }) {
  const [step, setStep] = useState(0);
  const current = WALKTHROUGH_STEPS[step];
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setStep(0); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#ea7924]" />
            Meeting Walkthrough
          </DialogTitle>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-1">
          {WALKTHROUGH_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === step ? 'bg-[#ea7924] scale-125' : i < step ? 'bg-[#ea7924]/40' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className={`rounded-xl p-5 ${current.bg} border ${current.border}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm`}>
              <Icon className={`w-5 h-5 ${current.color}`} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{current.title}</h3>
          </div>
          <ul className="space-y-2.5">
            {current.content.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-slate-400 mt-0.5 shrink-0">•</span>
                <span dangerouslySetInnerHTML={{ 
                  __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>') 
                }} />
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center text-xs text-slate-400">
          Step {step + 1} of {WALKTHROUGH_STEPS.length}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button 
            variant="outline" 
            onClick={() => setStep(s => s - 1)} 
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          {step < WALKTHROUGH_STEPS.length - 1 ? (
            <Button 
              onClick={() => setStep(s => s + 1)}
              className="gap-1 bg-[#ea7924] hover:bg-[#d66a1f]"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button 
              onClick={() => { setStep(0); onOpenChange(false); }}
              className="gap-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4" /> Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}