import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sale_id, sale_type } = await req.json();

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

    // Get the commission rule
    const commissionRuleId = salesperson.commission_rule_ids[0];
    const rules = await base44.asServiceRole.entities.CommissionRule.filter({ id: commissionRuleId });
    const commissionRule = rules[0];

    if (!commissionRule || !commissionRule.tiers?.length) {
      return Response.json({ error: 'Commission rule not found or has no tiers' }, { status: 404 });
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
        commission_rule_id: commissionRuleId
      });
    }

    // Calculate commission based on current tier
    const ytdVolume = commissionBank.ytd_sales_volume || 0;
    let applicableTier = commissionRule.tiers[0];
    
    for (const tier of commissionRule.tiers) {
      if (ytdVolume >= tier.min_volume && (!tier.max_volume || ytdVolume < tier.max_volume)) {
        applicableTier = tier;
        break;
      }
    }

    const commissionRate = applicableTier.commission_rate || 0;
    const saleAmount = sale.contract_value || 0;
    const commissionAmount = (saleAmount * commissionRate) / 100;

    // Determine banking percentage based on sale type
    let bankingPercentage = 0;
    if (sale_type === 'preconstruction') {
      bankingPercentage = commissionRule.precon_banking_rate || 25;
    } else if (sale_type === 'construction') {
      bankingPercentage = 100; // 100% banked for construction
    }

    const bankedAmount = (commissionAmount * bankingPercentage) / 100;
    const immediatePayout = commissionAmount - bankedAmount;

    // Create commission transaction
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
      status: 'banked'
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