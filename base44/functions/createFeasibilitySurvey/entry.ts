import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── ID helpers ───
let idCounter = 0;
const qid = (prefix = 'q_fs_') => `${prefix}${++idCounter}`;
const hid = () => `h_fs_${++idCounter}`;

// ─── Risk-trigger values that auto-add Risk Assessment ───
const RISK_TRIGGER_VALUES = [
  "Poor", "High", "Critical", "Unknown", "No", "Yes - Concern",
  "Requires Review", "Not Confirmed", "Unsafe", "Unclear", "Likely",
  "Possible", "Major Risk", "Permit Required", "Engineer Required",
  "Variance Required", "Financing Not Confirmed", "Budget Misaligned",
  "No - Not confirmed", "Significant concerns", "Significant infrastructure work required",
  "High - Significant cost uncertainty", "High - Multiple agencies / appeals likely",
  "Unsafe - Requires Immediate Attention", "Rezoning Required",
  "No - Rezoning Required", "Unknown - Needs Research",
  "Proceed only after investigation", "Pause until client/budget alignment",
  "Pause until professional review", "Disqualify / not a fit"
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    project_name,
    client_name,
    client_email,
    property_address,
    project_type,
    assigned_to,
    internal_notes,
    study_mode, // "client_questionnaire" | "staff_checklist" | "combined"
    sale_id,
  } = body;

  idCounter = 0;

  // ══════════════════════════════════
  // SECTION HEADING IDS
  // ══════════════════════════════════
  const H_SCOPE = hid();
  const H_CLIENT_READINESS = hid();
  const H_PROJECT_SCOPE = hid();
  const H_PROPERTY = hid();
  const H_ZONING = hid();
  const H_CODE_PERMITS = hid();
  const H_SITE_ACCESS = hid();
  const H_EXISTING_STRUCTURE = hid();
  const H_STRUCTURAL = hid();
  const H_CIVIL = hid();
  const H_UTILITIES = hid();
  const H_ENVIRONMENTAL = hid();
  const H_DESIGN = hid();
  const H_BUDGET = hid();
  const H_SCHEDULE = hid();
  const H_PROCUREMENT = hid();
  const H_LEGAL = hid();
  const H_CONSTRUCTABILITY = hid();
  const H_ONSITE = hid();
  const H_RISK = hid();
  const H_NEXT_STEPS = hid();

  // Master scope question ID
  const Q_SCOPE_SECTIONS = qid();
  const Q_SCOPE_PROJECT_TYPE = qid();
  const Q_SCOPE_ONSITE = qid();

  // Section option names (must match heading titles exactly)
  const ALL_SECTION_NAMES = [
    "Client & Decision Readiness",
    "Project Scope",
    "Property & Ownership",
    "Zoning & Planning",
    "Building Code & Permits",
    "Site Access & Logistics",
    "Existing Structure",
    "Structural Review",
    "Civil, Grading & Drainage",
    "Utilities & Servicing",
    "Environmental & Hazardous Materials",
    "Design Feasibility",
    "Budget & Estimate Feasibility",
    "Schedule Feasibility",
    "Procurement & Long-Lead Items",
    "Legal, Insurance & Risk",
    "Constructability",
    "Onsite Staff Checklist",
    "Risk Assessment",
    "Recommended Next Steps",
  ];

  const SECTION_ID_MAP = {
    "Client & Decision Readiness": H_CLIENT_READINESS,
    "Project Scope": H_PROJECT_SCOPE,
    "Property & Ownership": H_PROPERTY,
    "Zoning & Planning": H_ZONING,
    "Building Code & Permits": H_CODE_PERMITS,
    "Site Access & Logistics": H_SITE_ACCESS,
    "Existing Structure": H_EXISTING_STRUCTURE,
    "Structural Review": H_STRUCTURAL,
    "Civil, Grading & Drainage": H_CIVIL,
    "Utilities & Servicing": H_UTILITIES,
    "Environmental & Hazardous Materials": H_ENVIRONMENTAL,
    "Design Feasibility": H_DESIGN,
    "Budget & Estimate Feasibility": H_BUDGET,
    "Schedule Feasibility": H_SCHEDULE,
    "Procurement & Long-Lead Items": H_PROCUREMENT,
    "Legal, Insurance & Risk": H_LEGAL,
    "Constructability": H_CONSTRUCTABILITY,
    "Onsite Staff Checklist": H_ONSITE,
    "Risk Assessment": H_RISK,
    "Recommended Next Steps": H_NEXT_STEPS,
  };

  // ─── Logic rule helpers ───
  const showIf = (sectionName) => [{
    condition_question_id: Q_SCOPE_SECTIONS,
    operator: "contains",
    value: sectionName,
    logic_type: "show"
  }];

  const showIfAnd = (sectionName, triggerId, op, val) => [
    { condition_question_id: Q_SCOPE_SECTIONS, operator: "contains", value: sectionName, logic_type: "show" },
    { condition_question_id: triggerId, operator: op, value: val, logic_type: "show" }
  ];

  // ─── Helper to build a scored radio question ───
  const scoredRadio = (text, categoryId, sectionName, opts, scores, extra = {}) => ({
    id: qid(), text, type: "radio", category_id: categoryId, required: false,
    options: opts,
    option_scores: scores,
    weight: extra.weight || 1,
    logic_rules: showIf(sectionName),
    ...extra,
  });

  // ─── Helper: simple radio ───
  const simpleRadio = (text, categoryId, sectionName, opts, extra = {}) => ({
    id: qid(), text, type: "radio", category_id: categoryId, required: false,
    options: opts,
    logic_rules: showIf(sectionName),
    ...extra,
  });

  // ─── Helper: textarea ───
  const textArea = (text, categoryId, sectionName, extra = {}) => ({
    id: qid(), text, type: "textarea", category_id: categoryId, required: false,
    logic_rules: showIf(sectionName),
    ...extra,
  });

  // ─── Helper: file upload ───
  const fileUpload = (text, categoryId, sectionName, extra = {}) => ({
    id: qid(), text, type: "file_upload", category_id: categoryId, required: false,
    allowed_file_types: ["image", "video"], max_files: extra.max_files || 10,
    logic_rules: showIf(sectionName),
    ...extra,
  });

  // ══════════════════════════════════
  // BUILD ALL QUESTIONS
  // ══════════════════════════════════
  const questions = [];

  // ═══ SECTION 1: SCOPE SELECTOR ═══
  questions.push({
    id: Q_SCOPE_PROJECT_TYPE,
    text: "Project Type",
    description: "What type of project is being assessed? Select all that apply.",
    type: "checkbox", category_id: H_SCOPE, required: true,
    options: [
      "New Build", "Addition", "Second Storey Addition", "Whole-Home Renovation",
      "Interior Remodel", "Basement Renovation", "Bathroom Renovation", "Kitchen Renovation",
      "Detached ADU", "Garage Conversion ADU", "Garage Build / Renovation",
      "Deck", "Exterior Renovation", "Other"
    ],
  });

  questions.push({
    id: Q_SCOPE_SECTIONS,
    text: "Select applicable feasibility sections",
    description: "Choose which sections are relevant. Additional sections may be auto-added based on your answers.",
    type: "checkbox", category_id: H_SCOPE, required: true,
    options: ALL_SECTION_NAMES,
  });

  questions.push({
    id: Q_SCOPE_ONSITE,
    text: "Is this being completed by staff during an onsite visit?",
    type: "radio", category_id: H_SCOPE, required: false,
    options: ["Yes", "No", "Partially"],
  });

  questions.push({
    id: qid(), text: "Project Name / Title", type: "text", category_id: H_SCOPE, required: true,
    placeholder: project_name || "Enter project name",
  });
  questions.push({
    id: qid(), text: "Client Name", type: "text", category_id: H_SCOPE, required: true,
    placeholder: client_name || "Client name",
  });
  questions.push({
    id: qid(), text: "Client Email", type: "email", category_id: H_SCOPE, required: false,
    placeholder: client_email || "client@example.com",
  });
  questions.push({
    id: qid(), text: "Property Address", type: "text", category_id: H_SCOPE, required: true,
    placeholder: property_address || "Full property address",
  });
  questions.push({
    id: qid(), text: "Municipality / Jurisdiction", type: "dropdown", category_id: H_SCOPE, required: false,
    options: ["City of Hamilton", "County of Brant", "City of Brantford", "Haldimand County", "Norfolk County", "Other"],
    allow_other: true,
  });
  questions.push({
    id: qid(), text: "Brief Scope Description", type: "textarea", category_id: H_SCOPE, required: false,
    placeholder: "Describe the proposed project scope...",
  });

  // ═══ SECTION 2: CLIENT & DECISION READINESS ═══
  const SEC2 = "Client & Decision Readiness";
  questions.push(scoredRadio("Are all decision makers identified?", H_CLIENT_READINESS, SEC2,
    ["Yes - All identified", "Partially", "No - Not identified", "Unknown"],
    { "Yes - All identified": 3, "Partially": 2, "No - Not identified": 0, "Unknown": 1 }, { weight: 2 }));
  questions.push(scoredRadio("Are all decision makers involved in the process?", H_CLIENT_READINESS, SEC2,
    ["Yes", "Partially", "No", "Unknown"],
    { "Yes": 3, "Partially": 2, "No": 0, "Unknown": 1 }));
  questions.push(scoredRadio("Has the client provided a realistic budget range?", H_CLIENT_READINESS, SEC2,
    ["Yes - Realistic", "Yes - But unrealistic", "No budget discussed", "Unknown"],
    { "Yes - Realistic": 3, "Yes - But unrealistic": 1, "No budget discussed": 0, "Unknown": 1 }, { weight: 2 }));
  questions.push(scoredRadio("Is financing confirmed?", H_CLIENT_READINESS, SEC2,
    ["Yes - Confirmed", "In progress", "No - Not confirmed", "Unknown"],
    { "Yes - Confirmed": 3, "In progress": 2, "No - Not confirmed": 0, "Unknown": 1 }, { weight: 2 }));
  questions.push(scoredRadio("Is there a hard deadline or required completion date?", H_CLIENT_READINESS, SEC2,
    ["No deadline", "Flexible deadline", "Hard deadline", "Unknown"],
    { "No deadline": 3, "Flexible deadline": 2, "Hard deadline": 1, "Unknown": 1 }));
  questions.push(simpleRadio("Will the client live in the home during construction?", H_CLIENT_READINESS, SEC2,
    ["Yes", "No", "Partial occupancy", "Unknown"]));
  questions.push(scoredRadio("Does the client understand pre-con stages are separate from construction pricing?", H_CLIENT_READINESS, SEC2,
    ["Yes - Clear understanding", "Partially", "No", "Unknown"],
    { "Yes - Clear understanding": 3, "Partially": 2, "No": 0, "Unknown": 1 }));
  questions.push(scoredRadio("Does the client accept that unknown conditions may require contingency or change orders?", H_CLIENT_READINESS, SEC2,
    ["Yes - Accepts", "Partially", "No - Refuses", "Unknown"],
    { "Yes - Accepts": 3, "Partially": 2, "No - Refuses": 0, "Unknown": 1 }, { weight: 2 }));
  // Follow-up
  questions.push(textArea("What client expectation needs to be reset?", H_CLIENT_READINESS, SEC2, { is_followup: true }));
  questions.push(simpleRadio("Should the project proceed to design?", H_CLIENT_READINESS, SEC2,
    ["Yes", "Yes with conditions", "No - Not yet", "Requires discussion"], { is_followup: true }));
  questions.push(simpleRadio("Is a budget alignment meeting required?", H_CLIENT_READINESS, SEC2,
    ["Yes", "No"], { is_followup: true }));

  // ═══ SECTION 3: PROJECT SCOPE ═══
  const SEC3 = "Project Scope";
  questions.push(scoredRadio("Is the desired scope clearly defined?", H_PROJECT_SCOPE, SEC3,
    ["Yes - Clearly defined", "Partially defined", "Vague / unclear", "Unknown"],
    { "Yes - Clearly defined": 3, "Partially defined": 2, "Vague / unclear": 0, "Unknown": 1 }, { weight: 2 }));
  questions.push(scoredRadio("Is the project scope likely to change?", H_PROJECT_SCOPE, SEC3,
    ["No - Stable", "Minor changes expected", "Likely to change significantly", "Unknown"],
    { "No - Stable": 3, "Minor changes expected": 2, "Likely to change significantly": 0, "Unknown": 1 }));
  questions.push(simpleRadio("Are there areas of the home/property not yet reviewed?", H_PROJECT_SCOPE, SEC3,
    ["No - All reviewed", "Yes - Some areas not reviewed", "Unknown"]));
  questions.push(scoredRadio("Are owner-supplied materials or owner-performed work expected?", H_PROJECT_SCOPE, SEC3,
    ["No", "Yes - Minor items", "Yes - Significant items", "Unknown"],
    { "No": 3, "Yes - Minor items": 2, "Yes - Significant items": 1, "Unknown": 1 }));
  questions.push(simpleRadio("Are exclusions clearly understood?", H_PROJECT_SCOPE, SEC3,
    ["Yes", "Partially", "No", "Unknown"]));
  questions.push(simpleRadio("Are there future phases the design should account for?", H_PROJECT_SCOPE, SEC3,
    ["No", "Yes - Design rough-in needed", "Unknown"]));
  questions.push(simpleRadio("Are major selections known?", H_PROJECT_SCOPE, SEC3,
    ["Yes - Known", "Partially", "No - Allowances needed", "Unknown"]));
  questions.push(textArea("Scope notes, assumptions, and exclusions", H_PROJECT_SCOPE, SEC3));

  // ═══ SECTION 4: PROPERTY & OWNERSHIP ═══
  const SEC4 = "Property & Ownership";
  questions.push(scoredRadio("Does the client own the property?", H_PROPERTY, SEC4,
    ["Yes", "In process of purchasing", "No", "Unknown"],
    { "Yes": 3, "In process of purchasing": 2, "No": 0, "Unknown": 1 }));
  questions.push(scoredRadio("Are property boundaries known?", H_PROPERTY, SEC4,
    ["Yes - Survey available", "Approximately known", "No - Survey needed", "Unknown"],
    { "Yes - Survey available": 3, "Approximately known": 2, "No - Survey needed": 0, "Unknown": 1 }));
  questions.push(simpleRadio("Is a recent survey available?", H_PROPERTY, SEC4,
    ["Yes", "No - Survey needed", "Unknown"]));
  questions.push(scoredRadio("Are there easements, right-of-ways, shared driveways, or restrictions?", H_PROPERTY, SEC4,
    ["None known", "Yes - Minor", "Yes - Significant", "Unknown"],
    { "None known": 3, "Yes - Minor": 2, "Yes - Significant": 0, "Unknown": 1 }));
  questions.push(simpleRadio("Are there known encroachments?", H_PROPERTY, SEC4,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Is the property rural?", H_PROPERTY, SEC4,
    ["No - Urban/suburban", "Yes - Rural"]));
  questions.push(simpleRadio("Is the property subject to conservation authority review?", H_PROPERTY, SEC4,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Is the property heritage listed or designated?", H_PROPERTY, SEC4,
    ["No", "Yes - Listed", "Yes - Designated", "Unknown"]));
  questions.push(simpleRadio("Are previous permits known?", H_PROPERTY, SEC4,
    ["Yes - All known", "Partially", "No - Unknown history", "Unknown"]));

  // ═══ SECTION 5: ZONING & PLANNING ═══
  const SEC5 = "Zoning & Planning";
  questions.push(scoredRadio("Is the zoning designation confirmed?", H_ZONING, SEC5,
    ["Yes - Confirmed", "No - Not confirmed", "Unknown"],
    { "Yes - Confirmed": 3, "No - Not confirmed": 0, "Unknown": 1 }, { weight: 2 }));
  questions.push(scoredRadio("Is the intended use permitted?", H_ZONING, SEC5,
    ["Yes - As of right", "Yes - With minor variance", "No - Rezoning required", "Unknown"],
    { "Yes - As of right": 3, "Yes - With minor variance": 2, "No - Rezoning required": 0, "Unknown": 1 }, { weight: 3 }));
  questions.push(scoredRadio("Are setbacks confirmed?", H_ZONING, SEC5,
    ["Yes - All met", "Partially - Minor issues", "No - Variance required", "Unknown"],
    { "Yes - All met": 3, "Partially - Minor issues": 2, "No - Variance required": 0, "Unknown": 1 }, { weight: 2 }));
  questions.push(simpleRadio("Is lot coverage confirmed?", H_ZONING, SEC5,
    ["Yes - Within limits", "No - Over limit", "Unknown"]));
  questions.push(simpleRadio("Is building height confirmed?", H_ZONING, SEC5,
    ["Yes - Within limits", "No - Over limit", "Unknown"]));
  questions.push(simpleRadio("Is parking compliance confirmed?", H_ZONING, SEC5,
    ["Yes", "No - Additional parking needed", "Unknown"]));
  questions.push(scoredRadio("Is a minor variance likely?", H_ZONING, SEC5,
    ["Not required", "Likely required", "Required", "Unknown"],
    { "Not required": 3, "Likely required": 1, "Required": 0, "Unknown": 1 }));
  questions.push(simpleRadio("Is site plan approval likely?", H_ZONING, SEC5,
    ["Not required", "Likely required", "Required", "Unknown"]));
  questions.push(simpleRadio("Are development charges applicable?", H_ZONING, SEC5,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Is an ADU or additional dwelling unit included?", H_ZONING, SEC5,
    ["No", "Yes", "Unknown"]));
  questions.push(textArea("Zoning notes and concerns", H_ZONING, SEC5));

  // ═══ SECTION 6: BUILDING CODE & PERMITS ═══
  const SEC6 = "Building Code & Permits";
  questions.push(simpleRadio("Does the project require a building permit?", H_CODE_PERMITS, SEC6,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Are structural changes involved?", H_CODE_PERMITS, SEC6,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Is plumbing being added or relocated?", H_CODE_PERMITS, SEC6,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Is electrical work involved?", H_CODE_PERMITS, SEC6,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Is HVAC affected?", H_CODE_PERMITS, SEC6,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Is a basement bedroom being added?", H_CODE_PERMITS, SEC6,
    ["Yes", "No"]));
  questions.push(simpleRadio("Is an ADU or secondary suite being created?", H_CODE_PERMITS, SEC6,
    ["Yes", "No"]));
  questions.push(scoredRadio("Is fire separation required?", H_CODE_PERMITS, SEC6,
    ["No", "Yes - Confirmed", "Yes - Not confirmed", "Unknown"],
    { "No": 3, "Yes - Confirmed": 3, "Yes - Not confirmed": 0, "Unknown": 1 }));
  questions.push(simpleRadio("Is egress compliance confirmed?", H_CODE_PERMITS, SEC6,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Is energy compliance required (e.g. SB-12)?", H_CODE_PERMITS, SEC6,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Are BCIN drawings required?", H_CODE_PERMITS, SEC6,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Is engineering required?", H_CODE_PERMITS, SEC6,
    ["Yes", "No", "Unknown"]));

  // ═══ SECTION 7: SITE ACCESS & LOGISTICS ═══
  const SEC7 = "Site Access & Logistics";
  questions.push(scoredRadio("Is driveway access adequate for trucks and deliveries?", H_SITE_ACCESS, SEC7,
    ["Yes - Adequate", "Tight but manageable", "Poor - Difficult access", "Unknown"],
    { "Yes - Adequate": 3, "Tight but manageable": 2, "Poor - Difficult access": 0, "Unknown": 1 }));
  questions.push(simpleRadio("Is there space for bins?", H_SITE_ACCESS, SEC7,
    ["Yes", "Limited", "No", "Unknown"]));
  questions.push(simpleRadio("Is there space for material staging?", H_SITE_ACCESS, SEC7,
    ["Yes", "Limited", "No", "Unknown"]));
  questions.push(simpleRadio("Is crane, pump truck, or boom truck access required?", H_SITE_ACCESS, SEC7,
    ["No", "Yes - Access available", "Yes - Access difficult", "Unknown"]));
  questions.push(simpleRadio("Is the driveway narrow, steep, shared, soft, or restricted?", H_SITE_ACCESS, SEC7,
    ["No concerns", "Yes - Concern"]));
  questions.push(simpleRadio("Are neighbours close to the work area?", H_SITE_ACCESS, SEC7,
    ["No", "Yes - Communication needed"]));
  questions.push(simpleRadio("Is road occupancy or municipal permission needed?", H_SITE_ACCESS, SEC7,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Will winter conditions affect access?", H_SITE_ACCESS, SEC7,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Are utility locates required?", H_SITE_ACCESS, SEC7,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Are trees or landscaping in the work zone?", H_SITE_ACCESS, SEC7,
    ["No", "Yes - Minor", "Yes - Significant"]));
  questions.push(fileUpload("Site access photos", H_SITE_ACCESS, SEC7));

  // ═══ SECTION 8: EXISTING STRUCTURE ═══
  const SEC8 = "Existing Structure";
  questions.push(scoredRadio("Is the foundation visibly sound?", H_EXISTING_STRUCTURE, SEC8,
    ["Yes - Good condition", "Fair - Minor concerns", "Poor - Significant issues", "Unknown"],
    { "Yes - Good condition": 3, "Fair - Minor concerns": 2, "Poor - Significant issues": 0, "Unknown": 1 }, { weight: 2 }));
  questions.push(simpleRadio("Are there cracks, settlement, water entry, or signs of movement?", H_EXISTING_STRUCTURE, SEC8,
    ["None observed", "Minor", "Significant", "Unknown"]));
  questions.push(simpleRadio("Are floors level and stable?", H_EXISTING_STRUCTURE, SEC8,
    ["Yes", "Minor issues", "Significant issues", "Unknown"]));
  questions.push(simpleRadio("Are walls/ceilings visibly sagging or damaged?", H_EXISTING_STRUCTURE, SEC8,
    ["No", "Minor", "Significant", "Unknown"]));
  questions.push(simpleRadio("Are load-bearing walls being altered?", H_EXISTING_STRUCTURE, SEC8,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Is the roof structure being altered?", H_EXISTING_STRUCTURE, SEC8,
    ["No", "Yes", "Unknown"]));
  questions.push(scoredRadio("Are previous renovations known to be permitted?", H_EXISTING_STRUCTURE, SEC8,
    ["Yes - Permitted", "Unknown", "No - Likely unpermitted"],
    { "Yes - Permitted": 3, "Unknown": 1, "No - Likely unpermitted": 0 }));
  questions.push(scoredRadio("Is there evidence of mold, water damage, pests, or rot?", H_EXISTING_STRUCTURE, SEC8,
    ["No evidence", "Minor", "Significant", "Unknown"],
    { "No evidence": 3, "Minor": 2, "Significant": 0, "Unknown": 1 }));
  questions.push(simpleRadio("Is the basement dry?", H_EXISTING_STRUCTURE, SEC8,
    ["Yes", "No - Water issues", "Unknown"]));
  questions.push(simpleRadio("Is attic ventilation adequate?", H_EXISTING_STRUCTURE, SEC8,
    ["Yes", "No", "Unknown", "Not applicable"]));
  questions.push(fileUpload("Existing structure photos", H_EXISTING_STRUCTURE, SEC8));

  // ═══ SECTION 9: STRUCTURAL REVIEW ═══
  const SEC9 = "Structural Review";
  questions.push(simpleRadio("Will new loads be added?", H_STRUCTURAL, SEC9,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Is this a second-storey addition?", H_STRUCTURAL, SEC9,
    ["No", "Yes"]));
  questions.push(simpleRadio("Is an addition tying into the existing structure?", H_STRUCTURAL, SEC9,
    ["No", "Yes"]));
  questions.push(simpleRadio("Are large openings planned?", H_STRUCTURAL, SEC9,
    ["No", "Yes"]));
  questions.push(simpleRadio("Are beams, posts, or footings likely required?", H_STRUCTURAL, SEC9,
    ["No", "Yes", "Unknown"]));
  questions.push(scoredRadio("Is foundation capacity confirmed?", H_STRUCTURAL, SEC9,
    ["Yes - Confirmed", "Likely adequate", "Unknown", "No - Inadequate"],
    { "Yes - Confirmed": 3, "Likely adequate": 2, "Unknown": 1, "No - Inadequate": 0 }, { weight: 2 }));
  questions.push(simpleRadio("Are soil conditions known?", H_STRUCTURAL, SEC9,
    ["Yes", "Unknown"]));
  questions.push(simpleRadio("Is temporary shoring required?", H_STRUCTURAL, SEC9,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Are retaining walls required?", H_STRUCTURAL, SEC9,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Is roof tie-in complexity high?", H_STRUCTURAL, SEC9,
    ["No", "Yes", "Unknown"]));

  // ═══ SECTION 10: CIVIL, GRADING & DRAINAGE ═══
  const SEC10 = "Civil, Grading & Drainage";
  questions.push(scoredRadio("Does water currently drain away from the home?", H_CIVIL, SEC10,
    ["Yes", "Partially", "No - Drains toward foundation", "Unknown"],
    { "Yes": 3, "Partially": 2, "No - Drains toward foundation": 0, "Unknown": 1 }));
  questions.push(simpleRadio("Will the project alter existing grading?", H_CIVIL, SEC10,
    ["No", "Yes - Minor", "Yes - Significant"]));
  questions.push(simpleRadio("Are downspouts properly discharged?", H_CIVIL, SEC10,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Is a sump pump present or required?", H_CIVIL, SEC10,
    ["Present", "Required", "Not needed", "Unknown"]));
  questions.push(simpleRadio("Could water be redirected toward a neighbour?", H_CIVIL, SEC10,
    ["No", "Yes - Risk exists", "Unknown"]));
  questions.push(simpleRadio("Is the property in a low area or flood-risk area?", H_CIVIL, SEC10,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Is erosion control required?", H_CIVIL, SEC10,
    ["No", "Yes", "Unknown"]));

  // ═══ SECTION 11: UTILITIES & SERVICING ═══
  const SEC11 = "Utilities & Servicing";
  questions.push(simpleRadio("Is water service adequate?", H_UTILITIES, SEC11,
    ["Yes - Adequate", "Upgrade needed", "Unknown"]));
  questions.push(simpleRadio("Is sanitary service adequate?", H_UTILITIES, SEC11,
    ["Yes - Municipal sewer", "Septic - Adequate", "Septic - Upgrade needed", "Unknown"]));
  questions.push(simpleRadio("Is the property on septic?", H_UTILITIES, SEC11,
    ["No - Municipal sewer", "Yes"]));
  questions.push(simpleRadio("Is septic capacity confirmed?", H_UTILITIES, SEC11,
    ["Yes", "No - Designer needed", "Not applicable", "Unknown"]));
  questions.push(simpleRadio("Is the property on well water?", H_UTILITIES, SEC11,
    ["No - Municipal water", "Yes"]));
  questions.push(simpleRadio("Is well capacity/water quality confirmed?", H_UTILITIES, SEC11,
    ["Yes", "No - Testing needed", "Not applicable", "Unknown"]));
  questions.push(scoredRadio("Is electrical service capacity adequate?", H_UTILITIES, SEC11,
    ["Yes - 200A+", "100A - Upgrade likely", "60A - Upgrade required", "Unknown"],
    { "Yes - 200A+": 3, "100A - Upgrade likely": 2, "60A - Upgrade required": 0, "Unknown": 1 }));
  questions.push(simpleRadio("Is gas service adequate?", H_UTILITIES, SEC11,
    ["Yes", "No", "Not applicable", "Unknown"]));
  questions.push(simpleRadio("Is HVAC capacity adequate?", H_UTILITIES, SEC11,
    ["Yes", "No - Review needed", "Unknown"]));
  questions.push(simpleRadio("Are underground services in the work zone?", H_UTILITIES, SEC11,
    ["No", "Yes", "Unknown"]));

  // ═══ SECTION 12: ENVIRONMENTAL & HAZARDOUS MATERIALS ═══
  const SEC12 = "Environmental & Hazardous Materials";
  questions.push(simpleRadio("Was the home built before 1990?", H_ENVIRONMENTAL, SEC12,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Will demolition disturb older materials?", H_ENVIRONMENTAL, SEC12,
    ["No", "Yes", "Unknown"]));
  questions.push(scoredRadio("Is asbestos testing required?", H_ENVIRONMENTAL, SEC12,
    ["No", "Yes - Required", "Unknown"],
    { "No": 3, "Yes - Required": 1, "Unknown": 1 }));
  questions.push(simpleRadio("Is lead paint possible?", H_ENVIRONMENTAL, SEC12,
    ["No", "Yes - Likely", "Unknown"]));
  questions.push(scoredRadio("Is mold visible or suspected?", H_ENVIRONMENTAL, SEC12,
    ["No", "Yes - Minor", "Yes - Significant", "Unknown"],
    { "No": 3, "Yes - Minor": 2, "Yes - Significant": 0, "Unknown": 1 }));
  questions.push(simpleRadio("Is radon mitigation or rough-in required?", H_ENVIRONMENTAL, SEC12,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Is contaminated soil possible?", H_ENVIRONMENTAL, SEC12,
    ["No", "Yes - Possible", "Unknown"]));
  questions.push(simpleRadio("Is there evidence of underground oil tank?", H_ENVIRONMENTAL, SEC12,
    ["No", "Yes - Suspected", "Unknown"]));
  questions.push(simpleRadio("Are wildlife issues present?", H_ENVIRONMENTAL, SEC12,
    ["No", "Yes"]));
  questions.push(simpleRadio("Are protected trees affected?", H_ENVIRONMENTAL, SEC12,
    ["No", "Yes - Arborist/permit needed", "Unknown"]));

  // ═══ SECTION 13: DESIGN FEASIBILITY ═══
  const SEC13 = "Design Feasibility";
  questions.push(simpleRadio("Are accurate measurements available?", H_DESIGN, SEC13,
    ["Yes", "No - Site measure needed", "Unknown"]));
  questions.push(simpleRadio("Are as-built drawings available?", H_DESIGN, SEC13,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Is a survey/base plan available?", H_DESIGN, SEC13,
    ["Yes", "No - Survey needed", "Unknown"]));
  questions.push(simpleRadio("Does the design suit the existing structure?", H_DESIGN, SEC13,
    ["Yes", "Partially", "No - Significant changes needed", "Unknown"]));
  questions.push(simpleRadio("Are mechanical/plumbing/electrical routes logical?", H_DESIGN, SEC13,
    ["Yes", "Some concerns", "No - Trade review needed", "Unknown"]));
  questions.push(simpleRadio("Are window/opening changes feasible?", H_DESIGN, SEC13,
    ["Yes", "Uncertain", "No"]));
  questions.push(simpleRadio("Will new materials need to match existing?", H_DESIGN, SEC13,
    ["No", "Yes - Likely achievable", "Yes - May be difficult"]));
  questions.push(simpleRadio("Are accessibility or aging-in-place needs included?", H_DESIGN, SEC13,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Are future rough-ins needed?", H_DESIGN, SEC13,
    ["No", "Yes"]));

  // ═══ SECTION 14: BUDGET & ESTIMATE FEASIBILITY ═══
  const SEC14 = "Budget & Estimate Feasibility";
  questions.push(scoredRadio("Does the client budget align with probable scope?", H_BUDGET, SEC14,
    ["Yes - Well aligned", "Close - Minor gap", "No - Significant gap", "Unknown"],
    { "Yes - Well aligned": 3, "Close - Minor gap": 2, "No - Significant gap": 0, "Unknown": 1 }, { weight: 3 }));
  questions.push(simpleRadio("Are trade quotes available?", H_BUDGET, SEC14,
    ["Yes", "Partially", "No"]));
  questions.push(simpleRadio("Are major selections known?", H_BUDGET, SEC14,
    ["Yes", "Partially", "No - Allowances required"]));
  questions.push(simpleRadio("Are allowances required?", H_BUDGET, SEC14,
    ["No", "Yes - Minor", "Yes - Significant"]));
  questions.push(simpleRadio("Are exclusions clearly defined?", H_BUDGET, SEC14,
    ["Yes", "Partially", "No"]));
  questions.push(scoredRadio("Are hidden conditions likely?", H_BUDGET, SEC14,
    ["No - Low risk", "Possible", "Likely", "Unknown"],
    { "No - Low risk": 3, "Possible": 2, "Likely": 1, "Unknown": 1 }));
  questions.push(simpleRadio("Is contingency required?", H_BUDGET, SEC14,
    ["No", "Yes - Standard 10%", "Yes - Higher contingency needed"]));
  questions.push(simpleRadio("Is the budget gap greater than 20%?", H_BUDGET, SEC14,
    ["No", "Yes", "Unknown"]));
  questions.push(textArea("Budget notes, assumptions, and exclusions", H_BUDGET, SEC14));

  // ═══ SECTION 15: SCHEDULE FEASIBILITY ═══
  const SEC15 = "Schedule Feasibility";
  questions.push(scoredRadio("Is the desired start date realistic?", H_SCHEDULE, SEC15,
    ["Yes", "Tight but achievable", "No - Unrealistic", "Unknown"],
    { "Yes": 3, "Tight but achievable": 2, "No - Unrealistic": 0, "Unknown": 1 }));
  questions.push(simpleRadio("Is permit timing known?", H_SCHEDULE, SEC15,
    ["Yes", "Approximate", "Unknown"]));
  questions.push(simpleRadio("Are design and engineering timelines known?", H_SCHEDULE, SEC15,
    ["Yes", "Approximate", "Unknown"]));
  questions.push(simpleRadio("Are selections needed before construction?", H_SCHEDULE, SEC15,
    ["No", "Yes"]));
  questions.push(simpleRadio("Are long-lead items involved?", H_SCHEDULE, SEC15,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Is winter work involved?", H_SCHEDULE, SEC15,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Are trades available?", H_SCHEDULE, SEC15,
    ["Yes", "Limited availability", "Unknown"]));
  questions.push(simpleRadio("Is client occupancy affecting phasing?", H_SCHEDULE, SEC15,
    ["No", "Yes"]));
  questions.push(simpleRadio("Is there a hard deadline?", H_SCHEDULE, SEC15,
    ["No", "Yes - Flexible", "Yes - Hard deadline"]));

  // ═══ SECTION 16: PROCUREMENT & LONG-LEAD ITEMS ═══
  const SEC16 = "Procurement & Long-Lead Items";
  questions.push(simpleRadio("Are custom windows or exterior doors required?", H_PROCUREMENT, SEC16,
    ["No", "Yes"]));
  questions.push(simpleRadio("Are cabinets or millwork required?", H_PROCUREMENT, SEC16,
    ["No", "Yes"]));
  questions.push(simpleRadio("Are engineered beams, trusses, or steel required?", H_PROCUREMENT, SEC16,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Are specialty finishes involved?", H_PROCUREMENT, SEC16,
    ["No", "Yes"]));
  questions.push(simpleRadio("Are appliances selected?", H_PROCUREMENT, SEC16,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Are plumbing fixture specs available?", H_PROCUREMENT, SEC16,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Are lighting/electrical specs available?", H_PROCUREMENT, SEC16,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Is exterior cladding matching required?", H_PROCUREMENT, SEC16,
    ["No", "Yes - Likely achievable", "Yes - May be difficult"]));
  questions.push(simpleRadio("Is safe material storage available?", H_PROCUREMENT, SEC16,
    ["Yes", "Limited", "No"]));

  // ═══ SECTION 17: LEGAL, INSURANCE & RISK ═══
  const SEC17 = "Legal, Insurance & Risk";
  questions.push(simpleRadio("Is the right contract type known?", H_LEGAL, SEC17,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Is builder's risk insurance required?", H_LEGAL, SEC17,
    ["No", "Yes"]));
  questions.push(simpleRadio("Is client insurance confirmed?", H_LEGAL, SEC17,
    ["Yes", "No", "Unknown"]));
  questions.push(simpleRadio("Is WSIB/liability documentation needed?", H_LEGAL, SEC17,
    ["Yes - In place", "Yes - Not yet", "Unknown"]));
  questions.push(simpleRadio("Are tenants involved?", H_LEGAL, SEC17,
    ["No", "Yes"]));
  questions.push(simpleRadio("Is neighbour access required?", H_LEGAL, SEC17,
    ["No", "Yes"]));
  questions.push(simpleRadio("Is condo/HOA approval required?", H_LEGAL, SEC17,
    ["No", "Yes", "Unknown"]));
  questions.push(simpleRadio("Are warranty obligations clear?", H_LEGAL, SEC17,
    ["Yes", "No", "Unknown"]));
  questions.push(scoredRadio("Is dispute risk elevated?", H_LEGAL, SEC17,
    ["No", "Low", "Medium", "High"],
    { "No": 3, "Low": 2, "Medium": 1, "High": 0 }));
  questions.push(simpleRadio("Are assumptions and exclusions documented?", H_LEGAL, SEC17,
    ["Yes", "No"]));

  // ═══ SECTION 18: CONSTRUCTABILITY ═══
  const SEC18 = "Constructability";
  questions.push(scoredRadio("Can the project physically be built as imagined?", H_CONSTRUCTABILITY, SEC18,
    ["Yes", "Yes with modifications", "Uncertain", "No"],
    { "Yes": 3, "Yes with modifications": 2, "Uncertain": 1, "No": 0 }, { weight: 2 }));
  questions.push(simpleRadio("Is the construction sequence logical?", H_CONSTRUCTABILITY, SEC18,
    ["Yes", "Needs planning", "No - Constructability meeting needed"]));
  questions.push(simpleRadio("Are temporary supports required?", H_CONSTRUCTABILITY, SEC18,
    ["No", "Yes"]));
  questions.push(simpleRadio("Will the home be opened to weather?", H_CONSTRUCTABILITY, SEC18,
    ["No", "Yes - Protection plan needed"]));
  questions.push(simpleRadio("Are old/new tie-ins complicated?", H_CONSTRUCTABILITY, SEC18,
    ["No", "Moderate", "Yes - Details required"]));
  questions.push(simpleRadio("Are trade conflicts likely?", H_CONSTRUCTABILITY, SEC18,
    ["No", "Possible", "Likely"]));
  questions.push(simpleRadio("Can occupied areas be protected?", H_CONSTRUCTABILITY, SEC18,
    ["Yes", "Partially", "No", "Not applicable"]));
  questions.push(simpleRadio("Are quality expectations realistic?", H_CONSTRUCTABILITY, SEC18,
    ["Yes", "Partially", "No - Expectation reset needed"]));
  questions.push(simpleRadio("Can inspectors access required areas?", H_CONSTRUCTABILITY, SEC18,
    ["Yes", "Difficult", "Unknown"]));

  // ═══ SECTION 19: ONSITE STAFF CHECKLIST ═══
  const SEC19 = "Onsite Staff Checklist";
  // Project Basics
  questions.push({ id: qid(), text: "Confirm who attended the site visit", type: "text", category_id: H_ONSITE, required: false, logic_rules: showIf(SEC19) });
  questions.push(simpleRadio("Were all decision makers present?", H_ONSITE, SEC19, ["Yes", "No", "Partially"]));
  questions.push({ id: qid(), text: "Main reason for project", type: "textarea", category_id: H_ONSITE, required: false, logic_rules: showIf(SEC19) });
  questions.push({ id: qid(), text: "Desired timeline", type: "text", category_id: H_ONSITE, required: false, logic_rules: showIf(SEC19) });
  questions.push({ id: qid(), text: "Stated budget range", type: "text", category_id: H_ONSITE, required: false, logic_rules: showIf(SEC19) });
  questions.push(simpleRadio("Financing status", H_ONSITE, SEC19, ["Confirmed", "In progress", "Not discussed", "Unknown"]));
  // Photos
  questions.push(fileUpload("Front of house", H_ONSITE, SEC19, { max_files: 3 }));
  questions.push(fileUpload("Rear of house", H_ONSITE, SEC19, { max_files: 3 }));
  questions.push(fileUpload("Side yards", H_ONSITE, SEC19, { max_files: 5 }));
  questions.push(fileUpload("Driveway / access / street view", H_ONSITE, SEC19, { max_files: 5 }));
  questions.push(fileUpload("Existing structure / work area", H_ONSITE, SEC19, { max_files: 5 }));
  questions.push(fileUpload("Foundation, basement, attic", H_ONSITE, SEC19, { max_files: 10 }));
  questions.push(fileUpload("Electrical panel, mechanical, plumbing", H_ONSITE, SEC19, { max_files: 10 }));
  questions.push(fileUpload("Any damage, hazards, or areas of concern", H_ONSITE, SEC19, { max_files: 10 }));
  // Measurements
  questions.push(textArea("Key measurements captured", H_ONSITE, SEC19, { placeholder: "Room dims, ceiling heights, side yard widths, etc." }));
  // Access
  questions.push(simpleRadio("Can a bin fit onsite?", H_ONSITE, SEC19, ["Yes", "No", "Tight"]));
  questions.push(simpleRadio("Can delivery trucks access the site?", H_ONSITE, SEC19, ["Yes", "Difficult", "No"]));
  questions.push(simpleRadio("Is there staging space?", H_ONSITE, SEC19, ["Yes", "Limited", "No"]));
  questions.push(simpleRadio("Are overhead wires present?", H_ONSITE, SEC19, ["No", "Yes"]));
  // Existing Conditions
  questions.push(simpleRadio("Foundation cracks observed?", H_ONSITE, SEC19, ["None", "Minor", "Significant"]));
  questions.push(simpleRadio("Water entry / mold / musty smell?", H_ONSITE, SEC19, ["None", "Minor", "Significant"]));
  questions.push(simpleRadio("Signs of pests or rot?", H_ONSITE, SEC19, ["None", "Minor", "Significant"]));
  questions.push(simpleRadio("Signs of unpermitted work?", H_ONSITE, SEC19, ["None", "Suspected", "Likely"]));
  questions.push(simpleRadio("Signs of asbestos-containing materials?", H_ONSITE, SEC19, ["None", "Suspected", "Likely"]));
  // Utility notes
  questions.push({ id: qid(), text: "Electrical panel size and location", type: "text", category_id: H_ONSITE, required: false, logic_rules: showIf(SEC19) });
  questions.push(simpleRadio("Sewer or septic?", H_ONSITE, SEC19, ["Municipal sewer", "Septic", "Unknown"]));
  questions.push(simpleRadio("Well or municipal water?", H_ONSITE, SEC19, ["Municipal", "Well", "Unknown"]));
  questions.push({ id: qid(), text: "HVAC type and condition", type: "text", category_id: H_ONSITE, required: false, logic_rules: showIf(SEC19) });
  // Staff Assessment
  questions.push(textArea("Top 3 risks noticed onsite", H_ONSITE, SEC19, { required: false }));
  questions.push(textArea("What information is missing?", H_ONSITE, SEC19));
  questions.push(textArea("What professional review is needed?", H_ONSITE, SEC19));
  const Q_STAFF_RECOMMEND = qid();
  questions.push({
    id: Q_STAFF_RECOMMEND,
    text: "Staff Recommended Status",
    description: "Selecting anything other than 'Proceed to feasibility report' will trigger the Risk Assessment section.",
    type: "radio", category_id: H_ONSITE, required: false,
    options: [
      "Proceed to feasibility report",
      "Proceed with assumptions",
      "Proceed only after investigation",
      "Pause until client/budget alignment",
      "Pause until professional review",
      "Disqualify / not a fit"
    ],
    logic_rules: showIf(SEC19),
  });

  // ═══ SECTION 20: RISK ASSESSMENT ═══
  const SEC20 = "Risk Assessment";
  questions.push(textArea("What risks were triggered?", H_RISK, SEC20, { description: "List all risks identified across the study." }));
  questions.push({
    id: qid(), text: "Risk categories identified", type: "checkbox", category_id: H_RISK, required: false,
    options: ["Client", "Budget", "Schedule", "Zoning", "Permit", "Code", "Structural", "Site Access", "Existing Conditions", "Environmental", "Utilities", "Design", "Procurement", "Legal", "Constructability"],
    logic_rules: showIf(SEC20),
  });
  questions.push({
    id: qid(), text: "Overall risk level", type: "radio", category_id: H_RISK, required: false,
    options: ["Green", "Yellow", "Orange", "Red", "Black"],
    option_scores: { "Green": 5, "Yellow": 3, "Orange": 2, "Red": 1, "Black": 0 },
    weight: 3,
    logic_rules: showIf(SEC20),
  });
  questions.push({
    id: qid(), text: "Required actions", type: "checkbox", category_id: H_RISK, required: false,
    options: [
      "Proceed", "Add allowance", "Add contingency", "Revise design", "Require survey",
      "Require engineer", "Require septic review", "Require HVAC review", "Require electrician review",
      "Require municipal review", "Require environmental testing", "Hold client alignment meeting", "Pause", "Disqualify"
    ],
    logic_rules: showIf(SEC20),
  });
  questions.push({ id: qid(), text: "Who is responsible for the next action?", type: "text", category_id: H_RISK, required: false, logic_rules: showIf(SEC20) });
  questions.push(simpleRadio("Is this risk a project blocker?", H_RISK, SEC20, ["No", "Yes"]));
  questions.push(textArea("Risk notes and explanation", H_RISK, SEC20));

  // ═══ SECTION 21: RECOMMENDED NEXT STEPS ═══
  const SEC21 = "Recommended Next Steps";
  questions.push({
    id: qid(), text: "Overall feasibility status", type: "radio", category_id: H_NEXT_STEPS, required: false,
    options: [
      "Green: Feasible",
      "Yellow: Feasible with minor clarifications",
      "Orange: Feasible with significant review required",
      "Red: Pause before proceeding",
      "Black: Not feasible as currently described"
    ],
    option_scores: { "Green: Feasible": 5, "Yellow: Feasible with minor clarifications": 4, "Orange: Feasible with significant review required": 2, "Red: Pause before proceeding": 1, "Black: Not feasible as currently described": 0 },
    weight: 3,
    logic_rules: showIf(SEC21),
  });
  questions.push({
    id: qid(), text: "Recommended next steps", type: "checkbox", category_id: H_NEXT_STEPS, required: false,
    options: [
      "Move to pre-construction proposal", "Complete design concept", "Complete zoning review",
      "Order survey", "Engage structural engineer", "Engage septic designer",
      "Complete site investigation", "Complete hazardous material testing",
      "Complete budget alignment meeting", "Revise scope", "Disqualify"
    ],
    logic_rules: showIf(SEC21),
  });
  questions.push(textArea("Internal recommendation notes", H_NEXT_STEPS, SEC21));
  questions.push(textArea("Client-facing summary notes", H_NEXT_STEPS, SEC21));
  questions.push({ id: qid(), text: "Staff sign-off (name)", type: "text", category_id: H_NEXT_STEPS, required: false, logic_rules: showIf(SEC21) });
  questions.push(simpleRadio("Manager review required?", H_NEXT_STEPS, SEC21, ["Yes", "No"]));

  // ══════════════════════════════════
  // AUTO-TRIGGER RULES (stored on the survey for frontend use)
  // ══════════════════════════════════
  // These tell the frontend to auto-add sections to the scope checkbox when certain answers are given
  const autoTriggerRules = [
    // Project type triggers
    { source_question_id: Q_SCOPE_PROJECT_TYPE, trigger_values: ["Detached ADU", "Garage Conversion ADU"], sections_to_add: ["Zoning & Planning", "Building Code & Permits", "Utilities & Servicing", "Risk Assessment"] },
    { source_question_id: Q_SCOPE_PROJECT_TYPE, trigger_values: ["Second Storey Addition"], sections_to_add: ["Structural Review", "Building Code & Permits"] },
    { source_question_id: Q_SCOPE_PROJECT_TYPE, trigger_values: ["Addition", "Second Storey Addition", "Exterior Renovation", "Deck", "Garage Build / Renovation", "Detached ADU"], sections_to_add: ["Zoning & Planning", "Property & Ownership", "Civil, Grading & Drainage"] },
    { source_question_id: Q_SCOPE_PROJECT_TYPE, trigger_values: ["Whole-Home Renovation", "Basement Renovation"], sections_to_add: ["Existing Structure", "Environmental & Hazardous Materials"] },
    // Onsite staff recommendation triggers
    { source_question_id: Q_STAFF_RECOMMEND, trigger_values: ["Proceed only after investigation", "Pause until client/budget alignment", "Pause until professional review", "Disqualify / not a fit"], sections_to_add: ["Risk Assessment"] },
    // Onsite trigger
    { source_question_id: Q_SCOPE_ONSITE, trigger_values: ["Yes", "Partially"], sections_to_add: ["Onsite Staff Checklist"] },
  ];

  // Also, any question with an answer matching RISK_TRIGGER_VALUES auto-adds Risk Assessment.
  // This is handled by the frontend using the `risk_trigger_values` property below.

  // ══════════════════════════════════
  // SECTION FOLLOW-UP RULES
  // ══════════════════════════════════
  // When section scores fall below 65%, show follow-up questions
  const followupMap = {};
  for (const q of questions) {
    if (q.is_followup && q.category_id) {
      if (!followupMap[q.category_id]) followupMap[q.category_id] = [];
      followupMap[q.category_id].push(q.id);
    }
  }
  const sectionFollowupRules = Object.entries(followupMap).map(([headingId, qIds]) => ({
    heading_id: headingId,
    threshold_score: 999, // high threshold = show when score is concerning (we'll use percent-based in frontend)
    threshold_percent: 65,
    followup_question_ids: qIds,
  }));

  // ══════════════════════════════════
  // BUILD HEADINGS
  // ══════════════════════════════════
  const headings = [
    { id: H_SCOPE, title: "Scope Selector", description: "Select project type, applicable sections, and provide basic project information" },
    { id: H_CLIENT_READINESS, title: "Client & Decision Readiness", description: "Assess client preparedness, budget alignment, and decision-maker involvement" },
    { id: H_PROJECT_SCOPE, title: "Project Scope", description: "Define scope clarity, exclusions, and potential changes" },
    { id: H_PROPERTY, title: "Property & Ownership", description: "Property boundaries, ownership, easements, and heritage status" },
    { id: H_ZONING, title: "Zoning & Planning", description: "Zoning compliance, setbacks, variances, and development charges" },
    { id: H_CODE_PERMITS, title: "Building Code & Permits", description: "Permit requirements, code compliance, and engineering needs" },
    { id: H_SITE_ACCESS, title: "Site Access & Logistics", description: "Driveway access, staging, equipment needs, and neighbour proximity" },
    { id: H_EXISTING_STRUCTURE, title: "Existing Structure", description: "Foundation, walls, roof, water damage, and previous renovations" },
    { id: H_STRUCTURAL, title: "Structural Review", description: "Load-bearing changes, foundation capacity, and soil conditions" },
    { id: H_CIVIL, title: "Civil, Grading & Drainage", description: "Water drainage, grading impacts, and flood risk" },
    { id: H_UTILITIES, title: "Utilities & Servicing", description: "Water, sewer, electrical, gas, HVAC capacity and service adequacy" },
    { id: H_ENVIRONMENTAL, title: "Environmental & Hazardous Materials", description: "Asbestos, lead, mold, radon, contaminated soil, and protected trees" },
    { id: H_DESIGN, title: "Design Feasibility", description: "Measurements, as-builts, mechanical routing, and material matching" },
    { id: H_BUDGET, title: "Budget & Estimate Feasibility", description: "Budget alignment, trade quotes, allowances, and contingency" },
    { id: H_SCHEDULE, title: "Schedule Feasibility", description: "Start date, permit timeline, long-lead items, and winter work" },
    { id: H_PROCUREMENT, title: "Procurement & Long-Lead Items", description: "Custom items, specialty finishes, and material availability" },
    { id: H_LEGAL, title: "Legal, Insurance & Risk", description: "Contracts, insurance, tenants, HOA, and dispute risk" },
    { id: H_CONSTRUCTABILITY, title: "Constructability", description: "Build sequence, weather protection, tie-ins, and quality expectations" },
    { id: H_ONSITE, title: "Onsite Staff Checklist", description: "Field checklist for photos, measurements, observations, and staff recommendation" },
    { id: H_RISK, title: "Risk Assessment", description: "Document triggered risks, severity levels, and required actions" },
    { id: H_NEXT_STEPS, title: "Recommended Next Steps", description: "Overall status, recommendations, and staff sign-off" },
  ];

  // ══════════════════════════════════
  // BUILD SURVEY
  // ══════════════════════════════════
  const title = project_name
    ? `Feasibility Study — ${project_name}`
    : property_address
      ? `Feasibility Study — ${property_address}`
      : `Feasibility Study — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const shareToken = 'fs_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

  const surveyData = {
    title,
    description: client_name
      ? `Pre-construction feasibility assessment for ${client_name}${property_address ? ` at ${property_address}` : ''}`
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
    // Store auto-trigger rules and risk values in the survey for frontend consumption
    // Using ai_insights field temporarily (or we can add to styling.metadata)
    styling: {
      background_color: "#f8fafc",
      accent_color: "#ea7924",
      button_color: "#ea7924",
      button_text_color: "#ffffff",
      border_radius: "12px",
      button_border_radius: "12px",
    },
    welcome_page_enabled: true,
    welcome_page_content: `<h2>Pre-Construction Feasibility Study</h2>
