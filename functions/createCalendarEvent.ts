import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meeting_id } = await req.json();
    if (!meeting_id) {
      return Response.json({ error: 'meeting_id is required' }, { status: 400 });
    }

    // Fetch the meeting
    const meetings = await base44.asServiceRole.entities.Meeting.filter({ id: meeting_id });
    if (!meetings || meetings.length === 0) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }
    const meeting = meetings[0];

    // Fetch attendee emails
    const allUsers = await base44.asServiceRole.entities.User.list();
    const attendeeEmails = (meeting.attendees || [])
      .map(id => allUsers.find(u => u.id === id)?.email)
      .filter(Boolean);

    const organizer = allUsers.find(u => u.id === meeting.organizer_id);

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    // Build the event
    const event = {
      summary: meeting.title,
      description: [
        meeting.description || '',
        meeting.outcome_summary ? `\nOutcome: ${meeting.outcome_summary}` : '',
        (meeting.action_items || []).length > 0
          ? `\nAction Items:\n${meeting.action_items.map((a, i) => `${i + 1}. ${a.description} (Due: ${a.due_date || 'N/A'})`).join('\n')}`
          : '',
      ].join(''),
      location: meeting.location || '',
      start: {
        dateTime: meeting.start_date,
        timeZone: 'UTC',
      },
      end: {
        dateTime: meeting.end_date || meeting.start_date,
        timeZone: 'UTC',
      },
      attendees: attendeeEmails.map(email => ({ email })),
    };

    // Create event on Google Calendar
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      return Response.json({ error: 'Failed to create calendar event', details: errorBody }, { status: response.status });
    }

    const calendarEvent = await response.json();

    return Response.json({
      success: true,
      calendar_event_id: calendarEvent.id,
      calendar_event_link: calendarEvent.htmlLink,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});