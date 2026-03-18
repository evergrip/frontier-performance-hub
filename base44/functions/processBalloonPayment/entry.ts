import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requested_amount, notes, user_id: target_user_id } = await req.json();

    // Admins can request on behalf of another user
    let user_id = user.id;
    if (target_user_id && target_user_id !== user.id) {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Only admins can request payments on behalf of other users' }, { status: 403 });
      }
      user_id = target_user_id;
    }

    // Validate inputs
    if (!requested_amount) {
      return Response.json({ error: 'requested_amount is required' }, { status: 400 });
    }

    if (requested_amount <= 0) {
      return Response.json({ error: 'requested_amount must be greater than 0' }, { status: 400 });
    }

    // Get commission bank
    const banks = await base44.asServiceRole.entities.CommissionBank.filter({ user_id });
    if (!banks || banks.length === 0) {
      return Response.json({ error: 'Commission bank not found for this user' }, { status: 404 });
    }

    const commissionBank = banks[0];
    const availableBalance = commissionBank.available_balance || 0;

    // Check if sufficient available balance
    if (requested_amount > availableBalance) {
      return Response.json({ 
        error: 'Insufficient available balance',
        requested: requested_amount,
        available: availableBalance
      }, { status: 400 });
    }

    // Create balloon payment request (pending approval)
    const payout = await base44.asServiceRole.entities.CommissionPayout.create({
      user_id,
      payout_type: 'balloon',
      amount: requested_amount,
      status: 'pending',
      request_date: new Date().toISOString().split('T')[0],
      bank_balance_before: availableBalance,
      bank_balance_after: availableBalance - requested_amount,
      notes: notes || 'Balloon payment request'
    });

    return Response.json({
      success: true,
      message: 'Balloon payment request created and pending approval',
      payout_id: payout.id,
      requested_amount,
      available_balance: availableBalance,
      remaining_after_approval: availableBalance - requested_amount,
      status: 'pending'
    });

  } catch (error) {
    console.error('Error processing balloon payment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});