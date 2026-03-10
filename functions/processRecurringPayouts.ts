import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    const banks = await base44.asServiceRole.entities.CommissionBank.filter({});
    const results = [];
    const skipped = [];

    for (const bank of banks) {
      const amount = bank.recurring_payout_amount || 0;
      const nextDate = bank.next_payout_date;

      // Skip if no recurring amount set or no next date
      if (amount <= 0 || !nextDate) {
        continue;
      }

      // Skip if next payout date is in the future
      if (nextDate > today) {
        continue;
      }

      const available = bank.available_balance || 0;

      // Skip if nothing available
      if (available <= 0) {
        skipped.push({
          user_id: bank.user_id,
          reason: 'No available balance',
          recurring_amount: amount
        });
        continue;
      }

      // Pay the set amount (or whatever is available if less)
      const payoutAmount = Math.min(amount, available);

      // Create the payout record
      await base44.asServiceRole.entities.CommissionPayout.create({
        user_id: bank.user_id,
        payout_type: 'regular_period',
        amount: payoutAmount,
        payout_date: today,
        status: 'paid',
        bank_balance_before: available,
        bank_balance_after: available - payoutAmount,
        notes: `Recurring biweekly payout (set amount: $${amount})`
      });

      // Advance next_payout_date by 14 days
      const nextPayoutDate = new Date(nextDate);
      nextPayoutDate.setDate(nextPayoutDate.getDate() + 14);
      const newNextDate = nextPayoutDate.toISOString().split('T')[0];

      // Update the bank
      await base44.asServiceRole.entities.CommissionBank.update(bank.id, {
        available_balance: available - payoutAmount,
        total_paid_out: (bank.total_paid_out || 0) + payoutAmount,
        next_payout_date: newNextDate
      });

      results.push({
        user_id: bank.user_id,
        amount_paid: payoutAmount,
        previous_available: available,
        new_available: available - payoutAmount,
        next_payout_date: newNextDate
      });
    }

    return Response.json({
      success: true,
      processed: results.length,
      skipped: skipped.length,
      date: today,
      results,
      skipped_details: skipped
    });

  } catch (error) {
    console.error('Error processing recurring payouts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});