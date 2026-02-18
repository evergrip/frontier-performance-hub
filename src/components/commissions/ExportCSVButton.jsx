import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

function escapeCSVValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function ExportCSVButton({ data, columns, filename, variant = "outline", size = "sm", label = "Export CSV" }) {
  const handleExport = () => {
    if (!data || data.length === 0) return;

    const headerRow = columns.map(col => escapeCSVValue(col.header)).join(',');
    const dataRows = data.map(row =>
      columns.map(col => escapeCSVValue(col.accessor(row))).join(',')
    );

    const csv = [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <Button variant={variant} size={size} onClick={handleExport} disabled={!data || data.length === 0}>
      <Download className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}