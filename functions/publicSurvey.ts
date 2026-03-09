import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function calculateScores(survey, responses) {
  const questions = survey.questions || [];
  const headings = survey.headings || [];
  
  let totalScore = 0;
  let maxPossibleScore = 0;
  const categoryScores = {};

  // Initialize category scores
  headings.forEach(h => {
    categoryScores[h.id] = { title: h.title, score: 0, max: 0, pct: 0 };
  });

  for (const q of questions) {
    const answer = responses[q.id];
    const weight = q.weight || 1;
    let questionScore = 0;
    let questionMax = 0;

    if (q.type === "radio" || q.type === "dropdown") {
      // Use option_scores if defined
      if (q.option_scores && Object.keys(q.option_scores).length > 0) {
        const scores = Object.values(q.option_scores).map(Number).filter(n => !isNaN(n));
        questionMax = scores.length > 0 ? Math.max(...scores) : 0;
        if (answer && q.option_scores[answer] !== undefined) {
          questionScore = Number(q.option_scores[answer]) || 0;
        }
      }
    } else if (q.type === "checkbox") {
      if (q.option_scores && Object.keys(q.option_scores).length > 0) {
        const scores = Object.values(q.option_scores).map(Number).filter(n => !isNaN(n));
        questionMax = scores.reduce((s, v) => s + Math.max(0, v), 0);
        if (Array.isArray(answer)) {
          answer.forEach(a => {
            if (q.option_scores[a] !== undefined) {
              questionScore += Number(q.option_scores[a]) || 0;
            }
          });
        }
      }
    } else if (q.type === "rating") {
      questionMax = (q.points || 5);
      questionScore = Math.min(Number(answer) || 0, questionMax);
    } else if (q.type === "scale") {
      questionMax = q.max_value || 10;
      questionScore = Math.min(Number(answer) || 0, questionMax);
    } else if (q.type === "number") {
      questionMax = q.points || 0;
      questionScore = Math.min(Number(answer) || 0, questionMax);
    }
    // Text/textarea/file/etc. don't contribute to scoring

    const weightedScore = questionScore * weight;
    const weightedMax = questionMax * weight;

    totalScore += weightedScore;
    maxPossibleScore += weightedMax;

    if (q.category_id && categoryScores[q.category_id]) {
      categoryScores[q.category_id].score += weightedScore;
      categoryScores[q.category_id].max += weightedMax;
    }
  }

  // Calculate percentages
  Object.keys(categoryScores).forEach(key => {
    const cat = categoryScores[key];
    cat.pct = cat.max > 0 ? Math.round((cat.score / cat.max) * 100) : 0;
  });

  const scorePercentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

  return { totalScore, maxPossibleScore, scorePercentage, categoryScores };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, token, invite, responseData } = await req.json();

    if (action === "get") {
      const surveys = await base44.asServiceRole.entities.Survey.filter({ share_token: token }, '-created_date', 1);
      const survey = surveys[0] || null;
      if (!survey) {
        return Response.json({ error: "Survey not found" }, { status: 404 });
      }
      const { ai_insights, ai_insights_generated_at, ai_insights_response_count, ...surveyData } = survey;
      return Response.json({ survey: surveyData });
    }

    if (action === "submit") {
      const surveys = await base44.asServiceRole.entities.Survey.filter({ share_token: token });
      const survey = surveys[0] || null;
      if (!survey) {
        return Response.json({ error: "Survey not found" }, { status: 404 });
      }
      if (survey.status !== "active") {
        return Response.json({ error: "Survey is not accepting responses" }, { status: 400 });
      }

      let user = null;
      try { user = await base44.auth.me(); } catch (e) {}

      // Calculate scores
      const { totalScore, maxPossibleScore, scorePercentage, categoryScores } = calculateScores(survey, responseData.responses || {});

      await base44.asServiceRole.entities.SurveyResponse.create({
        survey_id: survey.id,
        respondent_user_id: user?.id || "",
        respondent_email: user?.email || "",
        respondent_name: user?.full_name || "",
        responses: responseData.responses,
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        score_percentage: scorePercentage,
        category_scores: categoryScores,
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