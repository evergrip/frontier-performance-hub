import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

const TAG_CONFIG = {
  open_precon: { label: 'Open Precon', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  converted_precon: { label: 'Converted/Closed Precon', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  lost_precon: { label: 'Lost Precon', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  open_construction: { label: 'Open Construction', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  closed_construction: { label: 'Closed/Final Construction', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  orphaned: { label: 'Orphaned', className: 'bg-red-100 text-red-800 border-red-200' },
  adjustment: { label: 'Adjustment', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  unknown: { label: 'Unknown', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export function getSaleStatusTag(transaction, sale, project) {
  // Non-sale transactions
  if (transaction.transaction_type === 'adjustment' || transaction.transaction_type === 'correction_debit') {
    return 'adjustment';
  }
  if (transaction.transaction_type === 'bonus') {
    return 'adjustment';
  }

  // Orphaned: has sale_id but sale doesn't exist
  if (transaction.sale_id && !sale) {
    return 'orphaned';
  }

  // No sale linked
  if (!sale) {
    return 'adjustment';
  }

  const txType = transaction.sale_type || sale.sale_type;

  if (txType === 'preconstruction') {
    if (sale.status === 'closed_won' || sale.converted_to_project_id) {
      return 'converted_precon';
    }
    if (sale.status === 'closed_lost') {
      return 'lost_precon';
    }
    return 'open_precon';
  }

  if (txType === 'construction') {
    if (project && project.status === 'closed') {
      return 'closed_construction';
    }
    return 'open_construction';
  }

  return 'unknown';
}

export default function SaleStatusTag({ tagKey }) {
  const config = TAG_CONFIG[tagKey] || TAG_CONFIG.unknown;
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold whitespace-nowrap ${config.className}`}>
      {tagKey === 'orphaned' && <AlertTriangle className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
}