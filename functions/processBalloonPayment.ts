import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requested_amount, notes } = await req.json();

    // Use the authenticated user's ID — users can only request for themselves
    const user_id = user.id;

    // Validate inputs
    if (!requested_amount) {
      return Response.json({ 
        error: 'requested_amount is required' 
      }, { status: 400 });
    }

    if (requested_amount <= 0) {
      return Response.json({ 
        error: 'requested_amount must be greater than 0' 
      }, { status: 400 });
    }

    // Get commission bank
    const banks = await base44.asServiceRole.entities.CommissionBank.filter({ user_id });
    if (!banks || banks.length === 0) {
      return Response.json({ 
        error: 'Commission bank not found for this user' 
      }, { status: 404 });
    }

    const commissionBank = banks[0];
    const currentBalance = commissionBank.current_bank_balance || 0;

    // Check if sufficient balance
    if (requested_amount > currentBalance) {
      return Response.json({ 
        error: 'Insufficient commission bank balance',
        requested: requested_amount,
        available: currentBalance
      }, { status: 400 });
    }

    // Create balloon payment request (pending approval)
    const payout = await base44.asServiceRole.entities.CommissionPayout.create({
      user_id,
      payout_type: 'balloon',
      amount: requested_amount,
      status: 'pending',
      request_date: new Date().toISOString().split('T')[0],
      bank_balance_before: currentBalance,
      bank_balance_after: currentBalance - requested_amount,
      notes: notes || 'Balloon payment request'
    });

    return Response.json({
      success: true,
      message: 'Balloon payment request created and pending approval',
      payout_id: payout.id,
      requested_amount,
      current_balance: currentBalance,
      remaining_after_approval: currentBalance - requested_amount,
      status: 'pending'
    });

  } catch (error) {
    console.error('Error processing balloon payment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});