import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // This function should be triggered by automation or admin only
    if (user && user.role !== 'admin') {
      return Response.json({ 
        error: 'Forbidden: Admin access required' 
      }, { status: 403 });
    }

    // Get all commission banks
    const commissionBanks = await base44.asServiceRole.entities.CommissionBank.filter({});

    if (!commissionBanks || commissionBanks.length === 0) {
      return Response.json({ 
        message: 'No commission banks found',
        processed: 0 
      });
    }

    const results = [];
    const today = new Date().toISOString().split('T')[0];

    for (const bank of commissionBanks) {
      const currentBalance = bank.current_bank_balance || 0;
      
      // Calculate new quarterly payout amount: remaining bank / 26 pay periods
      const newQuarterlyAmount = currentBalance / 26;

      // Update the commission bank
      await base44.asServiceRole.entities.CommissionBank.update(bank.id, {
        quarterly_payout_amount: newQuarterlyAmount,
        last_quarterly_calculation_date: today
      });

      results.push({
        user_id: bank.user_id,
        bank_balance: currentBalance,
        new_quarterly_payout: newQuarterlyAmount
      });
    }

    return Response.json({
      success: true,
      message: `Quarterly payouts recalculated for ${results.length} salespeople`,
      calculation_date: today,
      results
    });

  } catch (error) {
    console.error('Error recalculating quarterly payouts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});