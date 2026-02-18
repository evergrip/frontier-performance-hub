import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can approve balloon payments
    if (user.role !== 'admin') {
      return Response.json({ 
        error: 'Forbidden: Admin access required' 
      }, { status: 403 });
    }

    const { payout_id, approve } = await req.json();

    if (!payout_id || approve === undefined) {
      return Response.json({ 
        error: 'payout_id and approve (true/false) are required' 
      }, { status: 400 });
    }

    // Get the payout request
    const payouts = await base44.asServiceRole.entities.CommissionPayout.filter({ id: payout_id });
    if (!payouts || payouts.length === 0) {
      return Response.json({ error: 'Payout not found' }, { status: 404 });
    }

    const payout = payouts[0];

    if (payout.status !== 'pending') {
      return Response.json({ 
        error: `Payout is already ${payout.status}` 
      }, { status: 400 });
    }

    if (approve) {
      // Approve and process the payout
      
      // Get commission bank
      const banks = await base44.asServiceRole.entities.CommissionBank.filter({ 
        user_id: payout.user_id 
      });
      
      if (!banks || banks.length === 0) {
        return Response.json({ error: 'Commission bank not found' }, { status: 404 });
      }

      const commissionBank = banks[0];
      const currentBalance = commissionBank.current_bank_balance || 0;

      // Verify sufficient balance
      if (payout.amount > currentBalance) {
        return Response.json({ 
          error: 'Insufficient balance in commission bank',
          requested: payout.amount,
          available: currentBalance
        }, { status: 400 });
      }

      // Deduct from bank
      const newBalance = currentBalance - payout.amount;
      const newTotalPaidOut = (commissionBank.total_paid_out || 0) + payout.amount;

      await base44.asServiceRole.entities.CommissionBank.update(commissionBank.id, {
        current_bank_balance: newBalance,
        total_paid_out: newTotalPaidOut
      });

      // Update payout record
      await base44.asServiceRole.entities.CommissionPayout.update(payout_id, {
        status: 'approved',
        approved_by: user.id,
        approval_date: new Date().toISOString().split('T')[0],
        payout_date: new Date().toISOString().split('T')[0],
        bank_balance_after: newBalance
      });

      return Response.json({
        success: true,
        message: 'Balloon payment approved and processed',
        payout_id,
        amount: payout.amount,
        new_bank_balance: newBalance
      });

    } else {
      // Reject the payout
      await base44.asServiceRole.entities.CommissionPayout.update(payout_id, {
        status: 'rejected',
        approved_by: user.id,
        approval_date: new Date().toISOString().split('T')[0]
      });

      return Response.json({
        success: true,
        message: 'Balloon payment rejected',
        payout_id
      });
    }

  } catch (error) {
    console.error('Error approving balloon payment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});