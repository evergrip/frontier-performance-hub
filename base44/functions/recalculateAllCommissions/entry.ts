import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { dry_run = true } = await req.json();

    // Load all data upfront
    const allTransactions = await base44.asServiceRole.entities.CommissionTransaction.list();
    const saleCommissions = allTransactions
      .filter(t => t.transaction_type === 'sale_commission' && t.sale_id)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    const allBanks = await base44.asServiceRole.entities.CommissionBank.list();
    const allUsers = await base44.asServiceRole.entities.User.list();
    const allRules = await base44.asServiceRole.entities.CommissionRule.list();
    const allSales = await base44.asServiceRole.entities.Sale.list();
    const allProjects = await base44.asServiceRole.entities.Project.list();

    // Index lookups
    const userMap = {};
    allUsers.forEach(u => { userMap[u.id] = u; });
    const ruleMap = {};
    allRules.forEach(r => { ruleMap[r.id] = r; });
    const saleMap = {};
    allSales.forEach(s => { saleMap[s.id] = s; });
    const projectsBySaleId = {};
    allProjects.forEach(p => {
      if (p.sale_id) projectsBySaleId[p.sale_id] = p;
    });

    // Helper: get anniversary window start for a user at a given date
    function getAnniversaryWindowStart(commissionStartDate, asOfDate) {
      if (!commissionStartDate) return null;
      const start = new Date(commissionStartDate);
      const asOf = new Date(asOfDate);
      
      // Find the most recent anniversary on or before asOfDate
      let anniversaryYear = asOf.getFullYear();
      let candidate = new Date(anniversaryYear, start.getMonth(), start.getDate());
      if (candidate > asOf) {
        candidate = new Date(anniversaryYear - 1, start.getMonth(), start.getDate());
      }
      return candidate;
    }

    // Track per-user running state
    const userState = {};

    function getUserState(userId) {
      if (!userState[userId]) {
        userState[userId] = {
          ytd_construction: 0,
          ytd_preconstruction: 0,
          total_earned: 0,
          bank_balance: 0,
          available_balance: 0,
          current_anniversary_start: null
        };
      }
      return userState[userId];
    }

    const results = [];
    const errors = [];
    const changes = [];

    for (const transaction of saleCommissions) {
      try {
        const sale = saleMap[transaction.sale_id];
        if (!sale || !sale.assigned_to) {
          errors.push({ tx_id: transaction.id, error: 'Sale not found or unassigned' });
          continue;
        }

        const salesperson = userMap[sale.assigned_to];
        if (!salesperson || !salesperson.commission_rule_ids?.length) {
          errors.push({ tx_id: transaction.id, error: 'No commission rules' });
          continue;
        }

        const sale_type = transaction.sale_type || sale.sale_type;

        // Find the correct rule for this sale type
        let rule = salesperson.commission_rule_ids
          .map(id => ruleMap[id]).filter(Boolean)
          .find(r => r.sale_type === sale_type);
        if (!rule) {
          rule = salesperson.commission_rule_ids
            .map(id => ruleMap[id]).filter(Boolean)
            .find(r => r.sale_type === 'both');
        }
        if (!rule) {
          rule = ruleMap[salesperson.commission_rule_ids[0]];
        }

        if (!rule || !rule.tiers?.length) {
          errors.push({ tx_id: transaction.id, error: 'No valid rule found' });
          continue;
        }

        const state = getUserState(sale.assigned_to);

        // Check if we've crossed an anniversary boundary
        const txDate = new Date(transaction.created_date);
        const startDate = salesperson.commission_start_date;
        if (startDate) {
          const windowStart = getAnniversaryWindowStart(startDate, txDate);
          if (state.current_anniversary_start === null) {
            state.current_anniversary_start = windowStart;
          } else if (windowStart > state.current_anniversary_start) {
            // Anniversary crossed — reset YTD
            state.ytd_construction = 0;
            state.ytd_preconstruction = 0;
            state.current_anniversary_start = windowStart;
          }
        }

        const saleAmount = transaction.sale_amount || sale.contract_value || 0;
        const ytdConstruction = state.ytd_construction;
        const sortedTiers = [...rule.tiers].sort((a, b) => a.min_volume - b.min_volume);

        let commissionAmount = 0;
        let tierBreakdown = [];

        if (sale_type === 'construction') {
          let remaining = saleAmount;
          let vol = ytdConstruction;

          for (const tier of sortedTiers) {
            if (vol >= (tier.max_volume || Infinity)) continue;

            const tierStart = Math.max(tier.min_volume || 0, vol);
            const tierEnd = tier.max_volume || Infinity;
            const inTier = Math.min(tierEnd - tierStart, remaining);

            if (inTier > 0) {
              const comm = (inTier * tier.commission_rate) / 100;
              commissionAmount += comm;
              vol += inTier;
              remaining -= inTier;
              tierBreakdown.push({ tier: tier.tier_name, amount: inTier, rate: tier.commission_rate, commission: comm });
            }
            if (remaining <= 0) break;
          }
        } else {
          // Precon: use current construction volume to determine tier
          let applicableTier = sortedTiers[0];
          for (const tier of sortedTiers) {
            if (ytdConstruction >= tier.min_volume && (!tier.max_volume || ytdConstruction < tier.max_volume)) {
              applicableTier = tier;
              break;
            }
          }
          commissionAmount = (saleAmount * applicableTier.commission_rate) / 100;
          tierBreakdown.push({ tier: applicableTier.tier_name, amount: saleAmount, rate: applicableTier.commission_rate, commission: commissionAmount });
        }

        // Determine phase and banking split
        let availPct = 0;
        let bankPct = 100;
        let phaseApplied = 'N/A';

        if (sale_type === 'preconstruction') {
          const project = projectsBySaleId[sale.id];
          if (project) {
            const mp = (rule.construction_phase_availability || []).find(p => p.phase === project.status);
            if (mp) { availPct = mp.available_percentage || 0; bankPct = mp.banked_percentage || 100; phaseApplied = project.status; }
          } else {
            const mp = (rule.precon_phase_availability || []).find(p => p.phase === sale.status);
            if (mp) { availPct = mp.available_percentage || 0; bankPct = mp.banked_percentage || 100; phaseApplied = sale.status; }
          }
        } else {
          const project = projectsBySaleId[sale.id];
          if (project) {
            const mp = (rule.construction_phase_availability || []).find(p => p.phase === project.status);
            if (mp) { availPct = mp.available_percentage || 0; bankPct = mp.banked_percentage || 100; phaseApplied = project.status; }
          }
        }

        const availableAmt = (commissionAmount * availPct) / 100;
        const bankedAmt = (commissionAmount * bankPct) / 100;

        // Final tier
        const newConVol = ytdConstruction + (sale_type === 'construction' ? saleAmount : 0);
        let finalTier = sortedTiers[0];
        for (const tier of sortedTiers) {
          if (newConVol >= tier.min_volume && (!tier.max_volume || newConVol < tier.max_volume)) {
            finalTier = tier;
            break;
          }
        }

        // Update running state
        if (sale_type === 'construction') state.ytd_construction += saleAmount;
        else state.ytd_preconstruction += saleAmount;
        state.total_earned += commissionAmount;
        state.bank_balance += bankedAmt;
        state.available_balance += availableAmt;

        // Record the change
        const oldAmount = transaction.amount || 0;
        const oldBanked = transaction.banked_amount || 0;
        const oldTier = transaction.tier_at_time || '';
        const oldBankPct = transaction.banking_percentage;

        const changed = Math.abs(commissionAmount - oldAmount) > 0.01 ||
                        Math.abs(bankedAmt - oldBanked) > 0.01 ||
                        finalTier.tier_name !== oldTier;

        let tierNote = '';
        if (sale_type === 'construction' && tierBreakdown.length > 0) {
          tierNote = `Tier: ${tierBreakdown.map(t => `${t.tier}: $${t.amount.toFixed(2)} @ ${t.rate}% = $${t.commission.toFixed(2)}`).join(' + ')}`;
        } else if (tierBreakdown.length === 1) {
          tierNote = `${tierBreakdown[0].tier}: $${saleAmount.toFixed(2)} @ ${tierBreakdown[0].rate}% = $${commissionAmount.toFixed(2)}`;
        }

        const entry = {
          tx_id: transaction.id,
          sale_title: sale.title,
          sale_type,
          salesperson: salesperson.full_name,
          sale_amount: saleAmount,
          ytd_con_before: ytdConstruction,
          ytd_con_after: state.ytd_construction,
          old_tier: oldTier,
          new_tier: finalTier.tier_name,
          old_amount: oldAmount,
          new_amount: commissionAmount,
          old_banked: oldBanked,
          new_banked: bankedAmt,
          old_bank_pct: oldBankPct,
          new_bank_pct: bankPct,
          phase: phaseApplied,
          tier_detail: tierNote,
          changed
        };

        results.push(entry);
        if (changed) changes.push(entry);

        // If not dry_run, apply the changes
        if (!dry_run) {
          let recalcNote = `Recalculated: ${tierNote}`;
          if (phaseApplied !== 'N/A') recalcNote += ` | Phase: ${phaseApplied} (${availPct}% avail, ${bankPct}% banked)`;

          await base44.asServiceRole.entities.CommissionTransaction.update(transaction.id, {
            amount: commissionAmount,
            commission_rate: null,
            tier_at_time: finalTier.tier_name,
            phase_name: phaseApplied,
            phase_payout_percentage: availPct,
            amount_made_available: availableAmt,
            banking_percentage: bankPct,
            banked_amount: bankedAmt,
            immediate_payout_amount: availableAmt,
            sale_type,
            notes: recalcNote
          });
        }
      } catch (err) {
        errors.push({ tx_id: transaction.id, error: err.message });
      }
    }

    // Build final bank summaries
    const bankSummaries = {};
    for (const [userId, state] of Object.entries(userState)) {
      const sp = userMap[userId];
      bankSummaries[sp?.full_name || userId] = {
        total_earned: state.total_earned,
        bank_balance: state.bank_balance,
        available_balance: state.available_balance,
        ytd_construction: state.ytd_construction,
        ytd_preconstruction: state.ytd_preconstruction
      };
    }

    // If not dry_run, update banks
    if (!dry_run) {
      for (const bank of allBanks) {
        const state = userState[bank.user_id];
        if (state) {
          await base44.asServiceRole.entities.CommissionBank.update(bank.id, {
            total_earned: state.total_earned,
            current_bank_balance: state.bank_balance,
            available_balance: state.available_balance,
            ytd_sales_volume: state.ytd_construction + state.ytd_preconstruction,
            ytd_construction_volume: state.ytd_construction,
            ytd_preconstruction_volume: state.ytd_preconstruction
          });
        }
      }
    }

    // Only include tier or commission amount changes (not just banking pct)
    const tierChanges = changes.filter(c => 
      Math.abs(c.new_amount - c.old_amount) > 0.01 || c.new_tier !== c.old_tier
    ).map(c => ({
      sale: c.sale_title,
      type: c.sale_type,
      person: c.salesperson,
      sale_amt: c.sale_amount,
      old_comm: +c.old_amount.toFixed(2),
      new_comm: +c.new_amount.toFixed(2),
      diff: +(c.new_amount - c.old_amount).toFixed(2),
      old_tier: c.old_tier,
      new_tier: c.new_tier,
      detail: c.tier_detail
    }));

    const bankingChanges = changes.filter(c => 
      Math.abs(c.new_amount - c.old_amount) <= 0.01 && c.new_tier === c.old_tier
    ).map(c => ({
      sale: c.sale_title,
      type: c.sale_type,
      old_bank_pct: c.old_bank_pct,
      new_bank_pct: c.new_bank_pct,
      old_banked: +c.old_banked.toFixed(2),
      new_banked: +c.new_banked.toFixed(2),
      phase: c.phase
    }));

    // Limit output for dry_run readability
    const tierSummary = tierChanges.map(c => `${c.sale} (${c.type}): ${c.old_tier||'none'}→${c.new_tier} $${c.old_comm}→$${c.new_comm} (${c.diff>=0?'+':''}${c.diff})`);
    const bankingSummary = bankingChanges.map(c => `${c.sale} (${c.type}): bank% ${c.old_bank_pct}→${c.new_bank_pct} phase:${c.phase}`);

    return Response.json({
      success: true,
      dry_run,
      total_transactions: results.length,
      total_changed: changes.length,
      tier_changes_count: tierChanges.length,
      tier_changes: tierSummary,
      banking_changes_count: bankingChanges.length,
      bank_summaries: bankSummaries,
      errors
    });

  } catch (error) {
    console.error('Recalculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});