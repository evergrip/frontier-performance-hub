import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, DollarSign, Lightbulb } from 'lucide-react';

export default function RecurringPayoutDialog({ open, onOpenChange, bank, userName, onSave, isSaving }) {
  const [amount, setAmount] = useState('');
  const [nextDate, setNextDate] = useState('');

  useEffect(() => {
    if (bank) {
      setAmount(bank.recurring_payout_amount || '');
      setNextDate(bank.next_payout_date || '');
    }
  }, [bank]);

  const suggestedAmount = bank ? Math.round((bank.available_balance || 0) / 26) : 0;

  const handleSave = () => {
    onSave({
      bankId: bank.id,
      recurring_payout_amount: parseFloat(amount) || 0,
      next_payout_date: nextDate || null
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Recurring Payout — {userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Current balances */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-xs text-slate-500">Banked</p>
              <p className="text-lg font-bold text-amber-600">${(bank?.current_bank_balance || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <p className="text-xs text-slate-500">Available</p>
              <p className="text-lg font-bold text-emerald-600">${(bank?.available_balance || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Suggested amount */}
          {suggestedAmount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Lightbulb className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-blue-800">
                  Suggested: <span className="font-bold">${suggestedAmount.toLocaleString()}</span>/pay period
                  <span className="text-blue-600 ml-1">(available ÷ 26)</span>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => setAmount(suggestedAmount)}
              >
                Use
              </Button>
            </div>
          )}

          {/* Current recurring settings */}
          {bank?.recurring_payout_amount > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Current recurring payout</p>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  ${(bank.recurring_payout_amount || 0).toLocaleString()} / pay period
                </Badge>
                {bank.next_payout_date && (
                  <span className="text-xs text-slate-500">
                    Next: {new Date(bank.next_payout_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Amount input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Payout Amount Per Pay Period
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-slate-500">Set to 0 to stop recurring payouts</p>
          </div>

          {/* Next payout date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Next Payout Date
            </Label>
            <Input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              After this date, the system advances by 14 days automatically each pay period
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
          >
            {isSaving ? 'Saving...' : 'Save Recurring Payout'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}