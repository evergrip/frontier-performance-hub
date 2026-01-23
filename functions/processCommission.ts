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

    // Find exact match first, then 'both', then fallback
    let commissionRule = allRules.find(rule => rule.sale_type === sale_type);

    if (!commissionRule) {
      commissionRule = allRules.find(rule => rule.sale_type === 'both');
    }

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
    // IMPORTANT: Only construction sales count towards tier progression
    const ytdConstructionVolume = commissionBank.ytd_construction_volume || 0;
    const ytdPreconVolume = commissionBank.ytd_preconstruction_volume || 0;
    const saleAmount = final_amount || sale.contract_value || 0;
    
    // Always use construction volume for tier calculation (both sale types use same tiers)
    const ytdVolume = ytdConstructionVolume;
    const newTotalVolume = ytdVolume + (sale_type === 'construction' ? saleAmount : 0);
    
    // Sort tiers by min_volume
    const sortedTiers = [...commissionRule.tiers].sort((a, b) => a.min_volume - b.min_volume);
    
    let commissionAmount = 0;
    let remainingAmount = saleAmount;
    let currentVolume = ytdVolume;
    let tierBreakdown = [];
    
    // Calculate commission across tiers
    // For construction: split across tiers as volume increases
    // For preconstruction: apply current tier rate to entire amount
    if (sale_type === 'construction') {
      for (let i = 0; i < sortedTiers.length; i++) {
        const tier = sortedTiers[i];
        
        // Skip if we're already completely past this tier
        if (currentVolume >= (tier.max_volume || Infinity)) {
          continue;
        }
        
        // Calculate the effective start within this tier
        const tierEffectiveStart = Math.max(tier.min_volume || 0, currentVolume);
        const tierEffectiveEnd = tier.max_volume || Infinity;
        
        // How much volume can fit in this tier
        const volumeInTier = Math.min(
          tierEffectiveEnd - tierEffectiveStart,
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
        
        if (remainingAmount <= 0) {
          break;
        }
      }
    } else {
      // Preconstruction: apply current tier rate based on construction volume
      let applicableTier = sortedTiers[0];
      for (const tier of sortedTiers) {
        if (currentVolume >= tier.min_volume && (!tier.max_volume || currentVolume < tier.max_volume)) {
          applicableTier = tier;
          break;
        }
      }
      
      commissionAmount = (saleAmount * applicableTier.commission_rate) / 100;
      tierBreakdown.push({
        tier_name: applicableTier.tier_name,
        amount: saleAmount,
        rate: applicableTier.commission_rate,
        commission: commissionAmount
      });
    }
    
    // Get the final tier for recording purposes
    let applicableTier = sortedTiers[0];
    for (const tier of sortedTiers) {
      if (newTotalVolume >= tier.min_volume && (!tier.max_volume || newTotalVolume < tier.max_volume)) {
        applicableTier = tier;
        break;
      }
    }

    // Determine available/banked percentages based on phase
    let availablePercentage = 0;
    let bankedPercentage = 0;
    let phaseApplied = 'N/A';
    
    if (sale_type === 'preconstruction') {
      const phaseAvailability = commissionRule.precon_phase_availability || [];
      const matchingPhase = phaseAvailability.find(p => p.phase === sale.status);
      if (matchingPhase) {
        availablePercentage = matchingPhase.available_percentage || 0;
        bankedPercentage = matchingPhase.banked_percentage || 100;
        phaseApplied = sale.status;
      } else {
        availablePercentage = 0;
        bankedPercentage = 100;
      }
    } else if (sale_type === 'construction') {
      const phaseAvailability = commissionRule.construction_phase_availability || [];
      const matchingPhase = phaseAvailability.find(p => p.phase === sale.status);
      if (matchingPhase) {
        availablePercentage = matchingPhase.available_percentage || 0;
        bankedPercentage = matchingPhase.banked_percentage || 100;
        phaseApplied = sale.status;
      } else {
        availablePercentage = 0;
        bankedPercentage = 100;
      }
    }

    const availableAmount = (commissionAmount * availablePercentage) / 100;
    const bankedAmount = (commissionAmount * bankedPercentage) / 100;
    const immediatePayout = availableAmount;

    // Check if transaction already exists for this sale
    const existingTransactions = await base44.asServiceRole.entities.CommissionTransaction.filter({ 
      sale_id: sale.id,
      transaction_type: 'sale_commission'
    });
    
    // If this is an update OR if a transaction already exists, update instead of creating new
    if (is_update || existingTransactions.length > 0) {
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
        // IMPORTANT: Only construction sales count towards tier progression
        const currentConstructionVolume = commissionBank.ytd_construction_volume || 0;
        const currentPreconVolume = commissionBank.ytd_preconstruction_volume || 0;
        
        const adjustedConstructionYTD = sale_type === 'construction' 
          ? currentConstructionVolume - oldSaleAmount 
          : currentConstructionVolume;
        const adjustedPreconYTD = sale_type === 'preconstruction' 
          ? currentPreconVolume - oldSaleAmount 
          : currentPreconVolume;
        
        // Use construction volume for tier calculation
        const adjustedYTD = adjustedConstructionYTD;
        
        // Now recalculate commission from scratch with adjusted YTD
        let newCommissionAmount = 0;
        let newRemainingAmount = saleAmount;
        let newCurrentVolume = adjustedYTD;
        let newTierBreakdown = [];
        
        // Calculate commission across tiers from scratch
        // For construction: split across tiers as volume increases
        // For preconstruction: apply current tier rate to entire amount
        if (sale_type === 'construction') {
          for (let i = 0; i < sortedTiers.length; i++) {
            const tier = sortedTiers[i];
            
            // Skip if we're already completely past this tier
            if (newCurrentVolume >= (tier.max_volume || Infinity)) {
              continue;
            }
            
            // Calculate the effective start within this tier
            const tierEffectiveStart = Math.max(tier.min_volume || 0, newCurrentVolume);
            const tierEffectiveEnd = tier.max_volume || Infinity;
            
            // How much volume can fit in this tier
            const volumeInTier = Math.min(
              tierEffectiveEnd - tierEffectiveStart,
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
        } else {
          // Preconstruction: apply current tier rate based on construction volume
          let applicableTier = sortedTiers[0];
          for (const tier of sortedTiers) {
            if (newCurrentVolume >= tier.min_volume && (!tier.max_volume || newCurrentVolume < tier.max_volume)) {
              applicableTier = tier;
              break;
            }
          }
          
          newCommissionAmount = (saleAmount * applicableTier.commission_rate) / 100;
          newTierBreakdown.push({
            tier_name: applicableTier.tier_name,
            amount: saleAmount,
            rate: applicableTier.commission_rate,
            commission: newCommissionAmount
          });
        }
        
        // Get the final tier (based on construction volume only)
        let newApplicableTier = sortedTiers[0];
        const finalConstructionYTD = adjustedConstructionYTD + (sale_type === 'construction' ? saleAmount : 0);
        for (const tier of sortedTiers) {
          if (finalConstructionYTD >= tier.min_volume && (!tier.max_volume || finalConstructionYTD < tier.max_volume)) {
            newApplicableTier = tier;
            break;
          }
        }
        
        let newAvailablePercentage = 0;
        let newBankedPercentage = 0;
        if (sale_type === 'preconstruction') {
          const phaseAvailability = commissionRule.precon_phase_availability || [];
          const matchingPhase = phaseAvailability.find(p => p.phase === sale.status);
          if (matchingPhase) {
            newAvailablePercentage = matchingPhase.available_percentage || 0;
            newBankedPercentage = matchingPhase.banked_percentage || 100;
          } else {
            newAvailablePercentage = 0;
            newBankedPercentage = 100;
          }
        } else if (sale_type === 'construction') {
          const phaseAvailability = commissionRule.construction_phase_availability || [];
          const matchingPhase = phaseAvailability.find(p => p.phase === sale.status);
          if (matchingPhase) {
            newAvailablePercentage = matchingPhase.available_percentage || 0;
            newBankedPercentage = matchingPhase.banked_percentage || 100;
          } else {
            newAvailablePercentage = 0;
            newBankedPercentage = 100;
          }
        }
        const newBankedAmount = (newCommissionAmount * newBankedPercentage) / 100;
        const newAvailableAmount = (newCommissionAmount * newAvailablePercentage) / 100;
        const newImmediatePayout = newAvailableAmount;
        
        const amountDiff = newCommissionAmount - oldAmount;
        const bankedDiff = newBankedAmount - oldBankedAmount;

        // Build tier breakdown note - required for construction, helpful for all
        let tierBreakdownNote = '';
        if (sale_type === 'construction' && newTierBreakdown.length > 0) {
          tierBreakdownNote = `\nTier breakdown: ${newTierBreakdown.map(t => 
            `${t.tier_name}: $${t.amount.toLocaleString()} @ ${t.rate}% = $${t.commission.toLocaleString()}`
          ).join(' + ')} = Total: $${newCommissionAmount.toLocaleString()}`;
        } else if (newTierBreakdown.length === 1) {
          tierBreakdownNote = `\nApplied at ${newTierBreakdown[0].tier_name} tier: $${saleAmount.toLocaleString()} @ ${newTierBreakdown[0].rate}% = $${newCommissionAmount.toLocaleString()}`;
        }

        // Update the transaction with adjustment note
        const adjustmentNote = `ADJUSTED: Original sale amount: $${oldSaleAmount.toLocaleString()}, New amount: $${saleAmount.toLocaleString()}. Original commission: $${oldAmount.toLocaleString()}, New commission: $${newCommissionAmount.toLocaleString()}, Net adjustment: ${amountDiff >= 0 ? '+' : ''}$${amountDiff.toLocaleString()}${tierBreakdownNote}`;

        await base44.asServiceRole.entities.CommissionTransaction.update(existingTransaction.id, {
          amount: newCommissionAmount,
          commission_rate: null,
          sale_amount: saleAmount,
          tier_at_time: newApplicableTier.tier_name,
          banked_amount: newBankedAmount,
          immediate_payout_amount: newImmediatePayout,
          notes: adjustmentNote
        });

        // Update commission bank with the difference
        const newBankBalance = (commissionBank.current_bank_balance || 0) + bankedDiff;
        const newTotalEarned = (commissionBank.total_earned || 0) + amountDiff;
        
        // Update volumes based on sale type
        const finalConstructionVolume = adjustedConstructionYTD + (sale_type === 'construction' ? saleAmount : 0);
        const finalPreconVolume = adjustedPreconYTD + (sale_type === 'preconstruction' ? saleAmount : 0);
        const finalTotalVolume = finalConstructionVolume + finalPreconVolume;

        await base44.asServiceRole.entities.CommissionBank.update(commissionBank.id, {
          current_bank_balance: newBankBalance,
          total_earned: newTotalEarned,
          ytd_sales_volume: finalTotalVolume,
          ytd_construction_volume: finalConstructionVolume,
          ytd_preconstruction_volume: finalPreconVolume
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
    let tierBreakdownNote = '';
    if (sale_type === 'construction' && tierBreakdown.length > 0) {
      tierBreakdownNote = `Tier breakdown: ${tierBreakdown.map(t => 
        `${t.tier_name}: $${t.amount.toLocaleString()} @ ${t.rate}% = $${t.commission.toLocaleString()}`
      ).join(' + ')} = Total: $${commissionAmount.toLocaleString()}`;
    } else if (tierBreakdown.length === 1) {
      tierBreakdownNote = `Applied at ${tierBreakdown[0].tier_name} tier: $${saleAmount.toLocaleString()} @ ${tierBreakdown[0].rate}% = $${commissionAmount.toLocaleString()}`;
    }

    const transaction = await base44.asServiceRole.entities.CommissionTransaction.create({
      user_id: sale.assigned_to,
      sale_id: sale.id,
      transaction_type: 'sale_commission',
      amount: commissionAmount,
      commission_rate: null,
      sale_amount: saleAmount,
      tier_at_time: applicableTier.tier_name,
      banking_percentage: bankingPercentage,
      banked_amount: bankedAmount,
      immediate_payout_amount: immediatePayout,
      status: 'banked',
      sale_type: sale_type,
      notes: tierBreakdownNote || undefined
    });

    // Update commission bank
    const newBankBalance = (commissionBank.current_bank_balance || 0) + bankedAmount;
    const newTotalEarned = (commissionBank.total_earned || 0) + commissionAmount;
    
    // Update volumes based on sale type
    const newConstructionVolume = sale_type === 'construction' 
      ? ytdConstructionVolume + saleAmount 
      : ytdConstructionVolume;
    const newPreconVolume = sale_type === 'preconstruction' 
      ? ytdPreconVolume + saleAmount 
      : ytdPreconVolume;
    const newTotalVolume = newConstructionVolume + newPreconVolume;

    await base44.asServiceRole.entities.CommissionBank.update(commissionBank.id, {
      current_bank_balance: newBankBalance,
      total_earned: newTotalEarned,
      ytd_sales_volume: newTotalVolume,
      ytd_construction_volume: newConstructionVolume,
      ytd_preconstruction_volume: newPreconVolume
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