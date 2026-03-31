import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const surveys = await base44.asServiceRole.entities.Survey.filter({ title: 'Frontier Home Improvement Discovery Survey' });
  const survey = surveys[0];
  if (!survey) return Response.json({ error: 'Survey not found' });

  const headings = survey.headings || [];
  const questions = survey.questions || [];

  const targetSections = headings.filter(h => 
    h.title.toLowerCase().includes('priorit')
  );

  const sections = targetSections.map(h => {
    const sectionQuestions = questions.filter(q => q.category_id === h.id);
    return {
      heading_id: h.id,
      heading_title: h.title,
      heading_max_score: h.max_score,
      question_count: sectionQuestions.length,
      questions: sectionQuestions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        weight: q.weight,
        points: q.points,
        option_scores: q.option_scores,
        options: q.options,
        has_logic_rules: (q.logic_rules || []).length > 0,
        is_followup: q.is_followup,
        min_value: q.min_value,
        max_value: q.max_value,
      }))
    };
  });

  const allHeadings = [];

  return Response.json({ allHeadings, sections });
});