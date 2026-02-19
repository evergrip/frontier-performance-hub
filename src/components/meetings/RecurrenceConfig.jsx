import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', full: 'Sunday' },
  { value: 1, label: 'Mon', full: 'Monday' },
  { value: 2, label: 'Tue', full: 'Tuesday' },
  { value: 3, label: 'Wed', full: 'Wednesday' },
  { value: 4, label: 'Thu', full: 'Thursday' },
  { value: 5, label: 'Fri', full: 'Friday' },
  { value: 6, label: 'Sat', full: 'Saturday' },
];

const ORDINALS = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: -1, label: 'Last' },
];

export default function RecurrenceConfig({ recurrence, onChange }) {
  const r = recurrence || {};

  const update = (field, value) => {
    onChange({ ...r, [field]: value });
  };

  const toggleDay = (dayVal) => {
    const current = r.days_of_week || [];
    if (current.includes(dayVal)) {
      update('days_of_week', current.filter(d => d !== dayVal));
    } else {
      update('days_of_week', [...current, dayVal].sort((a, b) => a - b));
    }
  };

  // Build a human-readable summary
  const buildSummary = () => {
    if (!r.frequency) return '';
    const interval = r.interval || 1;
    const freq = r.frequency;

    if (freq === 'daily') {
      return interval === 1 ? 'Every day' : `Every ${interval} days`;
    }
    if (freq === 'weekly') {
      const dayNames = (r.days_of_week || []).map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.label).join(', ');
      const base = interval === 1 ? 'Every week' : `Every ${interval} weeks`;
      return dayNames ? `${base} on ${dayNames}` : base;
    }
    if (freq === 'monthly') {
      if (r.monthly_type === 'day_of_month') {
        const day = r.day_of_month || 1;
        return interval === 1 ? `Monthly on the ${ordinalSuffix(day)}` : `Every ${interval} months on the ${ordinalSuffix(day)}`;
      }
      if (r.monthly_type === 'nth_weekday') {
        const ordinal = ORDINALS.find(o => o.value === r.nth_ordinal)?.label || '';
        const dayName = DAYS_OF_WEEK.find(d => d.value === r.nth_day_of_week)?.full || '';
        return interval === 1 ? `Monthly on the ${ordinal} ${dayName}` : `Every ${interval} months on the ${ordinal} ${dayName}`;
      }
    }
    return '';
  };

  const ordinalSuffix = (n) => {
    if (n % 10 === 1 && n !== 11) return n + 'st';
    if (n % 10 === 2 && n !== 12) return n + 'nd';
    if (n % 10 === 3 && n !== 13) return n + 'rd';
    return n + 'th';
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-slate-500" />
          <Label className="text-base font-semibold">Recurring Meeting</Label>
        </div>
        <Switch checked={r.enabled || false} onCheckedChange={v => update('enabled', v)} />
      </div>

      {r.enabled && (
        <div className="space-y-3">
          {/* Frequency + Interval */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Repeat every</Label>
              <Input
                type="number"
                min={1}
                max={52}
                value={r.interval || 1}
                onChange={e => update('interval', Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Frequency</Label>
              <Select value={r.frequency || ''} onValueChange={v => update('frequency', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{(r.interval || 1) > 1 ? 'Days' : 'Day'}</SelectItem>
                  <SelectItem value="weekly">{(r.interval || 1) > 1 ? 'Weeks' : 'Week'}</SelectItem>
                  <SelectItem value="monthly">{(r.interval || 1) > 1 ? 'Months' : 'Month'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Weekly: day of week selector */}
          {r.frequency === 'weekly' && (
            <div>
              <Label className="text-xs">On these days</Label>
              <div className="flex gap-1 mt-1">
                {DAYS_OF_WEEK.map(day => {
                  const selected = (r.days_of_week || []).includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                        selected
                          ? 'bg-[#ea7924] text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly: day of month OR nth weekday */}
          {r.frequency === 'monthly' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Repeat on</Label>
                <Select value={r.monthly_type || 'day_of_month'} onValueChange={v => update('monthly_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day_of_month">Day of the month</SelectItem>
                    <SelectItem value="nth_weekday">Specific weekday (e.g. 2nd Tuesday)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(r.monthly_type || 'day_of_month') === 'day_of_month' && (
                <div>
                  <Label className="text-xs">Day</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={r.day_of_month || 1}
                    onChange={e => update('day_of_month', Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                  />
                </div>
              )}

              {r.monthly_type === 'nth_weekday' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Which</Label>
                    <Select value={String(r.nth_ordinal || 1)} onValueChange={v => update('nth_ordinal', parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ORDINALS.map(o => (
                          <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Day</Label>
                    <Select value={String(r.nth_day_of_week ?? '')} onValueChange={v => update('nth_day_of_week', parseInt(v))}>
                      <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(d => (
                          <SelectItem key={d.value} value={String(d.value)}>{d.full}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* End date */}
          <div>
            <Label className="text-xs">Series ends</Label>
            <Input type="date" value={r.end_date || ''} onChange={e => update('end_date', e.target.value)} />
          </div>

          {/* Summary */}
          {buildSummary() && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-slate-600 bg-white">
                {buildSummary()}
                {r.end_date && ` until ${new Date(r.end_date).toLocaleDateString()}`}
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Given a recurrence config and a start datetime, generate all occurrence dates.
 * Returns array of Date objects.
 */
export function generateOccurrences(recurrence, startDate) {
  const r = recurrence || {};
  if (!r.enabled || !r.frequency || !r.end_date) return [new Date(startDate)];

  const start = new Date(startDate);
  const endDate = new Date(r.end_date);
  endDate.setHours(23, 59, 59); // include the full end day
  const interval = r.interval || 1;
  const occurrences = [];

  if (r.frequency === 'daily') {
    let current = new Date(start);
    while (current <= endDate) {
      occurrences.push(new Date(current));
      current.setDate(current.getDate() + interval);
    }
  } else if (r.frequency === 'weekly') {
    const targetDays = (r.days_of_week || []).length > 0
      ? r.days_of_week
      : [start.getDay()]; // default to start date's day

    // Find the start of the week containing the start date (Sunday)
    let weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    while (weekStart <= endDate) {
      for (const day of targetDays) {
        const candidate = new Date(weekStart);
        candidate.setDate(candidate.getDate() + day);
        // Set the same time as the original start
        candidate.setHours(start.getHours(), start.getMinutes(), start.getSeconds());
        if (candidate >= start && candidate <= endDate) {
          occurrences.push(new Date(candidate));
        }
      }
      weekStart.setDate(weekStart.getDate() + 7 * interval);
    }
  } else if (r.frequency === 'monthly') {
    let monthOffset = 0;
    const maxIterations = 120; // safety: 10 years monthly
    let iterations = 0;

    while (iterations < maxIterations) {
      const targetMonth = start.getMonth() + monthOffset;
      const targetYear = start.getFullYear() + Math.floor(targetMonth / 12);
      const targetMonthNorm = ((targetMonth % 12) + 12) % 12;

      let candidate;

      if (r.monthly_type === 'nth_weekday' && r.nth_ordinal != null && r.nth_day_of_week != null) {
        candidate = getNthWeekdayOfMonth(targetYear, targetMonthNorm, r.nth_day_of_week, r.nth_ordinal);
        if (candidate) {
          candidate.setHours(start.getHours(), start.getMinutes(), start.getSeconds());
        }
      } else {
        // day_of_month
        const day = Math.min(r.day_of_month || start.getDate(), daysInMonth(targetYear, targetMonthNorm));
        candidate = new Date(targetYear, targetMonthNorm, day, start.getHours(), start.getMinutes(), start.getSeconds());
      }

      if (candidate && candidate > endDate) break;
      if (candidate && candidate >= start) {
        occurrences.push(new Date(candidate));
      }

      monthOffset += interval;
      iterations++;
    }
  }

  return occurrences;
}

function getNthWeekdayOfMonth(year, month, dayOfWeek, nth) {
  if (nth === -1) {
    // Last occurrence
    const lastDay = new Date(year, month + 1, 0);
    let d = lastDay.getDate();
    while (d > 0) {
      const candidate = new Date(year, month, d);
      if (candidate.getDay() === dayOfWeek) return candidate;
      d--;
    }
    return null;
  }

  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const candidate = new Date(year, month, d);
    if (candidate.getMonth() !== month) break;
    if (candidate.getDay() === dayOfWeek) {
      count++;
      if (count === nth) return candidate;
    }
  }
  return null;
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}