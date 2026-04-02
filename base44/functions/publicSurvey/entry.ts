import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function evaluateVisibility(question, responses, allQuestions) {
  // Check logic_rules — if any exist, ALL must pass for the question to be visible
  const rules = question.logic_rules;
  if (!rules || rules.length === 0) return true;

  return rules.every(rule => {
    const condAnswer = responses[rule.condition_question_id];
    let conditionMet = false;

    switch (rule.operator) {
      case 'equals':
        conditionMet = String(condAnswer) === String(rule.value);
        break;
      case 'not_equals':
        conditionMet = String(condAnswer) !== String(rule.value);
        break;
      case 'contains':
        if (Array.isArray(condAnswer)) conditionMet = condAnswer.includes(rule.value);
        else conditionMet = String(condAnswer || '').includes(rule.value);
        break;
      case 'not_contains':
        if (Array.isArray(condAnswer)) conditionMet = !condAnswer.includes(rule.value);
        else conditionMet = !String(condAnswer || '').includes(rule.value);
        break;
      case 'greater_than':
        conditionMet = Number(condAnswer) > Number(rule.value);
        break;
      case 'less_than':
        conditionMet = Number(condAnswer) < Number(rule.value);
        break;
      case 'is_answered':
        conditionMet = condAnswer !== undefined && condAnswer !== null && condAnswer !== '' && (!Array.isArray(condAnswer) || condAnswer.length > 0);
        break;
      case 'is_not_answered':
        conditionMet = condAnswer === undefined || condAnswer === null || condAnswer === '' || (Array.isArray(condAnswer) && condAnswer.length === 0);
        break;
      default:
        conditionMet = true;
    }

    return rule.logic_type === 'show' ? conditionMet : !conditionMet;
  });
}

function scoreQuestion(q, answer) {
  let questionScore = 0;
  let questionMax = 0;

  if (q.type === 'scale' && q.option_scores && Object.keys(q.option_scores).length > 0) {
    // Scale with explicit option_scores — use those instead of raw value
    const vals = Object.values(q.option_scores).map(Number).filter(n => !isNaN(n));
    questionMax = vals.length > 0 ? Math.max(...vals) : (q.max_value || 10);
    const key = String(answer);
    if (answer != null && q.option_scores[key] !== undefined) {
      questionScore = Number(q.option_scores[key]) || 0;
    }
  } else if (q.type === 'radio' || q.type === 'dropdown') {
    if (q.option_scores && Object.keys(q.option_scores).length > 0) {
      const vals = Object.values(q.option_scores).map(Number).filter(n => !isNaN(n));
      questionMax = vals.length > 0 ? Math.max(...vals) : 0;
      if (answer && q.option_scores[answer] !== undefined) {
        questionScore = Number(q.option_scores[answer]) || 0;
      }
    }
  } else if (q.type === 'checkbox') {
    if (q.option_scores && Object.keys(q.option_scores).length > 0) {
      const vals = Object.values(q.option_scores).map(Number).filter(n => !isNaN(n));
      questionMax = vals.reduce((s, v) => s + Math.max(0, v), 0);
      if (Array.isArray(answer)) {
        answer.forEach(a => {
          if (q.option_scores[a] !== undefined) questionScore += Number(q.option_scores[a]) || 0;
        });
      }
    }
  } else if (q.type === 'rating') {
    questionMax = q.points || 5;
    questionScore = Math.min(Number(answer) || 0, questionMax);
  } else if (q.type === 'scale') {
    questionMax = q.max_value || 10;
    questionScore = Math.min(Number(answer) || 0, questionMax);
  } else if (q.type === 'number') {
    questionMax = q.points || 0;
    questionScore = Math.min(Number(answer) || 0, questionMax);
  }

  return { questionScore, questionMax };
}

