import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Use Eastern time (America/Toronto) to match the business timezone
    const nowEastern = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' }));
    const todayMonth = nowEastern.getMonth() + 1; // 1-12
    const todayDay = nowEastern.getDate();

    const allUsers = await base44.asServiceRole.entities.User.list();
    const commissionBanks = await base44.asServiceRole.entities.CommissionBank.list();
    const results = [];

    for (const u of allUsers) {
      if (!u.is_commission_eligible || !u.commission_start_date) continue;

      const startDate = new Date(u.commission_start_date + 'T12:00:00'); // noon to avoid timezone shift
      const startMonth = startDate.getMonth() + 1;
      const startDay = startDate.getDate();

      // Check if today is this user's anniversary
      if (todayMonth === startMonth && todayDay === startDay) {
        const bank = commissionBanks.find(b => b.user_id === u.id);
        if (!bank) continue;

        const oldVolumes = {
          ytd_construction: bank.ytd_construction_volume || 0,
          ytd_preconstruction: bank.ytd_preconstruction_volume || 0,
          ytd_total: bank.ytd_sales_volume || 0
        };

        // Reset YTD volumes to zero for the new commission year
        await base44.asServiceRole.entities.CommissionBank.update(bank.id, {
          ytd_sales_volume: 0,
          ytd_construction_volume: 0,
          ytd_preconstruction_volume: 0
        });

        // Apply next year's commission rules if set
        const nextYearRules = u.next_year_commission_rule_ids?.length > 0
          ? u.next_year_commission_rule_ids
          : u.commission_rule_ids || [];

        await base44.asServiceRole.entities.User.update(u.id, {
          commission_rule_ids: nextYearRules,
          next_year_commission_rule_ids: nextYearRules
        });

        results.push({
          user_id: u.id,
          user_name: u.full_name,
          anniversary_date: u.commission_start_date,
          old_volumes: oldVolumes,
          new_commission_rules: nextYearRules,
          status: 'reset'
        });
      }
    }

    return Response.json({
      success: true,
      date_checked: `${todayMonth}/${todayDay}`,
      users_reset: results.length,
      results
    });
  } catch (error) {
    console.error('Anniversary rollover error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});