import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarPlus, Copy, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function formatDateForGCal(dateStr) {
  // Format: YYYYMMDDTHHmmSSZ
  return new Date(dateStr).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatDateForICS(dateStr) {
  return new Date(dateStr).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function buildDescription(meeting) {
  const parts = [];
  if (meeting.description) parts.push(meeting.description);
  if ((meeting.action_items || []).length > 0) {
    parts.push('\nAction Items:');
    meeting.action_items.forEach((item, i) => {
      parts.push(`${i + 1}. ${item.description}`);
    });
  }
  return parts.join('\n');
}

function getAttendeeEmails(meeting, users) {
  if (!meeting.attendees?.length || !users?.length) return [];
  return meeting.attendees
    .map(id => users.find(u => u.id === id)?.email)
    .filter(Boolean);
}

function getGoogleCalendarUrl(meeting, users) {
  const start = formatDateForGCal(meeting.start_date);
  const end = meeting.end_date
    ? formatDateForGCal(meeting.end_date)
    : formatDateForGCal(new Date(new Date(meeting.start_date).getTime() + 60 * 60 * 1000).toISOString());
  const description = buildDescription(meeting);
  const emails = getAttendeeEmails(meeting, users);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: meeting.title,
    dates: `${start}/${end}`,
    details: description,
    location: meeting.location || '',
  });
  if (emails.length > 0) {
    params.set('add', emails.join(','));
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function getOutlookUrl(meeting, users) {
  const start = new Date(meeting.start_date).toISOString();
  const end = meeting.end_date
    ? new Date(meeting.end_date).toISOString()
    : new Date(new Date(meeting.start_date).getTime() + 60 * 60 * 1000).toISOString();
  const description = buildDescription(meeting);
  const emails = getAttendeeEmails(meeting, users);

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: meeting.title,
    startdt: start,
    enddt: end,
    body: description,
    location: meeting.location || '',
  });
  if (emails.length > 0) {
    params.set('to', emails.join(';'));
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function generateICSContent(meeting, users) {
  const start = formatDateForICS(meeting.start_date);
  const end = meeting.end_date
    ? formatDateForICS(meeting.end_date)
    : formatDateForICS(new Date(new Date(meeting.start_date).getTime() + 60 * 60 * 1000).toISOString());
  const description = buildDescription(meeting).replace(/\n/g, '\\n');
  const now = formatDateForICS(new Date().toISOString());
  const emails = getAttendeeEmails(meeting, users);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Frontier//Meeting//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${meeting.title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${meeting.location || ''}`,
  ];
  emails.forEach(email => {
    lines.push(`ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT:mailto:${email}`);
  });
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

function downloadICS(meeting, users) {
  const content = generateICSContent(meeting, users);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${meeting.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

export default function CalendarInviteButton({ meeting, users = [], variant = 'outline', size = 'sm' }) {
  const [copied, setCopied] = useState(false);

  const googleUrl = getGoogleCalendarUrl(meeting, users);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(googleUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-1.5" onClick={e => e.stopPropagation()}>
          <CalendarPlus className="w-4 h-4" />
          <span>Create Invite</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => window.open(googleUrl, '_blank')}>
          <span>Google Calendar</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(getOutlookUrl(meeting, users), '_blank')}>
          <span>Outlook</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadICS(meeting, users)}>
          <span>Download .ics file</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
          <span>{copied ? 'Copied!' : 'Copy invite link'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}