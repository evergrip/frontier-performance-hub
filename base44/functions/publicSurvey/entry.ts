import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function evaluateVisibility(question, responses, allQuestions) {
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

function generateResumeToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { action, token, invite, responseData, resumeToken } = body;

    const cleanHeaders = new Headers(req.headers);
    cleanHeaders.delete('Authorization');
    cleanHeaders.delete('authorization');
    const base44 = createClientFromRequest(new Request(req.url, {
      method: req.method,
      headers: cleanHeaders,
      body: JSON.stringify(body),
    }));

    // Try to get authenticated user once (reuse across actions)
    let authenticatedUser = null;
    try {
      const origHeaders = new Headers(req.headers);
      const hasAuth = origHeaders.has('Authorization') || origHeaders.has('authorization');
      if (hasAuth) {
        const origBase44 = createClientFromRequest(new Request(req.url, {
          method: req.method,
          headers: origHeaders,
          body: JSON.stringify(body),
        }));
        authenticatedUser = await origBase44.auth.me();
      }
    } catch (_e) { /* Not authenticated — expected for public surveys */ }

    if (action === "get") {
      const surveys = await base44.asServiceRole.entities.Survey.filter({ share_token: token }, '-created_date', 1);
      const survey = surveys[0] || null;
      if (!survey) {
        return Response.json({ error: "Survey not found" }, { status: 404 });
      }
      const { ai_insights, ai_insights_generated_at, ai_insights_response_count, ...surveyData } = survey;
      return Response.json({ survey: surveyData });
    }

    // Load an in-progress response (for resuming)
    if (action === "load_progress") {
      const surveys = await base44.asServiceRole.entities.Survey.filter({ share_token: token }, '-created_date', 1);
      const survey = surveys[0] || null;
      if (!survey) {
        return Response.json({ error: "Survey not found" }, { status: 404 });
      }

      let existing = null;

      // Try by explicit response_id first (staff editing on behalf)
      const responseId = body.response_id;
      if (responseId) {
        const byId = await base44.asServiceRole.entities.SurveyResponse.filter(
          { id: responseId, survey_id: survey.id, status: 'in_progress' },
          '-updated_date', 1
        );
        existing = byId[0] || null;
      }

      // Try by resume_token (anonymous users)
      if (!existing && resumeToken) {
        const byToken = await base44.asServiceRole.entities.SurveyResponse.filter(
          { survey_id: survey.id, resume_token: resumeToken, status: 'in_progress' },
          '-updated_date', 1
        );
        existing = byToken[0] || null;
      }

      // Try by authenticated user
      if (!existing && authenticatedUser) {
        const byUser = await base44.asServiceRole.entities.SurveyResponse.filter(
          { survey_id: survey.id, respondent_user_id: authenticatedUser.id, status: 'in_progress' },
          '-updated_date', 1
        );
        existing = byUser[0] || null;
      }

      if (existing) {
        return Response.json({
          found: true,
          response_id: existing.id,
          responses: existing.responses || {},
          resume_token: existing.resume_token || '',
        });
      }

      return Response.json({ found: false });
    }

    // Save progress (create or update in-progress response)
    if (action === "save_progress") {
      const surveys = await base44.asServiceRole.entities.Survey.filter({ share_token: token }, '-created_date', 1);
      const survey = surveys[0] || null;
      if (!survey) {
        return Response.json({ error: "Survey not found" }, { status: 404 });
      }

      const responseId = body.response_id;
      const responses = responseData?.responses || {};

      if (responseId) {
        // Update existing in-progress response
        await base44.asServiceRole.entities.SurveyResponse.update(responseId, {
          responses,
          status: 'in_progress',
          is_complete: false,
        });
        return Response.json({ success: true, response_id: responseId });
      } else {
        // Create new in-progress response
        const newResumeToken = generateResumeToken();
        const created = await base44.asServiceRole.entities.SurveyResponse.create({
          survey_id: survey.id,
          respondent_user_id: authenticatedUser?.id || '',
          respondent_email: authenticatedUser?.email || '',
          respondent_name: authenticatedUser?.full_name || '',
          responses,
          resume_token: newResumeToken,
          invitation_token: invite || '',
          status: 'in_progress',
          is_complete: false,
        });
        return Response.json({ success: true, response_id: created.id, resume_token: newResumeToken });
      }
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

      // Validate required questions are answered
      const responses = responseData.responses || {};
      const questions = survey.questions || [];
      const missingRequired = [];
      for (const q of questions) {
        if (!q.required) continue;
        if (!evaluateVisibility(q, responses, questions)) continue;
        const a = responses[q.id];
        const isEmpty = a === undefined || a === null || a === '' ||
          (Array.isArray(a) && a.length === 0) || a === '__other__';
        if (isEmpty) {
          missingRequired.push(q.text || q.id);
        }
      }
      if (missingRequired.length > 0) {
        return Response.json({
          error: `Please answer all required questions. Missing: ${missingRequired.join(', ')}`,
          missing_count: missingRequired.length,
        }, { status: 400 });
      }

      const { totalScore, maxPossibleScore, scorePercentage, categoryScores } = calculateScores(survey, responses);

      const responseId = body.response_id;

      if (responseId) {
        // Finalize an existing in-progress response
        await base44.asServiceRole.entities.SurveyResponse.update(responseId, {
          responses,
          total_score: totalScore,
          max_possible_score: maxPossibleScore,
          score_percentage: scorePercentage,
          category_scores: categoryScores,
          submitted_at: new Date().toISOString(),
          completion_time_seconds: responseData.completion_time_seconds || 0,
          is_complete: true,
          status: 'submitted',
        });
      } else {
        // Create a new completed response directly
        await base44.asServiceRole.entities.SurveyResponse.create({
          survey_id: survey.id,
          respondent_user_id: authenticatedUser?.id || "",
          respondent_email: authenticatedUser?.email || "",
          respondent_name: authenticatedUser?.full_name || "",
          responses,
          total_score: totalScore,
          max_possible_score: maxPossibleScore,
          score_percentage: scorePercentage,
          category_scores: categoryScores,
          invitation_token: invite || "",
          submitted_at: new Date().toISOString(),
          completion_time_seconds: responseData.completion_time_seconds || 0,
          is_complete: true,
          status: 'submitted',
        });
      }

      await base44.asServiceRole.entities.Survey.update(survey.id, {
        total_responses: (survey.total_responses || 0) + 1,
      });

      // Send alert emails if configured
      const alertRecipients = survey.alert_recipients || [];
      if (alertRecipients.length > 0) {
        const responses = responseData.responses || {};
        const questions = survey.questions || [];
        const includedQIds = survey.alert_include_question_ids || [];

        const getAnswer = (qId) => {
          const val = responses[qId];
          return Array.isArray(val) ? val.join(', ') : (val || '(no answer)');
        };

        // Build respondent info section
        const respondentName = authenticatedUser?.full_name || '';
        const respondentEmail = authenticatedUser?.email || '';
        let respondentInfoHtml = '';
        if (respondentName || respondentEmail) {
          respondentInfoHtml = `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:16px;">
            <p style="margin:0 0 4px;font-weight:600;color:#333645;font-size:13px;">Respondent</p>
            ${respondentName ? `<p style="margin:0;color:#475569;font-size:14px;">${respondentName}</p>` : ''}
            ${respondentEmail ? `<p style="margin:0;color:#475569;font-size:14px;">${respondentEmail}</p>` : ''}
          </div>`;
        }

        // Build all answers table for default email
        let allAnswersTableHtml = '';
        const allAnswerRows = questions
          .filter(q => responses[q.id] !== undefined && responses[q.id] !== null && responses[q.id] !== '')
          .map(q => `<tr><td style="padding:6px 12px;font-weight:600;color:#333645;white-space:nowrap;vertical-align:top;border-bottom:1px solid #f1f5f9;">${q.text}</td><td style="padding:6px 12px;color:#1e293b;border-bottom:1px solid #f1f5f9;">${getAnswer(q.id)}</td></tr>`)
          .filter(Boolean);
        if (allAnswerRows.length > 0) {
          allAnswersTableHtml = `<table style="border-collapse:collapse;margin:16px 0;width:100%;">${allAnswerRows.join('')}</table>`;
        }

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

        const resolvePlaceholders = (text) => {
          let result = text;
          result = result.replace(/\{\{survey_title\}\}/g, survey.title || '');
          result = result.replace(/\{\{total_responses\}\}/g, String((survey.total_responses || 0) + 1));
          result = result.replace(/\{\{answers_table\}\}/g, answersTableHtml);
          result = result.replace(/\{\{answer:([^}]+)\}\}/g, (_, qId) => getAnswer(qId.trim()));
          return result;
        };

        const customSubject = survey.alert_subject?.trim();
        const customBody = survey.alert_body?.trim();

        const emailSubject = customSubject
          ? resolvePlaceholders(customSubject)
          : `New Response: ${survey.title}`;

        let emailBody;
        if (customBody) {
          emailBody = `
            <div style="font-family:'Work Sans',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:linear-gradient(135deg,#333645,#ea7924);padding:24px 32px;border-radius:12px 12px 0 0;">
                <h2 style="color:#fff;margin:0;font-size:18px;">${emailSubject}</h2>
              </div>
              <div style="background:#ffffff;padding:24px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
                ${respondentInfoHtml}
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
                ${respondentInfoHtml}
                ${includedQIds.length > 0 ? answersTableHtml : allAnswersTableHtml}
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