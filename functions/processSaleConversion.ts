import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { conversion_type, entity_id, data } = await req.json();

        // Validate required inputs
        if (!conversion_type || !entity_id) {
            return Response.json({ 
                error: 'Missing required fields: conversion_type and entity_id' 
            }, { status: 400 });
        }

        // Handle Lead to Sale conversion
        if (conversion_type === 'lead_to_sale') {
            const lead = await base44.asServiceRole.entities.Lead.get(entity_id);
            
            if (!lead) {
                return Response.json({ error: 'Lead not found' }, { status: 404 });
            }

            // Prevent duplicate conversion
            if (lead.converted_to_sale_id) {
                return Response.json({ 
                    error: 'Lead already converted to Sale',
                    existing_sale_id: lead.converted_to_sale_id
                }, { status: 400 });
            }

            // Validate lead status
            if (lead.status === 'unqualified' || lead.status === 'lost') {
                return Response.json({ 
                    error: 'Cannot convert unqualified or lost leads' 
                }, { status: 400 });
            }

            // Create Sale from Lead
            const saleData = {
                client_id: lead.client_id,
                lead_id: lead.id,
                sale_type: data?.sale_type || lead.project_type === 'unknown' ? 'construction' : lead.project_type,
                title: data?.title || lead.title,
                status: 'prospect',
                contract_value: data?.contract_value || lead.estimated_value || 0,
                assigned_to: lead.assigned_to,
                notes: data?.notes || `Converted from Lead: ${lead.title}`
            };

            const newSale = await base44.asServiceRole.entities.Sale.create(saleData);

            // Update Lead with conversion link
            await base44.asServiceRole.entities.Lead.update(lead.id, {
                status: 'converted',
                converted_to_sale_id: newSale.id
            });

            return Response.json({ 
                success: true,
                sale_id: newSale.id,
                message: 'Lead successfully converted to Sale'
            });
        }

        // Handle Sale to Project conversion
        if (conversion_type === 'sale_to_project') {
            const sale = await base44.asServiceRole.entities.Sale.get(entity_id);
            
            if (!sale) {
                return Response.json({ error: 'Sale not found' }, { status: 404 });
            }

            // Prevent duplicate conversion
            if (sale.converted_to_project_id) {
                return Response.json({ 
                    error: 'Sale already converted to Project',
                    existing_project_id: sale.converted_to_project_id
                }, { status: 400 });
            }

            // Validate sale status
            if (sale.status !== 'closed_won') {
                return Response.json({ 
                    error: 'Only closed won sales can be converted to projects',
                    current_status: sale.status
                }, { status: 400 });
            }

            // Create Project from Sale
            const projectData = {
                client_id: sale.client_id,
                sale_id: sale.id,
                project_type: sale.sale_type,
                title: data?.title || sale.title,
                status: 'planning',
                contract_value: sale.contract_value,
                start_date: data?.start_date || new Date().toISOString().split('T')[0],
                project_manager_id: data?.project_manager_id || sale.assigned_to,
                notes: data?.notes || `Converted from Sale: ${sale.title}`
            };

            // Add default phases based on project type
            if (sale.sale_type === 'preconstruction') {
                projectData.phases = [
                    { name: 'Feasibility Study', status: 'planning', is_invoiceable: true, commission_processed: false },
                    { name: 'Concept Design', status: 'planning', is_invoiceable: true, commission_processed: false },
                    { name: 'Schematic Design', status: 'planning', is_invoiceable: true, commission_processed: false },
                    { name: 'Design Development', status: 'planning', is_invoiceable: true, commission_processed: false }
                ];
            } else {
                projectData.phases = [
                    { name: 'Mobilization', status: 'planning', is_invoiceable: false, commission_processed: false },
                    { name: 'Foundation', status: 'planning', is_invoiceable: true, commission_processed: false },
                    { name: 'Framing', status: 'planning', is_invoiceable: true, commission_processed: false },
                    { name: 'Completion', status: 'planning', is_invoiceable: true, commission_processed: false }
                ];
            }

            const newProject = await base44.asServiceRole.entities.Project.create(projectData);

            // Update Sale with conversion link
            await base44.asServiceRole.entities.Sale.update(sale.id, {
                converted_to_project_id: newProject.id
            });

            // Process commission if not already done
            if (!sale.commission_processed) {
                try {
                    await base44.functions.invoke('calculateCommission', { 
                        sale_id: sale.id 
                    });
                } catch (commError) {
                    console.error('Commission calculation error:', commError);
                }
            }

            return Response.json({ 
                success: true,
                project_id: newProject.id,
                message: 'Sale successfully converted to Project'
            });
        }

        return Response.json({ 
            error: 'Invalid conversion_type. Must be "lead_to_sale" or "sale_to_project"' 
        }, { status: 400 });

    } catch (error) {
        console.error('Error in processSaleConversion:', error);
        return Response.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
});