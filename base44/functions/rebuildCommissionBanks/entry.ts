import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all transactions and users (for anniversary-based YTD filtering)
    const allTransactions = await base44.asServiceRole.entities.CommissionTransaction.list();
    const allUsers = await base44.asServiceRole.entities.User.list();
    const sortedTransactions = [...allTransactions].sort((a, b) => 
      new Date(a.created_date) - new Date(b.created_date)
    );

    // Build a map of user anniversary windows
    const userAnniversaryStart = {};
    for (const u of allUsers) {
      if (u.commission_start_date) {
        const start = new Date(u.commission_start_date);
        const startMonth = start.getUTCMonth();
        const startDay = start.getUTCDate();
        const now = new Date();
        // Find the most recent anniversary date
        let anniversaryYear = now.getUTCFullYear();
        let anniversary = new Date(Date.UTC(anniversaryYear, startMonth, startDay));
        if (anniversary > now) {
          anniversaryYear--;
          anniversary = new Date(Date.UTC(anniversaryYear, startMonth, startDay));
        }
        userAnniversaryStart[u.id] = anniversary;
      }
    }

    // Aggregate in memory first, then write once per bank
    const bankAggregates = {};

    for (const transaction of sortedTransactions) {
      const userId = transaction.user_id;
      if (!userId) continue;

      if (!bankAggregates[userId]) {
        bankAggregates[userId] = {
          total_earned: 0,
          current_bank_balance: 0,
          available_balance: 0,
          ytd_sales_volume: 0,
          ytd_construction_volume: 0,
          ytd_preconstruction_volume: 0,
        };
      }

      // Determine if this transaction is within the user's current anniversary year
      const anniversaryStart = userAnniversaryStart[userId];
      const txDate = new Date(transaction.created_date);
      const isInCurrentYear = anniversaryStart ? txDate >= anniversaryStart : true;

      const agg = bankAggregates[userId];
      const amount = transaction.amount || 0;
      const bankedAmount = transaction.banked_amount || 0;
      const saleAmount = transaction.sale_amount || 0;
      const saleType = transaction.sale_type;
      const txType = transaction.transaction_type;

      if (txType === 'phase_commission') {
        // Phase releases TRANSFER money from banked to available (no new earnings)
        const released = transaction.amount_made_available || 0;
        agg.current_bank_balance -= released;
        agg.available_balance += released;
      } else {
        // sale_commission, adjustment, bonus, etc: new earnings
        const immediateAvailable = transaction.immediate_payout_amount || 0;
        
        // If banked_amount is null/undefined (historical/manual entries), 
        // the full amount minus immediate payout goes to banked
        const effectiveBanked = (transaction.banked_amount != null) 
          ? transaction.banked_amount 
          : (amount - immediateAvailable);
        
        agg.total_earned += amount;
        agg.current_bank_balance += effectiveBanked;
        agg.available_balance += immediateAvailable;
        // Only count towards YTD if within current anniversary year
        if (isInCurrentYear) {
          agg.ytd_sales_volume += saleAmount;
          if (saleType === 'construction') agg.ytd_construction_volume += saleAmount;
          if (saleType === 'preconstruction') agg.ytd_preconstruction_volume += saleAmount;
        }
      }
    }

    // Now write each bank once
    const allBanks = await base44.asServiceRole.entities.CommissionBank.list();
    const results = [];
    const errors = [];

    for (const bank of allBanks) {
      try {
        const agg = bankAggregates[bank.user_id];
        if (agg) {
          // Phase releases move money FROM banked TO available, so subtract from bank balance
          const adjustedBankBalance = agg.current_bank_balance;
          
          await base44.asServiceRole.entities.CommissionBank.update(bank.id, {
            total_earned: agg.total_earned,
            current_bank_balance: adjustedBankBalance,
            available_balance: agg.available_balance,
            ytd_sales_volume: agg.ytd_sales_volume,
            ytd_construction_volume: agg.ytd_construction_volume,
            ytd_preconstruction_volume: agg.ytd_preconstruction_volume,
          });
          results.push({
            user_id: bank.user_id,
            total_earned: agg.total_earned,
            bank_balance: adjustedBankBalance,
            available: agg.available_balance,
            math_check: `${agg.total_earned.toFixed(2)} = ${adjustedBankBalance.toFixed(2)} (banked) + ${agg.available_balance.toFixed(2)} (available) + ${(bank.total_paid_out || 0).toFixed(2)} (paid) = ${(adjustedBankBalance + agg.available_balance + (bank.total_paid_out || 0)).toFixed(2)}`
          });
        } else {
          // No transactions for this user, zero out
          await base44.asServiceRole.entities.CommissionBank.update(bank.id, {
            total_earned: 0,
            current_bank_balance: 0,
            available_balance: 0,
            ytd_sales_volume: 0,
            ytd_construction_volume: 0,
            ytd_preconstruction_volume: 0,
          });
          results.push({ user_id: bank.user_id, total_earned: 0, bank_balance: 0, available: 0 });
        }
        await sleep(200);
      } catch (error) {
        errors.push({ user_id: bank.user_id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      message: 'Commission banks rebuilt from transaction records',
      banks_updated: results.length,
      transactions_processed: sortedTransactions.length,
      results,
      errors
    });

  } catch (error) {
    console.error('Rebuild error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});