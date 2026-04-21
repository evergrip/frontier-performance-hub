import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Aggregates pre-construction analytics data:
 * - Estimate vs actual variance trends
 * - Most common risks by project type
 * - Average stage cycle times
 * - Pipeline health
 * - Gross margin impact
 * - AI summary of top insights
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all needed data in parallel
    const [leads, sales, stages, allProgress, alerts] = await Promise.all([
      base44.entities.Lead.list('-created_date', 500),
      base44.entities.Sale.list('-created_date', 500),
      base44.entities.PreconStage.list('stage_order', 200),
      base44.asServiceRole.entities.PreconProgress.list('-created_date', 5000),
      base44.asServiceRole.entities.PreconCopilotAlert.list('-created_date', 500),
    ]);

    const activeStages = stages.filter(s => s.is_active !== false);
    const stageMap = {};
    stages.forEach(s => { stageMap[s.id] = s; });

    // ── 1. Pipeline Health ──
    const convertedLeads = leads.filter(l => l.converted_to_sale_id);
    const preconSales = sales.filter(s => s.sale_type === 'preconstruction');
    const activePrecon = preconSales.filter(s => !['closed_won', 'closed_lost'].includes(s.status));
    const closedWon = preconSales.filter(s => s.status === 'closed_won');
    const closedLost = preconSales.filter(s => s.status === 'closed_lost');

    const pipelineHealth = {
      total_leads: leads.length,
      converted_leads: convertedLeads.length,
      conversion_rate: leads.length > 0 ? Math.round((convertedLeads.length / leads.length) * 100) : 0,
      active_precon: activePrecon.length,
      closed_won: closedWon.length,
      closed_lost: closedLost.length,
      win_rate: (closedWon.length + closedLost.length) > 0
        ? Math.round((closedWon.length / (closedWon.length + closedLost.length)) * 100)
        : 0,
      total_pipeline_value: activePrecon.reduce((sum, s) => sum + (s.estimated_construction_budget || 0), 0),
      total_precon_revenue: closedWon.reduce((sum, s) => sum + (s.contract_value || 0), 0),
    };

    // ── 2. Estimate vs Actual Variance ──
    // Compare Stage 6 (preliminary) vs Stage 18 (detailed) vs Stage 20 (final approved) budgets
    const varianceTrends = [];
    const leadsWithProgress = [...new Set(allProgress.map(p => p.lead_id))];

    for (const leadId of leadsWithProgress) {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) continue;
      
      const leadProgress = allProgress.filter(p => p.lead_id === leadId);
      const progressByStageOrder = {};
      leadProgress.forEach(p => {
        const s = stageMap[p.stage_id];
        if (s) progressByStageOrder[s.stage_order] = p;
      });

      const prelim = progressByStageOrder[6]?.form_data?.total_estimated_cost;
      const detailed = progressByStageOrder[18]?.form_data?.total_hard_costs;
      const final = progressByStageOrder[20]?.form_data?.final_budget;

      if (prelim || detailed || final) {
        varianceTrends.push({
          lead_id: leadId,
          project_name: lead.title,
          preliminary_budget: prelim ? parseFloat(prelim) : null,
          detailed_estimate: detailed ? parseFloat(detailed) : null,
          final_approved: final ? parseFloat(final) : null,
          variance_prelim_to_final: prelim && final ? Math.round(((parseFloat(final) - parseFloat(prelim)) / parseFloat(prelim)) * 100) : null,
          created_date: lead.created_date,
        });
      }
    }

    // ── 3. Average Stage Cycle Times ──
    const stageCycleTimes = [];
    for (const stage of activeStages) {
      const stageProgressRecords = allProgress.filter(p => p.stage_id === stage.id);
      const completedRecords = stageProgressRecords.filter(p => p.status === 'complete' && p.completed_at && p.created_date);
      
      if (completedRecords.length > 0) {
        const durations = completedRecords.map(p => {
          const start = new Date(p.created_date).getTime();
          const end = new Date(p.completed_at).getTime();
          return (end - start) / (1000 * 60 * 60 * 24); // days
        }).filter(d => d > 0 && d < 365); // filter outliers

        const avgDays = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
        
        stageCycleTimes.push({
          stage_order: stage.stage_order,
          stage_name: stage.stage_name,
          avg_days: avgDays,
          completed_count: completedRecords.length,
          total_count: stageProgressRecords.length,
        });
      }
    }

    // ── 4. Most Common Risks (from copilot alerts) ──
    const riskCounts = {};
    alerts.forEach(a => {
      const key = a.alert_type;
      riskCounts[key] = (riskCounts[key] || 0) + 1;
    });
    const commonRisks = Object.entries(riskCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // ── 5. Gross Margin Impact ──
    const grossMarginData = closedWon.map(s => {
      const constructionSale = sales.find(cs => cs.linked_precon_sale_id === s.id);
      return {
        project_name: s.title,
        precon_value: s.contract_value || 0,
        construction_value: constructionSale?.contract_value || s.estimated_construction_budget || 0,
        precon_as_pct_of_construction: (s.contract_value && (constructionSale?.contract_value || s.estimated_construction_budget))
          ? Math.round((s.contract_value / (constructionSale?.contract_value || s.estimated_construction_budget)) * 100)
          : null,
      };
    }).filter(d => d.construction_value > 0);

    // ── 6. AI Summary ──
    let aiSummary = '';
    const recentProjects = varianceTrends.slice(0, 10);
    if (recentProjects.length > 0 || stageCycleTimes.length > 0) {
      const summaryPrompt = `You are a construction business analyst. Analyze this pre-construction data and provide exactly 3 actionable insights.

PIPELINE: ${JSON.stringify(pipelineHealth)}
BUDGET VARIANCES (recent projects): ${JSON.stringify(recentProjects)}
STAGE CYCLE TIMES: ${JSON.stringify(stageCycleTimes.slice(0, 15))}
COMMON RISKS: ${JSON.stringify(commonRisks)}
GROSS MARGIN DATA: ${JSON.stringify(grossMarginData.slice(0, 10))}

Provide 3 concise, specific insights focused on improving pre-construction efficiency, reducing budget variance, and pipeline optimization. Use plain business language.`;

      aiSummary = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: summaryPrompt,
      });
    }

    return Response.json({
      success: true,
      pipeline_health: pipelineHealth,
      variance_trends: varianceTrends,
      stage_cycle_times: stageCycleTimes,
      common_risks: commonRisks,
      gross_margin_data: grossMarginData,
      ai_summary: aiSummary,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});