/**
 * Deliverable form field configurations for all 34 PreconStages.
 * Keyed by stage_order number.
 *
 * Field types: text, textarea, richtext, number, currency, date, select, calculated, checkbox
 * auto_from: "lead.<field>" | "sale.<field>" | "client.<field>" | "stage.<prev_stage_order>.<form_field>"
 * svic: true  — marks a field as S.V.I.C. language (client-facing)
 */

const CONFIGS = {
  // ── Stage 1: Project Intake & Qualification ────────────────────────
  1: {
    title: 'Project Intake Form',
    fields: [
      { key: 'project_name', label: 'Project Name', type: 'text', auto_from: 'lead.title', required: true },
      { key: 'client_name', label: 'Client Name', type: 'text', auto_from: 'client.contact_name', required: true },
      { key: 'client_email', label: 'Client Email', type: 'text', auto_from: 'client.email' },
      { key: 'client_phone', label: 'Client Phone', type: 'text', auto_from: 'client.phone' },
      { key: 'property_address', label: 'Property Address', type: 'text' },
      { key: 'project_type', label: 'Project Type', type: 'select', options: ['New Build', 'Renovation', 'Addition', 'Mixed'] },
      { key: 'lead_source', label: 'Lead Source', type: 'text', auto_from: 'lead.source' },
      { key: 'estimated_precon_value', label: 'Estimated Pre-Con Value ($)', type: 'currency', auto_from: 'lead.estimated_precon_value' },
      { key: 'estimated_construction_value', label: 'Estimated Construction Value ($)', type: 'currency', auto_from: 'lead.estimated_construction_value' },
      { key: 'client_budget_range', label: 'Client Budget Range', type: 'text' },
      { key: 'target_start_date', label: 'Target Construction Start', type: 'date' },
      { key: 'qualification_notes', label: 'Qualification Notes', type: 'textarea', svic: false },
      { key: 'go_no_go_decision', label: 'Go / No-Go Decision', type: 'select', options: ['Go', 'Conditional Go', 'No-Go'], required: true },
    ],
  },

  // ── Stage 2: Initial Client Consultation ───────────────────────────
  2: {
    title: 'Consultation Notes & Project Brief',
    fields: [
      { key: 'meeting_date', label: 'Meeting Date', type: 'date', required: true },
      { key: 'attendees', label: 'Attendees', type: 'text' },
      { key: 'meeting_format', label: 'Format', type: 'select', options: ['Video Call', 'In-Person', 'Phone'] },
      { key: 'client_vision', label: 'Client Vision & Goals', type: 'richtext', svic: true },
      { key: 'functional_requirements', label: 'Functional Requirements', type: 'richtext' },
      { key: 'aesthetic_preferences', label: 'Aesthetic Preferences', type: 'richtext' },
      { key: 'budget_discussion', label: 'Budget Discussion Summary', type: 'textarea' },
      { key: 'timeline_expectations', label: 'Timeline Expectations', type: 'textarea' },
      { key: 'special_requirements', label: 'Special Requirements / Concerns', type: 'richtext' },
      { key: 'next_steps', label: 'Next Steps', type: 'textarea' },
    ],
  },

  // ── Stage 3: Site Visit & Assessment ───────────────────────────────
  3: {
    title: 'Site Assessment Report',
    fields: [
      { key: 'visit_date', label: 'Visit Date', type: 'date', required: true },
      { key: 'address', label: 'Property Address', type: 'text', auto_from: 'stage.1.property_address' },
      { key: 'lot_dimensions', label: 'Lot Dimensions', type: 'text' },
      { key: 'existing_structure', label: 'Existing Structure Description', type: 'richtext' },
      { key: 'structural_observations', label: 'Structural Observations', type: 'richtext' },
      { key: 'mechanical_observations', label: 'Mechanical / HVAC Observations', type: 'richtext' },
      { key: 'electrical_observations', label: 'Electrical Observations', type: 'richtext' },
      { key: 'plumbing_observations', label: 'Plumbing Observations', type: 'richtext' },
      { key: 'site_access_notes', label: 'Site Access & Staging Notes', type: 'textarea' },
      { key: 'environmental_concerns', label: 'Environmental Concerns', type: 'textarea' },
      { key: 'zoning_info', label: 'Zoning / Setback Info', type: 'textarea' },
      { key: 'risk_items', label: 'Risk Items Identified', type: 'richtext' },
      { key: 'photo_notes', label: 'Photo Documentation Notes', type: 'textarea' },
    ],
  },

  // ── Stage 4: Existing Conditions Documentation ─────────────────────
  4: {
    title: 'As-Built Drawings / 3D Model',
    fields: [
      { key: 'documentation_type', label: 'Documentation Type', type: 'select', options: ['2D Floor Plans', '3D Scan / Model', 'Combined 2D & 3D'] },
      { key: 'software_used', label: 'Software / Tools Used', type: 'text' },
      { key: 'floor_count', label: 'Number of Floors Documented', type: 'number' },
      { key: 'total_sq_ft', label: 'Total Existing Square Footage', type: 'number' },
      { key: 'key_measurements', label: 'Key Measurements & Notes', type: 'richtext' },
      { key: 'discrepancies', label: 'Discrepancies from Original Plans', type: 'textarea' },
      { key: 'completion_date', label: 'Documentation Completion Date', type: 'date' },
    ],
  },

  // ── Stage 5: Feasibility Study ─────────────────────────────────────
  5: {
    title: 'Feasibility Report',
    fields: [
      { key: 'zoning_compliance', label: 'Zoning Compliance', type: 'select', options: ['Compliant', 'Variance Required', 'Non-Compliant'], required: true },
      { key: 'zoning_notes', label: 'Zoning Analysis Notes', type: 'richtext' },
      { key: 'structural_feasibility', label: 'Structural Feasibility', type: 'select', options: ['Feasible', 'Feasible with Conditions', 'Not Feasible'] },
      { key: 'structural_notes', label: 'Structural Notes', type: 'richtext' },
      { key: 'budget_feasibility', label: 'Budget Feasibility', type: 'select', options: ['Within Range', 'Slightly Over', 'Significantly Over'] },
      { key: 'budget_range_low', label: 'Budget Range Low ($)', type: 'currency' },
      { key: 'budget_range_high', label: 'Budget Range High ($)', type: 'currency' },
      { key: 'regulatory_constraints', label: 'Regulatory Constraints', type: 'richtext' },
      { key: 'risk_log', label: 'Risk Log', type: 'richtext' },
      { key: 'overall_recommendation', label: 'Overall Recommendation', type: 'select', options: ['Proceed', 'Proceed with Conditions', 'Do Not Proceed'], required: true, svic: true },
      { key: 'recommendation_summary', label: 'Recommendation Summary (S.V.I.C.)', type: 'richtext', svic: true },
    ],
  },

  // ── Stage 6: Preliminary Budget Development ────────────────────────
  6: {
    title: 'Preliminary Budget Estimate',
    fields: [
      { key: 'estimate_class', label: 'Estimate Class', type: 'select', options: ['Class D (Order of Magnitude)', 'Class C (Budget)', 'Class B (Substantive)'] },
      { key: 'total_estimated_cost', label: 'Total Estimated Cost ($)', type: 'currency', required: true },
      { key: 'site_work_cost', label: 'Site Work ($)', type: 'currency' },
      { key: 'structural_cost', label: 'Structural ($)', type: 'currency' },
      { key: 'envelope_cost', label: 'Building Envelope ($)', type: 'currency' },
      { key: 'mechanical_cost', label: 'Mechanical / HVAC ($)', type: 'currency' },
      { key: 'electrical_cost', label: 'Electrical ($)', type: 'currency' },
      { key: 'plumbing_cost', label: 'Plumbing ($)', type: 'currency' },
      { key: 'finishes_cost', label: 'Interior Finishes ($)', type: 'currency' },
      { key: 'contingency_pct', label: 'Contingency (%)', type: 'number' },
      { key: 'contingency_amount', label: 'Contingency Amount ($)', type: 'calculated', formula: 'total_estimated_cost * contingency_pct / 100' },
      { key: 'total_with_contingency', label: 'Total with Contingency ($)', type: 'calculated', formula: 'total_estimated_cost + (total_estimated_cost * contingency_pct / 100)' },
      { key: 'cost_per_sq_ft', label: 'Cost per Sq Ft ($)', type: 'calculated', formula: 'total_estimated_cost / sq_footage', depends: ['sq_footage'] },
      { key: 'sq_footage', label: 'Estimated Square Footage', type: 'number', auto_from: 'stage.4.total_sq_ft' },
      { key: 'assumptions', label: 'Key Assumptions & Exclusions', type: 'richtext' },
      { key: 'basis_of_estimate', label: 'Basis of Estimate', type: 'textarea' },
    ],
  },

  // ── Stage 7: Client Budget Alignment ───────────────────────────────
  7: {
    title: 'Budget Alignment Letter',
    fields: [
      { key: 'presentation_date', label: 'Presentation Date', type: 'date', required: true },
      { key: 'presented_budget', label: 'Presented Budget ($)', type: 'currency', auto_from: 'stage.6.total_with_contingency' },
      { key: 'client_feedback', label: 'Client Feedback', type: 'richtext' },
      { key: 'scope_adjustments', label: 'Scope Adjustments Agreed', type: 'richtext', svic: true },
      { key: 'revised_budget', label: 'Revised Budget (if changed) ($)', type: 'currency' },
      { key: 'alignment_status', label: 'Alignment Status', type: 'select', options: ['Aligned', 'Conditionally Aligned', 'Not Aligned'], required: true },
      { key: 'client_signature_date', label: 'Client Signature Date', type: 'date' },
    ],
  },

  // ── Stage 8: Pre-Construction Agreement ────────────────────────────
  8: {
    title: 'Pre-Construction Agreement',
    fields: [
      { key: 'agreement_type', label: 'Agreement Type', type: 'select', options: ['Fixed Fee', 'Hourly', 'Percentage of Construction'] },
      { key: 'precon_fee', label: 'Pre-Construction Fee ($)', type: 'currency', auto_from: 'lead.estimated_precon_value' },
      { key: 'scope_of_services', label: 'Scope of Pre-Con Services', type: 'richtext', svic: true },
      { key: 'payment_terms', label: 'Payment Terms', type: 'textarea' },
      { key: 'estimated_duration', label: 'Estimated Pre-Con Duration', type: 'text' },
      { key: 'client_signed_date', label: 'Client Signature Date', type: 'date', required: true },
      { key: 'company_signed_date', label: 'Company Signature Date', type: 'date', required: true },
      { key: 'special_conditions', label: 'Special Conditions', type: 'richtext' },
    ],
  },

  // ── Stage 9: Design Team Assembly ──────────────────────────────────
  9: {
    title: 'Design Team Roster & Engagement Letters',
    fields: [
      { key: 'architect_firm', label: 'Architect Firm', type: 'text' },
      { key: 'architect_contact', label: 'Architect Contact', type: 'text' },
      { key: 'architect_fee', label: 'Architect Fee ($)', type: 'currency' },
      { key: 'structural_engineer', label: 'Structural Engineer Firm', type: 'text' },
      { key: 'structural_fee', label: 'Structural Engineer Fee ($)', type: 'currency' },
      { key: 'mech_engineer', label: 'Mechanical Engineer Firm', type: 'text' },
      { key: 'mech_fee', label: 'Mechanical Engineer Fee ($)', type: 'currency' },
      { key: 'elec_engineer', label: 'Electrical Engineer Firm', type: 'text' },
      { key: 'elec_fee', label: 'Electrical Engineer Fee ($)', type: 'currency' },
      { key: 'other_consultants', label: 'Other Consultants', type: 'richtext' },
      { key: 'total_consultant_fees', label: 'Total Consultant Fees ($)', type: 'calculated', formula: 'architect_fee + structural_fee + mech_fee + elec_fee' },
      { key: 'engagement_status', label: 'All Engagement Letters Signed?', type: 'checkbox' },
    ],
  },

  // ── Stage 10: Schematic Design ─────────────────────────────────────
  10: {
    title: 'Schematic Design Package (SD)',
    fields: [
      { key: 'design_start_date', label: 'Design Start Date', type: 'date' },
      { key: 'design_completion_date', label: 'Design Completion Date', type: 'date' },
      { key: 'total_sq_ft_proposed', label: 'Proposed Total Sq Ft', type: 'number' },
      { key: 'floor_plan_description', label: 'Floor Plan Description', type: 'richtext' },
      { key: 'elevation_description', label: 'Elevation Description', type: 'richtext' },
      { key: 'key_design_features', label: 'Key Design Features', type: 'richtext', svic: true },
      { key: 'design_revisions', label: 'Revisions Made', type: 'textarea' },
      { key: 'drawings_list', label: 'Drawing List / Index', type: 'textarea' },
    ],
  },

  // ── Stage 11: Client Design Review – SD ────────────────────────────
  11: {
    title: 'Client-Approved SD Package',
    fields: [
      { key: 'review_date', label: 'Review Meeting Date', type: 'date', required: true },
      { key: 'client_feedback', label: 'Client Feedback', type: 'richtext' },
      { key: 'changes_requested', label: 'Changes Requested', type: 'richtext' },
      { key: 'changes_incorporated', label: 'Changes Incorporated?', type: 'checkbox' },
      { key: 'approval_date', label: 'Client Approval Date', type: 'date' },
      { key: 'approval_notes', label: 'Approval Notes (S.V.I.C.)', type: 'richtext', svic: true },
    ],
  },

  // ── Stage 12: Design Development ───────────────────────────────────
  12: {
    title: 'Design Development Package (DD)',
    fields: [
      { key: 'dd_start_date', label: 'DD Start Date', type: 'date' },
      { key: 'dd_completion_date', label: 'DD Completion Date', type: 'date' },
      { key: 'material_specs_summary', label: 'Material Specifications Summary', type: 'richtext' },
      { key: 'systems_summary', label: 'Building Systems Summary', type: 'richtext' },
      { key: 'detail_drawings_count', label: 'Number of Detail Drawings', type: 'number' },
      { key: 'coordination_notes', label: 'Coordination Notes', type: 'textarea' },
      { key: 'dd_drawing_list', label: 'DD Drawing Index', type: 'textarea' },
    ],
  },

  // ── Stage 13: Material & Finish Selections ─────────────────────────
  13: {
    title: 'Complete Selections Schedule',
    fields: [
      { key: 'flooring_selection', label: 'Flooring Selection', type: 'text' },
      { key: 'flooring_cost', label: 'Flooring Budget ($)', type: 'currency' },
      { key: 'cabinetry_selection', label: 'Cabinetry Selection', type: 'text' },
      { key: 'cabinetry_cost', label: 'Cabinetry Budget ($)', type: 'currency' },
      { key: 'countertop_selection', label: 'Countertop Selection', type: 'text' },
      { key: 'countertop_cost', label: 'Countertop Budget ($)', type: 'currency' },
      { key: 'plumbing_fixtures', label: 'Plumbing Fixtures', type: 'text' },
      { key: 'plumbing_fixtures_cost', label: 'Plumbing Fixtures Budget ($)', type: 'currency' },
      { key: 'lighting_selection', label: 'Lighting Selections', type: 'text' },
      { key: 'lighting_cost', label: 'Lighting Budget ($)', type: 'currency' },
      { key: 'paint_colors', label: 'Paint Colors', type: 'text' },
      { key: 'tile_selection', label: 'Tile Selections', type: 'text' },
      { key: 'tile_cost', label: 'Tile Budget ($)', type: 'currency' },
      { key: 'hardware_selection', label: 'Hardware Selections', type: 'text' },
      { key: 'appliance_selection', label: 'Appliance Selections', type: 'text' },
      { key: 'appliance_cost', label: 'Appliance Budget ($)', type: 'currency' },
      { key: 'other_selections', label: 'Other Selections', type: 'richtext' },
      { key: 'total_selections_cost', label: 'Total Selections Cost ($)', type: 'calculated', formula: 'flooring_cost + cabinetry_cost + countertop_cost + plumbing_fixtures_cost + lighting_cost + tile_cost + appliance_cost' },
      { key: 'selections_complete', label: 'All Selections Finalized?', type: 'checkbox' },
      { key: 'client_approval_date', label: 'Client Approval Date', type: 'date' },
    ],
  },

  // ── Stage 14: Structural Engineering ───────────────────────────────
  14: {
    title: 'Structural Engineering Drawings & Calcs',
    fields: [
      { key: 'engineer_firm', label: 'Engineering Firm', type: 'text', auto_from: 'stage.9.structural_engineer' },
      { key: 'scope_of_work', label: 'Scope of Structural Work', type: 'richtext' },
      { key: 'foundation_type', label: 'Foundation Type', type: 'select', options: ['Slab on Grade', 'Crawl Space', 'Full Basement', 'Piers/Piles', 'Other'] },
      { key: 'framing_type', label: 'Framing Type', type: 'select', options: ['Wood Frame', 'Steel Frame', 'Concrete', 'Hybrid'] },
      { key: 'key_findings', label: 'Key Findings / Special Conditions', type: 'richtext' },
      { key: 'drawings_received_date', label: 'Drawings Received Date', type: 'date' },
      { key: 'review_status', label: 'Review Status', type: 'select', options: ['Pending Review', 'Reviewed - OK', 'Reviewed - Revisions Needed'] },
    ],
  },

  // ── Stage 15: Mechanical/Electrical Engineering ────────────────────
  15: {
    title: 'M/E Engineering Drawings',
    fields: [
      { key: 'mech_firm', label: 'Mechanical Firm', type: 'text', auto_from: 'stage.9.mech_engineer' },
      { key: 'elec_firm', label: 'Electrical Firm', type: 'text', auto_from: 'stage.9.elec_engineer' },
      { key: 'hvac_system_type', label: 'HVAC System Type', type: 'text' },
      { key: 'hvac_capacity', label: 'HVAC Capacity (tons / BTU)', type: 'text' },
      { key: 'electrical_service', label: 'Electrical Service Size', type: 'select', options: ['100A', '200A', '400A', 'Other'] },
      { key: 'plumbing_scope', label: 'Plumbing Scope Summary', type: 'textarea' },
      { key: 'special_systems', label: 'Special Systems (in-floor heat, ERV, etc.)', type: 'textarea' },
      { key: 'mech_received_date', label: 'Mechanical Drawings Received', type: 'date' },
      { key: 'elec_received_date', label: 'Electrical Drawings Received', type: 'date' },
      { key: 'coordination_issues', label: 'Coordination Issues', type: 'richtext' },
    ],
  },

  // ── Stage 16: Energy Compliance Review ─────────────────────────────
  16: {
    title: 'Energy Compliance Report',
    fields: [
      { key: 'compliance_standard', label: 'Compliance Standard', type: 'select', options: ['OBC SB-12', 'OBC SB-10', 'EnerGuide', 'ENERGY STAR', 'Other'] },
      { key: 'energy_model_tool', label: 'Energy Modelling Tool Used', type: 'text' },
      { key: 'insulation_values', label: 'Insulation R-Values Summary', type: 'textarea' },
      { key: 'window_performance', label: 'Window U-Value / SHGC', type: 'text' },
      { key: 'air_tightness_target', label: 'Air Tightness Target (ACH)', type: 'text' },
      { key: 'compliance_result', label: 'Compliance Result', type: 'select', options: ['Pass', 'Conditional Pass', 'Fail - Revisions Needed'], required: true },
      { key: 'recommendations', label: 'Recommendations', type: 'richtext' },
      { key: 'report_date', label: 'Report Date', type: 'date' },
    ],
  },

  // ── Stage 17: Client Design Review – DD ────────────────────────────
  17: {
    title: 'Client-Approved DD Package',
    fields: [
      { key: 'review_date', label: 'Review Meeting Date', type: 'date', required: true },
      { key: 'client_feedback', label: 'Client Feedback', type: 'richtext' },
      { key: 'changes_requested', label: 'Changes Requested', type: 'richtext' },
      { key: 'changes_incorporated', label: 'Changes Incorporated?', type: 'checkbox' },
      { key: 'approval_date', label: 'Client Approval Date', type: 'date' },
      { key: 'approval_letter_sent', label: 'Approval Letter Sent?', type: 'checkbox' },
    ],
  },

  // ── Stage 18: Detailed Cost Estimate ───────────────────────────────
  18: {
    title: 'Detailed Cost Estimate Report',
    fields: [
      { key: 'estimate_class', label: 'Estimate Class', type: 'select', options: ['Class C (Budget)', 'Class B (Substantive)', 'Class A (Definitive)'] },
      { key: 'total_hard_costs', label: 'Total Hard Costs ($)', type: 'currency', required: true },
      { key: 'total_soft_costs', label: 'Total Soft Costs ($)', type: 'currency' },
      { key: 'contingency_pct', label: 'Contingency (%)', type: 'number' },
      { key: 'total_project_cost', label: 'Total Project Cost ($)', type: 'calculated', formula: 'total_hard_costs + total_soft_costs + (total_hard_costs * contingency_pct / 100)' },
      { key: 'cost_per_sq_ft', label: 'Cost per Sq Ft ($)', type: 'calculated', formula: 'total_hard_costs / sq_footage', depends: ['sq_footage'] },
      { key: 'sq_footage', label: 'Square Footage', type: 'number', auto_from: 'stage.10.total_sq_ft_proposed' },
      { key: 'variance_from_prelim', label: 'Variance from Preliminary Budget', type: 'textarea' },
      { key: 'estimate_notes', label: 'Estimate Notes & Qualifications', type: 'richtext' },
    ],
  },

  // ── Stage 19: Value Engineering ────────────────────────────────────
  19: {
    title: 'Value Engineering Report & Revised Estimate',
    fields: [
      { key: 've_session_date', label: 'VE Session Date', type: 'date', required: true },
      { key: 'attendees', label: 'VE Team / Attendees', type: 'text' },
      { key: 'items_reviewed', label: 'Items Reviewed', type: 'richtext' },
      { key: 'savings_identified', label: 'Total Savings Identified ($)', type: 'currency' },
      { key: 'savings_accepted', label: 'Savings Accepted ($)', type: 'currency' },
      { key: 'original_estimate', label: 'Original Estimate ($)', type: 'currency', auto_from: 'stage.18.total_project_cost' },
      { key: 'revised_estimate', label: 'Revised Estimate ($)', type: 'calculated', formula: 'original_estimate - savings_accepted' },
      { key: 've_items_detail', label: 'VE Items Detail', type: 'richtext' },
      { key: 'quality_impact_assessment', label: 'Quality Impact Assessment', type: 'richtext' },
    ],
  },

  // ── Stage 20: Client Budget Review & Approval ──────────────────────
  20: {
    title: 'Client-Approved Project Budget',
    fields: [
      { key: 'presentation_date', label: 'Presentation Date', type: 'date', required: true },
      { key: 'final_budget', label: 'Final Approved Budget ($)', type: 'currency', required: true, auto_from: 'stage.19.revised_estimate' },
      { key: 'scope_summary', label: 'Scope Summary (S.V.I.C.)', type: 'richtext', svic: true },
      { key: 'client_concerns', label: 'Client Concerns / Questions', type: 'richtext' },
      { key: 'approval_date', label: 'Approval Date', type: 'date' },
      { key: 'budget_letter_signed', label: 'Budget Letter Signed?', type: 'checkbox' },
    ],
  },

  // ── Stage 21: Construction Document Preparation ────────────────────
  21: {
    title: 'Construction Document Set (CD)',
    fields: [
      { key: 'cd_start_date', label: 'CD Start Date', type: 'date' },
      { key: 'cd_completion_date', label: 'CD Completion Date', type: 'date' },
      { key: 'drawing_count', label: 'Total Number of Drawings', type: 'number' },
      { key: 'spec_sections', label: 'Specification Sections', type: 'textarea' },
      { key: 'cd_review_status', label: 'Internal Review Status', type: 'select', options: ['Pending', 'In Review', 'Approved', 'Revisions Needed'] },
      { key: 'coordination_complete', label: 'All Disciplines Coordinated?', type: 'checkbox' },
      { key: 'cd_notes', label: 'CD Notes', type: 'textarea' },
    ],
  },

  // ── Stage 22: Permit Application Preparation ───────────────────────
  22: {
    title: 'Complete Permit Application Package',
    fields: [
      { key: 'municipality', label: 'Municipality / Jurisdiction', type: 'text' },
      { key: 'permit_type', label: 'Permit Type', type: 'select', options: ['Building Permit', 'Demolition Permit', 'Combined', 'Minor Variance', 'Other'] },
      { key: 'application_fee', label: 'Application Fee ($)', type: 'currency' },
      { key: 'documents_checklist', label: 'Required Documents Checklist', type: 'richtext' },
      { key: 'all_documents_ready', label: 'All Documents Ready?', type: 'checkbox' },
      { key: 'application_date', label: 'Target Application Date', type: 'date' },
    ],
  },

  // ── Stage 23: Permit Submission ────────────────────────────────────
  23: {
    title: 'Permit Submission Confirmation',
    fields: [
      { key: 'submission_date', label: 'Submission Date', type: 'date', required: true },
      { key: 'submission_method', label: 'Submission Method', type: 'select', options: ['Online Portal', 'In-Person', 'Mail'] },
      { key: 'application_number', label: 'Application / Reference Number', type: 'text' },
      { key: 'estimated_review_time', label: 'Estimated Review Timeline', type: 'text' },
      { key: 'submission_notes', label: 'Submission Notes', type: 'textarea' },
    ],
  },

  // ── Stage 24: Permit Review & Revisions ────────────────────────────
  24: {
    title: 'Addressed Review Comments / Revised Submissions',
    fields: [
      { key: 'comments_received_date', label: 'Comments Received Date', type: 'date' },
      { key: 'comment_summary', label: 'Comment Summary', type: 'richtext' },
      { key: 'response_actions', label: 'Response Actions Taken', type: 'richtext' },
      { key: 'resubmission_date', label: 'Resubmission Date', type: 'date' },
      { key: 'revision_rounds', label: 'Number of Revision Rounds', type: 'number' },
      { key: 'status', label: 'Current Status', type: 'select', options: ['Awaiting Comments', 'Responding to Comments', 'Resubmitted', 'Approved'] },
    ],
  },

  // ── Stage 25: Permit Issuance ──────────────────────────────────────
  25: {
    title: 'Issued Building Permit',
    fields: [
      { key: 'permit_number', label: 'Permit Number', type: 'text', required: true },
      { key: 'issue_date', label: 'Issue Date', type: 'date', required: true },
      { key: 'expiry_date', label: 'Expiry Date', type: 'date' },
      { key: 'conditions', label: 'Conditions of Approval', type: 'richtext' },
      { key: 'inspections_required', label: 'Inspections Required', type: 'richtext' },
    ],
  },

  // ── Stage 26: Subtrade Procurement ─────────────────────────────────
  26: {
    title: 'Bid Summary & Recommended Subtrade List',
    fields: [
      { key: 'rfp_sent_date', label: 'RFP Sent Date', type: 'date' },
      { key: 'bids_due_date', label: 'Bids Due Date', type: 'date' },
      { key: 'trades_solicited', label: 'Number of Trades Solicited', type: 'number' },
      { key: 'bids_received', label: 'Number of Bids Received', type: 'number' },
      { key: 'bid_summary', label: 'Bid Comparison Summary', type: 'richtext' },
      { key: 'recommended_subs', label: 'Recommended Subtrades', type: 'richtext' },
      { key: 'total_sub_cost', label: 'Total Subtrade Cost ($)', type: 'currency' },
      { key: 'procurement_notes', label: 'Procurement Notes', type: 'textarea' },
    ],
  },

  // ── Stage 27: Subtrade Award & Contracts ───────────────────────────
  27: {
    title: 'Signed Subtrade Contracts',
    fields: [
      { key: 'contracts_awarded', label: 'Number of Contracts Awarded', type: 'number' },
      { key: 'total_contracted_value', label: 'Total Contracted Value ($)', type: 'currency', required: true },
      { key: 'contract_summary', label: 'Contract Summary by Trade', type: 'richtext' },
      { key: 'insurance_verified', label: 'Insurance Verified for All Subs?', type: 'checkbox' },
      { key: 'all_contracts_signed', label: 'All Contracts Signed?', type: 'checkbox' },
      { key: 'award_notes', label: 'Award Notes', type: 'textarea' },
    ],
  },

  // ── Stage 28: Construction Schedule Development ────────────────────
  28: {
    title: 'Master Construction Schedule',
    fields: [
      { key: 'schedule_tool', label: 'Scheduling Tool Used', type: 'text' },
      { key: 'project_duration_weeks', label: 'Project Duration (weeks)', type: 'number', required: true },
      { key: 'start_date', label: 'Planned Start Date', type: 'date', required: true },
      { key: 'completion_date', label: 'Planned Completion Date', type: 'date', required: true },
      { key: 'milestone_summary', label: 'Key Milestones', type: 'richtext' },
      { key: 'critical_path', label: 'Critical Path Items', type: 'richtext' },
      { key: 'resource_allocation', label: 'Resource Allocation Summary', type: 'textarea' },
      { key: 'schedule_risks', label: 'Schedule Risks', type: 'textarea' },
    ],
  },

  // ── Stage 29: Pre-Construction Meeting – Internal ──────────────────
  29: {
    title: 'Internal Pre-Con Meeting Minutes',
    fields: [
      { key: 'meeting_date', label: 'Meeting Date', type: 'date', required: true },
      { key: 'attendees', label: 'Attendees', type: 'text' },
      { key: 'scope_review', label: 'Scope Review Notes', type: 'richtext' },
      { key: 'schedule_review', label: 'Schedule Review Notes', type: 'richtext' },
      { key: 'budget_review', label: 'Budget Review Notes', type: 'richtext' },
      { key: 'risk_discussion', label: 'Risk Discussion', type: 'richtext' },
      { key: 'roles_responsibilities', label: 'Roles & Responsibilities Confirmed', type: 'richtext' },
      { key: 'action_items', label: 'Action Items', type: 'richtext' },
    ],
  },

  // ── Stage 30: Pre-Construction Meeting – Client ────────────────────
  30: {
    title: 'Client Pre-Con Meeting Minutes',
    fields: [
      { key: 'meeting_date', label: 'Meeting Date', type: 'date', required: true },
      { key: 'attendees', label: 'Attendees', type: 'text' },
      { key: 'project_overview', label: 'Project Overview Presented (S.V.I.C.)', type: 'richtext', svic: true },
      { key: 'schedule_presented', label: 'Schedule Review', type: 'richtext', svic: true },
      { key: 'communication_protocol', label: 'Communication Protocol', type: 'richtext', svic: true },
      { key: 'client_questions', label: 'Client Questions & Answers', type: 'richtext' },
      { key: 'next_steps', label: 'Next Steps & Expectations', type: 'richtext', svic: true },
    ],
  },

  // ── Stage 31: Buildertrend Project Setup ───────────────────────────
  31: {
    title: 'Live Buildertrend Project',
    fields: [
      { key: 'bt_project_name', label: 'Buildertrend Project Name', type: 'text', auto_from: 'lead.title' },
      { key: 'bt_setup_date', label: 'Setup Date', type: 'date' },
      { key: 'schedule_uploaded', label: 'Schedule Uploaded?', type: 'checkbox' },
      { key: 'budget_uploaded', label: 'Budget Uploaded?', type: 'checkbox' },
      { key: 'documents_uploaded', label: 'Documents Uploaded?', type: 'checkbox' },
      { key: 'client_portal_activated', label: 'Client Portal Activated?', type: 'checkbox' },
      { key: 'team_access_granted', label: 'Team Access Granted?', type: 'checkbox' },
      { key: 'setup_notes', label: 'Setup Notes', type: 'textarea' },
    ],
  },

  // ── Stage 32: Final Pre-Construction Review ────────────────────────
  32: {
    title: 'Pre-Con Completion Checklist',
    fields: [
      { key: 'review_date', label: 'Review Date', type: 'date', required: true },
      { key: 'all_designs_approved', label: 'All Designs Approved?', type: 'checkbox' },
      { key: 'permits_in_hand', label: 'Permits in Hand?', type: 'checkbox' },
      { key: 'budget_finalized', label: 'Budget Finalized?', type: 'checkbox' },
      { key: 'contracts_signed', label: 'All Contracts Signed?', type: 'checkbox' },
      { key: 'schedule_confirmed', label: 'Schedule Confirmed?', type: 'checkbox' },
      { key: 'bt_setup_complete', label: 'Buildertrend Setup Complete?', type: 'checkbox' },
      { key: 'client_aligned', label: 'Client Expectations Aligned?', type: 'checkbox' },
      { key: 'risk_register_complete', label: 'Risk Register Complete?', type: 'checkbox' },
      { key: 'outstanding_items', label: 'Outstanding Items', type: 'richtext' },
      { key: 'reviewer_sign_off', label: 'Reviewer Sign-Off Notes', type: 'textarea' },
    ],
  },

  // ── Stage 33: Construction Contract Execution ──────────────────────
  33: {
    title: 'Construction Contract',
    fields: [
      { key: 'contract_type', label: 'Contract Type', type: 'select', options: ['Fixed Price', 'Cost Plus', 'GMP', 'Time & Materials'] },
      { key: 'contract_value', label: 'Contract Value ($)', type: 'currency', required: true, auto_from: 'stage.20.final_budget' },
      { key: 'payment_schedule', label: 'Payment Schedule / Terms', type: 'richtext', svic: true },
      { key: 'start_date', label: 'Construction Start Date', type: 'date', required: true },
      { key: 'completion_date', label: 'Expected Completion Date', type: 'date', required: true, auto_from: 'stage.28.completion_date' },
      { key: 'warranty_terms', label: 'Warranty Terms', type: 'richtext', svic: true },
      { key: 'special_conditions', label: 'Special Conditions', type: 'richtext' },
      { key: 'client_signed_date', label: 'Client Signature Date', type: 'date', required: true },
      { key: 'company_signed_date', label: 'Company Signature Date', type: 'date', required: true },
    ],
  },

  // ── Stage 34: Project Handoff to Construction ──────────────────────
  34: {
    title: 'Signed Handoff Checklist',
    fields: [
      { key: 'handoff_date', label: 'Handoff Date', type: 'date', required: true },
      { key: 'pm_receiving', label: 'Construction PM Receiving', type: 'text' },
      { key: 'super_assigned', label: 'Site Superintendent Assigned', type: 'text' },
      { key: 'scope_document_transferred', label: 'Scope Document Transferred?', type: 'checkbox' },
      { key: 'drawings_transferred', label: 'All Drawings Transferred?', type: 'checkbox' },
      { key: 'permit_transferred', label: 'Permit Transferred?', type: 'checkbox' },
      { key: 'budget_transferred', label: 'Budget Transferred?', type: 'checkbox' },
      { key: 'schedule_transferred', label: 'Schedule Transferred?', type: 'checkbox' },
      { key: 'contracts_transferred', label: 'Sub Contracts Transferred?', type: 'checkbox' },
      { key: 'risk_register_transferred', label: 'Risk Register Transferred?', type: 'checkbox' },
      { key: 'client_contact_info', label: 'Client Contact Info Shared?', type: 'checkbox' },
      { key: 'special_instructions', label: 'Special Instructions / Handoff Notes', type: 'richtext', svic: true },
      { key: 'pc_sign_off', label: 'Pre-Con Team Sign-Off', type: 'checkbox' },
      { key: 'pm_sign_off', label: 'Construction PM Sign-Off', type: 'checkbox' },
    ],
  },
};

export default CONFIGS;