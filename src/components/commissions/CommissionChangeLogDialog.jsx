import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, User, FileText, ArrowRight, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const EVENT_STYLES = {
  sale_commission: { label: 'Commission Created', color: 'bg-emerald-100 text-emerald-800', icon: DollarSign },
  phase_commission: { label: 'Phase Release', color: 'bg-blue-100 text-blue-800', icon: ArrowRight },
  adjustment: { label: 'Adjustment', color: 'bg-amber-100 text-amber-800', icon: AlertCircle },
  bonus: { label: 'Bonus', color: 'bg-purple-100 text-purple-800', icon: CheckCircle2 },
  manual_edit: { label: 'Manual Edit', color: 'bg-red-100 text-red-800', icon: User },
};

function buildTimeline(transactions, sales) {
  const events = [];

  for (const t of transactions) {
    const saleName = getSaleNameFromList(t.sale_id, t.sale_type, sales);

    // 1. Transaction creation event
    events.push({
      type: 'transaction',
      eventType: t.transaction_type,
      timestamp: t.created_date,
      saleName,
      saleType: t.sale_type,
      amount: t.amount,
      saleAmount: t.sale_amount,
      phaseName: t.phase_name,
      tierAtTime: t.tier_at_time,
      bankedAmount: t.banked_amount,
      availableAmount: t.amount_made_available,
      immediatePayout: t.immediate_payout_amount,
      bankingPercentage: t.banking_percentage,
      phasePayoutPercentage: t.phase_payout_percentage,
      notes: t.notes,
      status: t.status,
      createdBy: t.created_by,
    });

    // 2. Audit log entries (manual edits)
    if (t.audit_log?.length > 0) {
      for (const entry of t.audit_log) {
        events.push({
          type: 'audit',
          eventType: 'manual_edit',
          timestamp: entry.timestamp,
          saleName,
          saleType: t.sale_type,
          editedBy: entry.edited_by,
          changes: entry.changes,
          note: entry.note,
          amount: t.amount,
        });
      }
    }
  }

  // Sort newest first
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return events;
}

function getSaleNameFromList(saleId, saleType, sales) {
  if (!saleId) return '';
  const sale = sales.find(s => s.id === saleId);
  if (!sale) return 'Unknown Sale';
  return `${sale.title}${saleType ? ` (${saleType})` : ''}`;
}

function formatCurrency(val) {
  if (val == null || val === 0) return null;
  return `$${Math.round(val).toLocaleString()}`;
}

function TransactionEvent({ event }) {
  const style = EVENT_STYLES[event.eventType] || EVENT_STYLES.adjustment;
  const Icon = style.icon;

  return (
    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Badge className={`${style.color} text-xs`}>{style.label}</Badge>
        {event.saleType && (
          <Badge variant="outline" className="text-xs capitalize">{event.saleType}</Badge>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500">
            {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
          </span>
        </div>
      </div>

      {/* Sale name */}
      {event.saleName && (
        <p className="text-xs text-slate-500 mb-2">
          Sale: <span className="font-medium text-slate-700">{event.saleName}</span>
        </p>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
        {event.eventType === 'sale_commission' && (
          <>
            {formatCurrency(event.saleAmount) && (
              <Detail label="Sale Value" value={formatCurrency(event.saleAmount)} />
            )}
            {formatCurrency(event.amount) && (
              <Detail label="Commission" value={formatCurrency(event.amount)} highlight />
            )}
            {event.tierAtTime && (
              <Detail label="Tier" value={event.tierAtTime} />
            )}
            {formatCurrency(event.bankedAmount) && (
              <Detail label="Banked" value={formatCurrency(event.bankedAmount)} />
            )}
            {formatCurrency(event.immediatePayout) && (
              <Detail label="Immediate Payout" value={formatCurrency(event.immediatePayout)} />
            )}
            {event.bankingPercentage != null && (
              <Detail label="Banking %" value={`${event.bankingPercentage}%`} />
            )}
          </>
        )}
        {event.eventType === 'phase_commission' && (
          <>
            {event.phaseName && (
              <Detail label="Phase" value={event.phaseName.replace(/_/g, ' ')} />
            )}
            {formatCurrency(event.availableAmount) && (
              <Detail label="Made Available" value={formatCurrency(event.availableAmount)} highlight />
            )}
            {event.phasePayoutPercentage != null && (
              <Detail label="Release %" value={`${event.phasePayoutPercentage}%`} />
            )}
          </>
        )}
        {event.eventType === 'adjustment' && (
          <>
            {formatCurrency(event.amount) && (
              <Detail label="Amount" value={formatCurrency(event.amount)} highlight />
            )}
            {formatCurrency(event.availableAmount) && (
              <Detail label="Made Available" value={formatCurrency(event.availableAmount)} />
            )}
          </>
        )}
        {event.eventType === 'bonus' && (
          <>
            {formatCurrency(event.amount) && (
              <Detail label="Bonus Amount" value={formatCurrency(event.amount)} highlight />
            )}
          </>
        )}
      </div>

      {/* Notes */}
      {event.notes && (
        <div className="bg-white rounded p-2 border border-slate-100">
          <p className="text-xs text-slate-600 whitespace-pre-wrap">{event.notes}</p>
        </div>
      )}
    </div>
  );
}

function AuditEvent({ event }) {
  const style = EVENT_STYLES.manual_edit;

  return (
    <div className="p-3 bg-red-50/50 rounded-lg border border-red-100">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Badge className={`${style.color} text-xs`}>{style.label}</Badge>
        {event.saleType && (
          <Badge variant="outline" className="text-xs capitalize">{event.saleType}</Badge>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500">
            {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <User className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-700">{event.editedBy}</span>
      </div>

      {event.saleName && (
        <p className="text-xs text-slate-500 mb-2">
          Sale: <span className="font-medium text-slate-700">{event.saleName}</span>
        </p>
      )}

      <div className="bg-white rounded p-2 border border-red-100 mb-2">
        <p className="text-xs text-slate-600 font-medium mb-1">Changes:</p>
        <p className="text-xs text-slate-700 whitespace-pre-wrap">{event.changes}</p>
      </div>

      {event.note && (
        <p className="text-xs text-slate-600 italic">Note: {event.note}</p>
      )}
    </div>
  );
}

function Detail({ label, value, highlight }) {
  return (
    <div className="bg-white rounded px-2 py-1 border border-slate-100">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className={`text-xs font-semibold ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

export default function CommissionChangeLogDialog({ open, onOpenChange, userId, userName, sales = [] }) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['commissionTransactionsForLog', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await base44.entities.CommissionTransaction.filter({ user_id: userId }, '-created_date');
    },
    enabled: open && !!userId,
  });

  const timeline = buildTimeline(transactions, sales);

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
          <p className="text-xs text-slate-500 mt-1">
            Full history of commissions earned, phase releases, adjustments, and manual edits
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading && (
            <div className="text-center py-8 text-slate-500 text-sm">Loading change log...</div>
          )}

          {!isLoading && timeline.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No commission activity found</p>
            </div>
          )}

          {timeline.map((event, idx) => (
            event.type === 'audit' 
              ? <AuditEvent key={`audit-${idx}`} event={event} />
              : <TransactionEvent key={`tx-${idx}`} event={event} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}