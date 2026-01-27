import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sale_id, project_id, phase, type } = await req.json();

    if ((!sale_id && !project_id) || !phase || !type) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get the sale or project
    let sale, assignedTo, commissionRuleId;
    
    if (type === 'preconstruction' && sale_id) {
      const sales = await base44.asServiceRole.entities.Sale.filter({ id: sale_id });
      sale = sales[0];
      assignedTo = sale?.assigned_to;
    } else if (type === 'construction' && project_id) {
      const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
      const project = projects[0];
      if (project?.sale_id) {
        const sales = await base44.asServiceRole.entities.Sale.filter({ id: project.sale_id });
        sale = sales[0];
        assignedTo = sale?.assigned_to;
      }
    }

    if (!assignedTo) {
      return Response.json({ error: 'No salesperson assigned' }, { status: 404 });
    }

    // Get the salesperson's user record
    const users = await base44.asServiceRole.entities.User.filter({ id: assignedTo });
    const salesperson = users[0];

    if (!salesperson?.commission_rule_ids?.length) {
      return Response.json({ error: 'Salesperson has no commission rules assigned' }, { status: 400 });
    }

    // Get the commission rule
    commissionRuleId = salesperson.commission_rule_ids[0];
    const rules = await base44.asServiceRole.entities.CommissionRule.filter({ id: commissionRuleId });
    const commissionRule = rules[0];

    if (!commissionRule) {
      return Response.json({ error: 'Commission rule not found' }, { status: 404 });
    }

    // Get phase payout percentage
    let phasePayouts = [];
    if (type === 'preconstruction') {
      phasePayouts = commissionRule.precon_phase_availability || [];
    } else if (type === 'construction') {
      phasePayouts = commissionRule.construction_phase_availability || [];
    }

    const phasePayout = phasePayouts.find(p => p.phase === phase);
    if (!phasePayout || !phasePayout.payout_percentage) {
      return Response.json({ success: true, message: 'No payout configured for this phase' });
    }

    // Get commission bank
    const banks = await base44.asServiceRole.entities.CommissionBank.filter({ user_id: assignedTo });
    const commissionBank = banks[0];

    if (!commissionBank) {
      return Response.json({ error: 'Commission bank not found' }, { status: 404 });
    }

    // Get the original commission transaction
    const transactions = await base44.asServiceRole.entities.CommissionTransaction.filter({ 
      sale_id: sale_id || sale.id,
      transaction_type: 'sale_commission'
    });

    if (transactions.length === 0) {
      return Response.json({ error: 'Original commission transaction not found' }, { status: 404 });
    }

    const originalTransaction = transactions[0];
    const totalCommission = originalTransaction.amount || 0;
    const amountToMakeAvailable = (totalCommission * phasePayout.payout_percentage) / 100;

    // Create phase commission transaction
    const phaseTransaction = await base44.asServiceRole.entities.CommissionTransaction.create({
      user_id: assignedTo,
      sale_id: sale_id || sale.id,
      project_id: project_id || null,
      transaction_type: 'phase_commission',
      amount: 0, // No new commission earned
      phase_name: phase,
      phase_payout_percentage: phasePayout.payout_percentage,
      amount_made_available: amountToMakeAvailable,
      status: 'available',
      notes: `${phasePayout.payout_percentage}% made available upon completing ${phase} phase`
    });

    // Update commission bank - move from banked to available
    const newBankBalance = (commissionBank.current_bank_balance || 0) - amountToMakeAvailable;
    const newAvailableBalance = (commissionBank.available_balance || 0) + amountToMakeAvailable;

    await base44.asServiceRole.entities.CommissionBank.update(commissionBank.id, {
      current_bank_balance: Math.max(0, newBankBalance),
      available_balance: newAvailableBalance
    });

    return Response.json({
      success: true,
      phase_transaction: phaseTransaction,
      amount_made_available: amountToMakeAvailable,
      new_bank_balance: newBankBalance,
      new_available_balance: newAvailableBalance
    });

  } catch (error) {
    console.error('Phase commission update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});