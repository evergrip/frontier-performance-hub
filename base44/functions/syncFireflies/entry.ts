import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';

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
    body: JSON.stringify({ query, variables: { transcriptId } }),
  });

  const json = await res.json();
  if (json.errors) throw new Error(`Fireflies API error: ${JSON.stringify(json.errors)}`);
  return json.data?.transcript;
}

async function fetchRecentTranscripts() {
  const apiKey = Deno.env.get('FIREFLIES_API_KEY');
  const query = `
    query {
      transcripts(limit: 20) {
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
  if (json.errors) throw new Error(`Fireflies API error: ${JSON.stringify(json.errors)}`);
  return json.data?.transcripts || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { meeting_id, transcript_id } = body;

    // Case 1: Sync a specific transcript to a specific meeting
    if (meeting_id && transcript_id) {
      const transcript = await fetchTranscriptFromFireflies(transcript_id);
      if (!transcript) return Response.json({ error: 'Transcript not found on Fireflies' }, { status: 404 });

      const summary = transcript.summary || {};
      const updateData = {
        fireflies_transcript_id: transcript.id,
        fireflies_transcript_url: transcript.transcript_url || '',
        fireflies_summary: summary.overview || summary.short_summary || '',
        fireflies_action_items: summary.action_items || '',
        fireflies_minutes: summary.outline || '',
        fireflies_synced_at: new Date().toISOString(),
      };

      await base44.asServiceRole.entities.Meeting.update(meeting_id, updateData);
      return Response.json({ status: 'success', transcript_title: transcript.title });
    }

    // Case 2: Fetch recent transcripts list for the user to pick from
    const transcripts = await fetchRecentTranscripts();
    return Response.json({ 
      status: 'success', 
      transcripts: transcripts.map(t => {
        // Fireflies date could be epoch seconds or already a date string
        let dateStr = null;
        if (t.date) {
          const d = typeof t.date === 'number' ? new Date(t.date * 1000) : new Date(t.date);
          if (!isNaN(d.getTime()) && d.getFullYear() < 3000) {
            dateStr = d.toISOString();
          }
        }
        return {
          id: t.id,
          title: t.title,
          date: dateStr,
          duration: t.duration,
          transcript_url: t.transcript_url,
          has_summary: !!(t.summary?.overview || t.summary?.short_summary),
          has_action_items: !!t.summary?.action_items,
        };
      })
    });

  } catch (error) {
    console.error('Sync Fireflies error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});