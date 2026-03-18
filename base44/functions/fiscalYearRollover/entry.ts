import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all commission banks
    const commissionBanks = await base44.asServiceRole.entities.CommissionBank.list();
    
    const results = [];
    const errors = [];

    for (const bank of commissionBanks) {
      try {
        // Get the user
        const users = await base44.asServiceRole.entities.User.filter({ id: bank.user_id });
        const userRecord = users[0];

        if (!userRecord) {
          errors.push({ user_id: bank.user_id, error: 'User not found' });
          continue;
        }

        // Determine next year's commission rules
        // Default to current rules if next year rules not set
        const nextYearRules = userRecord.next_year_commission_rule_ids?.length > 0
          ? userRecord.next_year_commission_rule_ids
          : userRecord.commission_rule_ids || [];

        // Reset YTD volumes to zero
        await base44.asServiceRole.entities.CommissionBank.update(bank.id, {
          ytd_sales_volume: 0,
          ytd_construction_volume: 0,
          ytd_preconstruction_volume: 0
        });

        // Update user's commission rules to next year's rules
        // And set next year's rules to the new current rules (for continuity)
        await base44.asServiceRole.entities.User.update(userRecord.id, {
          commission_rule_ids: nextYearRules,
          next_year_commission_rule_ids: nextYearRules
        });

        results.push({
          user_id: bank.user_id,
          user_name: userRecord.full_name,
          old_ytd_construction: bank.ytd_construction_volume || 0,
          old_ytd_precon: bank.ytd_preconstruction_volume || 0,
          new_commission_rules: nextYearRules,
          status: 'success'
        });

      } catch (error) {
        errors.push({ user_id: bank.user_id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      message: 'Fiscal year rollover completed',
      processed: results.length,
      errors: errors.length,
      results,
      errors
    });

  } catch (error) {
    console.error('Fiscal year rollover error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});