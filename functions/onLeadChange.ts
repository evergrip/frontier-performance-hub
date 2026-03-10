import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload;

    if (!event || !data) {
      return Response.json({ success: true, message: 'No event data' });
    }

    const response = await base44.asServiceRole.functions.invoke('processAlertEvent', {
      entity_type: 'lead',
      entity_id: event.entity_id,
      event_type_hint: event.type,
      data,
      old_data: old_data || null,
    });

    return Response.json({ success: true, result: response.data });
  } catch (error) {
    console.error('onLeadChange error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});