import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admins can use app builder assistant
        if (user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { request_type, request_description, context } = await req.json();

        if (!request_type || !request_description) {
            return Response.json({ 
                error: 'request_type and request_description are required' 
            }, { status: 400 });
        }

        let response = {};

        switch (request_type) {
            case 'generate_entity':
                // Generate entity schema from description
                const entityPrompt = `Generate a JSON schema for a Base44 entity based on this description:

"${request_description}"

Context: This is for Frontier Building Group's performance management system. It should integrate well with existing entities: Client, Lead, Sale, Project, CommissionBank, CommissionTransaction, CommissionPayout, CommissionRule.

Requirements:
- Follow JSON Schema standards
- Include appropriate data types (string, number, boolean, array, object)
- Add descriptive field descriptions
- Include enum constraints where appropriate
- Mark required fields
- Consider relationships with existing entities

Generate a complete, production-ready entity schema.`;

                const entitySchema = await base44.integrations.Core.InvokeLLM({
                    prompt: entityPrompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            type: { type: "string" },
                            properties: { type: "object" },
                            required: { type: "array", items: { type: "string" } },
                            description: { type: "string" },
                            usage_examples: { type: "array", items: { type: "string" } }
                        }
                    }
                });

                response = {
                    entity_schema: entitySchema,
                    implementation_notes: `To create this entity:
1. Create file: entities/${entitySchema.name}.json
2. Add the generated schema
3. Consider creating CRUD pages/components
4. Update related entities if needed`,
                    suggested_pages: [
                        `${entitySchema.name}List - View all records`,
                        `${entitySchema.name}Detail - View/edit single record`,
                        `${entitySchema.name}Analytics - Visualize data`
                    ]
                };
                break;

            case 'generate_kpi':
                // Generate KPI calculation logic
                const kpiPrompt = `Design a new KPI calculation for this requirement:

"${request_description}"

Context: ${JSON.stringify(context || {})}

Provide:
1. KPI name and description
2. Data sources needed
3. Calculation formula
4. Implementation pseudocode
5. Recommended visualization
6. Refresh frequency`;

                const kpiDesign = await base44.integrations.Core.InvokeLLM({
                    prompt: kpiPrompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            kpi_name: { type: "string" },
                            description: { type: "string" },
                            data_sources: { type: "array", items: { type: "string" } },
                            calculation_formula: { type: "string" },
                            implementation_code: { type: "string" },
                            visualization_type: { type: "string" },
                            refresh_frequency: { type: "string" },
                            business_value: { type: "string" }
                        }
                    }
                });

                response = {
                    kpi_design: kpiDesign,
                    implementation_steps: [
                        'Add KPI calculation to calculateKPIAggregates function',
                        'Update Dashboard to display new KPI',
                        'Add filters if needed',
                        'Test with sample data'
                    ]
                };
                break;

            case 'suggest_automation':
                // Suggest workflow automation
                const autoPrompt = `Analyze this workflow need and suggest automation:

"${request_description}"

Current system capabilities:
- Entity automations (triggered on create/update/delete)
- Scheduled automations
- Backend functions
- Commission calculations
- AI integrations

Suggest automation opportunities with:
1. Trigger conditions
2. Actions to perform
3. Implementation approach
4. Expected benefits`;

                const autoSuggestion = await base44.integrations.Core.InvokeLLM({
                    prompt: autoPrompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            automation_name: { type: "string" },
                            trigger_type: { type: "string" },
                            trigger_conditions: { type: "array", items: { type: "string" } },
                            actions: { type: "array", items: { type: "string" } },
                            implementation_details: { type: "string" },
                            expected_benefits: { type: "array", items: { type: "string" } },
                            estimated_time_saved: { type: "string" }
                        }
                    }
                });

                response = {
                    automation_suggestion: autoSuggestion,
                    next_steps: [
                        'Create backend function if needed',
                        'Set up automation in admin panel',
                        'Test with sample data',
                        'Monitor and adjust'
                    ]
                };
                break;

            case 'optimize_workflow':
                // Analyze and optimize existing workflow
                const workflowPrompt = `Analyze this workflow and suggest optimizations:

"${request_description}"

Current state: ${JSON.stringify(context || {})}

Identify:
1. Bottlenecks
2. Manual steps that could be automated
3. Data quality improvements
4. UI/UX enhancements
5. Performance optimizations

Provide specific, actionable recommendations.`;

                const workflowOptimization = await base44.integrations.Core.InvokeLLM({
                    prompt: workflowPrompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            identified_issues: { type: "array", items: { type: "string" } },
                            optimization_recommendations: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        issue: { type: "string" },
                                        recommendation: { type: "string" },
                                        priority: { type: "string" },
                                        implementation_effort: { type: "string" },
                                        expected_impact: { type: "string" }
                                    }
                                }
                            },
                            quick_wins: { type: "array", items: { type: "string" } },
                            long_term_improvements: { type: "array", items: { type: "string" } }
                        }
                    }
                });

                response = {
                    workflow_optimization: workflowOptimization,
                    prioritized_actions: workflowOptimization.optimization_recommendations
                        ?.sort((a, b) => {
                            const priority = { high: 3, medium: 2, low: 1 };
                            return (priority[b.priority] || 0) - (priority[a.priority] || 0);
                        })
                };
                break;

            case 'explain_system':
                // Explain system architecture or feature
                const explainPrompt = `Explain this aspect of the Frontier Building Group system:

"${request_description}"

System overview:
- CRM for leads and clients
- Sales pipeline management
- Project tracking
- Commission calculation and banking
- KPI dashboards
- AI-powered insights

Provide a clear, detailed explanation suitable for a stakeholder.`;

                const explanation = await base44.integrations.Core.InvokeLLM({
                    prompt: explainPrompt
                });

                response = {
                    explanation,
                    related_features: [
                        'Check Dashboard for visualizations',
                        'See Entity schemas for data structure',
                        'Review backend functions for business logic'
                    ]
                };
                break;

            default:
                return Response.json({ 
                    error: 'Invalid request_type. Use: generate_entity, generate_kpi, suggest_automation, optimize_workflow, explain_system' 
                }, { status: 400 });
        }

        return Response.json({
            success: true,
            request_type,
            request_description,
            response,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in appBuilderAssistant:', error);
        return Response.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
});