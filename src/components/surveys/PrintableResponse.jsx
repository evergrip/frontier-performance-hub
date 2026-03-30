import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import moment from "moment";

export default function PrintableResponse({ survey, response, responseNumber }) {

  const handlePrint = () => {
    const questions = survey.questions || [];
    const r = response;
    const hasScoring = r.max_possible_score > 0;

    const answersHtml = questions.map(q => {
      const answer = r.responses?.[q.id];
      let answerText = "No answer";
      if (answer !== undefined && answer !== null && answer !== "") {
        if (Array.isArray(answer)) {
          if (q.type === "ranking") {
            answerText = answer.map((item, i) => `${i + 1}. ${item}`).join("<br/>");
          } else if (q.type === "file_upload") {
            answerText = `${answer.length} file(s) uploaded`;
          } else {
            answerText = answer.join(", ");
          }
        } else if (q.type === "rating") {
          answerText = `${answer} / 5 stars`;
        } else {
          answerText = String(answer);
        }
      }

      return `
        <div style="margin-bottom: 16px; page-break-inside: avoid;">
          <div style="font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">${q.text}${q.required ? ' *' : ''}</div>
          <div style="font-size: 13px; color: #1e293b; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">${answerText}</div>
        </div>
      `;
    }).join("");

    const scoreHtml = hasScoring ? `
      <div style="margin-bottom: 20px; padding: 12px 16px; background: #fef3c7; border-radius: 8px; border: 1px solid #fde68a;">
        <strong>Score:</strong> ${r.total_score} / ${r.max_possible_score} (${r.score_percentage}%)
        ${r.category_scores ? Object.entries(r.category_scores).map(([k, cat]) =>
          `<br/><span style="color: #6b7280; font-size: 12px;">• ${cat.title || k}: ${cat.score}/${cat.max} (${cat.pct}%)</span>`
        ).join("") : ""}
      </div>
    ` : "";

    // Convert markdown AI insight to simple HTML for print
    const aiInsight = r.ai_insight;
    let aiHtml = "";
    if (aiInsight) {
      const converted = aiInsight
        .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;margin:12px 0 6px;color:#1e293b;">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 style="font-size:15px;font-weight:700;margin:14px 0 6px;color:#1e293b;">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 style="font-size:16px;font-weight:700;margin:16px 0 8px;color:#1e293b;">$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li style="margin-left:16px;font-size:13px;">$1</li>')
        .replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left:16px;font-size:13px;">$2</li>')
        .replace(/\n\n/g, '<br/><br/>');

      aiHtml = `
        <div style="margin-top: 28px; page-break-before: auto;">
          <div style="border-bottom: 2px solid #7c3aed; padding-bottom: 8px; margin-bottom: 16px;">
            <h2 style="margin: 0; font-size: 16px; color: #7c3aed;">AI Analysis</h2>
            ${r.ai_insight_generated_at ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Generated ${moment(r.ai_insight_generated_at).format("MMMM D, YYYY h:mm A")}</div>` : ""}
          </div>
          <div style="font-size: 13px; color: #334155; line-height: 1.6;">
            ${converted}
          </div>
        </div>
      `;
    }

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${survey.title} - Response #${responseNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 24px; color: #1e293b; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div style="border-bottom: 2px solid #ea7924; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="margin: 0 0 4px; font-size: 20px; color: #0f172a;">${survey.title}</h1>
          <div style="font-size: 13px; color: #64748b;">
            Response #${responseNumber}
            ${r.respondent_name ? ` &mdash; ${r.respondent_name}` : ""}
            ${r.respondent_email ? ` (${r.respondent_email})` : ""}
          </div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
            Submitted: ${moment(r.submitted_at || r.created_date).format("MMMM D, YYYY h:mm A")}
          </div>
        </div>
        ${scoreHtml}
        ${answersHtml}
        ${aiHtml}
        <div style="margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
          Printed on ${moment().format("MMMM D, YYYY h:mm A")}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600" onClick={handlePrint} title="Print this response">
      <Printer className="w-3.5 h-3.5" />
    </Button>
  );
}