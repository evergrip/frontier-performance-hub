import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sale_id, sale_type, final_amount, is_update } = await req.json();

    if (!sale_id || !sale_type) {
      return Response.json({ error: 'Missing sale_id or sale_type' }, { status: 400 });
    }

    // Get the sale
    const sales = await base44.asServiceRole.entities.Sale.filter({ id: sale_id });
    const sale = sales[0];

    if (!sale || !sale.assigned_to) {
      return Response.json({ error: 'Sale not found or no salesperson assigned' }, { status: 404 });
    }

    // Get the salesperson's user record
    const users = await base44.asServiceRole.entities.User.filter({ id: sale.assigned_to });
    const salesperson = users[0];

    if (!salesperson || !salesperson.commission_rule_ids?.length) {
      return Response.json({ error: 'Salesperson has no commission rules assigned' }, { status: 400 });
    }

    // Get all commission rules for the salesperson
    const allRules = await base44.asServiceRole.entities.CommissionRule.filter({ 
      id: { $in: salesperson.commission_rule_ids }
    });

    // Find the appropriate rule based on sale_type
    let commissionRule = allRules.find(rule => 
      rule.sale_type === sale_type || rule.sale_type === 'both'
    );

    // If no matching rule, fall back to first rule
    if (!commissionRule) {
      commissionRule = allRules[0];
    }

    if (!commissionRule || !commissionRule.tiers?.length) {
      return Response.json({ error: `No commission rule found for ${sale_type} sales` }, { status: 404 });
    }

    // Get commission bank or create if doesn't exist
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
    const saleAmount = final_amount || sale.contract_value || 0;
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
      
      // Skip if we haven't reached this tier yet
      if (currentVolume >= (tier.max_volume || Infinity)) {
        continue;
      }
      
      // Calculate how much of the sale falls in this tier
      const tierStart = Math.max(tier.min_volume, currentVolume);
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

    // Determine banking percentage based on sale type
    let bankingPercentage = 0;
    if (sale_type === 'preconstruction') {
      bankingPercentage = commissionRule.precon_banking_rate || 25;
    } else if (sale_type === 'construction') {
      bankingPercentage = 100; // 100% banked for construction
    }

    const bankedAmount = (commissionAmount * bankingPercentage) / 100;
    const immediatePayout = commissionAmount - bankedAmount;

    // If this is an update, find and update existing transaction
    if (is_update) {
      const existingTransactions = await base44.asServiceRole.entities.CommissionTransaction.filter({ 
        sale_id: sale.id 
      });
      
      if (existingTransactions.length > 0) {
        const existingTransaction = existingTransactions[0];
        const oldSaleAmount = existingTransaction.sale_amount || 0;
        const oldAmount = existingTransaction.amount || 0;
        const oldBankedAmount = existingTransaction.banked_amount || 0;
        
        // Calculate the difference in sale amount
        const saleDifference = saleAmount - oldSaleAmount;
        
        if (saleDifference === 0) {
          return Response.json({
            success: true,
            updated: false,
            message: 'No change in sale amount'
          });
        }
        
        // Adjust YTD to remove the old sale amount (we'll re-add the new amount)
        const adjustedYTD = (commissionBank.ytd_sales_volume || 0) - oldSaleAmount;
        
        // Now recalculate commission from scratch with adjusted YTD
        let newCommissionAmount = 0;
        let newRemainingAmount = saleAmount;
        let newCurrentVolume = adjustedYTD;
        let newTierBreakdown = [];
        
        // Calculate commission across tiers from scratch
        for (let i = 0; i < sortedTiers.length; i++) {
          const tier = sortedTiers[i];
          const nextTier = sortedTiers[i + 1];
          
          // Skip if we haven't reached this tier yet
          if (newCurrentVolume >= (tier.max_volume || Infinity)) {
            continue;
          }
          
          // Calculate how much of the sale falls in this tier
          const tierStart = Math.max(tier.min_volume, newCurrentVolume);
          const tierEnd = nextTier ? nextTier.min_volume : Infinity;
          const tierCap = tier.max_volume || Infinity;
          const effectiveTierEnd = Math.min(tierEnd, tierCap);
          
          // How much volume can fit in this tier
          const volumeInTier = Math.min(
            effectiveTierEnd - newCurrentVolume,
            newRemainingAmount
          );
          
          if (volumeInTier > 0) {
            const tierCommission = (volumeInTier * tier.commission_rate) / 100;
            newCommissionAmount += tierCommission;
            newCurrentVolume += volumeInTier;
            newRemainingAmount -= volumeInTier;
            
            newTierBreakdown.push({
              tier_name: tier.tier_name,
              amount: volumeInTier,
              rate: tier.commission_rate,
              commission: tierCommission
            });
          }
          
          if (newRemainingAmount <= 0) {
            break;
          }
        }
        
        // Get the final tier
        let newApplicableTier = sortedTiers[0];
        const finalYTD = adjustedYTD + saleAmount;
        for (const tier of sortedTiers) {
          if (finalYTD >= tier.min_volume && (!tier.max_volume || finalYTD < tier.max_volume)) {
            newApplicableTier = tier;
            break;
          }
        }
        
        const newCommissionRate = (newCommissionAmount / saleAmount) * 100;
        const newBankedAmount = (newCommissionAmount * bankingPercentage) / 100;
        const newImmediatePayout = newCommissionAmount - newBankedAmount;
        
        const amountDiff = newCommissionAmount - oldAmount;
        const bankedDiff = newBankedAmount - oldBankedAmount;

        // Build tier breakdown note if applicable
        const tierBreakdownNote = newTierBreakdown.length > 1 
          ? `\nTier breakdown: ${newTierBreakdown.map(t => `${t.tier_name}: $${t.amount.toLocaleString()} @ ${t.rate}% = $${t.commission.toLocaleString()}`).join(', ')}`
          : '';

        // Update the transaction with adjustment note
        const adjustmentNote = `Updated with final ${sale_type} amount: $${saleAmount.toLocaleString()}. Original commission: $${oldAmount.toLocaleString()}, New: $${newCommissionAmount.toLocaleString()}, Adjustment: ${amountDiff >= 0 ? '+' : ''}$${amountDiff.toLocaleString()}${tierBreakdownNote}`;
        
        await base44.asServiceRole.entities.CommissionTransaction.update(existingTransaction.id, {
          amount: newCommissionAmount,
          commission_rate: newCommissionRate,
          sale_amount: saleAmount,
          tier_at_time: newApplicableTier.tier_name,
          banked_amount: newBankedAmount,
          immediate_payout_amount: newImmediatePayout,
          notes: adjustmentNote
        });

        // Update commission bank with the difference
        const newBankBalance = (commissionBank.current_bank_balance || 0) + bankedDiff;
        const newTotalEarned = (commissionBank.total_earned || 0) + amountDiff;
        const newYtdVolume = adjustedYTD + saleAmount;

        await base44.asServiceRole.entities.CommissionBank.update(commissionBank.id, {
          current_bank_balance: newBankBalance,
          total_earned: newTotalEarned,
          ytd_sales_volume: newYtdVolume
        });

        return Response.json({
          success: true,
          updated: true,
          transaction: existingTransaction,
          commission_amount: newCommissionAmount,
          banked_amount: newBankedAmount,
          immediate_payout: newImmediatePayout,
          new_bank_balance: newBankBalance
        });
      }
    }

    // Create commission transaction with tier breakdown
    const tierBreakdownNote = tierBreakdown.length > 1 
      ? `\nTier breakdown: ${tierBreakdown.map(t => `${t.tier_name}: $${t.amount.toLocaleString()} @ ${t.rate}% = $${t.commission.toLocaleString()}`).join(', ')}`
      : '';
    
    const transaction = await base44.asServiceRole.entities.CommissionTransaction.create({
      user_id: sale.assigned_to,
      sale_id: sale.id,
      transaction_type: 'sale_commission',
      amount: commissionAmount,
      commission_rate: commissionRate,
      sale_amount: saleAmount,
      tier_at_time: applicableTier.tier_name,
      banking_percentage: bankingPercentage,
      banked_amount: bankedAmount,
      immediate_payout_amount: immediatePayout,
      status: 'banked',
      sale_type: sale_type,
      notes: tierBreakdown.length > 1 ? `Split across tiers${tierBreakdownNote}` : undefined
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

    // Update sale to mark commission as processed
    await base44.asServiceRole.entities.Sale.update(sale.id, {
      commission_processed: true,
      commission_transaction_ids: [...(sale.commission_transaction_ids || []), transaction.id]
    });

    return Response.json({
      success: true,
      transaction,
      commission_amount: commissionAmount,
      banked_amount: bankedAmount,
      immediate_payout: immediatePayout,
      new_bank_balance: newBankBalance
    });

  } catch (error) {
    console.error('Commission processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});