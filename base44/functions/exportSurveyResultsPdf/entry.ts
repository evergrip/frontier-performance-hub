import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { survey_id } = await req.json();
  if (!survey_id) return Response.json({ error: 'Missing survey_id' }, { status: 400 });

  const surveys = await base44.entities.Survey.filter({ id: survey_id });
  const survey = surveys[0];
  if (!survey) return Response.json({ error: 'Survey not found' }, { status: 404 });

  const responses = await base44.entities.SurveyResponse.filter({ survey_id });
  const questions = survey.questions || [];

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPage = (needed) => {
    if (y + needed > 270) { doc.addPage(); y = 20; }
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(survey.title || 'Survey Results', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()} | ${responses.length} responses | ${questions.length} questions`, margin, y);
  doc.setTextColor(0);
  y += 6;

  // Avg completion time
  const avgTime = responses.length > 0
    ? Math.round(responses.reduce((s, r) => s + (r.completion_time_seconds || 0), 0) / responses.length)
    : 0;
  doc.text(`Average completion time: ${avgTime > 60 ? Math.round(avgTime / 60) + ' min' : avgTime + ' sec'}`, margin, y);
  y += 12;

  // AI Insights section (if available)
  if (survey.ai_insights) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Analysis', margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // Parse markdown-ish text into lines for PDF
    const insightLines = (survey.ai_insights || '').split('\n');
    for (const line of insightLines) {
      const trimmed = line.trim();
      if (!trimmed) { y += 3; continue; }

      checkPage(8);

      if (trimmed.startsWith('# ')) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const wrapped = doc.splitTextToSize(trimmed.replace(/^# /, ''), contentWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 6 + 2;
      } else if (trimmed.startsWith('## ')) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const wrapped = doc.splitTextToSize(trimmed.replace(/^## /, ''), contentWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5 + 2;
      } else if (trimmed.startsWith('### ')) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const wrapped = doc.splitTextToSize(trimmed.replace(/^### /, ''), contentWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 4.5 + 2;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const bullet = trimmed.replace(/^[-*] /, '').replace(/\*\*(.+?)\*\*/g, '$1');
        const wrapped = doc.splitTextToSize('• ' + bullet, contentWidth - 8);
        doc.text(wrapped, margin + 4, y);
        y += wrapped.length * 4 + 1;
      } else if (/^\d+\. /.test(trimmed)) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const cleaned = trimmed.replace(/\*\*(.+?)\*\*/g, '$1');
        const wrapped = doc.splitTextToSize(cleaned, contentWidth - 8);
        doc.text(wrapped, margin + 4, y);
        y += wrapped.length * 4 + 1;
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const cleaned = trimmed.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
        const wrapped = doc.splitTextToSize(cleaned, contentWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 4 + 1;
      }
    }

    y += 6;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
  }

  // Section header for question breakdown
  checkPage(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Results Breakdown', margin, y);
  y += 10;

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Questions
  for (const question of questions) {
    const answers = responses.map(r => r.responses?.[question.id]).filter(a => a !== undefined && a !== null && a !== '');
    const responseRate = responses.length > 0 ? Math.round((answers.length / responses.length) * 100) : 0;

    checkPage(40);

    // Question text
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const qLines = doc.splitTextToSize(question.text || 'Untitled Question', contentWidth - 40);
    doc.text(qLines, margin, y);
    
    // Response rate
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130);
    doc.text(`${responseRate}% answered (${answers.length}/${responses.length})`, pageWidth - margin, y, { align: 'right' });
    doc.setTextColor(0);
    y += qLines.length * 5 + 4;

    // Radio/Dropdown
    if (['radio', 'dropdown'].includes(question.type)) {
      const counts = {};
      answers.forEach(a => { counts[a] = (counts[a] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const max = Math.max(...Object.values(counts), 1);

      for (const [opt, count] of sorted) {
        checkPage(10);
        doc.setFontSize(9);
        const label = opt.length > 30 ? opt.substring(0, 30) + '...' : opt;
        doc.text(label, margin + 2, y);

        // Bar
        const barX = margin + 70;
        const barW = contentWidth - 90;
        doc.setFillColor(240, 240, 240);
        doc.rect(barX, y - 3.5, barW, 4.5, 'F');
        doc.setFillColor(234, 121, 36);
        doc.rect(barX, y - 3.5, barW * (count / max), 4.5, 'F');

        doc.text(`${count}`, pageWidth - margin, y, { align: 'right' });
        y += 7;
      }
      y += 4;
    }
    // Checkbox
    else if (question.type === 'checkbox') {
      const counts = {};
      answers.forEach(arr => {
        (Array.isArray(arr) ? arr : []).forEach(a => { counts[a] = (counts[a] || 0) + 1; });
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const max = Math.max(...Object.values(counts), 1);

      for (const [opt, count] of sorted) {
        checkPage(10);
        doc.setFontSize(9);
        const label = opt.length > 30 ? opt.substring(0, 30) + '...' : opt;
        doc.text(label, margin + 2, y);

        const barX = margin + 70;
        const barW = contentWidth - 90;
        doc.setFillColor(240, 240, 240);
        doc.rect(barX, y - 3.5, barW, 4.5, 'F');
        doc.setFillColor(234, 121, 36);
        doc.rect(barX, y - 3.5, barW * (count / max), 4.5, 'F');

        doc.text(`${count}`, pageWidth - margin, y, { align: 'right' });
        y += 7;
      }
      y += 4;
    }
    // Rating/Scale/Number
    else if (['rating', 'scale', 'number'].includes(question.type)) {
      const nums = answers.map(Number).filter(n => !isNaN(n));
      const avg = nums.length > 0 ? (nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(1) : '—';
      const min = nums.length > 0 ? Math.min(...nums) : '—';
      const max = nums.length > 0 ? Math.max(...nums) : '—';

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(234, 121, 36);
      doc.text(`${avg}`, margin + 2, y + 2);
      doc.setTextColor(0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`average (min: ${min}, max: ${max}, ${nums.length} responses)`, margin + 20, y + 2);
      y += 12;
    }
    // Text-based
    else if (question.type !== 'file_upload') {
      const textAnswers = answers.slice(0, 5);
      doc.setFontSize(9);
      for (const a of textAnswers) {
        checkPage(12);
        const txt = String(a);
        const lines = doc.splitTextToSize(txt.length > 150 ? txt.substring(0, 150) + '...' : txt, contentWidth - 10);
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, y - 3.5, contentWidth, lines.length * 4.5 + 2, 'F');
        doc.text(lines, margin + 4, y);
        y += lines.length * 4.5 + 4;
      }
      if (answers.length > 5) {
        doc.setFontSize(8);
        doc.setTextColor(130);
        doc.text(`+${answers.length - 5} more responses`, margin + 2, y);
        doc.setTextColor(0);
        y += 6;
      }
      y += 2;
    }
    // File upload
    else {
      const total = answers.flat().length;
      doc.setFontSize(9);
      doc.text(`${total} file(s) uploaded`, margin + 2, y);
      y += 8;
    }

    // Separator
    checkPage(6);
    doc.setDrawColor(230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  }

  const pdfBytes = doc.output('arraybuffer');

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${(survey.title || 'survey').replace(/[^a-zA-Z0-9]/g, '_')}_results.pdf"`,
    },
  });
});