function calculateScores(survey, responses) {
  const questions = survey.questions || [];
  const headings = survey.headings || [];

  let totalScore = 0;
  let maxPossibleScore = 0;
  const categoryScores = {};

  headings.forEach(h => {
    categoryScores[h.id] = { title: h.title, score: 0, max: 0, pct: 0 };
  });

  for (const q of questions) {
    const answer = responses[q.id];
    const weight = q.weight || 1;

    // Skip questions that were not visible to the respondent
    if (!evaluateVisibility(q, responses, questions)) continue;

    const { questionScore, questionMax } = scoreQuestion(q, answer);

    const weightedScore = questionScore * weight;
    const weightedMax = questionMax * weight;

    totalScore += weightedScore;
    maxPossibleScore += weightedMax;

    if (q.category_id && categoryScores[q.category_id]) {
      categoryScores[q.category_id].score += weightedScore;
      categoryScores[q.category_id].max += weightedMax;
    }
  }

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
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) user = await base44.auth.me();
      } catch (e) {}

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

      // Send alert emails if configured
      const alertRecipients = survey.alert_recipients || [];
      if (alertRecipients.length > 0) {
        const responses = responseData.responses || {};
        const questions = survey.questions || [];
        const includedQIds = survey.alert_include_question_ids || [];

        // Helper to resolve a single answer by question ID
        const getAnswer = (qId) => {
          const val = responses[qId];
          return Array.isArray(val) ? val.join(', ') : (val || '(no answer)');
        };

        // Build highlighted answers table HTML
        let answersTableHtml = '';
        if (includedQIds.length > 0) {
          const rows = includedQIds.map(qId => {
            const q = questions.find(qq => qq.id === qId);
            if (!q) return null;
            return `<tr><td style="padding:6px 12px;font-weight:600;color:#333645;white-space:nowrap;vertical-align:top;">${q.text}</td><td style="padding:6px 12px;color:#1e293b;">${getAnswer(qId)}</td></tr>`;
          }).filter(Boolean);
          if (rows.length > 0) {
            answersTableHtml = `<table style="border-collapse:collapse;margin:16px 0;width:100%;">${rows.join('')}</table>`;
          }
        }

        // Replace placeholders in a string
        const resolvePlaceholders = (text) => {
          let result = text;
          result = result.replace(/\{\{survey_title\}\}/g, survey.title || '');
          result = result.replace(/\{\{total_responses\}\}/g, String((survey.total_responses || 0) + 1));
          result = result.replace(/\{\{answers_table\}\}/g, answersTableHtml);
          // Replace {{answer:QUESTION_ID}} placeholders
          result = result.replace(/\{\{answer:([^}]+)\}\}/g, (_, qId) => getAnswer(qId.trim()));
          return result;
        };

        // Determine subject and body
        const customSubject = survey.alert_subject?.trim();
        const customBody = survey.alert_body?.trim();

        const emailSubject = customSubject
          ? resolvePlaceholders(customSubject)
          : `New Response: ${survey.title}`;

        let emailBody;
        if (customBody) {
          // Convert newlines to <br> for HTML and resolve placeholders
          emailBody = `
            <div style="font-family:'Work Sans',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:linear-gradient(135deg,#333645,#ea7924);padding:24px 32px;border-radius:12px 12px 0 0;">
                <h2 style="color:#fff;margin:0;font-size:18px;">${emailSubject}</h2>
              </div>
              <div style="background:#ffffff;padding:24px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
                ${resolvePlaceholders(customBody).replace(/\n/g, '<br>')}
              </div>
            </div>`;
        } else {
          emailBody = `
            <div style="font-family:'Work Sans',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:linear-gradient(135deg,#333645,#ea7924);padding:24px 32px;border-radius:12px 12px 0 0;">
                <h2 style="color:#fff;margin:0;font-size:18px;">New Survey Response</h2>
              </div>
              <div style="background:#ffffff;padding:24px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
                <p style="color:#333645;font-size:15px;margin:0 0 4px;">A new response was submitted for:</p>
                <p style="color:#ea7924;font-size:17px;font-weight:600;margin:0 0 16px;">${survey.title}</p>
                ${answersTableHtml}
                <p style="color:#64748b;font-size:13px;margin:16px 0 0;">Total responses: ${(survey.total_responses || 0) + 1}</p>
              </div>
            </div>`;
        }

        const emailPromises = alertRecipients.map(email =>
          base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: emailSubject,
            body: emailBody,
            from_name: 'Frontier Survey Alerts'
          }).catch(err => console.error('Alert email failed for', email, err.message))
        );
        await Promise.all(emailPromises);
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});