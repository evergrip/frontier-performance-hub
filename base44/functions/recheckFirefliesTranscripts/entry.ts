import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';

async function fetchRecentTranscripts() {
  const apiKey = Deno.env.get('FIREFLIES_API_KEY');
  const query = `
    query {
      transcripts(limit: 30) {
        id
        title
        date
        duration
        transcript_url
        organizer_email
        meeting_attendees { displayName email }
        summary {
          action_items
          overview
          outline
          short_summary
          keywords
          topics_discussed
        }
      }
    }
  `;

  const res = await fetch(FIREFLIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query }),
  });

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Fireflies API error: ${JSON.stringify(json.errors)}`);
  }
  return json.data?.transcripts || [];
}

function findBestTranscriptForMeeting(meeting, transcripts) {
  const meetingTitle = (meeting.title || '').toLowerCase();
  const meetingDate = meeting.start_date ? new Date(meeting.start_date) : null;

  let bestMatch = null;
  let bestScore = 0;

  for (const transcript of transcripts) {
    let score = 0;
    const transcriptTitle = (transcript.title || '').toLowerCase();
    const transcriptDate = transcript.date ? new Date(transcript.date * 1000) : null;

    // Title matching - full containment
    if (transcriptTitle.includes(meetingTitle) || meetingTitle.includes(transcriptTitle)) {
      score += 5;
    } else {
      // Word overlap
      const tWords = transcriptTitle.split(/\s+/);
      const mWords = meetingTitle.split(/\s+/);
      const overlap = tWords.filter(w => w.length > 2 && mWords.includes(w)).length;
      score += overlap;
    }

    // Date matching
    if (transcriptDate && meetingDate) {
      const diffHours = Math.abs(transcriptDate - meetingDate) / (1000 * 60 * 60);
      if (diffHours < 2) score += 10;
      else if (diffHours < 12) score += 5;
      else if (diffHours < 24) score += 2;
    }

    // Attendee email matching
    if (transcript.meeting_attendees && meeting.attendees) {
      // We don't have user emails easily here, but organizer_email can help
      if (transcript.organizer_email) {
        score += 1; // Small boost for having organizer info
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = transcript;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Find meetings that need Fireflies recheck:
    // - invite_fireflies is true
    // - no transcript linked yet
    // - fewer than 10 recheck attempts
    const allMeetings = await base44.asServiceRole.entities.Meeting.list();
    
    const now = new Date();
    const meetingsToRecheck = allMeetings.filter(m => {
      if (!m.invite_fireflies) return false;
      if (m.fireflies_transcript_id) return false; // already linked
      if ((m.fireflies_recheck_attempts || 0) >= 10) return false; // maxed out
      
      // Only recheck meetings from the last 15 days
      const meetingDate = m.start_date ? new Date(m.start_date) : null;
      if (!meetingDate) return false;
      const daysSinceMeeting = (now - meetingDate) / (1000 * 60 * 60 * 24);
      if (daysSinceMeeting > 15 || daysSinceMeeting < 0) return false;
      
      return true;
    });

    if (meetingsToRecheck.length === 0) {
      console.log('No meetings need Fireflies recheck.');
      return Response.json({ status: 'ok', message: 'No meetings to recheck', checked: 0 });
    }

    console.log(`Found ${meetingsToRecheck.length} meeting(s) to recheck for Fireflies transcripts.`);

    // Fetch recent transcripts from Fireflies (single API call for all meetings)
    const transcripts = await fetchRecentTranscripts();
    console.log(`Fetched ${transcripts.length} recent transcripts from Fireflies.`);

    // Filter out transcripts already linked to other meetings
    const linkedTranscriptIds = new Set(
      allMeetings.filter(m => m.fireflies_transcript_id).map(m => m.fireflies_transcript_id)
    );
    const availableTranscripts = transcripts.filter(t => !linkedTranscriptIds.has(t.id));

    let matched = 0;
    let rechecked = 0;

    for (const meeting of meetingsToRecheck) {
      rechecked++;
      const matchedTranscript = findBestTranscriptForMeeting(meeting, availableTranscripts);

      const recheckUpdate = {
        fireflies_recheck_attempts: (meeting.fireflies_recheck_attempts || 0) + 1,
        fireflies_recheck_last_date: now.toISOString(),
      };

      if (matchedTranscript) {
        const summary = matchedTranscript.summary || {};
        const updateData = {
          ...recheckUpdate,
          fireflies_transcript_id: matchedTranscript.id,
          fireflies_transcript_url: matchedTranscript.transcript_url || '',
          fireflies_summary: summary.overview || summary.short_summary || '',
          fireflies_action_items: summary.action_items || '',
          fireflies_minutes: summary.outline || '',
          fireflies_synced_at: now.toISOString(),
        };

        if (!meeting.outcome_summary && (summary.overview || summary.short_summary)) {
          updateData.outcome_summary = summary.overview || summary.short_summary;
        }

        await base44.asServiceRole.entities.Meeting.update(meeting.id, updateData);
        console.log(`✅ Matched transcript "${matchedTranscript.title}" → meeting "${meeting.title}" (attempt ${recheckUpdate.fireflies_recheck_attempts})`);
        matched++;

        // Remove from available pool so we don't double-match
        const idx = availableTranscripts.findIndex(t => t.id === matchedTranscript.id);
        if (idx >= 0) availableTranscripts.splice(idx, 1);
      } else {
        await base44.asServiceRole.entities.Meeting.update(meeting.id, recheckUpdate);
        console.log(`❌ No match for meeting "${meeting.title}" (attempt ${recheckUpdate.fireflies_recheck_attempts}/10)`);
      }
    }

    return Response.json({ 
      status: 'ok', 
      rechecked, 
      matched,
      message: `Rechecked ${rechecked} meeting(s), matched ${matched}.`
    });

  } catch (error) {
    console.error('Fireflies recheck error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});