<p>${client_name ? `Prepared for <strong>${client_name}</strong>` : 'Assessment'}${property_address ? ` — ${property_address}` : ''}</p>
<p>This assessment guides you through evaluating project feasibility across multiple categories. Start by selecting which sections apply.</p>
<p><strong>Tips:</strong></p>
<ul>
<li>Progress saves automatically every few seconds</li>
<li>You can close and return later using your resume link</li>
<li>Photos can be uploaded directly from your phone camera</li>
<li>Sections may appear automatically based on your answers</li>
<li>"Unknown" is a valid answer — it flags items for follow-up</li>
</ul>`,
    welcome_page_button_text: "Begin Assessment",
    success_message: "Feasibility study submitted successfully! The team will review your assessment.",
    thank_you_page_content: "<h2>Assessment Complete</h2><p>Your feasibility study has been submitted. The pre-construction team will review the findings and follow up with next steps.</p>",
  };

  const created = await base44.entities.Survey.create(surveyData);

  // Store trigger rules separately in the survey's ai_insights field (JSON-encoded metadata)
  // This is a pragmatic approach to store the trigger config without schema changes
  const triggerMetadata = JSON.stringify({
    auto_trigger_rules: autoTriggerRules,
    risk_trigger_values: RISK_TRIGGER_VALUES,
    scope_question_id: Q_SCOPE_SECTIONS,
    study_mode: study_mode || 'combined',
    project_type_question_id: Q_SCOPE_PROJECT_TYPE,
  });
  await base44.entities.Survey.update(created.id, { ai_insights: triggerMetadata });

  return Response.json({
    success: true,
    survey_id: created.id,
    share_token: shareToken,
    title,
  });
});