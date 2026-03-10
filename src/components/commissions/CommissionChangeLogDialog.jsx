import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, User, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function CommissionChangeLogDialog({ open, onOpenChange, userId, userName, sales = [] }) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['commissionTransactionsForLog', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await base44.entities.CommissionTransaction.filter({ user_id: userId }, '-created_date');
    },
    enabled: open && !!userId,
  });

  // Collect all audit log entries across all transactions
  const allAuditEntries = transactions
    .filter(t => t.audit_log && t.audit_log.length > 0)
    .flatMap(t => 
      t.audit_log.map(entry => ({
        ...entry,
        transactionId: t.id,
        transactionType: t.transaction_type,
        saleId: t.sale_id,
        saleType: t.sale_type,
        amount: t.amount,
      }))
    )
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const getSaleName = (saleId, saleType) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return saleId ? 'Unknown Sale' : '';
    return `${sale.title}${saleType ? ` (${saleType})` : ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            Commission Change Log
            {userName && (
              <Badge variant="outline" className="ml-2 font-normal">
                {userName}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading && (
            <div className="text-center py-8 text-slate-500 text-sm">Loading change log...</div>
          )}

          {!isLoading && allAuditEntries.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No changes have been made to commission records</p>
            </div>
          )}

          {allAuditEntries.map((entry, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">{entry.edited_by}</span>
                <Clock className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                <span className="text-xs text-slate-500">
                  {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                </span>
              </div>

              {entry.saleId && (
                <p className="text-xs text-slate-500 mb-1">
                  Sale: <span className="font-medium text-slate-700">{getSaleName(entry.saleId, entry.saleType)}</span>
                </p>
              )}

              <div className="bg-white rounded p-2 border border-slate-100 mb-2">
                <p className="text-xs text-slate-600 font-medium mb-1">Changes:</p>
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{entry.changes}</p>
              </div>

              {entry.note && (
                <p className="text-xs text-slate-600 italic">
                  Note: {entry.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}