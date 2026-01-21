import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user_id, time_period } = await req.json();

        // Determine date range based on time_period
        const now = new Date();
        let startDate;
        
        switch (time_period) {
            case 'mtd': // Month to date
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'qtd': // Quarter to date
                startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                break;
            case 'ytd': // Year to date
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'last_month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                break;
            case 'last_quarter':
                startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
                break;
            default: // Default to YTD
                startDate = new Date(now.getFullYear(), 0, 1);
        }

        const startDateStr = startDate.toISOString().split('T')[0];

        // Fetch all relevant data
        const [leads, sales, projects, commissionBanks] = await Promise.all([
            base44.asServiceRole.entities.Lead.filter({}),
            base44.asServiceRole.entities.Sale.filter({}),
            base44.asServiceRole.entities.Project.filter({}),
            base44.asServiceRole.entities.CommissionBank.filter({})
        ]);

        // Filter by user if specified
        const filterByUser = (items, userField) => {
            if (!user_id) return items;
            return items.filter(item => item[userField] === user_id);
        };

        const userLeads = filterByUser(leads, 'assigned_to');
        const userSales = filterByUser(sales, 'assigned_to');
        const userProjects = filterByUser(projects, 'project_manager_id');

        // Filter by date range
        const filterByDate = (items, dateField) => {
            return items.filter(item => {
                const itemDate = new Date(item[dateField]);
                return itemDate >= startDate;
            });
        };

        const periodLeads = filterByDate(userLeads, 'created_date');
        const periodSales = filterByDate(userSales, 'created_date');
        const periodProjects = filterByDate(userProjects, 'created_date');

        // Calculate Lead KPIs
        const leadKPIs = {
            total_leads: periodLeads.length,
            qualified_leads: periodLeads.filter(l => l.status === 'qualified').length,
            converted_leads: periodLeads.filter(l => l.status === 'converted').length,
            lost_leads: periodLeads.filter(l => l.status === 'lost').length,
            conversion_rate: periodLeads.length > 0 
                ? (periodLeads.filter(l => l.status === 'converted').length / periodLeads.length * 100).toFixed(2)
                : 0,
            avg_lead_score: periodLeads.length > 0
                ? (periodLeads.reduce((sum, l) => sum + (l.lead_score || 0), 0) / periodLeads.length).toFixed(2)
                : 0,
            total_estimated_value: periodLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0)
        };

        // Calculate Sales KPIs
        const closedWonSales = periodSales.filter(s => s.status === 'closed_won');
        const salesKPIs = {
            total_sales: periodSales.length,
            prospect_sales: periodSales.filter(s => s.status === 'prospect').length,
            proposal_sent: periodSales.filter(s => s.status === 'proposal_sent').length,
            negotiation: periodSales.filter(s => s.status === 'negotiation').length,
            closed_won: closedWonSales.length,
            closed_lost: periodSales.filter(s => s.status === 'closed_lost').length,
            win_rate: periodSales.filter(s => ['closed_won', 'closed_lost'].includes(s.status)).length > 0
                ? (closedWonSales.length / periodSales.filter(s => ['closed_won', 'closed_lost'].includes(s.status)).length * 100).toFixed(2)
                : 0,
            total_contract_value: closedWonSales.reduce((sum, s) => sum + (s.contract_value || 0), 0),
            avg_deal_size: closedWonSales.length > 0
                ? (closedWonSales.reduce((sum, s) => sum + (s.contract_value || 0), 0) / closedWonSales.length).toFixed(2)
                : 0,
            precon_sales: closedWonSales.filter(s => s.sale_type === 'preconstruction').length,
            construction_sales: closedWonSales.filter(s => s.sale_type === 'construction').length
        };

        // Calculate Project KPIs
        const activeProjects = periodProjects.filter(p => !['closed', 'cancelled'].includes(p.status));
        const completedProjects = periodProjects.filter(p => p.status === 'completion' || p.status === 'closed');
        
        const projectKPIs = {
            total_projects: periodProjects.length,
            active_projects: activeProjects.length,
            completed_projects: completedProjects.length,
            planning_stage: periodProjects.filter(p => p.status === 'planning').length,
            execution_stage: periodProjects.filter(p => p.status === 'execution').length,
            total_contract_value: periodProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0),
            total_actual_costs: periodProjects.reduce((sum, p) => sum + (p.actual_costs || 0), 0),
            total_margin: periodProjects.reduce((sum, p) => {
                const margin = (p.contract_value || 0) - (p.actual_costs || 0);
                return sum + margin;
            }, 0),
            avg_margin_percentage: periodProjects.length > 0
                ? (periodProjects.reduce((sum, p) => {
                    if (!p.contract_value || p.contract_value === 0) return sum;
                    const margin = ((p.contract_value - (p.actual_costs || 0)) / p.contract_value) * 100;
                    return sum + margin;
                }, 0) / periodProjects.length).toFixed(2)
                : 0,
            precon_projects: periodProjects.filter(p => p.project_type === 'preconstruction').length,
            construction_projects: periodProjects.filter(p => p.project_type === 'construction').length
        };

        // Calculate Commission KPIs
        const userCommissionBank = user_id 
            ? commissionBanks.find(b => b.user_id === user_id)
            : null;

        const commissionKPIs = user_id && userCommissionBank ? {
            current_bank_balance: userCommissionBank.current_bank_balance || 0,
            total_earned: userCommissionBank.total_earned || 0,
            total_paid_out: userCommissionBank.total_paid_out || 0,
            quarterly_payout: userCommissionBank.quarterly_payout_amount || 0,
            ytd_sales_volume: userCommissionBank.ytd_sales_volume || 0,
            current_tier: userCommissionBank.current_tier || 'N/A'
        } : {
            total_banked: commissionBanks.reduce((sum, b) => sum + (b.current_bank_balance || 0), 0),
            total_earned_all: commissionBanks.reduce((sum, b) => sum + (b.total_earned || 0), 0),
            total_paid_out_all: commissionBanks.reduce((sum, b) => sum + (b.total_paid_out || 0), 0)
        };

        // Overall Pipeline Health
        const pipelineHealth = {
            pipeline_value: sales.filter(s => ['prospect', 'proposal_sent', 'negotiation'].includes(s.status))
                .reduce((sum, s) => sum + (s.contract_value || 0), 0),
            weighted_pipeline: sales.filter(s => ['prospect', 'proposal_sent', 'negotiation'].includes(s.status))
                .reduce((sum, s) => {
                    const weights = { prospect: 0.2, proposal_sent: 0.5, negotiation: 0.75 };
                    return sum + ((s.contract_value || 0) * (weights[s.status] || 0));
                }, 0),
            avg_sales_cycle: 0 // Could be calculated based on date differences
        };

        return Response.json({
            success: true,
            time_period,
            start_date: startDateStr,
            user_id: user_id || 'all',
            kpis: {
                leads: leadKPIs,
                sales: salesKPIs,
                projects: projectKPIs,
                commissions: commissionKPIs,
                pipeline: pipelineHealth
            }
        });

    } catch (error) {
        console.error('Error in calculateKPIAggregates:', error);
        return Response.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
});