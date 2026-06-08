import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Flag, AlertTriangle, Edit2, Eye, Shield } from 'lucide-react';
import { format } from 'date-fns';
import SaleStatusTag from './SaleStatusTag';

function DiscrepancyIndicator({ txAmount, saleAmount }) {
  if (!txAmount || !saleAmount) return null;
  const diff = Math.abs(txAmount - saleAmount);
  if (diff <= 1) return null;
  return (
    <div className="flex items-center gap-1 text-amber-600">
      <AlertTriangle className="w-3 h-3" />
      <span className="text-[10px] font-medium">
        Δ ${Math.round(diff).toLocaleString()}
      </span>
    </div>
  );
}

function VerifiedBadge({ tx }) {
  if (tx.verified) {
    return (
      <div className="flex items-center gap-1 text-emerald-600" title={`Verified ${tx.verified_date ? format(new Date(tx.verified_date), 'MMM d') : ''}`}>
        <CheckCircle2 className="w-4 h-4" />
      </div>
    );
  }
  if (tx.flagged_for_review) {
    return (
      <div className="flex items-center gap-1 text-amber-600" title={tx.flag_notes || 'Flagged for review'}>
        <Flag className="w-4 h-4" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-slate-300" title="Not verified">
      <Shield className="w-4 h-4" />
    </div>
  );
}

export default function AuditTransactionTable({ 
  transactions, 
  allUsers,
  onVerify, 
  onFlag, 
  onEdit, 
  onViewDetail 
}) {
  const getUserName = (userId) => {
    const u = allUsers?.find(u => u.id === userId);
    return u?.full_name || 'Unknown';
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Date</TableHead>
            <TableHead>Sale / Project</TableHead>
            <TableHead>Status Tag</TableHead>
            <TableHead className="text-right">Sale Value</TableHead>
            <TableHead className="text-right">Commission</TableHead>
            <TableHead className="text-center">Tier</TableHead>
            <TableHead className="text-center">Verified</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const rowClass = tx.isOrphaned 
              ? 'border-l-4 border-l-red-400 bg-red-50/30' 
              : tx.hasDiscrepancy 
                ? 'border-l-4 border-l-amber-400 bg-amber-50/30'
                : tx.flagged_for_review
                  ? 'border-l-4 border-l-amber-400 bg-amber-50/20'
                  : tx.verified
                    ? 'border-l-4 border-l-emerald-400'
                    : '';

            return (
              <TableRow key={tx.id} className={`hover:bg-slate-50 ${rowClass}`}>
                <TableCell className="text-xs text-slate-600">
                  {format(new Date(tx.created_date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                      {tx.saleName || '-'}
                    </p>
                    <p className="text-[10px] text-slate-500 capitalize">
                      {tx.transaction_type?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <SaleStatusTag tagKey={tx.statusTag} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      ${Math.round(tx.sale_amount || 0).toLocaleString()}
                    </p>
                    {tx.currentSaleValue != null && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500">
                          Current: ${Math.round(tx.currentSaleValue).toLocaleString()}
                        </p>
                        <DiscrepancyIndicator txAmount={tx.sale_amount} saleAmount={tx.currentSaleValue} />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-semibold text-slate-900">
                    ${tx.amount?.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-xs text-slate-600">{tx.tier_at_time || '-'}</span>
                </TableCell>
                <TableCell className="text-center">
                  <VerifiedBadge tx={tx} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!tx.verified && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700" title="Verify" onClick={() => onVerify(tx)}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700" title="Flag" onClick={() => onFlag(tx)}>
                      <Flag className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-600 hover:text-slate-700" title="Edit" onClick={() => onEdit(tx)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600" title="View Details" onClick={() => onViewDetail(tx)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-slate-500 py-12">
                No transactions found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}