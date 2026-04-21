/**
 * Entity automation handler: when a Lead is converted (converted_to_sale_id set),
 * automatically create PreconProgress records for the first batch of stages
 * and pre-populate them from lead/client/sale data.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    // Only fire on lead update where converted_to_sale_id was just set
    if (event?.type !== 'update') {
      return Response.json({ skipped: true, reason: 'not an update event' });
    }

    const newSaleId = data?.converted_to_sale_id;
    const oldSaleId = old_data?.converted_to_sale_id;

    if (!newSaleId || newSaleId === oldSaleId) {
      return Response.json({ skipped: true, reason: 'no new sale conversion' });
    }

    const leadId = event.entity_id;

    // Check if progress records already exist for this lead
    const allProgress = await base44.asServiceRole.entities.PreconProgress.list('-created_date', 500);
    const existing = allProgress.filter(p => p.lead_id === leadId);
    if (existing.length > 0) {
      return Response.json({ skipped: true, reason: 'progress records already exist' });
    }

    // Get active stages
    const stages = await base44.asServiceRole.entities.PreconStage.list('stage_order', 200);
    const activeStages = stages.filter(s => s.is_active !== false).sort((a, b) => a.stage_order - b.stage_order);

    if (activeStages.length === 0) {
      return Response.json({ skipped: true, reason: 'no active stages' });
    }

    // Use the data from the event payload (it's the current lead data)
    const lead = data;
    
    let client = null;
    if (lead?.client_id) {
      const allClients = await base44.asServiceRole.entities.Client.list('-created_date', 500);
      client = allClients.find(c => c.id === lead.client_id) || null;
    }

    let sale = null;
    if (newSaleId) {
      const allSales = await base44.asServiceRole.entities.Sale.list('-created_date', 500);
      sale = allSales.find(s => s.id === newSaleId) || null;
    }

    // Create progress records for first 5 stages (pre-populate first stage)
    const autoCreateCount = Math.min(5, activeStages.length);
    const records = [];

    for (let i = 0; i < autoCreateCount; i++) {
      const stage = activeStages[i];
      const record = {
        lead_id: leadId,
        stage_id: stage.id,
        status: i === 0 ? 'in_progress' : 'not_started',
      };

      // Pre-populate Stage 1 form_data from lead/client/sale
      if (stage.stage_order === 1) {
        record.form_data = {
          project_name: lead?.title || '',
          client_name: client?.contact_name || '',
          client_email: client?.email || '',
          client_phone: client?.phone || '',
          lead_source: lead?.source || '',
          estimated_precon_value: lead?.estimated_precon_value || '',
          estimated_construction_value: lead?.estimated_construction_value || '',
        };
      }

      records.push(record);
    }

    // Bulk create
    await base44.asServiceRole.entities.PreconProgress.bulkCreate(records);

    return Response.json({
      success: true,
      created: records.length,
      lead_id: leadId,
      sale_id: newSaleId,
    });
  } catch (error) {
    console.error('preconAutoHandoff error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});