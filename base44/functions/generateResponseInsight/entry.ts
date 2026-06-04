import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;
    if (!event || !data) {
      return Response.json({ error: 'Missing event data' }, { status: 400 });
    }

    const responseId = event.entity_id;
    const surveyId = data.survey_id;
    if (!surveyId) {
      return Response.json({ skipped: true, reason: 'No survey_id' });
    }

    // Skip if insight already exists
    if (data.ai_insight) {
      return Response.json({ skipped: true, reason: 'Insight already exists' });
    }

    // Fetch the survey
    const surveys = await base44.asServiceRole.entities.Survey.filter({ id: surveyId });
    if (!surveys || surveys.length === 0) {
      return Response.json({ error: 'Survey not found' }, { status: 404 });
    }
    const survey = surveys[0];
    const questions = survey.questions || [];
    const headings = survey.headings || [];

    const responses = data.responses || {};
    const responseData = questions
      .filter(q => {
        const a = responses[q.id];
        return a !== undefined && a !== null && a !== '';
      })
      .map(q => {
        const heading = headings.find(h => h.id === q.category_id);
        return {
          section: heading?.title || 'General',
          question: q.text,
          answer: responses[q.id],
          type: q.type,
        };
      });

    // Find respondent name from Full Name question
    const fullNameQ = questions.find(q => /full\s*name/i.test(q.text));
    const respondentName = data.respondent_name || (fullNameQ && responses[fullNameQ.id]) || 'Unknown';
    const respondentEmail = data.respondent_email || 'no email';

    const scoreInfo = data.max_possible_score > 0
      ? `\nQualification Score: ${data.total_score}/${data.max_possible_score} (${data.score_percentage}%)\nCategory Scores: ${JSON.stringify(data.category_scores || {})}`
      : '';

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a sales preparation analyst for a home improvement company called Frontier Building Group. Analyze this individual survey response and provide actionable insights for the sales team.

Survey: "${survey.title}"
Respondent: ${respondentName} (${respondentEmail})
${scoreInfo}

Response Data:
${JSON.stringify(responseData, null, 2)}

Provide a focused analysis with these sections:
1. **Client Profile Summary** — Who is this person? What do they want? 2-3 sentences.
2. **Key Pain Points & Motivations** — What matters most to them based on their answers? What past experiences shaped their expectations?
3. **Budget & Timeline Readiness** — Assess their investment readiness and urgency.
4. **Decision-Making Dynamics** — Who are the decision makers? What's the authority structure?
5. **Pillar Alignment** — Which of our core pillars (risk, design, permits, construction, communication, process) resonate most?
6. **Red Flags & Concerns** — Any warning signs or areas that need careful handling?
7. **Meeting Preparation Tips** — 3-5 specific talking points or strategies for the sales meeting with this client.

Use markdown formatting. Be specific, reference their actual answers, and keep it actionable.`,
      model: 'claude_sonnet_4_6',
    });

    // Save insight back to the response
    await base44.asServiceRole.entities.SurveyResponse.update(responseId, {
      ai_insight: result,
      ai_insight_generated_at: new Date().toISOString(),
    });

    return Response.json({ success: true, responseId });
  } catch (error) {
    console.error('Error generating response insight:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});