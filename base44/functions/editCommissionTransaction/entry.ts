import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_UPDATE_FIELDS = ['amount', 'commission_rate', 'sale_amount', 'tier_at_time', 'phase_name', 'phase_payout_percentage', 'amount_made_available', 'banking_percentage', 'banked_amount', 'immediate_payout_amount', 'status', 'sale_type', 'notes', 'user_id'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { transaction_id, updates: rawUpdates, note } = await req.json();

    if (!transaction_id || !rawUpdates || !note) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Whitelist allowed fields to prevent arbitrary field injection
    const updates = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (rawUpdates[key] !== undefined) {
        updates[key] = rawUpdates[key];
      }
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
    const oldStatus = originalTransaction.status;
    const newStatus = updates.status || oldStatus;
    const statusChanged = oldStatus !== newStatus;

    // Helper: map a status to which bank bucket it affects
    function getBankAdjustments(status, amount) {
      switch (status) {
        case 'banked':
          return { total_earned: amount, current_bank_balance: amount, available_balance: 0, total_paid_out: 0 };
        case 'available':
          return { total_earned: amount, current_bank_balance: 0, available_balance: amount, total_paid_out: 0 };
        case 'paid':
          return { total_earned: amount, current_bank_balance: 0, available_balance: 0, total_paid_out: amount };
        case 'pending':
        default:
          return { total_earned: amount, current_bank_balance: 0, available_balance: 0, total_paid_out: 0 };
      }
    }

    // Reverse old transaction's effect on old user's bank
    const oldAdj = getBankAdjustments(oldStatus, oldAmount);
    const [oldUserBank] = await base44.asServiceRole.entities.CommissionBank.filter({ user_id: oldUserId });
    if (oldUserBank) {
      await base44.asServiceRole.entities.CommissionBank.update(oldUserBank.id, {
        total_earned: (oldUserBank.total_earned || 0) - oldAdj.total_earned,
        current_bank_balance: (oldUserBank.current_bank_balance || 0) - oldAdj.current_bank_balance,
        available_balance: (oldUserBank.available_balance || 0) - oldAdj.available_balance,
        total_paid_out: (oldUserBank.total_paid_out || 0) - oldAdj.total_paid_out,
      });
    }

    // Apply new transaction's effect on (possibly different) user's bank
    const newAdj = getBankAdjustments(newStatus, newAmount);
    if (userChanged) {
      const [newUserBank] = await base44.asServiceRole.entities.CommissionBank.filter({ user_id: newUserId });
      if (newUserBank) {
        await base44.asServiceRole.entities.CommissionBank.update(newUserBank.id, {
          total_earned: (newUserBank.total_earned || 0) + newAdj.total_earned,
          current_bank_balance: (newUserBank.current_bank_balance || 0) + newAdj.current_bank_balance,
          available_balance: (newUserBank.available_balance || 0) + newAdj.available_balance,
          total_paid_out: (newUserBank.total_paid_out || 0) + newAdj.total_paid_out,
        });
      }
    } else {
      // Re-read in case the subtract already updated it
      const [refreshedBank] = await base44.asServiceRole.entities.CommissionBank.filter({ user_id: oldUserId });
      if (refreshedBank) {
        await base44.asServiceRole.entities.CommissionBank.update(refreshedBank.id, {
          total_earned: (refreshedBank.total_earned || 0) + newAdj.total_earned,
          current_bank_balance: (refreshedBank.current_bank_balance || 0) + newAdj.current_bank_balance,
          available_balance: (refreshedBank.available_balance || 0) + newAdj.available_balance,
          total_paid_out: (refreshedBank.total_paid_out || 0) + newAdj.total_paid_out,
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

    // If sale_date was updated, also update the related sale's close_date
    if (updates.sale_date && originalTransaction.sale_id) {
      await base44.asServiceRole.entities.Sale.update(originalTransaction.sale_id, {
        close_date: updates.sale_date,
      });
    }

    return Response.json({
      success: true,
      message: 'Transaction updated and commission banks recalculated',
    });
  } catch (error) {
    console.error('Error editing transaction:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});