import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { validation_type, entity_type, entity_id } = await req.json();

        if (!validation_type || !entity_type) {
            return Response.json({ 
                error: 'validation_type and entity_type are required' 
            }, { status: 400 });
        }

        let anomalies = [];
        let suggestions = [];

        // Fetch all data for the entity type
        let allData;
        switch (entity_type) {
            case 'Sale':
                allData = await base44.asServiceRole.entities.Sale.filter({});
                break;
            case 'Project':
                allData = await base44.asServiceRole.entities.Project.filter({});
                break;
            case 'Lead':
                allData = await base44.asServiceRole.entities.Lead.filter({});
                break;
            case 'CommissionTransaction':
                allData = await base44.asServiceRole.entities.CommissionTransaction.filter({});
                break;
            default:
                return Response.json({ error: 'Invalid entity_type' }, { status: 400 });
        }

        // Get specific entity if ID provided
        const targetEntity = entity_id ? allData.find(e => e.id === entity_id) : null;

        switch (validation_type) {
            case 'outlier_detection':
                // Detect numerical outliers
                if (entity_type === 'Sale') {
                    const values = allData.map(s => s.contract_value || 0).filter(v => v > 0);
                    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
                    const stdDev = Math.sqrt(
                        values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
                    );

                    const outliers = allData.filter(s => {
                        const value = s.contract_value || 0;
                        return Math.abs(value - avg) > (2 * stdDev) && value > 0;
                    });

                    if (targetEntity && outliers.find(o => o.id === entity_id)) {
                        anomalies.push({
                            type: 'outlier',
                            severity: 'medium',
                            field: 'contract_value',
                            message: `Contract value of $${targetEntity.contract_value} is significantly different from average ($${Math.round(avg)})`,
                            suggestion: 'Verify this value is correct and not a data entry error'
                        });
                    }
                }

                if (entity_type === 'Project') {
                    // Check margin anomalies
                    allData.forEach(p => {
                        if (p.actual_costs && p.contract_value) {
                            const margin = ((p.contract_value - p.actual_costs) / p.contract_value) * 100;
                            if (margin < 0) {
                                if (!entity_id || p.id === entity_id) {
                                    anomalies.push({
                                        type: 'negative_margin',
                                        severity: 'high',
                                        field: 'margin',
                                        entity_id: p.id,
                                        message: `Project has negative margin: ${margin.toFixed(2)}%`,
                                        suggestion: 'Review costs and consider client communication about overruns'
                                    });
                                }
                            } else if (margin > 50) {
                                if (!entity_id || p.id === entity_id) {
                                    anomalies.push({
                                        type: 'unusually_high_margin',
                                        severity: 'low',
                                        field: 'margin',
                                        entity_id: p.id,
                                        message: `Project has unusually high margin: ${margin.toFixed(2)}%`,
                                        suggestion: 'Verify all costs have been recorded'
                                    });
                                }
                            }
                        }
                    });
                }
                break;

            case 'data_quality':
                // Check for missing or inconsistent data
                if (targetEntity) {
                    const issues = [];
                    
                    if (entity_type === 'Sale') {
                        if (!targetEntity.contract_value || targetEntity.contract_value === 0) {
                            issues.push('Missing or zero contract value');
                        }
                        if (!targetEntity.close_date && ['proposal_sent', 'negotiation'].includes(targetEntity.status)) {
                            issues.push('Missing expected close date for active opportunity');
                        }
                        if (!targetEntity.assigned_to) {
                            issues.push('No salesperson assigned');
                        }
                        if (targetEntity.status === 'closed_won' && !targetEntity.converted_to_project_id) {
                            issues.push('Closed won sale not converted to project');
                        }
                    }

                    if (entity_type === 'Project') {
                        if (!targetEntity.project_manager_id) {
                            issues.push('No project manager assigned');
                        }
                        if (!targetEntity.start_date) {
                            issues.push('Missing start date');
                        }
                        if (targetEntity.status === 'execution' && (!targetEntity.phases || targetEntity.phases.length === 0)) {
                            issues.push('Project in execution without defined phases');
                        }
                    }

                    if (entity_type === 'Lead') {
                        if (!targetEntity.lead_score) {
                            issues.push('Lead score not set');
                        }
                        if (!targetEntity.assigned_to) {
                            issues.push('Lead not assigned to anyone');
                        }
                    }

                    issues.forEach(issue => {
                        anomalies.push({
                            type: 'data_quality',
                            severity: 'medium',
                            message: issue,
                            suggestion: 'Update this field to improve data completeness'
                        });
                    });
                }
                break;

            case 'consistency_check':
                // Check for logical inconsistencies
                if (targetEntity && entity_type === 'Sale') {
                    if (targetEntity.status === 'closed_won' && targetEntity.commission_processed === false) {
                        anomalies.push({
                            type: 'consistency',
                            severity: 'high',
                            message: 'Sale is closed won but commission not processed',
                            suggestion: 'Process commission immediately'
                        });
                    }

                    if (targetEntity.linked_precon_sale_id && targetEntity.sale_type !== 'construction') {
                        anomalies.push({
                            type: 'consistency',
                            severity: 'medium',
                            message: 'Sale has linked preconstruction sale but is not marked as construction type',
                            suggestion: 'Verify sale type is correct'
                        });
                    }
                }

                if (targetEntity && entity_type === 'Project') {
                    const today = new Date();
                    const targetDate = targetEntity.target_completion_date ? new Date(targetEntity.target_completion_date) : null;
                    
                    if (targetDate && targetDate < today && targetEntity.status !== 'closed' && targetEntity.status !== 'completion') {
                        anomalies.push({
                            type: 'consistency',
                            severity: 'high',
                            message: 'Project past target completion date but not marked complete',
                            suggestion: 'Update project status or extend target date'
                        });
                    }
                }
                break;

            case 'ai_analysis':
                // Use AI for deeper analysis
                const analysisPrompt = `Analyze this ${entity_type} data for potential issues, anomalies, or opportunities:

Data: ${JSON.stringify(targetEntity || allData.slice(0, 10))}

Identify:
1. Data quality issues
2. Business logic anomalies
3. Potential risks or red flags
4. Optimization opportunities

Provide specific, actionable findings.`;

                const aiAnalysis = await base44.integrations.Core.InvokeLLM({
                    prompt: analysisPrompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            findings: { 
                                type: "array", 
                                items: {
                                    type: "object",
                                    properties: {
                                        type: { type: "string" },
                                        severity: { type: "string" },
                                        message: { type: "string" },
                                        recommendation: { type: "string" }
                                    }
                                }
                            },
                            overall_health_score: { type: "number" },
                            summary: { type: "string" }
                        }
                    }
                });

                anomalies = aiAnalysis.findings || [];
                suggestions.push(aiAnalysis.summary);
                break;

            default:
                return Response.json({ 
                    error: 'Invalid validation_type. Use: outlier_detection, data_quality, consistency_check, ai_analysis' 
                }, { status: 400 });
        }

        return Response.json({
            success: true,
            validation_type,
            entity_type,
            entity_id: entity_id || 'all',
            anomalies,
            anomaly_count: anomalies.length,
            suggestions,
            validated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in aiDataValidator:', error);
        return Response.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
});