import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Link2, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';

const TYPE_LABELS = {
  daily_operational: 'Daily Operational',
  weekly_tactical: 'Weekly Tactical',
  monthly_strategic: 'Monthly Strategic',
  quarterly_reset: 'Quarterly Reset',
};

export default function ParentMeetingPicker({ meetings, meetingType, parentMeetingId, onParentSelect, users }) {
  // Suggest meetings of the same type first, sorted most recent first
  const sortedMeetings = useMemo(() => {
    const past = meetings.filter(m => m.status === 'completed' || new Date(m.start_date) < new Date());
    const sameType = past.filter(m => m.meeting_type === meetingType)
      .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    const otherType = past.filter(m => m.meeting_type !== meetingType)
      .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    return [...sameType, ...otherType];
  }, [meetings, meetingType]);

  const parentMeeting = meetings.find(m => m.id === parentMeetingId);
  const incompleteItems = parentMeeting?.action_items?.filter(a => !a.is_completed) || [];
  const getUserName = (id) => users?.find(u => u.id === id)?.full_name || 'Unassigned';

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-blue-50/50 border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-600" />
          <Label className="text-base font-semibold text-blue-900">Follow-up to Previous Meeting</Label>
        </div>
        <Switch
          checked={!!parentMeetingId}
          onCheckedChange={(checked) => onParentSelect(checked ? sortedMeetings[0]?.id || '' : '')}
        />
      </div>
      <p className="text-xs text-blue-700">Link this meeting to a previous one to carry forward outstanding action items as "Previous Business".</p>

      {parentMeetingId && (
        <>
          <Select value={parentMeetingId} onValueChange={onParentSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select previous meeting..." />
            </SelectTrigger>
            <SelectContent>
              {sortedMeetings.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  <div className="flex items-center gap-2">
                    <span className="truncate">{m.title}</span>
                    <span className="text-xs text-slate-400">
                      {format(new Date(m.start_date), 'MMM d, yyyy')}
                    </span>
                    {m.meeting_type === meetingType && (
                      <Badge className="bg-blue-100 text-blue-700 text-[10px] py-0 px-1">Same type</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {parentMeeting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">
                  Outstanding items to carry forward:
                </span>
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  {incompleteItems.length} item{incompleteItems.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              {incompleteItems.length > 0 ? (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {incompleteItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded bg-white border border-blue-100 text-sm">
                      <ArrowRight className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 truncate">{item.description}</p>
                        <p className="text-xs text-slate-400">{getUserName(item.assigned_to_user_id)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded bg-white border border-green-100 text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  All action items from this meeting are complete!
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}