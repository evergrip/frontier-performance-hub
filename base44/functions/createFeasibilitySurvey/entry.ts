import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
  "Pause until professional review", "Disqualify / not a fit",
  // V2 additions
  "Required", "Significant", "Red", "Black", "Not confirmed",
  "Not feasible as discussed", "Very low", "Low"
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
    study_mode,
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

  // ─── Helpers ───
  const scoredRadio = (text, categoryId, sectionName, opts, scores, extra = {}) => ({
    id: qid(), text, type: "radio", category_id: categoryId, required: false,
    options: opts,
    option_scores: scores,
    weight: extra.weight || 1,
    logic_rules: showIf(sectionName),
    ...extra,
  });

  const simpleRadio = (text, categoryId, sectionName, opts, extra = {}) => ({
    id: qid(), text, type: "radio", category_id: categoryId, required: false,
    options: opts,
    logic_rules: showIf(sectionName),
    ...extra,
  });

  const textArea = (text, categoryId, sectionName, extra = {}) => ({
    id: qid(), text, type: "textarea", category_id: categoryId, required: false,
    logic_rules: showIf(sectionName),
    ...extra,
  });

  const fileUpload = (text, categoryId, sectionName, extra = {}) => ({
    id: qid(), text, type: "file_upload", category_id: categoryId, required: false,
    allowed_file_types: ["image", "video"], max_files: extra.max_files || 10,
    logic_rules: showIf(sectionName),
    ...extra,
  });

  const textField = (text, categoryId, sectionName, extra = {}) => ({
    id: qid(), text, type: "text", category_id: categoryId, required: false,
    logic_rules: showIf(sectionName),
    ...extra,
  });

  const numberField = (text, categoryId, sectionName, extra = {}) => ({
    id: qid(), text, type: "number", category_id: categoryId, required: false,
    logic_rules: showIf(sectionName),
    ...extra,
  });

  const dateField = (text, categoryId, sectionName, extra = {}) => ({
    id: qid(), text, type: "date", category_id: categoryId, required: false,
    logic_rules: showIf(sectionName),
    ...extra,
  });

  const dropdown = (text, categoryId, sectionName, opts, extra = {}) => ({
    id: qid(), text, type: "dropdown", category_id: categoryId, required: false,
    options: opts,
    logic_rules: showIf(sectionName),
    ...extra,
  });

  const checkboxField = (text, categoryId, sectionName, opts, extra = {}) => ({
    id: qid(), text, type: "checkbox", category_id: categoryId, required: false,
    options: opts,
    logic_rules: showIf(sectionName),
    ...extra,
  });

  const phoneField = (text, categoryId, sectionName, extra = {}) => ({
    id: qid(), text, type: "phone", category_id: categoryId, required: false,
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

  questions.push({ id: qid(), text: "Project Name / Title", type: "text", category_id: H_SCOPE, required: true, placeholder: project_name || "Enter project name" });
  questions.push({ id: qid(), text: "Client Name", type: "text", category_id: H_SCOPE, required: true, placeholder: client_name || "Client name" });
  questions.push({ id: qid(), text: "Client Email", type: "email", category_id: H_SCOPE, required: false, placeholder: client_email || "client@example.com" });
  questions.push({ id: qid(), text: "Property Address", type: "text", category_id: H_SCOPE, required: true, placeholder: property_address || "Full property address" });
  questions.push(dropdown("Municipality / Jurisdiction", H_SCOPE, "", ["City of Hamilton", "County of Brant", "City of Brantford", "Haldimand County", "Norfolk County", "Other"], { allow_other: true, logic_rules: [] }));
  questions.push({ id: qid(), text: "Brief Scope Description", type: "textarea", category_id: H_SCOPE, required: false, placeholder: "Describe the proposed project scope..." });

  // V2: New scope selector questions (S1.1 - S1.9)
  const Q_SCOPE_LEAD_SOURCE = qid();
  questions.push({ id: Q_SCOPE_LEAD_SOURCE, text: "Lead source", type: "dropdown", category_id: H_SCOPE, required: true,
    options: ["Referral", "Website", "Google", "Social Media", "Past Client", "Realtor", "Bark", "Networking", "Walk-in", "Other"], allow_other: true });
  questions.push(textField("Salesperson / staff owner", H_SCOPE, "", { required: true, logic_rules: [] }));
  questions.push(textField("Staff member completing feasibility", H_SCOPE, "", { required: true, logic_rules: [] }));
  const Q_SITE_VISIT_DATE = qid();
  questions.push({ id: Q_SITE_VISIT_DATE, text: "Site visit date", type: "date", category_id: H_SCOPE, required: true,
    logic_rules: [{ condition_question_id: Q_SCOPE_ONSITE, operator: "equals", value: "Yes", logic_type: "show" }, { condition_question_id: Q_SCOPE_ONSITE, operator: "equals", value: "Partially", logic_type: "show" }] });
  questions.push(phoneField("Client phone number", H_SCOPE, "", { logic_rules: [] }));
  const Q_OCCUPANCY = qid();
  questions.push({ id: Q_OCCUPANCY, text: "Occupancy status", type: "dropdown", category_id: H_SCOPE, required: true,
    options: ["Owner occupied", "Tenant occupied", "Vacant", "Seasonal property", "Mixed owner/tenant", "Unknown"], logic_rules: [] });
  const Q_EXISTING_USE = qid();
  questions.push({ id: Q_EXISTING_USE, text: "Existing use of property", type: "dropdown", category_id: H_SCOPE, required: true,
    options: ["Single family home", "Multi-unit residential", "Rental property", "Commercial", "Mixed-use", "Farm/rural residential", "Unknown", "Other"], allow_other: true, logic_rules: [] });
  const Q_PROPOSED_USE = qid();
  questions.push({ id: Q_PROPOSED_USE, text: "Proposed use of property", type: "dropdown", category_id: H_SCOPE, required: true,
    options: ["Single family home", "Additional dwelling unit", "Multi-unit residential", "Rental unit", "Home office/business", "Short-term rental", "Other"], allow_other: true, logic_rules: [] });
  questions.push(textArea("Project urgency reason", H_SCOPE, "", { logic_rules: [] }));

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

  // V2: New client readiness questions (C1-C15)
  questions.push(textArea("List all decision makers", H_CLIENT_READINESS, SEC2, { required: true, description: "Names and roles" }));
  questions.push(textArea("Who was present at the site visit or meeting?", H_CLIENT_READINESS, SEC2, { required: true }));
  questions.push(textArea("Who was missing?", H_CLIENT_READINESS, SEC2));
  questions.push(numberField("Client stated budget low", H_CLIENT_READINESS, SEC2, { required: true, placeholder: "$" }));
  questions.push(numberField("Client stated budget high", H_CLIENT_READINESS, SEC2, { required: true, placeholder: "$" }));
  const Q_BUDGET_SOURCE = qid();
  questions.push({ id: Q_BUDGET_SOURCE, text: "Budget source", type: "dropdown", category_id: H_CLIENT_READINESS, required: true,
    options: ["Client stated", "Financing pre-approved", "Cash available", "Rough guess", "Not discussed", "Unknown"], logic_rules: showIf(SEC2) });
  const Q_FINANCING_METHOD = qid();
  questions.push({ id: Q_FINANCING_METHOD, text: "Financing method", type: "dropdown", category_id: H_CLIENT_READINESS, required: true,
    options: ["Cash", "HELOC", "Refinance", "Construction loan", "Sale of property", "Family funds", "Insurance claim", "Not confirmed", "Unknown", "Other"], allow_other: true, logic_rules: showIf(SEC2) });
  questions.push(dateField("Desired construction start date", H_CLIENT_READINESS, SEC2));
  questions.push(dateField("Desired completion date", H_CLIENT_READINESS, SEC2));
  questions.push(textArea("Reason for deadline", H_CLIENT_READINESS, SEC2));
  questions.push(textArea("Client's top 3 priorities", H_CLIENT_READINESS, SEC2, { required: true }));
  questions.push(textArea("Client's top 3 fears or concerns", H_CLIENT_READINESS, SEC2, { required: true }));
  questions.push(simpleRadio("Has the client completed a discovery or pain indicator survey?", H_CLIENT_READINESS, SEC2, ["Yes", "No", "Not applicable"]));
  const Q_EXPECTATION_RESET = qid();
  questions.push({ id: Q_EXPECTATION_RESET, text: "Is a client expectation reset required?", type: "radio", category_id: H_CLIENT_READINESS, required: true,
    options: ["Yes", "No", "Unsure"], logic_rules: showIf(SEC2) });
  questions.push(checkboxField("Expectation reset topic", H_CLIENT_READINESS, SEC2,
    ["Budget", "Timeline", "Scope", "Process", "Permits", "Design", "Living through construction", "Change orders", "Quality expectations", "Other"]));

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

  // V2: New project scope questions (PS1-PS19)
  questions.push(textArea("Existing area affected", H_PROJECT_SCOPE, SEC3, { required: true, description: "Describe rooms/areas" }));
  questions.push(textArea("Proposed work area", H_PROJECT_SCOPE, SEC3, { required: true, description: "Describe new/changed areas" }));
  questions.push(numberField("Existing square footage affected", H_PROJECT_SCOPE, SEC3, { placeholder: "sq.ft." }));
  questions.push(numberField("Proposed new square footage", H_PROJECT_SCOPE, SEC3, { placeholder: "sq.ft." }));
  questions.push(numberField("Number of floors affected", H_PROJECT_SCOPE, SEC3, { required: true }));
  const Q_EXISTING_BEDROOMS = qid();
  questions.push({ id: Q_EXISTING_BEDROOMS, text: "Existing bedrooms", type: "number", category_id: H_PROJECT_SCOPE, required: false, logic_rules: showIf(SEC3) });
  const Q_PROPOSED_BEDROOMS = qid();
  questions.push({ id: Q_PROPOSED_BEDROOMS, text: "Proposed bedrooms", type: "number", category_id: H_PROJECT_SCOPE, required: false, logic_rules: showIf(SEC3) });
  questions.push(numberField("Existing bathrooms", H_PROJECT_SCOPE, SEC3));
  questions.push(numberField("Proposed bathrooms", H_PROJECT_SCOPE, SEC3));
  questions.push(checkboxField("Rooms affected", H_PROJECT_SCOPE, SEC3,
    ["Kitchen", "Bathroom", "Basement", "Living Room", "Dining Room", "Bedroom", "Laundry", "Mudroom", "Garage", "Exterior", "Deck/Porch", "Attic", "Mechanical Room", "Whole Home", "Other"], { required: true }));
  questions.push(textArea("Structural work anticipated", H_PROJECT_SCOPE, SEC3));
  questions.push(textArea("Plumbing fixtures added or relocated", H_PROJECT_SCOPE, SEC3, { description: "Fixture list" }));
  questions.push(textArea("Electrical upgrades desired", H_PROJECT_SCOPE, SEC3));
  questions.push(textArea("HVAC changes desired", H_PROJECT_SCOPE, SEC3));
  questions.push(textArea("Client must-haves", H_PROJECT_SCOPE, SEC3, { required: true }));
  questions.push(textArea("Client nice-to-haves", H_PROJECT_SCOPE, SEC3));
  questions.push(textArea("Known exclusions", H_PROJECT_SCOPE, SEC3, { required: true }));
  const Q_DEMOLITION = qid();
  questions.push({ id: Q_DEMOLITION, text: "Is demolition included?", type: "radio", category_id: H_PROJECT_SCOPE, required: true,
    options: ["Yes", "No", "Unknown"], logic_rules: showIf(SEC3) });
  const Q_EXTERIOR_FOOTPRINT = qid();
  questions.push({ id: Q_EXTERIOR_FOOTPRINT, text: "Is exterior footprint changing?", type: "radio", category_id: H_PROJECT_SCOPE, required: true,
    options: ["Yes", "No", "Unknown"], logic_rules: showIf(SEC3) });

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

  // V2: New property questions (PO1-PO18)
  questions.push(textField("Property roll number / ARN", H_PROPERTY, SEC4));
  questions.push(textArea("Legal description, if known", H_PROPERTY, SEC4));
  questions.push(numberField("Lot frontage", H_PROPERTY, SEC4, { placeholder: "ft or m" }));
  questions.push(numberField("Lot depth", H_PROPERTY, SEC4, { placeholder: "ft or m" }));
  questions.push(numberField("Lot area", H_PROPERTY, SEC4, { placeholder: "sq.ft., acres, or m²" }));
  questions.push(dropdown("Unit of measurement for lot dimensions", H_PROPERTY, SEC4, ["Feet", "Metres", "Acres", "Square Feet", "Square Metres", "Unknown"]));
  questions.push(fileUpload("Survey upload", H_PROPERTY, SEC4, { allowed_file_types: ["image", "video"], max_files: 5 }));
  questions.push(dateField("Survey date", H_PROPERTY, SEC4));
  questions.push(textField("Survey prepared by", H_PROPERTY, SEC4));
  const Q_BOUNDARY_SOURCE = qid();
  questions.push({ id: Q_BOUNDARY_SOURCE, text: "Source of boundary information", type: "dropdown", category_id: H_PROPERTY, required: true,
    options: ["Recent survey", "Old survey", "Client stated", "GIS/municipal map", "Site observation only", "Unknown"], logic_rules: showIf(SEC4) });
  questions.push(textArea("Easement details", H_PROPERTY, SEC4));
  questions.push(textArea("Right-of-way details", H_PROPERTY, SEC4));
  questions.push(textArea("Shared driveway details", H_PROPERTY, SEC4));
  questions.push(dropdown("Conservation authority name", H_PROPERTY, SEC4, ["LPRCA", "GRCA", "HCA", "NPCA", "Other", "Unknown"], { allow_other: true }));
  questions.push(dropdown("Heritage source reviewed", H_PROPERTY, SEC4, ["Municipal register", "Provincial register", "Client stated", "Not reviewed", "Unknown"]));
  questions.push(textArea("Previous permit numbers, if known", H_PROPERTY, SEC4));
  questions.push(dropdown("Permit history source", H_PROPERTY, SEC4, ["Municipality confirmed", "Client provided", "Previous drawings", "Not checked", "Unknown"]));
  questions.push(simpleRadio("Ownership evidence reviewed?", H_PROPERTY, SEC4, ["Yes", "No", "Not required", "Unknown"]));

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

  // V2: New zoning questions (Z1-Z33)
  questions.push(textField("Current zoning designation", H_ZONING, SEC5, { required: true, placeholder: "e.g. R1, R2, R1-B" }));
  questions.push(textField("Zoning by-law/source used", H_ZONING, SEC5, { required: true, placeholder: "By-law number, map, link" }));
  questions.push(dropdown("Zoning verification source", H_ZONING, SEC5,
    ["Municipal zoning map", "Municipal zoning by-law", "Planner confirmed", "Client provided", "Prior permit drawings", "Unknown/not verified"], { required: true }));
  const Q_FOOTPRINT_INCREASE = qid();
  questions.push({ id: Q_FOOTPRINT_INCREASE, text: "Does the proposed work increase building footprint?", type: "radio", category_id: H_ZONING, required: true,
    options: ["Yes", "No", "Unknown"], logic_rules: showIf(SEC5) });
  // Setback fields
  questions.push(numberField("Minimum front yard setback", H_ZONING, SEC5, { placeholder: "ft or m" }));
  questions.push(numberField("Minimum rear yard setback", H_ZONING, SEC5, { placeholder: "ft or m" }));
  questions.push(numberField("Minimum interior side yard setback", H_ZONING, SEC5, { placeholder: "ft or m" }));
  questions.push(numberField("Minimum exterior side yard setback", H_ZONING, SEC5, { placeholder: "ft or m" }));
  questions.push(numberField("Existing front yard setback", H_ZONING, SEC5, { placeholder: "ft or m" }));
  questions.push(numberField("Existing rear yard setback", H_ZONING, SEC5, { placeholder: "ft or m" }));
  questions.push(numberField("Existing left side yard setback", H_ZONING, SEC5, { placeholder: "ft or m" }));
  questions.push(numberField("Existing right side yard setback", H_ZONING, SEC5, { placeholder: "ft or m" }));
  questions.push(numberField("Proposed front yard setback", H_ZONING, SEC5, { placeholder: "ft or m" }));
  questions.push(numberField("Proposed rear yard setback", H_ZONING, SEC5, { placeholder: "ft or m" }));
  questions.push(numberField("Proposed left side yard setback", H_ZONING, SEC5, { placeholder: "ft or m" }));
  questions.push(numberField("Proposed right side yard setback", H_ZONING, SEC5, { placeholder: "ft or m" }));
  questions.push(dropdown("Setback measurement source", H_ZONING, SEC5, ["Survey", "Site measurement", "GIS estimate", "Drawing", "Unknown"]));
  // Coverage
  questions.push(numberField("Maximum lot coverage allowed", H_ZONING, SEC5, { placeholder: "%" }));
  questions.push(numberField("Existing lot coverage", H_ZONING, SEC5, { placeholder: "% or sq.ft." }));
  questions.push(numberField("Proposed lot coverage", H_ZONING, SEC5, { placeholder: "% or sq.ft." }));
  // Height
  questions.push(numberField("Maximum building height allowed", H_ZONING, SEC5, { placeholder: "ft or m" }));
  questions.push(numberField("Existing building height", H_ZONING, SEC5, { placeholder: "ft or m" }));
  questions.push(numberField("Proposed building height", H_ZONING, SEC5, { placeholder: "ft or m" }));
  // Parking
  questions.push(numberField("Required parking spaces", H_ZONING, SEC5));
  questions.push(numberField("Existing parking spaces", H_ZONING, SEC5));
  questions.push(numberField("Proposed parking spaces", H_ZONING, SEC5));
  // Compliance
  const Q_AS_OF_RIGHT = qid();
  questions.push({ id: Q_AS_OF_RIGHT, text: "Does the proposed work appear to comply as-of-right?", type: "radio", category_id: H_ZONING, required: true,
    options: ["Yes", "No", "Unknown", "Requires planner confirmation"], logic_rules: showIf(SEC5) });
  questions.push(textArea("Minor variance issue description", H_ZONING, SEC5));
  questions.push(textArea("Site plan approval trigger notes", H_ZONING, SEC5));
  questions.push(numberField("Development charge estimate", H_ZONING, SEC5, { placeholder: "$" }));
  questions.push(textField("Development charge source", H_ZONING, SEC5));
  questions.push(textArea("ADU zoning notes", H_ZONING, SEC5));
  questions.push(checkboxField("Zoning action required", H_ZONING, SEC5,
    ["None", "Confirm zoning", "Order survey", "Planner review", "Minor variance", "Rezoning", "Site plan approval", "Development charge estimate", "Other"], { required: true }));

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

  // V2: New building code questions (BP1-BP18)
  questions.push(checkboxField("Expected permit type", H_CODE_PERMITS, SEC6,
    ["Building permit", "Plumbing permit", "Septic permit", "Demolition permit", "Road occupancy permit", "Conservation approval", "Minor variance", "Site plan approval", "Heritage permit", "ESA/electrical", "Gas permit", "Other"], { required: true }));
  questions.push(textField("Permit authority / municipality", H_CODE_PERMITS, SEC6, { required: true }));
  questions.push(checkboxField("Required drawing type", H_CODE_PERMITS, SEC6,
    ["Sketch only", "Permit drawings", "BCIN drawings", "Engineered drawings", "Architectural drawings", "Site plan", "Lot grading plan", "HVAC design", "Septic design", "Other"], { required: true }));
  questions.push(simpleRadio("BCIN designer required?", H_CODE_PERMITS, SEC6, ["Yes", "No", "Unknown"], { required: true }));
  questions.push(simpleRadio("Architect required?", H_CODE_PERMITS, SEC6, ["Yes", "No", "Unknown"], { required: true }));
  const Q_ENGINEER_DISCIPLINE = qid();
  questions.push({ id: Q_ENGINEER_DISCIPLINE, text: "Engineer discipline required", type: "checkbox", category_id: H_CODE_PERMITS, required: true,
    options: ["Structural", "Mechanical", "Electrical", "Civil/grading", "Septic", "Geotechnical", "None known", "Unknown"], logic_rules: showIf(SEC6) });
  questions.push(textField("Existing occupancy classification", H_CODE_PERMITS, SEC6));
  questions.push(textField("Proposed occupancy classification", H_CODE_PERMITS, SEC6));
  const Q_EXISTING_UNITS = qid();
  questions.push({ id: Q_EXISTING_UNITS, text: "Existing number of dwelling units", type: "number", category_id: H_CODE_PERMITS, required: true, logic_rules: showIf(SEC6) });
  const Q_PROPOSED_UNITS = qid();
  questions.push({ id: Q_PROPOSED_UNITS, text: "Proposed number of dwelling units", type: "number", category_id: H_CODE_PERMITS, required: true, logic_rules: showIf(SEC6) });
  questions.push(textArea("Fire separation location/description", H_CODE_PERMITS, SEC6));
  questions.push(textArea("Egress issue description", H_CODE_PERMITS, SEC6));
  questions.push(dropdown("Energy compliance path", H_CODE_PERMITS, SEC6,
    ["SB-12 prescriptive", "Performance path", "Energy advisor required", "Not applicable", "Unknown"]));
  questions.push(textArea("Permit history notes", H_CODE_PERMITS, SEC6));
  questions.push(textField("Estimated permit submission timeline", H_CODE_PERMITS, SEC6, { placeholder: "e.g. 2–4 weeks after drawings" }));
  questions.push(textField("Estimated permit review timeline", H_CODE_PERMITS, SEC6, { placeholder: "e.g. 4–8 weeks" }));
  questions.push(simpleRadio("Has municipality been contacted?", H_CODE_PERMITS, SEC6, ["Yes", "No", "Not required yet"]));
  questions.push(textArea("Municipal contact / notes", H_CODE_PERMITS, SEC6, { description: "Name, date, notes" }));

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

  // V2: New site access questions (SA1-SA13)
  questions.push(numberField("Driveway width", H_SITE_ACCESS, SEC7, { placeholder: "ft or m" }));
  questions.push(dropdown("Driveway surface type", H_SITE_ACCESS, SEC7,
    ["Asphalt", "Concrete", "Gravel", "Dirt", "Shared lane", "No driveway", "Unknown", "Other"], { required: true, allow_other: true }));
  questions.push(numberField("Approximate distance from road to work area", H_SITE_ACCESS, SEC7, { placeholder: "ft or m" }));
  questions.push(textArea("Bin location description", H_SITE_ACCESS, SEC7, { required: true }));
  questions.push(textArea("Material staging location description", H_SITE_ACCESS, SEC7, { required: true }));
  questions.push(textArea("Truck access notes", H_SITE_ACCESS, SEC7));
  questions.push(textArea("Overhead wire location notes", H_SITE_ACCESS, SEC7));
  questions.push(textArea("Crane/pump setup location", H_SITE_ACCESS, SEC7));
  const Q_NEIGHBOUR_ACCESS = qid();
  questions.push({ id: Q_NEIGHBOUR_ACCESS, text: "Neighbour access required?", type: "radio", category_id: H_SITE_ACCESS, required: true,
    options: ["Yes", "No", "Unknown"], logic_rules: showIf(SEC7) });
  const Q_ROAD_OCCUPANCY = qid();
  questions.push({ id: Q_ROAD_OCCUPANCY, text: "Road occupancy permit likely?", type: "radio", category_id: H_SITE_ACCESS, required: true,
    options: ["Yes", "No", "Unknown"], logic_rules: showIf(SEC7) });
  questions.push(checkboxField("Site protection needed", H_SITE_ACCESS, SEC7,
    ["Lawn protection", "Driveway protection", "Tree protection", "Neighbour protection", "Dust control", "Temporary fencing", "Floor protection", "Weather protection", "None", "Other"], { required: true }));
  questions.push(textArea("Landscaping/fence/deck removal required", H_SITE_ACCESS, SEC7));
  questions.push(textArea("Access risk notes", H_SITE_ACCESS, SEC7));

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

  // V2: New existing structure questions (ES1-ES18)
  questions.push(numberField("Approximate age of home", H_EXISTING_STRUCTURE, SEC8));
  const Q_YEAR_BUILT = qid();
  questions.push({ id: Q_YEAR_BUILT, text: "Year built", type: "number", category_id: H_EXISTING_STRUCTURE, required: false, logic_rules: showIf(SEC8) });
  const Q_FOUNDATION_TYPE = qid();
  questions.push({ id: Q_FOUNDATION_TYPE, text: "Foundation type", type: "dropdown", category_id: H_EXISTING_STRUCTURE, required: true,
    options: ["Poured concrete", "Concrete block", "Stone/rubble", "Slab-on-grade", "Crawlspace", "Piers/posts", "Unknown", "Other"], allow_other: true, logic_rules: showIf(SEC8) });
  questions.push(dropdown("Basement type", H_EXISTING_STRUCTURE, SEC8,
    ["Full basement", "Partial basement", "Crawlspace", "Slab", "None", "Unknown"], { required: true }));
  questions.push(dropdown("Framing type", H_EXISTING_STRUCTURE, SEC8,
    ["Wood frame", "Masonry", "Steel", "Post and beam", "Unknown", "Other"], { allow_other: true }));
  questions.push(dropdown("Roof type", H_EXISTING_STRUCTURE, SEC8,
    ["Gable", "Hip", "Flat/low slope", "Shed", "Complex/multiple tie-ins", "Unknown", "Other"], { allow_other: true }));
  questions.push(dropdown("Exterior cladding type", H_EXISTING_STRUCTURE, SEC8,
    ["Brick", "Vinyl", "Wood", "Fibre cement", "Stucco", "Stone", "Metal", "Mixed", "Unknown", "Other"], { allow_other: true }));
  questions.push(textField("Window type/age", H_EXISTING_STRUCTURE, SEC8));
  questions.push(textArea("Known previous renovation areas", H_EXISTING_STRUCTURE, SEC8));
  questions.push(textArea("Visible foundation crack locations", H_EXISTING_STRUCTURE, SEC8));
  questions.push(textArea("Water entry location", H_EXISTING_STRUCTURE, SEC8));
  questions.push(textArea("Mold/rot/pest location", H_EXISTING_STRUCTURE, SEC8));
  questions.push(textArea("Floor level concern location", H_EXISTING_STRUCTURE, SEC8));
  questions.push(textField("Attic access location", H_EXISTING_STRUCTURE, SEC8));
  questions.push(numberField("Basement ceiling height", H_EXISTING_STRUCTURE, SEC8, { placeholder: "inches, ft, or m" }));
  questions.push(numberField("Main floor ceiling height", H_EXISTING_STRUCTURE, SEC8, { placeholder: "inches, ft, or m" }));
  questions.push(textArea("Existing photos notes", H_EXISTING_STRUCTURE, SEC8, { description: "Caption/context for uploaded photos" }));
  questions.push(textArea("Areas not accessible during visit", H_EXISTING_STRUCTURE, SEC8));

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

  // V2: New structural review questions (SR1-SR12)
  questions.push(checkboxField("Structural elements affected", H_STRUCTURAL, SEC9,
    ["Foundation", "Load-bearing wall", "Beam", "Post", "Floor joists", "Roof rafters", "Trusses", "Exterior wall", "Retaining wall", "Deck structure", "Stairs", "None known", "Unknown", "Other"], { required: true }));
  questions.push(textArea("Load-bearing walls affected description", H_STRUCTURAL, SEC9));
  questions.push(textArea("Proposed beam locations", H_STRUCTURAL, SEC9));
  questions.push(textArea("Proposed post locations", H_STRUCTURAL, SEC9));
  questions.push(textArea("Foundation work required", H_STRUCTURAL, SEC9));
  questions.push(textArea("Roof tie-in description", H_STRUCTURAL, SEC9));
  questions.push(simpleRadio("Existing joist direction known?", H_STRUCTURAL, SEC9, ["Yes", "No", "Unknown", "Not applicable"]));
  questions.push(dropdown("Existing roof framing type", H_STRUCTURAL, SEC9, ["Trusses", "Rafters", "Unknown", "Not applicable"]));
  questions.push(textArea("Engineer required for what scope?", H_STRUCTURAL, SEC9, { required: true }));
  questions.push(textArea("Structural unknowns", H_STRUCTURAL, SEC9));
  const Q_INVASIVE_INVESTIGATION = qid();
  questions.push({ id: Q_INVASIVE_INVESTIGATION, text: "Is invasive investigation required before pricing?", type: "radio", category_id: H_STRUCTURAL, required: true,
    options: ["Yes", "No", "Unknown"], logic_rules: showIf(SEC9) });
  questions.push(textArea("Temporary support/shoring notes", H_STRUCTURAL, SEC9));

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

  // V2: New civil/drainage questions (CG1-CG12)
  questions.push(textArea("Current drainage direction", H_CIVIL, SEC10, { required: true, description: "Describe where water flows" }));
  questions.push(textArea("Problem drainage areas", H_CIVIL, SEC10));
  questions.push(textArea("Existing downspout discharge locations", H_CIVIL, SEC10));
  questions.push(textArea("Sump pump discharge location", H_CIVIL, SEC10));
  questions.push(textArea("Proposed grading changes", H_CIVIL, SEC10));
  questions.push(textArea("Swale locations", H_CIVIL, SEC10));
  questions.push(textArea("Neighbour drainage concern description", H_CIVIL, SEC10));
  const Q_LOT_GRADING_PLAN = qid();
  questions.push({ id: Q_LOT_GRADING_PLAN, text: "Lot grading plan required?", type: "radio", category_id: H_CIVIL, required: true,
    options: ["Yes", "No", "Unknown"], logic_rules: showIf(SEC10) });
  questions.push(simpleRadio("Waterproofing required?", H_CIVIL, SEC10, ["Yes", "No", "Unknown"], { required: true }));
  questions.push(simpleRadio("Foundation drainage required?", H_CIVIL, SEC10, ["Yes", "No", "Unknown"], { required: true }));
  questions.push(simpleRadio("Stormwater management required?", H_CIVIL, SEC10, ["Yes", "No", "Unknown"]));
  questions.push(fileUpload("Drainage photos", H_CIVIL, SEC10, { description: "Images/video of drainage concerns" }));

  // ═══ SECTION 11: UTILITIES & SERVICING ═══
  const SEC11 = "Utilities & Servicing";
  questions.push(simpleRadio("Is water service adequate?", H_UTILITIES, SEC11,
    ["Yes - Adequate", "Upgrade needed", "Unknown"]));
  questions.push(simpleRadio("Is sanitary service adequate?", H_UTILITIES, SEC11,
    ["Yes - Municipal sewer", "Septic - Adequate", "Septic - Upgrade needed", "Unknown"]));
  const Q_ON_SEPTIC = qid();
  questions.push({ id: Q_ON_SEPTIC, text: "Is the property on septic?", type: "radio", category_id: H_UTILITIES, required: false,
    options: ["No - Municipal sewer", "Yes"], logic_rules: showIf(SEC11) });
  questions.push(simpleRadio("Is septic capacity confirmed?", H_UTILITIES, SEC11,
    ["Yes", "No - Designer needed", "Not applicable", "Unknown"]));
  const Q_ON_WELL = qid();
  questions.push({ id: Q_ON_WELL, text: "Is the property on well water?", type: "radio", category_id: H_UTILITIES, required: false,
    options: ["No - Municipal water", "Yes"], logic_rules: showIf(SEC11) });
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

  // V2: New utility questions (US1-US21)
  const Q_PANEL_AMP = qid();
  questions.push({ id: Q_PANEL_AMP, text: "Electrical panel amperage", type: "dropdown", category_id: H_UTILITIES, required: true,
    options: ["60A", "100A", "125A", "200A", "400A", "Unknown"], logic_rules: showIf(SEC11) });
  questions.push(textField("Electrical panel location", H_UTILITIES, SEC11, { required: true }));
  questions.push(textArea("Electrical panel condition notes", H_UTILITIES, SEC11));
  questions.push(simpleRadio("Service upgrade likely?", H_UTILITIES, SEC11, ["Yes", "No", "Unknown"], { required: true }));
  questions.push(dropdown("HVAC system type", H_UTILITIES, SEC11,
    ["Forced air gas", "Forced air electric", "Heat pump", "Boiler/radiant", "Ductless mini split", "Baseboard", "Wood stove", "Other", "Unknown"], { required: true, allow_other: true }));
  questions.push(textField("Furnace/boiler/heat pump age", H_UTILITIES, SEC11));
  questions.push(textField("HVAC location", H_UTILITIES, SEC11));
  questions.push(dropdown("Water heater type", H_UTILITIES, SEC11,
    ["Gas tank", "Electric tank", "Tankless", "Heat pump water heater", "Rental", "Unknown", "Other"], { allow_other: true }));
  questions.push(dropdown("Water service type", H_UTILITIES, SEC11,
    ["Municipal water", "Well", "Cistern", "Unknown", "Other"], { required: true, allow_other: true }));
  questions.push(dropdown("Water service material, if known", H_UTILITIES, SEC11,
    ["Copper", "PEX", "Poly-B", "Galvanized", "Lead", "Unknown", "Other"], { allow_other: true }));
  questions.push(dropdown("Sanitary service type", H_UTILITIES, SEC11,
    ["Municipal sewer", "Septic", "Holding tank", "Unknown", "Other"], { required: true, allow_other: true }));
  questions.push(textArea("Septic tank location, if known", H_UTILITIES, SEC11));
  questions.push(textArea("Septic bed location, if known", H_UTILITIES, SEC11));
  questions.push(textField("Septic age, if known", H_UTILITIES, SEC11));
  questions.push(fileUpload("Septic documents uploaded", H_UTILITIES, SEC11, { max_files: 5 }));
  questions.push(textArea("Well location, if known", H_UTILITIES, SEC11));
  questions.push(simpleRadio("Well test required?", H_UTILITIES, SEC11, ["Yes", "No", "Unknown"]));
  questions.push(fileUpload("Well report uploaded", H_UTILITIES, SEC11, { max_files: 5 }));
  questions.push(textField("Gas meter location", H_UTILITIES, SEC11));
  questions.push(textArea("Utility conflicts", H_UTILITIES, SEC11));
  questions.push(fileUpload("Utility photos", H_UTILITIES, SEC11));

  // ═══ SECTION 12: ENVIRONMENTAL & HAZARDOUS MATERIALS ═══
  const SEC12 = "Environmental & Hazardous Materials";
  const Q_HOME_BEFORE_1990 = qid();
  questions.push({ id: Q_HOME_BEFORE_1990, text: "Was the home built before 1990?", type: "radio", category_id: H_ENVIRONMENTAL, required: false,
    options: ["Yes", "No", "Unknown"], logic_rules: showIf(SEC12) });
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

  // V2: New environmental questions (EH1-EH13)
  questions.push(numberField("Year built (Environmental)", H_ENVIRONMENTAL, SEC12));
  questions.push(textArea("Areas to be demolished", H_ENVIRONMENTAL, SEC12));
  questions.push(checkboxField("Potential asbestos materials observed", H_ENVIRONMENTAL, SEC12,
    ["Drywall compound", "Vinyl floor tile", "Linoleum", "Vermiculite insulation", "Pipe insulation", "Duct wrap", "Plaster", "Ceiling texture", "Exterior siding", "Roofing material", "Unknown", "None observed", "Other"]));
  questions.push(simpleRadio("Hazardous material testing recommended?", H_ENVIRONMENTAL, SEC12, ["Yes", "No", "Unknown"], { required: true }));
  questions.push(textField("Testing company/contact", H_ENVIRONMENTAL, SEC12));
  questions.push(textArea("Mold location", H_ENVIRONMENTAL, SEC12));
  questions.push(textArea("Water damage location", H_ENVIRONMENTAL, SEC12));
  questions.push(textArea("Suspected lead paint locations", H_ENVIRONMENTAL, SEC12));
  questions.push(simpleRadio("Radon rough-in required?", H_ENVIRONMENTAL, SEC12, ["Yes", "No", "Unknown"]));
  questions.push(textArea("Oil tank concern location", H_ENVIRONMENTAL, SEC12));
  questions.push(textArea("Tree species/size/location", H_ENVIRONMENTAL, SEC12));
  questions.push(textArea("Wildlife issue description", H_ENVIRONMENTAL, SEC12));
  questions.push(fileUpload("Hazardous material photos", H_ENVIRONMENTAL, SEC12));

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

  // V2: New design questions (DF1-DF12)
  questions.push(fileUpload("Existing drawings upload", H_DESIGN, SEC13, { max_files: 10 }));
  questions.push(fileUpload("Survey upload (Design)", H_DESIGN, SEC13, { max_files: 5 }));
  questions.push(simpleRadio("Designer required?", H_DESIGN, SEC13, ["Yes", "No", "Unknown"], { required: true }));
  questions.push(simpleRadio("Interior designer required?", H_DESIGN, SEC13, ["Yes", "No", "Unknown"], { required: true }));
  questions.push(simpleRadio("Structural design required?", H_DESIGN, SEC13, ["Yes", "No", "Unknown"], { required: true }));
  questions.push(textArea("Main design challenge", H_DESIGN, SEC13, { required: true }));
  questions.push(textArea("Material matching concern", H_DESIGN, SEC13));
  questions.push(textArea("Accessibility requirements", H_DESIGN, SEC13));
  questions.push(textArea("Future phase design requirements", H_DESIGN, SEC13));
  questions.push(textArea("Design assumptions", H_DESIGN, SEC13, { required: true }));
  questions.push(checkboxField("Design deliverables required", H_DESIGN, SEC13,
    ["Concept plan", "Floor plans", "Elevations", "3D renderings", "Permit drawings", "Interior selections", "Engineering coordination", "Site plan", "Other"], { required: true }));
  questions.push(simpleRadio("Is a site measure required?", H_DESIGN, SEC13, ["Yes", "No", "Already completed"], { required: true }));

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

  // V2: New budget questions (BE1-BE14)
  questions.push(numberField("Client stated budget low (Budget)", H_BUDGET, SEC14, { required: true, placeholder: "$" }));
  questions.push(numberField("Client stated budget high (Budget)", H_BUDGET, SEC14, { required: true, placeholder: "$" }));
  questions.push(numberField("Internal rough order of magnitude low", H_BUDGET, SEC14, { placeholder: "$" }));
  questions.push(numberField("Internal rough order of magnitude high", H_BUDGET, SEC14, { placeholder: "$" }));
  questions.push(numberField("Budget gap amount", H_BUDGET, SEC14, { placeholder: "$" }));
  questions.push(numberField("Budget gap percentage", H_BUDGET, SEC14, { placeholder: "%" }));
  questions.push(numberField("Recommended contingency percentage", H_BUDGET, SEC14, { required: true, placeholder: "%" }));
  questions.push(checkboxField("Major allowance categories", H_BUDGET, SEC14,
    ["Cabinets", "Countertops", "Flooring", "Tile", "Plumbing fixtures", "Lighting", "Appliances", "Windows/doors", "Exterior cladding", "Landscaping", "Septic", "HVAC", "Electrical", "Unknown conditions", "Other"]));
  questions.push(textArea("Allowance notes", H_BUDGET, SEC14));
  questions.push(textArea("Major exclusions", H_BUDGET, SEC14, { required: true }));
  questions.push(dropdown("Pricing confidence level", H_BUDGET, SEC14,
    ["Very low", "Low", "Medium", "High", "Final pricing not available"], { required: true }));
  questions.push(dropdown("Estimate class", H_BUDGET, SEC14,
    ["Rough feasibility range", "Conceptual estimate", "Pre-construction budget", "Trade-validated estimate", "Construction proposal"], { required: true }));
  questions.push(checkboxField("Trade quotes needed", H_BUDGET, SEC14,
    ["Excavation", "Concrete/foundation", "Framing", "Roofing", "Windows/doors", "Plumbing", "HVAC", "Electrical", "Septic", "Insulation", "Drywall", "Cabinets", "Flooring", "Painting", "Landscaping", "Other"]));
  questions.push(simpleRadio("Is this project priceable now?", H_BUDGET, SEC14,
    ["Yes", "Yes with assumptions", "No - more information required"], { required: true }));

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

  // V2: New schedule questions (SCH1-SCH13)
  questions.push(dateField("Desired design start date", H_SCHEDULE, SEC15));
  questions.push(dateField("Desired construction start date (Schedule)", H_SCHEDULE, SEC15));
  questions.push(dateField("Desired completion date (Schedule)", H_SCHEDULE, SEC15));
  questions.push(textField("Estimated design duration", H_SCHEDULE, SEC15, { placeholder: "e.g. 2–4 weeks" }));
  questions.push(textField("Estimated engineering duration", H_SCHEDULE, SEC15, { placeholder: "e.g. 2–6 weeks" }));
  questions.push(textField("Estimated permit duration", H_SCHEDULE, SEC15, { placeholder: "e.g. 4–8 weeks" }));
  questions.push(textField("Estimated construction duration", H_SCHEDULE, SEC15, { placeholder: "e.g. 12–16 weeks" }));
  questions.push(textArea("Long-lead item list", H_SCHEDULE, SEC15));
  questions.push(textArea("Critical path concerns", H_SCHEDULE, SEC15, { required: true }));
  questions.push(textArea("Client blackout dates", H_SCHEDULE, SEC15, { description: "Vacations/events/no-access dates" }));
  questions.push(textArea("Trade availability notes", H_SCHEDULE, SEC15));
  questions.push(textArea("Seasonal risk notes", H_SCHEDULE, SEC15));
  questions.push(simpleRadio("Is the client's requested timeline feasible?", H_SCHEDULE, SEC15,
    ["Yes", "Yes with risk", "No", "Unknown"], { required: true }));

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

  // V2: New procurement questions (PR1-PR11)
  questions.push(textField("Custom window/door supplier", H_PROCUREMENT, SEC16));
  questions.push(textField("Cabinet supplier", H_PROCUREMENT, SEC16));
  questions.push(textField("Structural material supplier", H_PROCUREMENT, SEC16));
  questions.push(dateField("Appliance decision deadline", H_PROCUREMENT, SEC16));
  questions.push(dateField("Plumbing fixture decision deadline", H_PROCUREMENT, SEC16));
  questions.push(dateField("Lighting decision deadline", H_PROCUREMENT, SEC16));
  questions.push(dateField("Tile/flooring decision deadline", H_PROCUREMENT, SEC16));
  questions.push(textArea("Long-lead items list (Procurement)", H_PROCUREMENT, SEC16, { required: true }));
  questions.push(textArea("Storage plan", H_PROCUREMENT, SEC16));
  questions.push(textArea("Substitution risk notes", H_PROCUREMENT, SEC16));
  questions.push(simpleRadio("Procurement risk level", H_PROCUREMENT, SEC16,
    ["Low", "Medium", "High", "Unknown"], { required: true }));

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

  // V2: New legal questions (LIR1-LIR12)
  questions.push(dropdown("Recommended contract type", H_LEGAL, SEC17,
    ["Pre-construction agreement", "Fixed-price construction contract", "Cost-plus", "Construction management", "Service work", "Not determined"], { required: true }));
  questions.push(dropdown("Builder's risk responsibility", H_LEGAL, SEC17,
    ["Frontier", "Client", "Not required", "To be confirmed", "Unknown"]));
  questions.push(textArea("Client insurance confirmation notes", H_LEGAL, SEC17));
  questions.push(textArea("Tenant notice requirements", H_LEGAL, SEC17));
  questions.push(textArea("Neighbour access details", H_LEGAL, SEC17));
  questions.push(textField("Condo/HOA/board contact", H_LEGAL, SEC17));
  questions.push(dropdown("Warranty type applicable", H_LEGAL, SEC17,
    ["Renovation warranty", "Tarion/new home review", "Manufacturer warranties only", "Service warranty", "Unknown", "Other"], { required: true, allow_other: true }));
  questions.push(dropdown("Tarion relevance", H_LEGAL, SEC17,
    ["Not applicable", "Renovation only", "New home likely", "New dwelling unit to review", "Unknown"], { required: true }));
  questions.push(textArea("Dispute risk explanation", H_LEGAL, SEC17));
  const Q_LEGAL_REVIEW = qid();
  questions.push({ id: Q_LEGAL_REVIEW, text: "Required legal/management review", type: "radio", category_id: H_LEGAL, required: true,
    options: ["Yes", "No", "Unknown"], logic_rules: showIf(SEC17) });
  questions.push(checkboxField("Required approvals before proceeding", H_LEGAL, SEC17,
    ["Client approval", "Management approval", "Neighbour approval", "Condo/HOA approval", "Municipal approval", "Conservation approval", "Heritage approval", "Insurance confirmation", "Other"]));
  questions.push(textArea("Contract assumptions requiring protection", H_LEGAL, SEC17, { required: true }));

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

  // V2: New constructability questions (CON1-CON12)
  questions.push(textArea("Main constructability concern", H_CONSTRUCTABILITY, SEC18, { required: true }));
  questions.push(textArea("Required construction sequence notes", H_CONSTRUCTABILITY, SEC18));
  questions.push(textArea("Temporary support/shoring notes (Constructability)", H_CONSTRUCTABILITY, SEC18));
  questions.push(textArea("Weather protection plan notes", H_CONSTRUCTABILITY, SEC18));
  questions.push(textArea("Existing-to-new tie-in notes", H_CONSTRUCTABILITY, SEC18));
  questions.push(textArea("Trade coordination concerns", H_CONSTRUCTABILITY, SEC18));
  questions.push(textArea("Occupied-home protection plan", H_CONSTRUCTABILITY, SEC18));
  questions.push(textArea("Quality expectation notes", H_CONSTRUCTABILITY, SEC18));
  questions.push(textArea("Inspection access issue notes", H_CONSTRUCTABILITY, SEC18));
  questions.push(textArea("Site cleanliness/safety notes", H_CONSTRUCTABILITY, SEC18));
  const Q_CONSTRUCTABILITY_MTG = qid();
  questions.push({ id: Q_CONSTRUCTABILITY_MTG, text: "Is a constructability meeting required?", type: "radio", category_id: H_CONSTRUCTABILITY, required: true,
    options: ["Yes", "No", "Unknown"], logic_rules: showIf(SEC18) });
  questions.push(checkboxField("Who should attend constructability meeting?", H_CONSTRUCTABILITY, SEC18,
    ["Project Manager", "Site Supervisor", "Estimator", "Designer", "Engineer", "HVAC", "Electrical", "Plumbing", "Excavation", "Client", "Other"]));

  // ═══ SECTION 19: ONSITE STAFF CHECKLIST ═══
  const SEC19 = "Onsite Staff Checklist";
  // Project Basics (existing)
  questions.push({ id: qid(), text: "Confirm who attended the site visit", type: "text", category_id: H_ONSITE, required: false, logic_rules: showIf(SEC19) });
  questions.push(simpleRadio("Were all decision makers present?", H_ONSITE, SEC19, ["Yes", "No", "Partially"]));
  questions.push({ id: qid(), text: "Main reason for project", type: "textarea", category_id: H_ONSITE, required: false, logic_rules: showIf(SEC19) });
  questions.push({ id: qid(), text: "Desired timeline", type: "text", category_id: H_ONSITE, required: false, logic_rules: showIf(SEC19) });
  questions.push({ id: qid(), text: "Stated budget range", type: "text", category_id: H_ONSITE, required: false, logic_rules: showIf(SEC19) });
  questions.push(simpleRadio("Financing status", H_ONSITE, SEC19, ["Confirmed", "In progress", "Not discussed", "Unknown"]));
  // Photos (existing)
  questions.push(fileUpload("Front of house", H_ONSITE, SEC19, { max_files: 3 }));
  questions.push(fileUpload("Rear of house", H_ONSITE, SEC19, { max_files: 3 }));
  questions.push(fileUpload("Side yards", H_ONSITE, SEC19, { max_files: 5 }));
  questions.push(fileUpload("Driveway / access / street view", H_ONSITE, SEC19, { max_files: 5 }));
  questions.push(fileUpload("Existing structure / work area", H_ONSITE, SEC19, { max_files: 5 }));
  questions.push(fileUpload("Foundation, basement, attic", H_ONSITE, SEC19, { max_files: 10 }));
  questions.push(fileUpload("Electrical panel, mechanical, plumbing", H_ONSITE, SEC19, { max_files: 10 }));
  questions.push(fileUpload("Any damage, hazards, or areas of concern", H_ONSITE, SEC19, { max_files: 10 }));
  // Measurements (existing)
  questions.push(textArea("Key measurements captured", H_ONSITE, SEC19, { placeholder: "Room dims, ceiling heights, side yard widths, etc." }));
  // Access (existing)
  questions.push(simpleRadio("Can a bin fit onsite?", H_ONSITE, SEC19, ["Yes", "No", "Tight"]));
  questions.push(simpleRadio("Can delivery trucks access the site?", H_ONSITE, SEC19, ["Yes", "Difficult", "No"]));
  questions.push(simpleRadio("Is there staging space?", H_ONSITE, SEC19, ["Yes", "Limited", "No"]));
  questions.push(simpleRadio("Are overhead wires present?", H_ONSITE, SEC19, ["No", "Yes"]));
  // Existing Conditions (existing)
  questions.push(simpleRadio("Foundation cracks observed?", H_ONSITE, SEC19, ["None", "Minor", "Significant"]));
  questions.push(simpleRadio("Water entry / mold / musty smell?", H_ONSITE, SEC19, ["None", "Minor", "Significant"]));
  questions.push(simpleRadio("Signs of pests or rot?", H_ONSITE, SEC19, ["None", "Minor", "Significant"]));
  questions.push(simpleRadio("Signs of unpermitted work?", H_ONSITE, SEC19, ["None", "Suspected", "Likely"]));
  questions.push(simpleRadio("Signs of asbestos-containing materials?", H_ONSITE, SEC19, ["None", "Suspected", "Likely"]));
  // Utility notes (existing)
  questions.push({ id: qid(), text: "Electrical panel size and location", type: "text", category_id: H_ONSITE, required: false, logic_rules: showIf(SEC19) });
  questions.push(simpleRadio("Sewer or septic?", H_ONSITE, SEC19, ["Municipal sewer", "Septic", "Unknown"]));
  questions.push(simpleRadio("Well or municipal water?", H_ONSITE, SEC19, ["Municipal", "Well", "Unknown"]));
  questions.push({ id: qid(), text: "HVAC type and condition", type: "text", category_id: H_ONSITE, required: false, logic_rules: showIf(SEC19) });
  // Staff Assessment (existing)
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

  // V2: New onsite measurement fields (OSC1-OSC17)
  questions.push(textArea("Approximate existing room dimensions", H_ONSITE, SEC19, { description: "Room by room" }));
  questions.push(textArea("Approximate proposed addition dimensions", H_ONSITE, SEC19, { description: "Length x width" }));
  questions.push(numberField("Basement ceiling height (onsite)", H_ONSITE, SEC19, { placeholder: "inches or ft" }));
  questions.push(numberField("Main floor ceiling height (onsite)", H_ONSITE, SEC19, { placeholder: "inches or ft" }));
  questions.push(numberField("Second floor ceiling height", H_ONSITE, SEC19, { placeholder: "inches or ft" }));
  questions.push(numberField("Side yard width - left", H_ONSITE, SEC19, { placeholder: "ft or m" }));
  questions.push(numberField("Side yard width - right", H_ONSITE, SEC19, { placeholder: "ft or m" }));
  questions.push(numberField("Rear yard depth", H_ONSITE, SEC19, { placeholder: "ft or m" }));
  questions.push(numberField("Front yard setback estimate", H_ONSITE, SEC19, { placeholder: "ft or m" }));
  questions.push(numberField("Distance from work area to driveway", H_ONSITE, SEC19, { placeholder: "ft or m" }));
  questions.push(numberField("Driveway width (onsite)", H_ONSITE, SEC19, { placeholder: "ft or m" }));
  questions.push(numberField("Stair width", H_ONSITE, SEC19, { placeholder: "inches" }));
  questions.push(simpleRadio("Stair headroom concern?", H_ONSITE, SEC19, ["Yes", "No", "Unknown", "Not applicable"]));
  questions.push(textArea("Window sizes relevant to egress", H_ONSITE, SEC19, { description: "Width/height/location" }));
  questions.push(dropdown("Electrical panel amperage observed", H_ONSITE, SEC19,
    ["60A", "100A", "125A", "200A", "400A", "Unknown"], { required: true }));
  questions.push(textField("Water heater location", H_ONSITE, SEC19));
  questions.push(textField("Furnace/HVAC location (onsite)", H_ONSITE, SEC19));

  // V2: New onsite observation fields (OSC18-OSC30)
  questions.push(dropdown("Foundation type observed", H_ONSITE, SEC19,
    ["Poured concrete", "Concrete block", "Stone/rubble", "Slab", "Crawlspace", "Piers/posts", "Unknown", "Other"], { required: true, allow_other: true }));
  questions.push(dropdown("Framing type observed", H_ONSITE, SEC19,
    ["Wood frame", "Masonry", "Steel", "Unknown", "Other"], { allow_other: true }));
  questions.push(dropdown("Exterior cladding observed", H_ONSITE, SEC19,
    ["Brick", "Vinyl", "Wood", "Fibre cement", "Stucco", "Stone", "Metal", "Mixed", "Unknown", "Other"], { allow_other: true }));
  questions.push(dropdown("Roof type observed", H_ONSITE, SEC19,
    ["Gable", "Hip", "Flat/low slope", "Shed", "Complex", "Unknown"], {}));
  questions.push(dropdown("Roof condition", H_ONSITE, SEC19,
    ["Good", "Fair", "Poor", "Unknown", "Not reviewed"]));
  questions.push(dropdown("Basement condition", H_ONSITE, SEC19,
    ["Dry/good", "Minor moisture", "Significant water issue", "Not accessible", "No basement", "Unknown"]));
  questions.push(simpleRadio("Attic accessible?", H_ONSITE, SEC19, ["Yes", "No", "Not applicable"]));
  questions.push(simpleRadio("Crawlspace accessible?", H_ONSITE, SEC19, ["Yes", "No", "Not applicable"]));
  questions.push(simpleRadio("Mechanical room accessible?", H_ONSITE, SEC19, ["Yes", "No", "Not applicable"]));
  questions.push(simpleRadio("Electrical panel accessible?", H_ONSITE, SEC19, ["Yes", "No"], { required: true }));
  questions.push(simpleRadio("Septic/well visible?", H_ONSITE, SEC19, ["Yes", "No", "Not applicable", "Unknown"]));
  questions.push(textArea("Areas staff could not inspect", H_ONSITE, SEC19));
  questions.push(dropdown("Staff confidence in onsite information", H_ONSITE, SEC19,
    ["High", "Medium", "Low"], { required: true }));

  // V2: Document uploads (OSC31-OSC38)
  questions.push(fileUpload("Upload survey (onsite)", H_ONSITE, SEC19, { max_files: 5 }));
  questions.push(fileUpload("Upload existing drawings (onsite)", H_ONSITE, SEC19, { max_files: 10 }));
  questions.push(fileUpload("Upload previous permits (onsite)", H_ONSITE, SEC19, { max_files: 5 }));
  questions.push(fileUpload("Upload client inspiration photos", H_ONSITE, SEC19, { max_files: 10 }));
  questions.push(fileUpload("Upload septic documents (onsite)", H_ONSITE, SEC19, { max_files: 5 }));
  questions.push(fileUpload("Upload well report (onsite)", H_ONSITE, SEC19, { max_files: 5 }));
  questions.push(fileUpload("Upload utility bills if relevant", H_ONSITE, SEC19, { max_files: 5 }));
  questions.push(fileUpload("Upload existing property report/listing", H_ONSITE, SEC19, { max_files: 5 }));

  // V2: Staff action fields (OSC39-OSC43)
  const Q_RETURN_VISIT = qid();
  questions.push({ id: Q_RETURN_VISIT, text: "Should staff return for another site visit?", type: "radio", category_id: H_ONSITE, required: true,
    options: ["Yes", "No", "Maybe"], logic_rules: showIf(SEC19) });
  questions.push(textArea("Why is another visit required?", H_ONSITE, SEC19));
  questions.push(textArea("Immediate red flags", H_ONSITE, SEC19));
  questions.push(checkboxField("Recommended professionals to involve", H_ONSITE, SEC19,
    ["Structural engineer", "Designer", "Interior designer", "Septic designer", "HVAC designer", "Electrician", "Surveyor", "Planner", "Conservation authority", "Arborist", "Environmental testing company", "Other"], { required: true }));
  questions.push(dropdown("Staff confidence in project feasibility", H_ONSITE, SEC19,
    ["High", "Medium", "Low", "Not feasible as discussed"], { required: true }));

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

  // V2: Repeatable risk items (Risk 1-5)
  for (let riskNum = 1; riskNum <= 5; riskNum++) {
    const riskLabel = `Risk Item ${riskNum}`;
    questions.push(textField(`${riskLabel} — Title`, H_RISK, SEC20, { description: `Risk register item ${riskNum}` }));
    questions.push(dropdown(`${riskLabel} — Source section`, H_RISK, SEC20,
      ["Client", "Scope", "Property", "Zoning", "Permit", "Code", "Site Access", "Existing Structure", "Structural", "Drainage", "Utilities", "Environmental", "Design", "Budget", "Schedule", "Procurement", "Legal", "Constructability", "Onsite"]));
    questions.push(textArea(`${riskLabel} — Description`, H_RISK, SEC20));
    questions.push(dropdown(`${riskLabel} — Risk level`, H_RISK, SEC20,
      ["Green", "Yellow", "Orange", "Red", "Black"]));
    questions.push(checkboxField(`${riskLabel} — Required action`, H_RISK, SEC20,
      ["Proceed", "Document assumption", "Add allowance", "Add contingency", "Revise scope", "Revise design", "Order survey", "Municipal zoning review", "Permit history request", "Structural engineer", "Septic designer", "HVAC designer", "Electrician", "Hazmat testing", "Drainage/grading review", "Trade walkthrough", "Client budget alignment", "Client expectation reset", "Management escalation", "Pause project", "Disqualify"]));
    questions.push(textField(`${riskLabel} — Responsible person`, H_RISK, SEC20));
    questions.push(dateField(`${riskLabel} — Due date`, H_RISK, SEC20));
    questions.push(simpleRadio(`${riskLabel} — Does this block design?`, H_RISK, SEC20, ["Yes", "No"]));
    questions.push(simpleRadio(`${riskLabel} — Does this block pricing?`, H_RISK, SEC20, ["Yes", "No"]));
    questions.push(simpleRadio(`${riskLabel} — Does this block permit submission?`, H_RISK, SEC20, ["Yes", "No"]));
    questions.push(simpleRadio(`${riskLabel} — Does this block construction start?`, H_RISK, SEC20, ["Yes", "No"]));
    questions.push(textArea(`${riskLabel} — Resolution notes`, H_RISK, SEC20));
    questions.push(dropdown(`${riskLabel} — Status`, H_RISK, SEC20,
      ["Open", "In review", "Resolved", "Accepted as assumption", "Excluded", "Carried as allowance", "Carried as contingency"]));
  }

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

  // V2: New next steps questions (RNS1-RNS13)
  questions.push(simpleRadio("Is this project ready for pre-construction proposal?", H_NEXT_STEPS, SEC21,
    ["Yes", "Yes with conditions", "No", "Not sure"], { required: true }));
  questions.push(textArea("Conditions before pre-construction proposal", H_NEXT_STEPS, SEC21));
  questions.push(simpleRadio("Is this project ready for design?", H_NEXT_STEPS, SEC21,
    ["Yes", "Yes with assumptions", "No"], { required: true }));
  questions.push(simpleRadio("Is this project ready for budget pricing?", H_NEXT_STEPS, SEC21,
    ["Yes", "Yes with assumptions", "No"], { required: true }));
  questions.push(simpleRadio("Is this project ready for permit pathway planning?", H_NEXT_STEPS, SEC21,
    ["Yes", "No", "Not applicable"], { required: true }));
  questions.push(textArea("Items that must be resolved before pricing", H_NEXT_STEPS, SEC21));
  questions.push(textArea("Items that must be resolved before construction", H_NEXT_STEPS, SEC21));
  questions.push(checkboxField("Professional reviews required", H_NEXT_STEPS, SEC21,
    ["Surveyor", "Planner", "Structural engineer", "Architect", "BCIN designer", "HVAC designer", "Electrician", "Plumber", "Septic designer", "Geotechnical engineer", "Arborist", "Conservation authority", "Environmental testing", "Other"], { required: true }));
  questions.push(dropdown("Recommended next internal meeting", H_NEXT_STEPS, SEC21,
    ["Sales alignment", "Budget alignment", "Design kickoff", "Site revisit", "Constructability meeting", "Management review", "No meeting required"], { required: true }));
  questions.push(dropdown("Client-facing recommendation", H_NEXT_STEPS, SEC21,
    ["Proceed to pre-construction", "Proceed after clarifications", "Revise scope", "Confirm budget", "Complete investigation first", "Not a fit"], { required: true }));
  questions.push(dropdown("Internal go/no-go recommendation", H_NEXT_STEPS, SEC21,
    ["Go", "Conditional go", "Pause", "No-go"], { required: true }));
  questions.push(textField("Manager approval name", H_NEXT_STEPS, SEC21));
  questions.push(dateField("Manager approval date", H_NEXT_STEPS, SEC21));

  // ══════════════════════════════════
  // AUTO-TRIGGER RULES
  // ══════════════════════════════════
  const autoTriggerRules = [
    // Existing triggers
    { source_question_id: Q_SCOPE_PROJECT_TYPE, trigger_values: ["Detached ADU", "Garage Conversion ADU"], sections_to_add: ["Zoning & Planning", "Building Code & Permits", "Utilities & Servicing", "Legal, Insurance & Risk", "Risk Assessment"] },
    { source_question_id: Q_SCOPE_PROJECT_TYPE, trigger_values: ["Second Storey Addition"], sections_to_add: ["Structural Review", "Existing Structure", "Building Code & Permits", "Risk Assessment"] },
    { source_question_id: Q_SCOPE_PROJECT_TYPE, trigger_values: ["Addition", "Second Storey Addition", "Exterior Renovation", "Deck", "Garage Build / Renovation", "Detached ADU"], sections_to_add: ["Zoning & Planning", "Property & Ownership", "Civil, Grading & Drainage", "Site Access & Logistics"] },
    { source_question_id: Q_SCOPE_PROJECT_TYPE, trigger_values: ["Whole-Home Renovation", "Basement Renovation"], sections_to_add: ["Existing Structure", "Environmental & Hazardous Materials", "Building Code & Permits", "Utilities & Servicing"] },
    { source_question_id: Q_SCOPE_PROJECT_TYPE, trigger_values: ["New Build"], sections_to_add: ["Property & Ownership", "Zoning & Planning", "Building Code & Permits", "Site Access & Logistics", "Civil, Grading & Drainage", "Utilities & Servicing", "Schedule Feasibility", "Budget & Estimate Feasibility"] },
    { source_question_id: Q_SCOPE_PROJECT_TYPE, trigger_values: ["Deck"], sections_to_add: ["Zoning & Planning", "Building Code & Permits", "Structural Review", "Site Access & Logistics"] },
    // Onsite staff triggers
    { source_question_id: Q_STAFF_RECOMMEND, trigger_values: ["Proceed only after investigation", "Pause until client/budget alignment", "Pause until professional review", "Disqualify / not a fit"], sections_to_add: ["Risk Assessment"] },
    { source_question_id: Q_SCOPE_ONSITE, trigger_values: ["Yes", "Partially"], sections_to_add: ["Onsite Staff Checklist"] },
    // V2: Occupancy triggers
    { source_question_id: Q_OCCUPANCY, trigger_values: ["Tenant occupied"], sections_to_add: ["Legal, Insurance & Risk", "Schedule Feasibility", "Constructability"] },
    // V2: Proposed use triggers
    { source_question_id: Q_PROPOSED_USE, trigger_values: ["Additional dwelling unit"], sections_to_add: ["Zoning & Planning", "Building Code & Permits", "Utilities & Servicing", "Legal, Insurance & Risk", "Risk Assessment"] },
    // V2: Exterior footprint triggers
    { source_question_id: Q_EXTERIOR_FOOTPRINT, trigger_values: ["Yes"], sections_to_add: ["Property & Ownership", "Zoning & Planning", "Civil, Grading & Drainage", "Site Access & Logistics"] },
    // V2: Demolition + pre-1990 trigger
    { source_question_id: Q_DEMOLITION, trigger_values: ["Yes"], sections_to_add: ["Environmental & Hazardous Materials"] },
    // V2: Septic/well triggers
    { source_question_id: Q_ON_SEPTIC, trigger_values: ["Yes"], sections_to_add: ["Utilities & Servicing", "Risk Assessment"] },
    { source_question_id: Q_ON_WELL, trigger_values: ["Yes"], sections_to_add: ["Utilities & Servicing"] },
    // V2: Neighbour access
    { source_question_id: Q_NEIGHBOUR_ACCESS, trigger_values: ["Yes"], sections_to_add: ["Legal, Insurance & Risk", "Risk Assessment"] },
    // V2: Road occupancy
    { source_question_id: Q_ROAD_OCCUPANCY, trigger_values: ["Yes", "Unknown"], sections_to_add: ["Building Code & Permits", "Schedule Feasibility"] },
    // V2: Lot grading plan
    { source_question_id: Q_LOT_GRADING_PLAN, trigger_values: ["Yes", "Unknown"], sections_to_add: ["Building Code & Permits", "Budget & Estimate Feasibility"] },
    // V2: Zoning as-of-right = No
    { source_question_id: Q_AS_OF_RIGHT, trigger_values: ["No"], sections_to_add: ["Risk Assessment", "Schedule Feasibility", "Budget & Estimate Feasibility"] },
    // V2: Invasive investigation
    { source_question_id: Q_INVASIVE_INVESTIGATION, trigger_values: ["Yes"], sections_to_add: ["Risk Assessment"] },
    // V2: Constructability meeting
    { source_question_id: Q_CONSTRUCTABILITY_MTG, trigger_values: ["Yes"], sections_to_add: ["Risk Assessment"] },
    // V2: Expectation reset
    { source_question_id: Q_EXPECTATION_RESET, trigger_values: ["Yes"], sections_to_add: ["Risk Assessment"] },
    // V2: Financing not confirmed
    { source_question_id: Q_FINANCING_METHOD, trigger_values: ["Not confirmed", "Unknown"], sections_to_add: ["Risk Assessment", "Budget & Estimate Feasibility"] },
    // V2: Legal/management review
    { source_question_id: Q_LEGAL_REVIEW, trigger_values: ["Yes", "Unknown"], sections_to_add: ["Risk Assessment"] },
    // V2: Year built < 1990 → Environmental
    { source_question_id: Q_HOME_BEFORE_1990, trigger_values: ["Yes", "Unknown"], sections_to_add: ["Environmental & Hazardous Materials"] },
    // V2: Client living in home
    { source_question_id: Q_OCCUPANCY, trigger_values: ["Owner occupied", "Mixed owner/tenant"], sections_to_add: ["Schedule Feasibility", "Constructability", "Legal, Insurance & Risk"] },
  ];

  // ══════════════════════════════════
  // SECTION FOLLOW-UP RULES
  // ══════════════════════════════════
  const followupMap = {};
  for (const q of questions) {
    if (q.is_followup && q.category_id) {
      if (!followupMap[q.category_id]) followupMap[q.category_id] = [];
      followupMap[q.category_id].push(q.id);
    }
  }
  const sectionFollowupRules = Object.entries(followupMap).map(([headingId, qIds]) => ({
    heading_id: headingId,
    threshold_score: 999,
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
    question_count: questions.length,
  });
});