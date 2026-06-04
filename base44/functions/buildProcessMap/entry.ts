import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileUrl, additionalContext, processMapTitle, processMapDepartment, stepTypes } = await req.json();

    // Step 1: Extract text from file if provided
    let documentText = "";
    if (fileUrl) {
      console.log("Extracting text from file:", fileUrl);
      const extracted = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: "object",
          properties: {
            content: { type: "string", description: "The complete text content of the document. Preserve all table data, step numbers, role names, and process details." }
          }
        }
      });
      
      if (extracted?.status === "success" && extracted?.output) {
        documentText = typeof extracted.output === "string" 
          ? extracted.output 
          : (extracted.output.content || JSON.stringify(extracted.output));
      }
      console.log("Extracted text length:", documentText.length);
    }

    if (!documentText && !additionalContext) {
      return Response.json({ error: "No document content or context provided." }, { status: 400 });
    }

    // Truncate to avoid token limits
    const input = (documentText || additionalContext).substring(0, 12000);
    const stepTypeList = (stepTypes || []).map(t => `${t.key}`).join(", ");

    console.log("Calling LLM...");
    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Parse this into a process map JSON. Group into phases with steps.

INPUT: ${input}

${additionalContext && documentText ? `CONTEXT: ${additionalContext}` : ""}

TITLE: "${processMapTitle || "Process"}" DEPT: ${processMapDepartment || "General"}
VALID step_type values: ${stepTypeList}

Return JSON with: sections (array of {section_title, section_description, section_steps}), objective, scope, improvements (markdown string).
Each step: {step_id, step_description, step_type (from valid list above), responsible_roles (array), accountable_role (string), consulted_roles (array), informed_roles (array), estimated_duration_minutes, inputs (array of strings), outputs (array of strings), is_decision_point (bool), decision_options (array of strings), notes}.
Use roles from the document. Mark decision gates with is_decision_point=true.`,
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
                section_steps: { type: "array", items: { type: "object" } }
              }
            }
          },
          objective: { type: "string" },
          scope: { type: "string" },
          improvements: { type: "string" }
        }
      }
    });

    console.log("LLM done. Sections:", response?.sections?.length || 0);
    
    if (!response?.sections || response.sections.length === 0) {
      return Response.json({ 
        error: "AI returned no sections. Please try again or provide more detail." 
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