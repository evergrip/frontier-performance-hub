import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all commission transactions
    const allTransactions = await base44.asServiceRole.entities.CommissionTransaction.list();
    const saleCommissions = allTransactions.filter(t => t.transaction_type === 'sale_commission' && t.sale_id);

    const results = [];
    const errors = [];

    // Reset all commission banks to zero
    const allBanks = await base44.asServiceRole.entities.CommissionBank.list();
    for (const bank of allBanks) {
      await base44.asServiceRole.entities.CommissionBank.update(bank.id, {
        total_earned: 0,
        current_bank_balance: 0,
        ytd_sales_volume: 0
      });
    }

    // Process each sale commission transaction
    for (const transaction of saleCommissions) {
      try {
        // Get the sale
        const sales = await base44.asServiceRole.entities.Sale.filter({ id: transaction.sale_id });
        const sale = sales[0];

        if (!sale || !sale.assigned_to) {
          errors.push({ transaction_id: transaction.id, error: 'Sale not found or no salesperson' });
          continue;
        }

        // Get salesperson
        const users = await base44.asServiceRole.entities.User.filter({ id: sale.assigned_to });
        const salesperson = users[0];

        if (!salesperson || !salesperson.commission_rule_ids?.length) {
          errors.push({ transaction_id: transaction.id, error: 'No commission rules assigned' });
          continue;
        }

        // Get all commission rules
        const allRules = await base44.asServiceRole.entities.CommissionRule.filter({ 
          id: { $in: salesperson.commission_rule_ids }
        });

        // Find correct rule based on sale_type
        const sale_type = transaction.sale_type || sale.sale_type;
        let commissionRule = allRules.find(rule => 
          rule.sale_type === sale_type || rule.sale_type === 'both'
        );

        if (!commissionRule) {
          commissionRule = allRules[0];
        }

        if (!commissionRule || !commissionRule.tiers?.length) {
          errors.push({ transaction_id: transaction.id, error: 'No valid commission rule found' });
          continue;
        }

        // Get or create commission bank
        let banks = await base44.asServiceRole.entities.CommissionBank.filter({ user_id: sale.assigned_to });
        let commissionBank = banks[0];

        if (!commissionBank) {
          commissionBank = await base44.asServiceRole.entities.CommissionBank.create({
            user_id: sale.assigned_to,
            total_earned: 0,
            current_bank_balance: 0,
            total_paid_out: 0,
            ytd_sales_volume: 0,
            commission_rule_id: commissionRule.id
          });
        }

        // Calculate commission based on current YTD (accumulated so far)
        const ytdVolume = commissionBank.ytd_sales_volume || 0;
        let applicableTier = commissionRule.tiers[0];
        
        for (const tier of commissionRule.tiers) {
          if (ytdVolume >= tier.min_volume && (!tier.max_volume || ytdVolume < tier.max_volume)) {
            applicableTier = tier;
            break;
          }
        }

        const commissionRate = applicableTier.commission_rate || 0;
        const saleAmount = transaction.sale_amount || sale.contract_value || 0;
        const commissionAmount = (saleAmount * commissionRate) / 100;

        // Determine banking percentage
        let bankingPercentage = 0;
        if (sale_type === 'preconstruction') {
          bankingPercentage = commissionRule.precon_banking_rate || 25;
        } else if (sale_type === 'construction') {
          bankingPercentage = 100;
        }

        const bankedAmount = (commissionAmount * bankingPercentage) / 100;
        const immediatePayout = commissionAmount - bankedAmount;

        // Update transaction
        await base44.asServiceRole.entities.CommissionTransaction.update(transaction.id, {
          amount: commissionAmount,
          commission_rate: commissionRate,
          tier_at_time: applicableTier.tier_name,
          banking_percentage: bankingPercentage,
          banked_amount: bankedAmount,
          immediate_payout_amount: immediatePayout,
          sale_type: sale_type,
          notes: `Recalculated using ${sale_type} rules (${commissionRule.rule_name})`
        });

        // Update commission bank
        const newBankBalance = (commissionBank.current_bank_balance || 0) + bankedAmount;
        const newTotalEarned = (commissionBank.total_earned || 0) + commissionAmount;
        const newYtdVolume = ytdVolume + saleAmount;

        await base44.asServiceRole.entities.CommissionBank.update(commissionBank.id, {
          current_bank_balance: newBankBalance,
          total_earned: newTotalEarned,
          ytd_sales_volume: newYtdVolume
        });

        results.push({
          transaction_id: transaction.id,
          sale_id: sale.id,
          sale_type: sale_type,
          old_amount: transaction.amount,
          new_amount: commissionAmount,
          rule_used: commissionRule.rule_name,
          tier: applicableTier.tier_name
        });

      } catch (error) {
        errors.push({ transaction_id: transaction.id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      processed: results.length,
      errors: errors.length,
      results,
      errors
    });

  } catch (error) {
    console.error('Recalculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});