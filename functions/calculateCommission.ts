import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sale_id, project_id, phase_name } = await req.json();

    if (!sale_id) {
      return Response.json({ error: 'sale_id is required' }, { status: 400 });
    }

    // Get the sale
    const sales = await base44.asServiceRole.entities.Sale.filter({ id: sale_id });
    if (!sales || sales.length === 0) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }
    const sale = sales[0];

    // Only process closed won sales
    if (sale.status !== 'closed_won') {
      return Response.json({ error: 'Sale must be closed_won to process commission' }, { status: 400 });
    }

    // Check if commission already processed for this sale
    if (sale.commission_processed && !phase_name) {
      return Response.json({ 
        message: 'Commission already processed for this sale',
        already_processed: true 
      });
    }

    // Get primary salesperson
    const salesPersonId = sale.assigned_to;
    if (!salesPersonId) {
      return Response.json({ error: 'No salesperson assigned to this sale' }, { status: 400 });
    }

    // Get or create commission bank for this user
    let commissionBanks = await base44.asServiceRole.entities.CommissionBank.filter({ user_id: salesPersonId });
    let commissionBank;
    
    if (!commissionBanks || commissionBanks.length === 0) {
      // Create new commission bank
      commissionBank = await base44.asServiceRole.entities.CommissionBank.create({
        user_id: salesPersonId,
        total_earned: 0,
        current_bank_balance: 0,
        total_paid_out: 0,
        quarterly_payout_amount: 0,
        ytd_sales_volume: 0
      });
    } else {
      commissionBank = commissionBanks[0];
    }

    // Get commission rule
    let commissionRule = null;
    if (commissionBank.commission_rule_id) {
      const rules = await base44.asServiceRole.entities.CommissionRule.filter({ 
        id: commissionBank.commission_rule_id 
      });
      if (rules && rules.length > 0) {
        commissionRule = rules[0];
      }
    }

    // If no rule assigned, use default
    if (!commissionRule) {
      const defaultRules = await base44.asServiceRole.entities.CommissionRule.filter({ 
        is_active: true 
      });
      if (defaultRules && defaultRules.length > 0) {
        commissionRule = defaultRules[0];
      } else {
        return Response.json({ 
          error: 'No commission rule found. Please create a commission rule first.' 
        }, { status: 400 });
      }
    }

    // Calculate commission tier based on YTD volume
    const ytdVolume = commissionBank.ytd_sales_volume || 0;
    let applicableTier = null;
    
    if (commissionRule.tiers && commissionRule.tiers.length > 0) {
      // Sort tiers by min_volume
      const sortedTiers = [...commissionRule.tiers].sort((a, b) => a.min_volume - b.min_volume);
      
      for (const tier of sortedTiers) {
        if (ytdVolume >= tier.min_volume) {
          if (!tier.max_volume || ytdVolume <= tier.max_volume) {
            applicableTier = tier;
          }
        }
      }
      
      // If no tier matched, use the first tier
      if (!applicableTier && sortedTiers.length > 0) {
        applicableTier = sortedTiers[0];
      }
    }

    if (!applicableTier) {
      return Response.json({ 
        error: 'No applicable commission tier found' 
      }, { status: 400 });
    }

    const commissionRate = applicableTier.commission_rate;
    const saleAmount = sale.contract_value || 0;
    const commissionAmount = saleAmount * (commissionRate / 100);

    // Determine banking behavior
    let bankedAmount = 0;
    let immediatePayout = 0;
    let bankingPercentage = 0;

    // For preconstruction sales with phases
    if (sale.sale_type === 'preconstruction' && phase_name) {
      // Bank based on phase (25% per phase by default)
      bankingPercentage = commissionRule.precon_banking_rate || 25;
      bankedAmount = commissionAmount * (bankingPercentage / 100);
      immediatePayout = 0; // All goes to bank for precon phases
    } else if (sale.sale_type === 'preconstruction' && !phase_name) {
      // Initial precon sale - bank nothing yet, wait for phases
      bankedAmount = 0;
      immediatePayout = 0;
    } else {
      // Construction sales - immediate payout (or customize as needed)
      bankedAmount = commissionAmount;
      immediatePayout = 0;
      bankingPercentage = 100;
    }

    // Create commission transaction
    const transaction = await base44.asServiceRole.entities.CommissionTransaction.create({
      user_id: salesPersonId,
      sale_id: sale_id,
      project_id: project_id || null,
      transaction_type: phase_name ? 'phase_commission' : 'sale_commission',
      amount: commissionAmount,
      commission_rate: commissionRate,
      sale_amount: saleAmount,
      tier_at_time: applicableTier.tier_name,
      phase_name: phase_name || null,
      banking_percentage: bankingPercentage,
      banked_amount: bankedAmount,
      immediate_payout_amount: immediatePayout,
      status: bankedAmount > 0 ? 'banked' : 'pending'
    });

    // Update commission bank
    const newBankBalance = (commissionBank.current_bank_balance || 0) + bankedAmount;
    const newTotalEarned = (commissionBank.total_earned || 0) + commissionAmount;
    const newYtdVolume = (commissionBank.ytd_sales_volume || 0) + saleAmount;

    await base44.asServiceRole.entities.CommissionBank.update(commissionBank.id, {
      current_bank_balance: newBankBalance,
      total_earned: newTotalEarned,
      ytd_sales_volume: newYtdVolume,
      current_tier: applicableTier.tier_name
    });

    // Mark sale as commission processed (if not a phase)
    if (!phase_name) {
      const existingTransactionIds = sale.commission_transaction_ids || [];
      await base44.asServiceRole.entities.Sale.update(sale_id, {
        commission_processed: true,
        commission_transaction_ids: [...existingTransactionIds, transaction.id]
      });
    }

    return Response.json({
      success: true,
      transaction_id: transaction.id,
      commission_amount: commissionAmount,
      commission_rate: commissionRate,
      tier: applicableTier.tier_name,
      banked_amount: bankedAmount,
      immediate_payout: immediatePayout,
      new_bank_balance: newBankBalance,
      new_ytd_volume: newYtdVolume
    });

  } catch (error) {
    console.error('Error calculating commission:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});