import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, image_url, selected_style, room_description } = await req.json();

    if (action === 'analyze') {
      // Step 1: AI looks at the uploaded photo and suggests design styles
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an expert interior designer for a home renovation company called Frontier Building Group. 
        
Analyze this room photo carefully. Identify:
1. What type of room it is (living room, kitchen, bedroom, bathroom, etc.)
2. The current style and condition
3. Key architectural features (windows, doors, ceiling height, layout)

Then suggest exactly 5 renovation design styles that would work well for THIS specific room based on its layout and features. Each style should be meaningfully different.

For each style, provide:
- name: A catchy 2-3 word style name (e.g. "Modern Minimalist", "Cozy Farmhouse", "Industrial Chic")
- description: One sentence describing the look and feel
- key_elements: 3-4 specific design elements that define this style (materials, colors, fixtures)
- emoji: A single emoji that represents the style

Also provide a brief description of the current room.`,
        file_urls: [image_url],
        response_json_schema: {
          type: "object",
          properties: {
            room_type: { type: "string" },
            current_description: { type: "string" },
            styles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  key_elements: { type: "array", items: { type: "string" } },
                  emoji: { type: "string" }
                }
              }
            }
          }
        },
        model: 'gemini_3_flash'
      });

      return Response.json({ success: true, analysis: result });
    }

    if (action === 'generate') {
      // Step 2: Generate the redesigned room image
      const result = await base44.asServiceRole.integrations.Core.GenerateImage({
        prompt: `A professional interior design photo of a fully renovated ${room_description || 'room'}. The renovation style is "${selected_style.name}": ${selected_style.description}. Key design elements include: ${(selected_style.key_elements || []).join(', ')}. 

The room should look like a real, high-end renovation — photorealistic, professionally staged, with natural lighting. Show the space as if it were photographed for an architectural magazine. The layout should feel like the same room but completely transformed with the new design style.`,
        existing_image_urls: [image_url]
      });

      return Response.json({ success: true, image_url: result.url });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});