import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { query, user_id } = await req.json();

        if (!query) {
            return Response.json({ error: 'Query is required' }, { status: 400 });
        }

        // Fetch relevant data
        const [leads, sales, projects, commissionBanks] = await Promise.all([
            base44.asServiceRole.entities.Lead.filter({}),
            base44.asServiceRole.entities.Sale.filter({}),
            base44.asServiceRole.entities.Project.filter({}),
            base44.asServiceRole.entities.CommissionBank.filter({})
        ]);

        // Use AI to understand the query and determine what data to return
        const analysisPrompt = `You are a business intelligence assistant for Frontier Building Group. 
User query: "${query}"

Available data summary:
- ${leads.length} leads
- ${sales.length} sales opportunities
- ${projects.length} projects
- ${commissionBanks.length} commission banks

Analyze this query and determine:
1. What data should be retrieved (leads, sales, projects, commissions)
2. What filters to apply
3. What visualization type is best (table, line_chart, bar_chart, pie_chart, metric_cards)
4. What metrics to calculate

Return your analysis in the specified JSON format.`;

        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    intent: { type: "string" },
                    data_type: { type: "string", enum: ["leads", "sales", "projects", "commissions", "pipeline", "kpis"] },
                    filters: { 
                        type: "object",
                        properties: {
                            status: { type: "string" },
                            time_period: { type: "string" },
                            user_id: { type: "string" }
                        }
                    },
                    visualization_type: { type: "string", enum: ["table", "line_chart", "bar_chart", "pie_chart", "metric_cards"] },
                    metrics_to_show: { type: "array", items: { type: "string" } }
                }
            }
        });

        // Process data based on AI analysis
        let resultData = [];
        let chartData = null;
        let metrics = null;

        switch (analysis.data_type) {
            case 'sales':
                resultData = sales;
                if (analysis.filters?.status) {
                    resultData = resultData.filter(s => s.status === analysis.filters.status);
                }
                
                if (analysis.visualization_type === 'bar_chart') {
                    const statusCounts = resultData.reduce((acc, s) => {
                        acc[s.status] = (acc[s.status] || 0) + 1;
                        return acc;
                    }, {});
                    chartData = {
                        type: 'bar',
                        labels: Object.keys(statusCounts),
                        values: Object.values(statusCounts)
                    };
                }
                
                if (analysis.visualization_type === 'metric_cards') {
                    metrics = {
                        total_sales: resultData.length,
                        total_value: resultData.reduce((sum, s) => sum + (s.contract_value || 0), 0),
                        closed_won: resultData.filter(s => s.status === 'closed_won').length,
                        win_rate: resultData.filter(s => ['closed_won', 'closed_lost'].includes(s.status)).length > 0
                            ? (resultData.filter(s => s.status === 'closed_won').length / 
                               resultData.filter(s => ['closed_won', 'closed_lost'].includes(s.status)).length * 100).toFixed(2)
                            : 0
                    };
                }
                break;

            case 'pipeline':
                resultData = sales.filter(s => ['prospect', 'proposal_sent', 'negotiation'].includes(s.status));
                chartData = {
                    type: 'bar',
                    labels: ['Prospect', 'Proposal Sent', 'Negotiation'],
                    values: [
                        resultData.filter(s => s.status === 'prospect').length,
                        resultData.filter(s => s.status === 'proposal_sent').length,
                        resultData.filter(s => s.status === 'negotiation').length
                    ]
                };
                break;

            case 'projects':
                resultData = projects;
                if (analysis.filters?.status) {
                    resultData = resultData.filter(p => p.status === analysis.filters.status);
                }
                
                metrics = {
                    total_projects: resultData.length,
                    active_projects: resultData.filter(p => !['closed', 'cancelled'].includes(p.status)).length,
                    total_value: resultData.reduce((sum, p) => sum + (p.contract_value || 0), 0),
                    total_margin: resultData.reduce((sum, p) => sum + ((p.contract_value || 0) - (p.actual_costs || 0)), 0)
                };
                break;

            case 'leads':
                resultData = leads;
                if (analysis.filters?.status) {
                    resultData = resultData.filter(l => l.status === analysis.filters.status);
                }
                
                chartData = {
                    type: 'pie',
                    labels: ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'],
                    values: [
                        resultData.filter(l => l.status === 'new').length,
                        resultData.filter(l => l.status === 'contacted').length,
                        resultData.filter(l => l.status === 'qualified').length,
                        resultData.filter(l => l.status === 'converted').length,
                        resultData.filter(l => l.status === 'lost').length
                    ]
                };
                break;

            case 'kpis':
                const kpiResponse = await base44.functions.invoke('calculateKPIAggregates', {
                    time_period: analysis.filters?.time_period || 'ytd',
                    user_id: user_id
                });
                metrics = kpiResponse.data.kpis;
                break;
        }

        // Generate natural language response
        const responsePrompt = `Based on the user query "${query}", generate a concise natural language summary of these results:
        
Data type: ${analysis.data_type}
Records found: ${resultData.length}
Metrics: ${JSON.stringify(metrics || {})}

Provide a 2-3 sentence summary that directly answers the user's question.`;

        const summary = await base44.integrations.Core.InvokeLLM({
            prompt: responsePrompt
        });

        return Response.json({
            success: true,
            query: query,
            intent: analysis.intent,
            summary: summary,
            data: {
                type: analysis.data_type,
                records: resultData.slice(0, 50), // Limit to 50 records
                total_count: resultData.length
            },
            visualization: {
                type: analysis.visualization_type,
                chart_data: chartData,
                metrics: metrics
            }
        });

    } catch (error) {
        console.error('Error in aiQueryProcessor:', error);
        return Response.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
});