import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all commission transactions and sort by creation date
    const allTransactions = await base44.asServiceRole.entities.CommissionTransaction.list();
    const saleCommissions = allTransactions
      .filter(t => t.transaction_type === 'sale_commission' && t.sale_id)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

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

        // Calculate commission with tier splitting
        const ytdVolume = commissionBank.ytd_sales_volume || 0;
        const saleAmount = transaction.sale_amount || sale.contract_value || 0;
        const newTotalVolume = ytdVolume + saleAmount;
        
        // Sort tiers by min_volume
        const sortedTiers = [...commissionRule.tiers].sort((a, b) => a.min_volume - b.min_volume);
        
        let commissionAmount = 0;
        let remainingAmount = saleAmount;
        let currentVolume = ytdVolume;
        let tierBreakdown = [];
        
        // Calculate commission across tiers
        for (let i = 0; i < sortedTiers.length; i++) {
          const tier = sortedTiers[i];
          const nextTier = sortedTiers[i + 1];
          
          // Skip if current volume is already past this tier's max
          if (tier.max_volume && currentVolume >= tier.max_volume) {
            continue;
          }
          
          // Skip if current volume hasn't reached this tier's minimum yet
          if (currentVolume < tier.min_volume) {
            continue;
          }
          
          // Calculate how much of the sale falls in this tier
          const tierEnd = nextTier ? nextTier.min_volume : Infinity;
          const tierCap = tier.max_volume || Infinity;
          const effectiveTierEnd = Math.min(tierEnd, tierCap);
          
          // How much volume can fit in this tier
          const volumeInTier = Math.min(
            effectiveTierEnd - currentVolume,
            remainingAmount
          );
          
          if (volumeInTier > 0) {
            const tierCommission = (volumeInTier * tier.commission_rate) / 100;
            commissionAmount += tierCommission;
            currentVolume += volumeInTier;
            remainingAmount -= volumeInTier;
            
            tierBreakdown.push({
              tier_name: tier.tier_name,
              amount: volumeInTier,
              rate: tier.commission_rate,
              commission: tierCommission
            });
          }
          
          if (remainingAmount <= 0 || currentVolume >= newTotalVolume) {
            break;
          }
        }
        
        // Get the final tier for recording purposes
        let applicableTier = sortedTiers[0];
        for (const tier of sortedTiers) {
          if (newTotalVolume >= tier.min_volume && (!tier.max_volume || newTotalVolume < tier.max_volume)) {
            applicableTier = tier;
            break;
          }
        }
        
        const commissionRate = (commissionAmount / saleAmount) * 100; // Effective blended rate

        // Determine banking percentage
        let bankingPercentage = 0;
        if (sale_type === 'preconstruction') {
          bankingPercentage = commissionRule.precon_banking_rate || 25;
        } else if (sale_type === 'construction') {
          bankingPercentage = 100;
        }

        const bankedAmount = (commissionAmount * bankingPercentage) / 100;
        const immediatePayout = commissionAmount - bankedAmount;

        // Update transaction with tier breakdown
        const tierBreakdownNote = tierBreakdown.length > 1 
          ? ` Split across: ${tierBreakdown.map(t => `${t.tier_name}: $${t.amount.toLocaleString()} @ ${t.rate}%`).join(', ')}`
          : '';
        
        await base44.asServiceRole.entities.CommissionTransaction.update(transaction.id, {
          amount: commissionAmount,
          commission_rate: commissionRate,
          tier_at_time: applicableTier.tier_name,
          banking_percentage: bankingPercentage,
          banked_amount: bankedAmount,
          immediate_payout_amount: immediatePayout,
          sale_type: sale_type,
          notes: `Recalculated using ${sale_type} rules (${commissionRule.rule_name}).${tierBreakdownNote}`
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
          tier: applicableTier.tier_name,
          ytd_before: ytdVolume,
          ytd_after: newYtdVolume,
          sale_amount: saleAmount,
          tier_breakdown: tierBreakdown
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