import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, token, invite, responseData } = await req.json();

    if (action === "get") {
      // Fetch survey by share_token using service role (no auth needed)
      const surveys = await base44.asServiceRole.entities.Survey.filter({ share_token: token }, '-created_date', 1);
      const survey = surveys[0] || null;
      if (!survey) {
        return Response.json({ error: "Survey not found" }, { status: 404 });
      }
      // Return only fields needed for rendering, strip heavy analytics
      const { ai_insights, ai_insights_generated_at, ai_insights_response_count, ...surveyData } = survey;
      return Response.json({ survey: surveyData });
    }

    if (action === "submit") {
      // Submit a response using service role
      const surveys = await base44.asServiceRole.entities.Survey.filter({ share_token: token });
      const survey = surveys[0] || null;
      if (!survey) {
        return Response.json({ error: "Survey not found" }, { status: 404 });
      }
      if (survey.status !== "active") {
        return Response.json({ error: "Survey is not accepting responses" }, { status: 400 });
      }

      // Try to get user info if logged in
      let user = null;
      try { user = await base44.auth.me(); } catch (e) {}

      await base44.asServiceRole.entities.SurveyResponse.create({
        survey_id: survey.id,
        respondent_user_id: user?.id || "",
        respondent_email: user?.email || "",
        respondent_name: user?.full_name || "",
        responses: responseData.responses,
        invitation_token: invite || "",
        submitted_at: new Date().toISOString(),
        completion_time_seconds: responseData.completion_time_seconds || 0,
        is_complete: true,
      });

      await base44.asServiceRole.entities.Survey.update(survey.id, {
        total_responses: (survey.total_responses || 0) + 1,
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});