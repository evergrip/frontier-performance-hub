import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function evaluateVisibility(question, responses) {
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
    if (!evaluateVisibility(q, responses)) continue;

    const answer = responses[q.id];
    const weight = q.weight || 1;
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
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Fetch all surveys
  const surveys = await base44.asServiceRole.entities.Survey.filter({});
  const surveyMap = {};
  for (const s of surveys) surveyMap[s.id] = s;

  // Fetch all responses
  const allResponses = await base44.asServiceRole.entities.SurveyResponse.filter({});

  let updated = 0;
  let skipped = 0;
  const details = [];

  for (const resp of allResponses) {
    const survey = surveyMap[resp.survey_id];
    if (!survey) { skipped++; continue; }

    const { totalScore, maxPossibleScore, scorePercentage, categoryScores } = calculateScores(survey, resp.responses || {});

    const changed = resp.total_score !== totalScore || resp.max_possible_score !== maxPossibleScore || resp.score_percentage !== scorePercentage;

    if (changed) {
      await base44.asServiceRole.entities.SurveyResponse.update(resp.id, {
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        score_percentage: scorePercentage,
        category_scores: categoryScores,
      });
      details.push({
        response_id: resp.id,
        survey: survey.title,
        old: { score: resp.total_score, max: resp.max_possible_score, pct: resp.score_percentage },
        new: { score: totalScore, max: maxPossibleScore, pct: scorePercentage },
      });
      updated++;
    } else {
      skipped++;
    }
  }

  return Response.json({ updated, skipped, total: allResponses.length, details });
});