import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rule, seeded_np_percent, seeded_revenue } = await req.json();

    if (!rule || seeded_np_percent === undefined || seeded_revenue === undefined) {
      return Response.json({ error: 'Missing required fields: rule, seeded_np_percent, seeded_revenue' }, { status: 400 });
    }

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const eligibleUsers = allUsers.filter(u => u.profit_sharing_eligible);

    const gateValue = rule.payout_gate_value || 0;
    const companyRetention = rule.company_retention_percent || 0;
    const distributionPercent = rule.distribution_percent || 0;
    const pools = rule.pools || [];
    const eligibilityRules = rule.eligibility_rules || {};

    // Calculate excess
    const excessPercent = Math.max(0, seeded_np_percent - gateValue);
    const excessDollars = (excessPercent / 100) * seeded_revenue;

    if (excessDollars <= 0) {
      return Response.json({
        gate_met: false,
        seeded_np_percent,
        gate_value: gateValue,
        excess_percent: 0,
        excess_dollars: 0,
        company_retention: 0,
        distributable_amount: 0,
        pool_breakdowns: [],
        employee_payouts: [],
        total_payout: 0
      });
    }

    const companyRetentionDollars = excessDollars * (companyRetention / 100);
    const distributableAmount = excessDollars * (distributionPercent / 100);

    // Build pool breakdowns
    const poolBreakdowns = [];
    const employeePayouts = [];

    for (const pool of pools) {
      const poolAmount = distributableAmount * (pool.allocation_percent / 100);

      // Find eligible users for this pool
      // Users now have profit_sharing_pools (array) — match if any user pool is in the pool's eligible_roles
      const poolNameNormalized = pool.pool_name.toLowerCase().replace(/\s+/g, '_');
      const eligibleRoles = (pool.eligible_roles || []).map(r => r.toLowerCase().replace(/\s+/g, '_'));

      const allPoolUsers = eligibleUsers.filter(u => {
        const userPools = (u.profit_sharing_pools || []).map(p => p.toLowerCase().replace(/\s+/g, '_'));
        if (userPools.length === 0) return false;
        if (eligibleRoles.includes('all')) return true;
        // User is in this pool if any of their assigned pools matches the eligible roles OR the pool name itself
        return userPools.some(up => eligibleRoles.includes(up) || up === poolNameNormalized);
      });
      const headCount = allPoolUsers.length || 1;
      const baseSharePerPerson = poolAmount / headCount;

      const poolPayouts = [];
      for (const emp of allPoolUsers) {
        let tenureYears = 0;
        if (emp.hire_date) {
          const hire = new Date(emp.hire_date);
          const now = new Date();
          tenureYears = Math.floor((now - hire) / (365.25 * 24 * 60 * 60 * 1000));
        }

        // Check min months
        const minMonths = eligibilityRules.min_months_employed || 0;
        const monthsEmployed = tenureYears * 12;
        if (emp.hire_date) {
          const hire = new Date(emp.hire_date);
          const now = new Date();
          const actualMonths = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
          if (actualMonths < minMonths) continue;
        }

        // Calculate tenure multiplier
        let multiplier = 1;
        if (eligibilityRules.tenure_multiplier_enabled && eligibilityRules.tenure_multipliers?.length > 0) {
          for (const tm of eligibilityRules.tenure_multipliers) {
            if (tenureYears >= tm.min_years && (tm.max_years === null || tm.max_years === undefined || tenureYears <= tm.max_years)) {
              multiplier = tm.multiplier;
              break;
            }
          }
        }

        const finalAmount = baseSharePerPerson * multiplier;

        poolPayouts.push({
          user_id: emp.id,
          user_name: emp.full_name,
          pool_name: pool.pool_name,
          hire_date: emp.hire_date,
          tenure_years: tenureYears,
          base_share: baseSharePerPerson,
          multiplier,
          final_amount: Math.round(finalAmount * 100) / 100
        });

        employeePayouts.push({
          user_id: emp.id,
          user_name: emp.full_name,
          pool_name: pool.pool_name,
          hire_date: emp.hire_date,
          tenure_years: tenureYears,
          base_share: baseSharePerPerson,
          multiplier,
          final_amount: Math.round(finalAmount * 100) / 100
        });
      }

      poolBreakdowns.push({
        pool_name: pool.pool_name,
        allocation_percent: pool.allocation_percent,
        pool_amount: Math.round(poolAmount * 100) / 100,
        eligible_count: allPoolUsers.length,
        base_share_per_person: Math.round(baseSharePerPerson * 100) / 100,
        payouts: poolPayouts
      });
    }

    const totalPayout = employeePayouts.reduce((sum, p) => sum + p.final_amount, 0);

    return Response.json({
      gate_met: true,
      seeded_np_percent,
      gate_value: gateValue,
      excess_percent: Math.round(excessPercent * 100) / 100,
      excess_dollars: Math.round(excessDollars * 100) / 100,
      company_retention: Math.round(companyRetentionDollars * 100) / 100,
      distributable_amount: Math.round(distributableAmount * 100) / 100,
      pool_breakdowns: poolBreakdowns,
      employee_payouts: employeePayouts,
      total_payout: Math.round(totalPayout * 100) / 100
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});