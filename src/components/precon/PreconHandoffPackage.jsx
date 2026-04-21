import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Package, Loader2, Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import CONFIGS from './deliverableFormConfigs';
import { evaluateFormula } from './calcEngine';

const CURRENCY_FMT = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

/**
 * Generates a comprehensive PDF handoff package containing all stage data.
 */
function buildHandoffPDF(stages, progressMap, leadData, clientData) {
  const doc = new jsPDF();
  const margin = 15;
  let y = margin;

  const addPage = () => { doc.addPage(); y = margin; };
  const checkPage = (need = 20) => { if (y > 280 - need) addPage(); };

  // ── Cover Page ──
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('Pre-Construction', margin, 50);
  doc.text('Handoff Package', margin, 62);

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Project: ${leadData?.title || 'N/A'}`, margin, 80);
  doc.text(`Client: ${clientData?.contact_name || 'N/A'}`, margin, 88);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, 96);

  // Progress summary
  const completedStages = stages.filter(s => progressMap[s.id]?.status === 'complete');
  const skippedStages = stages.filter(s => progressMap[s.id]?.status === 'skipped');
  doc.text(`Stages Complete: ${completedStages.length} / ${stages.length}`, margin, 112);
  doc.text(`Stages Skipped: ${skippedStages.length}`, margin, 120);

  doc.setDrawColor(200);
  doc.line(margin, 130, 195, 130);

  // ── Table of Contents ──
  addPage();
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Table of Contents', margin, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  stages.forEach(stage => {
    const status = progressMap[stage.id]?.status || 'not_started';
    const statusLabel = status === 'complete' ? '✓' : status === 'skipped' ? '—' : '○';
    checkPage(6);
    doc.text(`${statusLabel}  ${stage.stage_order}. ${stage.stage_name}`, margin, y);
    y += 5;
  });

  // ── Stage Details ──
  stages.forEach(stage => {
    const prog = progressMap[stage.id];
    const status = prog?.status || 'not_started';
    if (status === 'skipped') return;

    addPage();
    // Stage header
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Stage ${stage.stage_order}: ${stage.stage_name}`, margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Status: ${status.replace(/_/g, ' ').toUpperCase()}`, margin, y);
    if (prog?.completed_at) {
      doc.text(`  |  Completed: ${new Date(prog.completed_at).toLocaleDateString()}`, margin + 50, y);
    }
    y += 4;
    doc.setDrawColor(200);
    doc.line(margin, y, 195, y);
    y += 6;

    // Deliverable notes/URL
    if (prog?.deliverable_notes) {
      checkPage(12);
      doc.setFont(undefined, 'bold');
      doc.text('Deliverable Notes:', margin, y); y += 5;
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(prog.deliverable_notes, 170);
      for (const line of lines) { checkPage(5); doc.text(line, margin, y); y += 4; }
      y += 3;
    }
    if (prog?.deliverable_url) {
      checkPage(8);
      doc.setFont(undefined, 'bold');
      doc.text('Deliverable URL:', margin, y); y += 5;
      doc.setFont(undefined, 'normal');
      doc.text(prog.deliverable_url, margin, y); y += 6;
    }

    // Form data
    const config = CONFIGS[stage.stage_order];
    const fd = prog?.form_data || {};
    if (config && Object.keys(fd).length > 0) {
      checkPage(8);
      doc.setFont(undefined, 'bold');
      doc.text('Form Data:', margin, y); y += 6;

      for (const field of config.fields) {
        checkPage(12);
        let val = fd[field.key];
        if (field.type === 'calculated' && field.formula) {
          val = evaluateFormula(field.formula, fd);
          val = typeof val === 'number' && !isNaN(val) ? (field.label.includes('$') ? CURRENCY_FMT.format(val) : val.toFixed(2)) : '—';
        } else if (field.type === 'checkbox') {
          val = val ? 'Yes' : 'No';
        } else if (field.type === 'currency') {
          val = typeof val === 'number' ? CURRENCY_FMT.format(val) : (val || '—');
        } else if (field.type === 'richtext') {
          val = stripHtml(val) || '—';
        } else {
          val = val?.toString() || '—';
        }

        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        doc.text(field.label + ':', margin, y); y += 4;
        doc.setFont(undefined, 'normal');
        const wrappedLines = doc.splitTextToSize(val, 170);
        for (const line of wrappedLines) { checkPage(4); doc.text(line, margin + 2, y); y += 3.5; }
        y += 2;
        doc.setFontSize(9);
      }
    }

    // Attachments
    const atts = prog?.attachments || [];
    if (atts.length > 0) {
      checkPage(10);
      doc.setFont(undefined, 'bold');
      doc.text(`Attachments (${atts.length}):`, margin, y); y += 5;
      doc.setFont(undefined, 'normal');
      atts.forEach(att => {
        checkPage(5);
        doc.text(`• ${att.name}`, margin + 2, y);
        doc.setTextColor(0, 100, 200);
        doc.text(att.url, margin + 2, y + 3.5);
        doc.setTextColor(0, 0, 0);
        y += 8;
      });
    }
  });

  return doc;
}

export default function PreconHandoffPackage({ stages, progressMap, leadData, clientData }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const doc = buildHandoffPDF(stages, progressMap, leadData, clientData);
      const projectName = (leadData?.title || 'Project').replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`PreCon_Handoff_${projectName}_${new Date().toISOString().slice(0, 10)}.pdf`);
      setGenerating(false);
      toast.success('Handoff package generated!');
    }, 100);
  };

  const completedCount = stages.filter(s => progressMap[s.id]?.status === 'complete').length;
  const allComplete = completedCount === stages.length;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-indigo-900">Production Handoff Package</h4>
            <p className="text-xs text-indigo-600">
              {allComplete
                ? 'All stages complete — ready to generate!'
                : `${completedCount}/${stages.length} stages complete`
              }
            </p>
          </div>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-indigo-600 hover:bg-indigo-700 text-xs"
          size="sm"
        >
          {generating ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Generating...</>
          ) : (
            <><Download className="w-3.5 h-3.5 mr-1" /> Generate Package</>
          )}
        </Button>
      </div>
    </div>
  );
}