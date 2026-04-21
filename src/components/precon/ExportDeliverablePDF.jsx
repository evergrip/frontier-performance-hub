import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

const CURRENCY_FMT = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

export default function ExportDeliverablePDF({ stageName, config, formData, calculatedValues }) {
  const handleExport = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    // Header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(config.title || stageName, margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y);
    y += 10;

    // Line
    doc.setDrawColor(200);
    doc.line(margin, y, 190, y);
    y += 8;

    // Fields
    doc.setFontSize(10);
    for (const field of config.fields) {
      if (y > 270) { doc.addPage(); y = margin; }

      const val = field.type === 'calculated'
        ? calculatedValues?.[field.key]
        : formData?.[field.key];

      let displayVal = '';
      if (field.type === 'checkbox') {
        displayVal = val ? 'Yes' : 'No';
      } else if (field.type === 'calculated' || field.type === 'currency') {
        displayVal = typeof val === 'number' && !isNaN(val) ? CURRENCY_FMT.format(val) : '—';
      } else if (field.type === 'richtext') {
        displayVal = stripHtml(val) || '—';
      } else {
        displayVal = val?.toString() || '—';
      }

      // Label
      doc.setFont(undefined, 'bold');
      doc.text(field.label + ':', margin, y);
      y += 5;

      // Value (wrapped)
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(displayVal, 170 - margin);
      for (const line of lines) {
        if (y > 275) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 5;
      }
      y += 3;
    }

    doc.save(`${(config.title || stageName).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  return (
    <Button type="button" variant="outline" size="sm" className="text-xs" onClick={handleExport}>
      <Download className="w-3 h-3 mr-1" /> Export PDF
    </Button>
  );
}