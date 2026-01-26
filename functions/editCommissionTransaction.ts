import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { transaction_id, updates, note } = await req.json();

    if (!transaction_id || !updates || !note) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the original transaction
    const originalTransaction = await base44.asServiceRole.entities.CommissionTransaction.get(transaction_id);
    if (!originalTransaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const oldUserId = originalTransaction.user_id;
    const newUserId = updates.user_id || oldUserId;
    const oldAmount = originalTransaction.amount || 0;
    const newAmount = updates.amount !== undefined ? updates.amount : oldAmount;
    const amountDiff = newAmount - oldAmount;
    const userChanged = oldUserId !== newUserId;

    // Update the old user's bank (subtract old values)
    const [oldUserBank] = await base44.asServiceRole.entities.CommissionBank.filter({ user_id: oldUserId });
    if (oldUserBank) {
      await base44.asServiceRole.entities.CommissionBank.update(oldUserBank.id, {
        total_earned: (oldUserBank.total_earned || 0) - oldAmount,
        available_balance: (oldUserBank.available_balance || 0) - (originalTransaction.immediate_payout_amount || 0),
        current_bank_balance: (oldUserBank.current_bank_balance || 0) - (originalTransaction.banked_amount || 0),
      });
    }

    // Update the new user's bank (add new values)
    if (userChanged) {
      const [newUserBank] = await base44.asServiceRole.entities.CommissionBank.filter({ user_id: newUserId });
      if (newUserBank) {
        // Calculate new immediate and banked amounts based on the new amount
        const ratio = newAmount / oldAmount;
        const newImmediateAmount = (originalTransaction.immediate_payout_amount || 0) * ratio;
        const newBankedAmount = (originalTransaction.banked_amount || 0) * ratio;

        await base44.asServiceRole.entities.CommissionBank.update(newUserBank.id, {
          total_earned: (newUserBank.total_earned || 0) + newAmount,
          available_balance: (newUserBank.available_balance || 0) + newImmediateAmount,
          current_bank_balance: (newUserBank.current_bank_balance || 0) + newBankedAmount,
        });

        // Update transaction with recalculated amounts
        updates.immediate_payout_amount = newImmediateAmount;
        updates.banked_amount = newBankedAmount;
      }
    } else {
      // Same user, just update amounts
      const immediateAmountDiff = userChanged ? 0 : (updates.immediate_payout_amount !== undefined 
        ? updates.immediate_payout_amount - (originalTransaction.immediate_payout_amount || 0)
        : amountDiff * ((originalTransaction.immediate_payout_amount || 0) / oldAmount));
      
      const bankedAmountDiff = userChanged ? 0 : (updates.banked_amount !== undefined
        ? updates.banked_amount - (originalTransaction.banked_amount || 0)
        : amountDiff * ((originalTransaction.banked_amount || 0) / oldAmount));

      if (oldUserBank) {
        await base44.asServiceRole.entities.CommissionBank.update(oldUserBank.id, {
          total_earned: (oldUserBank.total_earned || 0) + amountDiff,
          available_balance: (oldUserBank.available_balance || 0) + immediateAmountDiff,
          current_bank_balance: (oldUserBank.current_bank_balance || 0) + bankedAmountDiff,
        });
      }
    }

    // Create audit log entry
    const auditEntry = {
      timestamp: new Date().toISOString(),
      edited_by: user.email,
      changes: Object.entries(updates)
        .map(([key, value]) => `${key}: ${originalTransaction[key]} → ${value}`)
        .join(', '),
      note: note,
    };

    const existingAuditLog = originalTransaction.audit_log || [];
    const newAuditLog = [...existingAuditLog, auditEntry];

    // Update the transaction
    await base44.asServiceRole.entities.CommissionTransaction.update(transaction_id, {
      ...updates,
      audit_log: newAuditLog,
    });

    return Response.json({
      success: true,
      message: 'Transaction updated and commission banks recalculated',
    });
  } catch (error) {
    console.error('Error editing transaction:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});