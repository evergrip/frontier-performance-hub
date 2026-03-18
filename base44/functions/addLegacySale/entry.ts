import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { lead_name, sale_date, sale_amount, commission_amount, salesperson_id } = await req.json();

    if (!lead_name || !sale_date || !sale_amount || !commission_amount || !salesperson_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the salesperson
    const users = await base44.asServiceRole.entities.User.filter({ id: salesperson_id });
    const salesperson = users[0];

    if (!salesperson) {
      return Response.json({ error: 'Salesperson not found' }, { status: 404 });
    }

    // Get or create commission bank
    let banks = await base44.asServiceRole.entities.CommissionBank.filter({ user_id: salesperson_id });
    let commissionBank = banks[0];

    if (!commissionBank) {
      commissionBank = await base44.asServiceRole.entities.CommissionBank.create({
        user_id: salesperson_id,
        total_earned: 0,
        current_bank_balance: 0,
        total_paid_out: 0,
        ytd_sales_volume: 0
      });
    }

    // Create commission transaction for the legacy sale
    const transaction = await base44.asServiceRole.entities.CommissionTransaction.create({
      user_id: salesperson_id,
      transaction_type: 'sale_commission',
      amount: commission_amount,
      sale_amount: sale_amount,
      status: 'banked',
      notes: `Legacy sale - ${lead_name} (${sale_date})`
    });

    // Update commission bank
    const newBankBalance = (commissionBank.current_bank_balance || 0) + commission_amount;
    const newTotalEarned = (commissionBank.total_earned || 0) + commission_amount;

    await base44.asServiceRole.entities.CommissionBank.update(commissionBank.id, {
      current_bank_balance: newBankBalance,
      total_earned: newTotalEarned
    });

    return Response.json({
      success: true,
      transaction,
      new_bank_balance: newBankBalance,
      message: `Legacy sale added: $${commission_amount.toLocaleString()} commission for ${salesperson.full_name}`
    });

  } catch (error) {
    console.error('Legacy sale error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});