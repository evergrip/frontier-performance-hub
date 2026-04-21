import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Analyzes Buildertrend project files for a given lead/project.
 * Uses read-only service account credentials.
 * Returns structured file inventory + AI analysis with field suggestions.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id, stage_order, project_name } = await req.json();
    if (!lead_id) {
      return Response.json({ error: 'lead_id is required' }, { status: 400 });
    }

    const BT_USERNAME = Deno.env.get('BUILDERTREND_USERNAME');
    const BT_PASSWORD = Deno.env.get('BUILDERTREND_PASSWORD');

    if (!BT_USERNAME || !BT_PASSWORD) {
      return Response.json({ 
        error: 'Buildertrend credentials not configured',
        setup_required: true 
      }, { status: 400 });
    }

    // Fetch lead, progress, and stage data for context
    const [lead, allProgress, stages] = await Promise.all([
      base44.entities.Lead.get(lead_id),
      base44.asServiceRole.entities.PreconProgress.filter({ lead_id }),
      base44.asServiceRole.entities.PreconStage.list('stage_order', 200),
    ]);

    // Build a summary of current progress for the AI
    const stageMap = {};
    stages.forEach(s => { stageMap[s.id] = s; });
    
    const progressSummary = allProgress
      .filter(p => p.form_data && Object.keys(p.form_data).length > 0)
      .sort((a, b) => (stageMap[a.stage_id]?.stage_order || 0) - (stageMap[b.stage_id]?.stage_order || 0))
      .map(p => {
        const s = stageMap[p.stage_id];
        return `Stage ${s?.stage_order} (${s?.stage_name}): ${JSON.stringify(p.form_data)}`;
      })
      .join('\n');

    // Attempt Buildertrend API connection
    // Buildertrend's API uses basic auth or token-based auth
    let btFiles = null;
    let btConnectionStatus = 'disconnected';
    let btError = null;

    try {
      // Try to authenticate and fetch project files from Buildertrend
      const authResponse = await fetch('https://api.buildertrend.net/api/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: BT_USERNAME, password: BT_PASSWORD }),
      });

      if (authResponse.ok) {
        const authData = await authResponse.json();
        const token = authData.token || authData.access_token;

        if (token) {
          // Search for project by name
          const searchName = project_name || lead.title;
          const projectsResponse = await fetch(
            `https://api.buildertrend.net/api/v1/projects?search=${encodeURIComponent(searchName)}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );

          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            const matchedProject = (projectsData.data || projectsData || []).find(
              p => p.name?.toLowerCase().includes(searchName.toLowerCase())
            );

            if (matchedProject) {
              // Fetch files/documents for the matched project
              const filesResponse = await fetch(
                `https://api.buildertrend.net/api/v1/projects/${matchedProject.id}/files`,
                { headers: { 'Authorization': `Bearer ${token}` } }
              );

              if (filesResponse.ok) {
                btFiles = await filesResponse.json();
                btConnectionStatus = 'connected';
              }
            }
          }
        }
      } else {
        btError = `Auth failed: ${authResponse.status}`;
      }
    } catch (e) {
      btError = e.message;
      // API may not be available — fall back to AI simulation
    }

    // Whether or not BT API succeeded, use AI to analyze and suggest
    const currentStage = stages.find(s => s.stage_order === stage_order);
    
    const analysisPrompt = `You are the Frontier Pre-Con Co-Pilot analyzing a Buildertrend project.

PROJECT: ${lead.title}
CURRENT STAGE: ${stage_order} — ${currentStage?.stage_name || 'Unknown'}
STAGE DELIVERABLE: ${currentStage?.main_deliverable || 'N/A'}

EXISTING PROGRESS DATA:
${progressSummary || 'No form data collected yet.'}

${btFiles ? `BUILDERTREND FILES FOUND:
${JSON.stringify(btFiles, null, 2)}` : `BUILDERTREND STATUS: ${btConnectionStatus === 'connected' ? 'Connected but no matching project found' : 'Not connected — credentials may need verification or API endpoint may differ'}
${btError ? `Error: ${btError}` : ''}`}

Based on this project context, provide:
1. FILE_INVENTORY: A categorized list of what files/documents should exist in Buildertrend for this stage (drawings, photos, specs, contracts, etc.)
2. FIELD_SUGGESTIONS: Specific values to auto-fill in the current stage's deliverable form, based on available data
3. UPLOAD_CHECKLIST: Items that need to be manually uploaded back to Buildertrend after the Hub generates PDFs
4. GAPS: Any missing documents or data that should be obtained

Keep responses specific to the current stage. Use S.V.I.C. language for any client-facing suggestions.`;

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          file_inventory: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                file_name: { type: 'string' },
                status: { type: 'string', enum: ['found', 'expected', 'missing'] },
                notes: { type: 'string' },
              }
            }
          },
          field_suggestions: {
            type: 'object',
            description: 'Key-value map of form field keys to suggested values'
          },
          upload_checklist: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item: { type: 'string' },
                destination_folder: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              }
            }
          },
          gaps: {
            type: 'array',
            items: { type: 'string' }
          },
          summary: { type: 'string' },
        }
      }
    });

    return Response.json({
      success: true,
      bt_connection_status: btConnectionStatus,
      bt_error: btError,
      project_name: project_name || lead.title,
      stage_order,
      stage_name: currentStage?.stage_name,
      analysis,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});