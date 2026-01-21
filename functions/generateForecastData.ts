import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { forecast_months = 6, user_id } = await req.json();

        // Fetch sales and projects data
        const [sales, projects] = await Promise.all([
            base44.asServiceRole.entities.Sale.filter({}),
            base44.asServiceRole.entities.Project.filter({})
        ]);

        // Filter by user if specified
        const filterByUser = (items, userField) => {
            if (!user_id) return items;
            return items.filter(item => item[userField] === user_id);
        };

        const userSales = filterByUser(sales, 'assigned_to');
        const userProjects = filterByUser(projects, 'project_manager_id');

        // Get historical closed won rate (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const recentSales = userSales.filter(s => new Date(s.created_date) >= sixMonthsAgo);
        const closedSales = recentSales.filter(s => ['closed_won', 'closed_lost'].includes(s.status));
        const wonSales = closedSales.filter(s => s.status === 'closed_won');
        
        const historicalWinRate = closedSales.length > 0 
            ? wonSales.length / closedSales.length 
            : 0.3; // Default 30% if no historical data

        // Calculate average deal size
        const avgDealSize = wonSales.length > 0
            ? wonSales.reduce((sum, s) => sum + (s.contract_value || 0), 0) / wonSales.length
            : 100000; // Default $100k

        // Calculate average margin
        const completedProjects = userProjects.filter(p => p.actual_costs && p.contract_value);
        const avgMarginPercent = completedProjects.length > 0
            ? completedProjects.reduce((sum, p) => {
                const margin = ((p.contract_value - p.actual_costs) / p.contract_value) * 100;
                return sum + margin;
              }, 0) / completedProjects.length
            : 25; // Default 25% margin

        // Probability weights for different stages
        const probabilityWeights = {
            prospect: 0.2,
            proposal_sent: 0.5,
            negotiation: 0.75,
            closed_won: 1.0
        };

        // Current pipeline
        const activePipeline = userSales.filter(s => ['prospect', 'proposal_sent', 'negotiation'].includes(s.status));

        // Generate forecast for each month
        const forecasts = [];
        const now = new Date();

        for (let i = 0; i < forecast_months; i++) {
            const forecastDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
            const monthLabel = forecastDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

            // Expected revenue from current pipeline
            const pipelineRevenue = activePipeline.reduce((sum, sale) => {
                // Estimate if sale will close in this month based on close_date
                const closeDate = sale.close_date ? new Date(sale.close_date) : null;
                const probability = probabilityWeights[sale.status] || 0;
                
                // If close date is in this forecast month, include with probability
                if (closeDate && 
                    closeDate.getMonth() === forecastDate.getMonth() && 
                    closeDate.getFullYear() === forecastDate.getFullYear()) {
                    return sum + ((sale.contract_value || 0) * probability);
                }
                
                return sum;
            }, 0);

            // New business projection (based on historical average)
            const monthlyAvgNewDeals = wonSales.length > 0 
                ? wonSales.length / 6 
                : 2; // Default 2 deals per month
            
            const projectedNewRevenue = monthlyAvgNewDeals * avgDealSize * historicalWinRate;

            // Total forecasted revenue
            const totalRevenue = pipelineRevenue + projectedNewRevenue;
            
            // Forecasted margin
            const totalMargin = totalRevenue * (avgMarginPercent / 100);

            // Breakdown by type (estimate 60/40 split if no historical data)
            const preconSales = wonSales.filter(s => s.sale_type === 'preconstruction');
            const preconRatio = wonSales.length > 0 
                ? preconSales.length / wonSales.length 
                : 0.4;

            forecasts.push({
                month: monthLabel,
                date: forecastDate.toISOString().split('T')[0],
                forecasted_revenue: Math.round(totalRevenue),
                forecasted_margin: Math.round(totalMargin),
                margin_percentage: avgMarginPercent.toFixed(2),
                pipeline_revenue: Math.round(pipelineRevenue),
                new_business_revenue: Math.round(projectedNewRevenue),
                expected_deals: Math.round(monthlyAvgNewDeals),
                breakdown: {
                    preconstruction: Math.round(totalRevenue * preconRatio),
                    construction: Math.round(totalRevenue * (1 - preconRatio))
                },
                confidence: pipelineRevenue > projectedNewRevenue ? 'high' : 'medium'
            });
        }

        // Calculate summary metrics
        const totalForecastedRevenue = forecasts.reduce((sum, f) => sum + f.forecasted_revenue, 0);
        const totalForecastedMargin = forecasts.reduce((sum, f) => sum + f.forecasted_margin, 0);
        const avgMonthlyRevenue = totalForecastedRevenue / forecast_months;

        return Response.json({
            success: true,
            forecast_period_months: forecast_months,
            user_id: user_id || 'all',
            generated_at: new Date().toISOString(),
            assumptions: {
                historical_win_rate: (historicalWinRate * 100).toFixed(2) + '%',
                avg_deal_size: Math.round(avgDealSize),
                avg_margin_percent: avgMarginPercent.toFixed(2) + '%',
                active_pipeline_count: activePipeline.length,
                active_pipeline_value: activePipeline.reduce((sum, s) => sum + (s.contract_value || 0), 0)
            },
            summary: {
                total_forecasted_revenue: Math.round(totalForecastedRevenue),
                total_forecasted_margin: Math.round(totalForecastedMargin),
                avg_monthly_revenue: Math.round(avgMonthlyRevenue),
                avg_monthly_margin: Math.round(totalForecastedMargin / forecast_months)
            },
            monthly_forecasts: forecasts
        });

    } catch (error) {
        console.error('Error in generateForecastData:', error);
        return Response.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
});