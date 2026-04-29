import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Helper to generate unique IDs
let idCounter = 0;
const qid = () => `q_fs_${++idCounter}`;
const hid = () => `h_fs_${++idCounter}`;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { client_name, property_address, sale_id } = await req.json();
  idCounter = 0;

  // ── Section IDs ──
  const H_SCOPE     = hid();
  const H_SITE      = hid();
  const H_STRUCT    = hid();
  const H_UTILITY   = hid();
  const H_BUDGET    = hid();
  const H_REGULATORY = hid();
  const H_RISK      = hid();
  const H_RECOMMEND = hid();
  const H_PHOTOS    = hid();

  // ── The master scope selector question ──
  const Q_SCOPE = qid();

  const SECTION_OPTIONS = [
    "Site & Zoning Analysis",
    "Structural & Building Condition",
    "Utility & Service Assessment",
    "Budget Analysis",
    "Regulatory & Permit Pathway",
    "Risk Assessment",
    "Recommendations & Next Steps",
    "Photo Documentation"
  ];

  // Map section name → heading ID for logic rules
  const SECTION_HEADING_MAP = {
    "Site & Zoning Analysis": H_SITE,
    "Structural & Building Condition": H_STRUCT,
    "Utility & Service Assessment": H_UTILITY,
    "Budget Analysis": H_BUDGET,
    "Regulatory & Permit Pathway": H_REGULATORY,
    "Risk Assessment": H_RISK,
    "Recommendations & Next Steps": H_RECOMMEND,
    "Photo Documentation": H_PHOTOS,
  };

  // Helper: creates a logic rule that shows a question only if a section was selected in the scope question
  const showIfSectionSelected = (sectionName) => [{
    condition_question_id: Q_SCOPE,
    operator: "contains",
    value: sectionName,
    logic_type: "show"
  }];

  // Helper: show question if section selected AND another question has a specific value
  const showIfSectionAndAnswer = (sectionName, triggerId, triggerValue) => [
    { condition_question_id: Q_SCOPE, operator: "contains", value: sectionName, logic_type: "show" },
    { condition_question_id: triggerId, operator: "equals", value: triggerValue, logic_type: "show" }
  ];

  // Helper: show question if section selected AND another question contains a value
  const showIfSectionAndContains = (sectionName, triggerId, triggerValue) => [
    { condition_question_id: Q_SCOPE, operator: "contains", value: sectionName, logic_type: "show" },
    { condition_question_id: triggerId, operator: "contains", value: triggerValue, logic_type: "show" }
  ];

  // ── TRIGGER QUESTIONS ── (used for cross-section triggers)
  // These specific questions trigger Risk Assessment when answered certain ways
  const Q_STRUCT_CONDITION = qid();
  const Q_STRUCT_FOUNDATION = qid();
  const Q_UTILITY_ISSUES = qid();
  const Q_BUDGET_CONCERN = qid();
  const Q_REGULATORY_COMPLEXITY = qid();
  const Q_SITE_ZONING_CONCERN = qid();

  // ── Build all questions ──
  const questions = [];

  // ════════════════════════════════
  // SECTION 1: SCOPE SELECTION
  // ════════════════════════════════
  questions.push({
    id: Q_SCOPE,
    text: "Which assessment sections are needed for this feasibility study?",
    description: "Select all sections that apply. Additional sections may be automatically recommended based on your answers.",
    type: "checkbox",
    category_id: H_SCOPE,
    required: true,
    options: SECTION_OPTIONS,
  });

  questions.push({
    id: qid(),
    text: "Project Type",
    description: "What type of project is being assessed?",
    type: "radio",
    category_id: H_SCOPE,
    required: true,
    options: ["New Build - Garden Suite / ADU", "New Build - Custom Home", "Addition / Extension", "Renovation / Retrofit", "Commercial Build", "Other"],
    allow_other: true,
  });

  questions.push({
    id: qid(),
    text: "Property Address",
    type: "text",
    category_id: H_SCOPE,
    required: true,
    placeholder: property_address || "Enter the full property address",
  });

  questions.push({
    id: qid(),
    text: "Client Name",
    type: "text",
    category_id: H_SCOPE,
    required: true,
    placeholder: client_name || "Client name",
  });

  questions.push({
    id: qid(),
    text: "Municipality / Jurisdiction",
    type: "dropdown",
    category_id: H_SCOPE,
    required: true,
    options: ["City of Hamilton", "County of Brant", "City of Brantford", "Haldimand County", "Norfolk County", "Other"],
    allow_other: true,
  });

  questions.push({
    id: qid(),
    text: "Brief Scope Description",
    description: "Describe the proposed project in a few sentences",
    type: "textarea",
    category_id: H_SCOPE,
    required: false,
    placeholder: "e.g. Proposed 800 sq ft garden suite in rear yard with separate entrance...",
  });

  // ════════════════════════════════
  // SECTION 2: SITE & ZONING ANALYSIS
  // ════════════════════════════════
  questions.push({
    id: qid(),
    text: "Lot Dimensions",
    description: "Approximate lot size (frontage × depth)",
    type: "text",
    category_id: H_SITE,
    required: false,
    placeholder: "e.g. 50ft × 120ft",
    logic_rules: showIfSectionSelected("Site & Zoning Analysis"),
  });

  questions.push({
    id: qid(),
    text: "Total Lot Area (sq ft)",
    type: "number",
    category_id: H_SITE,
    required: false,
    placeholder: "e.g. 6000",
    logic_rules: showIfSectionSelected("Site & Zoning Analysis"),
  });

  questions.push({
    id: qid(),
    text: "Current Zoning Classification",
    type: "text",
    category_id: H_SITE,
    required: false,
    placeholder: "e.g. R-2 Residential",
    logic_rules: showIfSectionSelected("Site & Zoning Analysis"),
  });

  questions.push({
    id: qid(),
    text: "Zoning Permits the Proposed Use?",
    type: "radio",
    category_id: H_SITE,
    required: false,
    options: ["Yes - As of Right", "Yes - With Minor Variance", "No - Rezoning Required", "Unknown - Needs Research"],
    logic_rules: showIfSectionSelected("Site & Zoning Analysis"),
  });

  questions.push({
    id: qid(),
    text: "Required Setbacks Met?",
    type: "radio",
    category_id: H_SITE,
    required: false,
    options: ["Yes - All setbacks met", "Partially - Minor encroachments", "No - Variance required", "Unknown"],
    logic_rules: showIfSectionSelected("Site & Zoning Analysis"),
  });

  questions.push({
    id: Q_SITE_ZONING_CONCERN,
    text: "Are there any zoning concerns or complexities?",
    description: "Selecting 'Yes' will add the Risk Assessment section if not already included",
    type: "radio",
    category_id: H_SITE,
    required: false,
    options: ["No concerns", "Minor concerns", "Significant concerns"],
    logic_rules: showIfSectionSelected("Site & Zoning Analysis"),
  });

  questions.push({
    id: qid(),
    text: "Zoning Concern Details",
    type: "textarea",
    category_id: H_SITE,
    required: false,
    placeholder: "Describe the zoning concerns...",
    logic_rules: showIfSectionAndAnswer("Site & Zoning Analysis", Q_SITE_ZONING_CONCERN, "Significant concerns"),
  });

  questions.push({
    id: qid(),
    text: "Site Access & Grading Notes",
    type: "textarea",
    category_id: H_SITE,
    required: false,
    placeholder: "Describe site access, topography, drainage patterns...",
    logic_rules: showIfSectionSelected("Site & Zoning Analysis"),
  });

  questions.push({
    id: qid(),
    text: "Site Photos",
    description: "Upload photos of the property, lot, and surrounding area",
    type: "file_upload",
    category_id: H_SITE,
    required: false,
    allowed_file_types: ["image", "video"],
    max_files: 10,
    logic_rules: showIfSectionSelected("Site & Zoning Analysis"),
  });

  // ════════════════════════════════
  // SECTION 3: STRUCTURAL & BUILDING CONDITION
  // ════════════════════════════════
  questions.push({
    id: Q_STRUCT_FOUNDATION,
    text: "Foundation Type & Condition",
    type: "radio",
    category_id: H_STRUCT,
    required: false,
    options: ["Poured Concrete - Good", "Poured Concrete - Fair", "Poured Concrete - Poor", "Block Foundation - Good", "Block Foundation - Fair", "Block Foundation - Poor", "Slab on Grade", "Other / Unknown"],
    logic_rules: showIfSectionSelected("Structural & Building Condition"),
  });

  questions.push({
    id: qid(),
    text: "Foundation Concerns (if Poor)",
    description: "Describe cracking, settlement, or water intrusion issues",
    type: "textarea",
    category_id: H_STRUCT,
    required: false,
    logic_rules: [
      ...showIfSectionSelected("Structural & Building Condition"),
      { condition_question_id: Q_STRUCT_FOUNDATION, operator: "contains", value: "Poor", logic_type: "show" }
    ],
  });

  questions.push({
    id: Q_STRUCT_CONDITION,
    text: "Overall Structural Condition",
    description: "Selecting 'Poor' or 'Unsafe' will trigger the Risk Assessment section",
    type: "radio",
    category_id: H_STRUCT,
    required: false,
    options: ["Excellent", "Good", "Fair", "Poor", "Unsafe - Requires Immediate Attention"],
    logic_rules: showIfSectionSelected("Structural & Building Condition"),
  });

  questions.push({
    id: qid(),
    text: "Structural Deficiency Details",
    type: "textarea",
    category_id: H_STRUCT,
    required: false,
    placeholder: "Describe structural deficiencies observed...",
    logic_rules: [
      ...showIfSectionSelected("Structural & Building Condition"),
      { condition_question_id: Q_STRUCT_CONDITION, operator: "contains", value: "Poor", logic_type: "show" }
    ],
  });

  questions.push({
    id: qid(),
    text: "Roof Type & Condition",
    type: "radio",
    category_id: H_STRUCT,
    required: false,
    options: ["Asphalt Shingles - Good", "Asphalt Shingles - Needs Replacement", "Metal Roof - Good", "Metal Roof - Fair", "Flat Roof - Good", "Flat Roof - Needs Repair", "Other"],
    logic_rules: showIfSectionSelected("Structural & Building Condition"),
  });

  questions.push({
    id: qid(),
    text: "Estimated Age of Existing Structure (years)",
    type: "number",
    category_id: H_STRUCT,
    required: false,
    logic_rules: showIfSectionSelected("Structural & Building Condition"),
  });

  questions.push({
    id: qid(),
    text: "Existing Building Square Footage",
    type: "number",
    category_id: H_STRUCT,
    required: false,
    logic_rules: showIfSectionSelected("Structural & Building Condition"),
  });

  questions.push({
    id: qid(),
    text: "Structural Photos",
    description: "Upload photos of foundation, framing, roof, and any areas of concern",
    type: "file_upload",
    category_id: H_STRUCT,
    required: false,
    allowed_file_types: ["image", "video"],
    max_files: 10,
    logic_rules: showIfSectionSelected("Structural & Building Condition"),
  });

  // ════════════════════════════════
  // SECTION 4: UTILITY & SERVICE ASSESSMENT
  // ════════════════════════════════
  questions.push({
    id: qid(),
    text: "Water Service",
    type: "radio",
    category_id: H_UTILITY,
    required: false,
    options: ["Municipal - Adequate", "Municipal - Upgrade Needed", "Well - Adequate", "Well - Needs Testing", "No Service"],
    logic_rules: showIfSectionSelected("Utility & Service Assessment"),
  });

  questions.push({
    id: qid(),
    text: "Sanitary Sewer / Septic",
    type: "radio",
    category_id: H_UTILITY,
    required: false,
    options: ["Municipal Sewer - Connected", "Municipal Sewer - Connection Needed", "Septic - Adequate Capacity", "Septic - Upgrade/Replacement Needed", "No Service"],
    logic_rules: showIfSectionSelected("Utility & Service Assessment"),
  });

  questions.push({
    id: qid(),
    text: "Electrical Service",
    type: "radio",
    category_id: H_UTILITY,
    required: false,
    options: ["200A Service - Adequate", "100A Service - Upgrade Likely", "60A Service - Upgrade Required", "Unknown"],
    logic_rules: showIfSectionSelected("Utility & Service Assessment"),
  });

  questions.push({
    id: qid(),
    text: "Gas Service",
    type: "radio",
    category_id: H_UTILITY,
    required: false,
    options: ["Natural Gas Available", "Propane", "No Gas Service", "Electric Heat Only"],
    logic_rules: showIfSectionSelected("Utility & Service Assessment"),
  });

  questions.push({
    id: Q_UTILITY_ISSUES,
    text: "Are there any utility capacity or connection concerns?",
    description: "Selecting 'Yes' may trigger additional Budget Analysis or Risk items",
    type: "radio",
    category_id: H_UTILITY,
    required: false,
    options: ["No concerns", "Minor upgrades needed", "Significant infrastructure work required"],
    logic_rules: showIfSectionSelected("Utility & Service Assessment"),
  });

  questions.push({
    id: qid(),
    text: "Utility Concern Details",
    type: "textarea",
    category_id: H_UTILITY,
    required: false,
    placeholder: "Describe utility issues, estimated upgrade costs...",
    logic_rules: showIfSectionAndAnswer("Utility & Service Assessment", Q_UTILITY_ISSUES, "Significant infrastructure work required"),
  });

  questions.push({
    id: qid(),
    text: "Utility Photos",
    description: "Upload photos of electrical panel, water meter, septic, etc.",
    type: "file_upload",
    category_id: H_UTILITY,
    required: false,
    allowed_file_types: ["image"],
    max_files: 10,
    logic_rules: showIfSectionSelected("Utility & Service Assessment"),
  });

  // ════════════════════════════════
  // SECTION 5: BUDGET ANALYSIS
  // ════════════════════════════════
  questions.push({
    id: qid(),
    text: "Estimated Construction Budget Range",
    type: "radio",
    category_id: H_BUDGET,
    required: false,
    options: ["Under $100,000", "$100,000 - $250,000", "$250,000 - $500,000", "$500,000 - $750,000", "$750,000 - $1,000,000", "Over $1,000,000"],
    logic_rules: showIfSectionSelected("Budget Analysis"),
  });

  questions.push({
    id: qid(),
    text: "Pre-Construction Fee Estimate",
    type: "number",
    category_id: H_BUDGET,
    required: false,
    placeholder: "e.g. 25000",
    logic_rules: showIfSectionSelected("Budget Analysis"),
  });

  questions.push({
    id: qid(),
    text: "Key Cost Drivers Identified",
    description: "Select all that apply",
    type: "checkbox",
    category_id: H_BUDGET,
    required: false,
    options: [
      "Site preparation / grading",
      "Foundation work",
      "Utility connections / upgrades",
      "Structural engineering requirements",
      "Permit fees & development charges",
      "Demolition required",
      "Environmental remediation",
      "Custom finishes / high-end materials",
      "Remote site / difficult access"
    ],
    logic_rules: showIfSectionSelected("Budget Analysis"),
  });

  questions.push({
    id: Q_BUDGET_CONCERN,
    text: "Budget Risk Level",
    description: "High risk will trigger the Risk Assessment section",
    type: "radio",
    category_id: H_BUDGET,
    required: false,
    options: ["Low - Within normal parameters", "Medium - Some variables to watch", "High - Significant cost uncertainty"],
    logic_rules: showIfSectionSelected("Budget Analysis"),
  });

  questions.push({
    id: qid(),
    text: "Budget Notes & Assumptions",
    type: "textarea",
    category_id: H_BUDGET,
    required: false,
    placeholder: "Key assumptions, allowances, or exclusions...",
    logic_rules: showIfSectionSelected("Budget Analysis"),
  });

  // ════════════════════════════════
  // SECTION 6: REGULATORY & PERMIT PATHWAY
  // ════════════════════════════════
  questions.push({
    id: qid(),
    text: "Permits Required",
    description: "Select all that will be needed",
    type: "checkbox",
    category_id: H_REGULATORY,
    required: false,
    options: [
      "Building Permit",
      "Demolition Permit",
      "Grading Permit",
      "Minor Variance",
      "Rezoning Application",
      "Site Plan Approval",
      "Conservation Authority Approval",
      "Septic Permit",
      "Heritage Approval",
      "Committee of Adjustment"
    ],
    logic_rules: showIfSectionSelected("Regulatory & Permit Pathway"),
  });

  questions.push({
    id: qid(),
    text: "Estimated Permit Timeline",
    type: "radio",
    category_id: H_REGULATORY,
    required: false,
    options: ["1-3 months", "3-6 months", "6-12 months", "12+ months"],
    logic_rules: showIfSectionSelected("Regulatory & Permit Pathway"),
  });

  questions.push({
    id: Q_REGULATORY_COMPLEXITY,
    text: "Regulatory Complexity Level",
    description: "High complexity will trigger Risk Assessment section",
    type: "radio",
    category_id: H_REGULATORY,
    required: false,
    options: ["Low - Standard permit path", "Medium - Some special approvals", "High - Multiple agencies / appeals likely"],
    logic_rules: showIfSectionSelected("Regulatory & Permit Pathway"),
  });

  questions.push({
    id: qid(),
    text: "Special Regulatory Considerations",
    type: "textarea",
    category_id: H_REGULATORY,
    required: false,
    placeholder: "Environmental constraints, heritage designation, flood plain, etc.",
    logic_rules: showIfSectionSelected("Regulatory & Permit Pathway"),
  });

  // ════════════════════════════════
  // SECTION 7: RISK ASSESSMENT
  // This section is always shown if selected, BUT also shown if triggered by answers in other sections
  // ════════════════════════════════
  // The risk section questions use OR logic — shown if the scope checkbox includes it,
  // OR if specific trigger questions have concerning values
  
  questions.push({
    id: qid(),
    text: "⚠️ This section was included because concerning items were identified in other sections, or you selected it manually.",
    description: "Review each risk factor and document mitigation strategies.",
    type: "text",
    category_id: H_RISK,
    required: false,
    placeholder: "Acknowledged",
    logic_rules: showIfSectionSelected("Risk Assessment"),
  });

  questions.push({
    id: qid(),
    text: "Structural Risk Level",
    type: "radio",
    category_id: H_RISK,
    required: false,
    options: ["Low", "Medium", "High"],
    option_scores: { "Low": 1, "Medium": 3, "High": 5 },
    logic_rules: showIfSectionSelected("Risk Assessment"),
  });

  questions.push({
    id: qid(),
    text: "Zoning / Regulatory Risk Level",
    type: "radio",
    category_id: H_RISK,
    required: false,
    options: ["Low", "Medium", "High"],
    option_scores: { "Low": 1, "Medium": 3, "High": 5 },
    logic_rules: showIfSectionSelected("Risk Assessment"),
  });

  questions.push({
    id: qid(),
    text: "Budget / Financial Risk Level",
    type: "radio",
    category_id: H_RISK,
    required: false,
    options: ["Low", "Medium", "High"],
    option_scores: { "Low": 1, "Medium": 3, "High": 5 },
    logic_rules: showIfSectionSelected("Risk Assessment"),
  });

  questions.push({
    id: qid(),
    text: "Environmental / Site Risk Level",
    type: "radio",
    category_id: H_RISK,
    required: false,
    options: ["Low", "Medium", "High"],
    option_scores: { "Low": 1, "Medium": 3, "High": 5 },
    logic_rules: showIfSectionSelected("Risk Assessment"),
  });

  questions.push({
    id: qid(),
    text: "Timeline / Schedule Risk Level",
    type: "radio",
    category_id: H_RISK,
    required: false,
    options: ["Low", "Medium", "High"],
    option_scores: { "Low": 1, "Medium": 3, "High": 5 },
    logic_rules: showIfSectionSelected("Risk Assessment"),
  });

  questions.push({
    id: qid(),
    text: "Risk Mitigation Notes",
    description: "Describe strategies to mitigate identified risks",
    type: "textarea",
    category_id: H_RISK,
    required: false,
    placeholder: "For each high-risk item, describe proposed mitigation...",
    logic_rules: showIfSectionSelected("Risk Assessment"),
  });

  // ════════════════════════════════
  // SECTION 8: RECOMMENDATIONS & NEXT STEPS
  // ════════════════════════════════
  questions.push({
    id: qid(),
    text: "Overall Feasibility Rating",
    type: "radio",
    category_id: H_RECOMMEND,
    required: false,
    options: ["Highly Feasible", "Feasible with Conditions", "Marginally Feasible", "Not Feasible"],
    option_scores: { "Highly Feasible": 4, "Feasible with Conditions": 3, "Marginally Feasible": 2, "Not Feasible": 1 },
    logic_rules: showIfSectionSelected("Recommendations & Next Steps"),
  });

  questions.push({
    id: qid(),
    text: "Key Conditions / Requirements",
    description: "What must be resolved for the project to proceed?",
    type: "textarea",
    category_id: H_RECOMMEND,
    required: false,
    placeholder: "e.g. Minor variance approval for side setback, septic system upgrade...",
    logic_rules: showIfSectionSelected("Recommendations & Next Steps"),
  });

  questions.push({
    id: qid(),
    text: "Recommended Next Steps",
    description: "Select all that apply",
    type: "checkbox",
    category_id: H_RECOMMEND,
    required: false,
    options: [
      "Proceed to Design Phase",
      "Obtain Minor Variance",
      "Commission Structural Engineer Report",
      "Complete Septic Assessment",
      "Conduct Environmental Study",
      "Obtain Surveyor's Report",
      "Pre-Consultation with Building Department",
      "Conservation Authority Review",
      "Soil / Geotechnical Assessment",
      "Client to Confirm Budget Alignment"
    ],
    logic_rules: showIfSectionSelected("Recommendations & Next Steps"),
  });

  questions.push({
    id: qid(),
    text: "Estimated Pre-Construction Timeline",
    type: "radio",
    category_id: H_RECOMMEND,
    required: false,
    options: ["2-4 weeks", "1-2 months", "2-4 months", "4-6 months", "6+ months"],
    logic_rules: showIfSectionSelected("Recommendations & Next Steps"),
  });

  questions.push({
    id: qid(),
    text: "Additional Notes / Summary",
    type: "textarea",
    category_id: H_RECOMMEND,
    required: false,
    placeholder: "Any final observations, recommendations, or notes for the client...",
    logic_rules: showIfSectionSelected("Recommendations & Next Steps"),
  });

  // ════════════════════════════════
  // SECTION 9: PHOTO DOCUMENTATION
  // ════════════════════════════════
  questions.push({
    id: qid(),
    text: "General Site Photos",
    description: "Upload overall site photos, street view, neighboring properties",
    type: "file_upload",
    category_id: H_PHOTOS,
    required: false,
    allowed_file_types: ["image", "video"],
    max_files: 20,
    logic_rules: showIfSectionSelected("Photo Documentation"),
  });

  questions.push({
    id: qid(),
    text: "Interior Photos (if applicable)",
    description: "Upload photos of interior condition, mechanical systems, etc.",
    type: "file_upload",
    category_id: H_PHOTOS,
    required: false,
    allowed_file_types: ["image", "video"],
    max_files: 20,
    logic_rules: showIfSectionSelected("Photo Documentation"),
  });

  questions.push({
    id: qid(),
    text: "Photo Notes",
    description: "Add captions or descriptions for the photos above",
    type: "textarea",
    category_id: H_PHOTOS,
    required: false,
    placeholder: "Describe what each photo shows, note any areas of concern...",
    logic_rules: showIfSectionSelected("Photo Documentation"),
  });

  // ── Section follow-up rules (trigger Risk Assessment when scores are high) ──
  const sectionFollowupRules = [
    {
      heading_id: H_RISK,
      threshold_score: 10,
      followup_question_ids: []
    }
  ];

  // ── Build the survey ──
  const headings = [
    { id: H_SCOPE, title: "Study Scope & Project Info", description: "Select which assessment sections to include and provide basic project information" },
    { id: H_SITE, title: "Site & Zoning Analysis", description: "Evaluate lot characteristics, zoning compliance, and site conditions" },
    { id: H_STRUCT, title: "Structural & Building Condition", description: "Assess existing structure condition, foundation, roof, and building systems" },
    { id: H_UTILITY, title: "Utility & Service Assessment", description: "Review water, sewer, electrical, and gas service availability and capacity" },
    { id: H_BUDGET, title: "Budget Analysis", description: "Estimate construction costs, identify cost drivers, and assess budget risk" },
    { id: H_REGULATORY, title: "Regulatory & Permit Pathway", description: "Identify required permits, approvals, and regulatory timeline" },
    { id: H_RISK, title: "Risk Assessment", description: "Evaluate and document project risks with mitigation strategies", max_score: 25 },
    { id: H_RECOMMEND, title: "Recommendations & Next Steps", description: "Provide overall feasibility rating and recommended actions" },
    { id: H_PHOTOS, title: "Photo Documentation", description: "Upload and organize project photos" },
  ];

  const title = property_address 
    ? `Feasibility Study — ${property_address}`
    : `Feasibility Study — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const shareToken = 'fs_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

  const surveyData = {
    title,
    description: client_name
      ? `Pre-construction feasibility assessment for ${client_name}`
      : "Pre-construction feasibility assessment",
    survey_type: "feasibility",
    status: "active",
    access_type: "link_only",
    allow_anonymous_responses: true,
    allow_multiple_responses: false,
    headings,
    questions,
    section_followup_rules: sectionFollowupRules,
    share_token: shareToken,
    welcome_page_enabled: true,
    welcome_page_content: `<h2>Pre-Construction Feasibility Study</h2>
<p>This assessment will guide you through evaluating the feasibility of the proposed project. Start by selecting which sections are relevant, then work through each tab to document your findings.</p>
<p><strong>Tips:</strong></p>
<ul>
<li>Your progress is saved automatically every few seconds</li>
<li>You can close and return later using your resume link</li>
<li>Photos can be uploaded directly from your phone's camera</li>
<li>Some sections may appear automatically based on your answers</li>
</ul>`,
    welcome_page_button_text: "Begin Assessment",
    success_message: "Feasibility study submitted successfully! The team will review your assessment.",
    thank_you_page_content: "<h2>Assessment Complete</h2><p>Your feasibility study has been submitted. The pre-construction team will review the findings and follow up with next steps.</p>",
  };

  const created = await base44.entities.Survey.create(surveyData);

  return Response.json({ 
    success: true, 
    survey_id: created.id,
    share_token: shareToken,
    title
  });
});