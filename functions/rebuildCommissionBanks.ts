import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Reset all commission banks to zero
    const allBanks = await base44.asServiceRole.entities.CommissionBank.list();
    for (const bank of allBanks) {
      await base44.asServiceRole.entities.CommissionBank.update(bank.id, {
        total_earned: 0,
        current_bank_balance: 0,
        available_balance: 0,
        ytd_sales_volume: 0,
        ytd_construction_volume: 0,
        ytd_preconstruction_volume: 0
      });
    }

    // Get all transactions sorted by date
    const allTransactions = await base44.asServiceRole.entities.CommissionTransaction.list();
    const sortedTransactions = [...allTransactions].sort((a, b) => 
      new Date(a.created_date) - new Date(b.created_date)
    );

    const results = [];
    const errors = [];

    // Rebuild banks from actual transaction records (including edited ones)
    for (const transaction of sortedTransactions) {
      try {
        const userId = transaction.user_id;
        if (!userId) {
          errors.push({ transaction_id: transaction.id, error: 'No user_id' });
          continue;
        }

        // Get or create commission bank
        let banks = await base44.asServiceRole.entities.CommissionBank.filter({ user_id: userId });
        let commissionBank = banks[0];

        if (!commissionBank) {
          commissionBank = await base44.asServiceRole.entities.CommissionBank.create({
            user_id: userId,
            total_earned: 0,
            current_bank_balance: 0,
            available_balance: 0,
            total_paid_out: 0,
            ytd_sales_volume: 0,
            ytd_construction_volume: 0,
            ytd_preconstruction_volume: 0,
          });
        }

        // Add transaction amounts to bank
        const amount = transaction.amount || 0;
        const bankedAmount = transaction.banked_amount || 0;
        const availableAmount = transaction.immediate_payout_amount || transaction.amount_made_available || 0;
        const saleAmount = transaction.sale_amount || 0;
        const saleType = transaction.sale_type;

        await base44.asServiceRole.entities.CommissionBank.update(commissionBank.id, {
          total_earned: (commissionBank.total_earned || 0) + amount,
          current_bank_balance: (commissionBank.current_bank_balance || 0) + bankedAmount,
          available_balance: (commissionBank.available_balance || 0) + availableAmount,
          ytd_sales_volume: (commissionBank.ytd_sales_volume || 0) + saleAmount,
          ytd_construction_volume: (commissionBank.ytd_construction_volume || 0) + 
            (saleType === 'construction' ? saleAmount : 0),
          ytd_preconstruction_volume: (commissionBank.ytd_preconstruction_volume || 0) + 
            (saleType === 'preconstruction' ? saleAmount : 0),
        });

        // Update for next iteration
        commissionBank = (await base44.asServiceRole.entities.CommissionBank.filter({ user_id: userId }))[0];

        results.push({
          transaction_id: transaction.id,
          user_id: userId,
          amount: amount,
          banked: bankedAmount,
          available: availableAmount,
        });

      } catch (error) {
        errors.push({ transaction_id: transaction.id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      message: 'Commission banks rebuilt from transaction records',
      processed: results.length,
      errors: errors.length,
      results,
      errors
    });

  } catch (error) {
    console.error('Rebuild error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});