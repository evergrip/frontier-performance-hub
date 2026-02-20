import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';

async function verifyWebhookSignature(payload, signature, secret) {
  if (!secret || !signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === signature;
}

async function fetchTranscriptFromFireflies(transcriptId) {
  const apiKey = Deno.env.get('FIREFLIES_API_KEY');
  const query = `
    query Transcript($transcriptId: String!) {
      transcript(id: $transcriptId) {
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
    body: JSON.stringify({
      query,
      variables: { transcriptId },
    }),
  });

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Fireflies API error: ${JSON.stringify(json.errors)}`);
  }
  return json.data?.transcript;
}

function findMatchingMeeting(meetings, transcript) {
  // Try to match by title similarity and date proximity
  const transcriptDate = transcript.date ? new Date(transcript.date * 1000) : null;
  const transcriptTitle = (transcript.title || '').toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const meeting of meetings) {
    let score = 0;
    const meetingTitle = (meeting.title || '').toLowerCase();

    // Title matching
    if (transcriptTitle.includes(meetingTitle) || meetingTitle.includes(transcriptTitle)) {
      score += 5;
    } else {
      // Check for word overlap
      const tWords = transcriptTitle.split(/\s+/);
      const mWords = meetingTitle.split(/\s+/);
      const overlap = tWords.filter(w => w.length > 2 && mWords.includes(w)).length;
      score += overlap;
    }

    // Date matching (within 24 hours)
    if (transcriptDate && meeting.start_date) {
      const meetingDate = new Date(meeting.start_date);
      const diffHours = Math.abs(transcriptDate - meetingDate) / (1000 * 60 * 60);
      if (diffHours < 2) score += 10;
      else if (diffHours < 12) score += 5;
      else if (diffHours < 24) score += 2;
    }

    // Check if meeting already has this transcript
    if (meeting.fireflies_transcript_id === transcript.id) {
      return meeting; // Exact match
    }

    // Prefer meetings without a transcript already linked
    if (!meeting.fireflies_transcript_id && score > bestScore) {
      bestScore = score;
      bestMatch = meeting;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
}

Deno.serve(async (req) => {
  // Handle the webhook from Fireflies
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
  }

  try {
    const rawBody = await req.text();
    
    // Verify webhook signature if secret is set
    const secret = Deno.env.get('FIREFLIES_WEBHOOK_SECRET');
    const signature = req.headers.get('x-hub-signature');
    if (secret && signature) {
      const valid = await verifyWebhookSignature(rawBody, signature, secret);
      if (!valid) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const { meetingId, eventType } = payload;

    if (!meetingId) {
      return Response.json({ error: 'Missing meetingId' }, { status: 400 });
    }

    // Use service role since this is a webhook (no user auth)
    const base44 = createClientFromRequest(req);

    // Fetch the transcript details from Fireflies
    const transcript = await fetchTranscriptFromFireflies(meetingId);
    if (!transcript) {
      return Response.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Find matching meeting in our system
    const allMeetings = await base44.asServiceRole.entities.Meeting.list();
    const matchingMeeting = findMatchingMeeting(allMeetings, transcript);

    if (!matchingMeeting) {
      console.log(`No matching meeting found for Fireflies transcript: ${transcript.title}`);
      return Response.json({ 
        status: 'no_match', 
        message: `No matching meeting found for transcript: ${transcript.title}`,
        transcript_id: transcript.id 
      });
    }

    // Build update data
    const summary = transcript.summary || {};
    const updateData = {
      fireflies_transcript_id: transcript.id,
      fireflies_transcript_url: transcript.transcript_url || '',
      fireflies_summary: summary.overview || summary.short_summary || '',
      fireflies_action_items: summary.action_items || '',
      fireflies_minutes: summary.outline || '',
      fireflies_synced_at: new Date().toISOString(),
    };

    // If the meeting has no outcome_summary yet, fill it from Fireflies
    if (!matchingMeeting.outcome_summary && updateData.fireflies_summary) {
      updateData.outcome_summary = updateData.fireflies_summary;
    }

    // Update the meeting
    await base44.asServiceRole.entities.Meeting.update(matchingMeeting.id, updateData);

    console.log(`Synced Fireflies transcript "${transcript.title}" → meeting "${matchingMeeting.title}"`);

    return Response.json({ 
      status: 'success', 
      meeting_id: matchingMeeting.id,
      meeting_title: matchingMeeting.title,
      transcript_id: transcript.id
    });

  } catch (error) {
    console.error('Fireflies webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});