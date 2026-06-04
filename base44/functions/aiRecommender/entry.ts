import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { context_type, entity_data, user_id } = await req.json();

        if (!context_type) {
            return Response.json({ error: 'context_type is required' }, { status: 400 });
        }

        let recommendations = [];

        switch (context_type) {
            case 'lead_scoring':
                // Analyze lead and suggest score
                const leadPrompt = `Analyze this lead and suggest a lead score (0-100) and actions:
                
Lead Data: ${JSON.stringify(entity_data)}

Consider:
- Company size and budget indicators
- Contact quality
- Project type fit
- Urgency signals

Provide scoring rationale and recommended next steps.`;

                const leadAnalysis = await base44.integrations.Core.InvokeLLM({
                    prompt: leadPrompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            suggested_score: { type: "number" },
                            rationale: { type: "string" },
                            recommended_actions: { type: "array", items: { type: "string" } },
                            priority: { type: "string", enum: ["high", "medium", "low"] }
                        }
                    }
                });

                recommendations.push({
                    type: 'lead_scoring',
                    ...leadAnalysis
                });
                break;

            case 'sales_strategy':
                // Fetch user's sales data for context
                const sales = await base44.asServiceRole.entities.Sale.filter({ assigned_to: user_id || user.id });
                
                const strategyPrompt = `Analyze this salesperson's performance and provide strategic recommendations:

Sales Data:
- Total sales: ${sales.length}
- Closed won: ${sales.filter(s => s.status === 'closed_won').length}
- In pipeline: ${sales.filter(s => ['prospect', 'proposal_sent', 'negotiation'].includes(s.status)).length}
- Total value: $${sales.reduce((sum, s) => sum + (s.contract_value || 0), 0)}

Current opportunity: ${JSON.stringify(entity_data || {})}

Provide specific recommendations for:
1. Deal prioritization
2. Closing strategies
3. Pipeline management
4. Next best actions`;

                const strategyAnalysis = await base44.integrations.Core.InvokeLLM({
                    prompt: strategyPrompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            deal_prioritization: { type: "string" },
                            closing_strategies: { type: "array", items: { type: "string" } },
                            pipeline_insights: { type: "string" },
                            next_actions: { type: "array", items: { type: "string" } },
                            focus_areas: { type: "array", items: { type: "string" } }
                        }
                    }
                });

                recommendations.push({
                    type: 'sales_strategy',
                    ...strategyAnalysis
                });
                break;

            case 'project_risk':
                // Analyze project for risks
                const riskPrompt = `Analyze this project for potential risks and provide mitigation strategies:

Project Data: ${JSON.stringify(entity_data)}

Evaluate:
- Budget vs actual costs variance
- Timeline risks
- Resource allocation
- Client communication
- Margin concerns

Provide risk assessment and mitigation plan.`;

                const riskAnalysis = await base44.integrations.Core.InvokeLLM({
                    prompt: riskPrompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            risk_level: { type: "string", enum: ["high", "medium", "low"] },
                            identified_risks: { type: "array", items: { type: "string" } },
                            mitigation_strategies: { type: "array", items: { type: "string" } },
                            action_items: { type: "array", items: { type: "string" } },
                            estimated_impact: { type: "string" }
                        }
                    }
                });

                recommendations.push({
                    type: 'project_risk',
                    ...riskAnalysis
                });
                break;

            case 'commission_optimization':
                // Analyze commission structure
                const commissionBank = await base44.asServiceRole.entities.CommissionBank.filter({ 
                    user_id: user_id || user.id 
                });

                const commPrompt = `Analyze this salesperson's commission data and provide optimization recommendations:

Commission Data: ${JSON.stringify(commissionBank[0] || {})}

Provide recommendations for:
1. Tier advancement strategies
2. Sales volume targets
3. Commission maximization tactics
4. Performance improvement areas`;

                const commAnalysis = await base44.integrations.Core.InvokeLLM({
                    prompt: commPrompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            tier_advancement_strategy: { type: "string" },
                            volume_targets: { type: "array", items: { type: "string" } },
                            optimization_tips: { type: "array", items: { type: "string" } },
                            performance_gaps: { type: "array", items: { type: "string" } }
                        }
                    }
                });

                recommendations.push({
                    type: 'commission_optimization',
                    ...commAnalysis
                });
                break;

            default:
                return Response.json({ 
                    error: 'Invalid context_type. Use: lead_scoring, sales_strategy, project_risk, commission_optimization' 
                }, { status: 400 });
        }

        return Response.json({
            success: true,
            context_type,
            recommendations,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in aiRecommender:', error);
        return Response.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
});