import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { fiscal_year, quarter } = await req.json();
    if (!fiscal_year || !quarter) {
      return Response.json({ error: 'Missing fiscal_year or quarter' }, { status: 400 });
    }

    // Get the active rule for this fiscal year
    const allRules = await base44.asServiceRole.entities.VarCompRule.filter({ status: 'active' });
    const rule = allRules.find(r => r.effective_fiscal_year === fiscal_year);
    if (!rule) {
      return Response.json({ error: `No active rule found for FY ${fiscal_year}` }, { status: 404 });
    }

    // Get the quarterly NP entry
    const npEntries = await base44.asServiceRole.entities.NetProfitEntry.filter({
      period_type: 'quarterly',
      fiscal_year,
      period_number: quarter
    });
    if (!npEntries || npEntries.length === 0) {
      return Response.json({ error: `No quarterly NP entry found for Q${quarter} FY ${fiscal_year}. Enter the quarterly financials first.` }, { status: 404 });
    }
    const npEntry = npEntries[0];

    const gateValue = rule.payout_gate_value || 0;
    const minNpFloor = rule.min_net_profit_dollars || 0;
    const npPercent = npEntry.net_profit_percent || 0;
    const revenue = npEntry.total_revenue || 0;
    const netProfitDollars = npEntry.net_profit_dollars || 0;

    // Check gates
    const percentGateMet = npPercent > gateValue;
    // For quarterly, scale the dollar floor to 1/4 of the annual floor
    const quarterlyFloor = minNpFloor / 4;
    const dollarFloorMet = quarterlyFloor <= 0 || netProfitDollars >= quarterlyFloor;

    const gateMet = percentGateMet && dollarFloorMet;

    if (!gateMet) {
      return Response.json({
        gate_met: false,
        quarter,
        fiscal_year,
        np_percent: npPercent,
        gate_value: gateValue,
        net_profit_dollars: netProfitDollars,
        quarterly_floor: quarterlyFloor,
        percent_gate_met: percentGateMet,
        floor_met: dollarFloorMet,
        message: `Q${quarter} did not meet the profit sharing gate.`
      });
    }

    // Gate met — calculate payouts
    const excessPercent = Math.max(0, npPercent - gateValue);
    const excessDollars = (excessPercent / 100) * revenue;
    const companyRetention = rule.company_retention_percent || 0;
    const distributionPercent = rule.distribution_percent || 0;
    const distributableAmount = excessDollars * (distributionPercent / 100);
    const pools = rule.pools || [];
    const eligibilityRules = rule.eligibility_rules || {};

    // Get eligible users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const eligibleUsers = allUsers.filter(u => u.profit_sharing_eligible);

    // Delete any existing payouts for this quarter to avoid duplicates
    const existingPayouts = await base44.asServiceRole.entities.VarCompPayout.filter({
      fiscal_year,
      quarter,
      rule_id: rule.id
    });
    for (const ep of existingPayouts) {
      await base44.asServiceRole.entities.VarCompPayout.delete(ep.id);
    }

    const createdPayouts = [];

    for (const pool of pools) {
      const poolAmount = distributableAmount * (pool.allocation_percent / 100);
      const poolNameNormalized = pool.pool_name.toLowerCase().replace(/\s+/g, '_');
      const eligibleRoles = (pool.eligible_roles || []).map(r => r.toLowerCase().replace(/\s+/g, '_'));

      const poolUsers = eligibleUsers.filter(u => {
        const userPools = (u.profit_sharing_pools || []).map(p => p.toLowerCase().replace(/\s+/g, '_'));
        if (userPools.length === 0) return false;
        if (eligibleRoles.includes('all')) return true;
        return userPools.some(up => eligibleRoles.includes(up) || up === poolNameNormalized);
      });

      const headCount = poolUsers.length || 1;
      const baseSharePerPerson = poolAmount / headCount;

      for (const emp of poolUsers) {
        let tenureYears = 0;
        if (emp.hire_date) {
          const hire = new Date(emp.hire_date);
          const now = new Date();
          tenureYears = Math.floor((now - hire) / (365.25 * 24 * 60 * 60 * 1000));
        }

        const minMonths = eligibilityRules.min_months_employed || 0;
        if (emp.hire_date) {
          const hire = new Date(emp.hire_date);
          const now = new Date();
          const actualMonths = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
          if (actualMonths < minMonths) continue;
        }

        let multiplier = 1;
        if (eligibilityRules.tenure_multiplier_enabled && eligibilityRules.tenure_multipliers?.length > 0) {
          for (const tm of eligibilityRules.tenure_multipliers) {
            if (tenureYears >= tm.min_years && (tm.max_years === null || tm.max_years === undefined || tenureYears <= tm.max_years)) {
              multiplier = tm.multiplier;
              break;
            }
          }
        }

        const finalAmount = Math.round(baseSharePerPerson * multiplier * 100) / 100;

        const payout = await base44.asServiceRole.entities.VarCompPayout.create({
          rule_id: rule.id,
          fiscal_year,
          quarter,
          user_id: emp.id,
          user_name: emp.full_name,
          pool_name: pool.pool_name,
          base_share_amount: Math.round(baseSharePerPerson * 100) / 100,
          tenure_multiplier: multiplier,
          tenure_years: tenureYears,
          final_payout_amount: finalAmount,
          status: 'projected',
          calculation_date: new Date().toISOString().split('T')[0],
          notes: `Q${quarter} FY ${fiscal_year} — auto-calculated`
        });

        createdPayouts.push(payout);
      }
    }

    return Response.json({
      gate_met: true,
      quarter,
      fiscal_year,
      np_percent: npPercent,
      gate_value: gateValue,
      net_profit_dollars: netProfitDollars,
      quarterly_floor: quarterlyFloor,
      excess_dollars: Math.round(excessDollars * 100) / 100,
      distributable_amount: Math.round(distributableAmount * 100) / 100,
      payouts_created: createdPayouts.length,
      message: `Q${quarter} gate met! ${createdPayouts.length} payout records created.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});