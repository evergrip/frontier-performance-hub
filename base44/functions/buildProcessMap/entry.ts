import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileUrl, additionalContext, processMapTitle, processMapDescription, processMapDepartment, stepTypes } = await req.json();

    // Step 1: Extract text from file if provided
    let documentText = "";
    if (fileUrl) {
      console.log("Extracting text from file:", fileUrl);
      const extracted = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: "object",
          properties: {
            content: { type: "string", description: "The complete text content of the document. Preserve all table data, step numbers, role names, and process details. Format tables as structured text." }
          }
        }
      });
      
      console.log("Extraction status:", extracted?.status);
      if (extracted?.status === "success" && extracted?.output) {
        documentText = typeof extracted.output === "string" 
          ? extracted.output 
          : (extracted.output.content || JSON.stringify(extracted.output));
      } else {
        console.log("Extraction failed, details:", extracted?.details);
      }
    }

    if (!documentText && !additionalContext) {
      return Response.json({ error: "No document content or context provided." }, { status: 400 });
    }

    console.log("Document text length:", documentText.length);
    console.log("First 500 chars:", documentText.substring(0, 500));

    // Step 2: Build process map with LLM
    const stepTypeList = (stepTypes || []).map(t => `"${t.key}": ${t.label}`).join(", ");

    const prompt = `You are an expert process improvement consultant for construction/renovation. Parse this document into a structured process map.

DOCUMENT:
${documentText}

${additionalContext ? `USER CONTEXT: ${additionalContext}` : ""}

PROCESS: "${processMapTitle || "Untitled"}" (${processMapDepartment || "General"})

STEP TYPES (use these exact keys): ${stepTypeList}

For step_type:
- "client_signature_required" = needs client sign-off
- "information_hand_off" = handoff between teams
- "deliverable" = produces a document/report
- "decision" = Go/No-Go gate (set is_decision_point=true, list options in decision_options)
- "meeting" = meetings/presentations
- "admin_requirement" = admin tasks
- "task" = general work
- "milestone" = key checkpoint

Group steps into phases. Use roles from the document for RACI. Capture EVERY step. Output "outputs" as simple string array like ["Report name"] and "decision_options" as string array like ["Go", "No-Go"]. Include improvements as markdown.`;

    console.log("Calling LLM...");
    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section_title: { type: "string" },
                section_description: { type: "string" },
                section_steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      step_id: { type: "string" },
                      step_description: { type: "string" },
                      step_type: { type: "string" },
                      responsible_roles: { type: "array", items: { type: "string" } },
                      accountable_role: { type: "string" },
                      consulted_roles: { type: "array", items: { type: "string" } },
                      informed_roles: { type: "array", items: { type: "string" } },
                      estimated_duration_minutes: { type: "number" },
                      inputs: { type: "array", items: { type: "string" } },
                      outputs: { type: "array", items: { type: "string" } },
                      is_decision_point: { type: "boolean" },
                      decision_options: { type: "array", items: { type: "string" } },
                      notes: { type: "string" }
                    }
                  }
                }
              }
            }
          },
          improvements: { type: "string" },
          objective: { type: "string" },
          scope: { type: "string" }
        }
      },
      model: "gpt_5"
    });

    console.log("LLM response type:", typeof response);
    console.log("Sections count:", response?.sections?.length || 0);
    
    if (!response?.sections || response.sections.length === 0) {
      console.log("Full response:", JSON.stringify(response).substring(0, 2000));
      return Response.json({ 
        error: "AI returned no sections. Response: " + JSON.stringify(response).substring(0, 500) 
      }, { status: 422 });
    }

    const totalSteps = response.sections.reduce((sum, s) => sum + (s.section_steps?.length || 0), 0);
    console.log("Total steps:", totalSteps);

    return Response.json(response);
  } catch (error) {
    console.error("Error:", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});