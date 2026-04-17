/**
 * Central permission definitions.
 * Every app section must be registered here.
 * When adding a new section, add it to PERMISSION_SECTIONS below.
 */

// Legacy 'pipeline' key is expanded into granular keys at check time (see hasPermission / hasPageAccess).
export const LEGACY_EXPANSION = {
  pipeline: ['pipeline_clients', 'pipeline_leads', 'pipeline_precon', 'pipeline_projects'],
};

export const PERMISSION_SECTIONS = [
  {
    key: 'pipeline_clients',
    label: 'Pipeline — Clients',
    description: 'View and manage clients',
    pages: ['Clients'],
    group: 'Pipeline',
  },
  {
    key: 'pipeline_leads',
    label: 'Pipeline — Leads',
    description: 'View and manage leads',
    pages: ['Leads'],
    group: 'Pipeline',
  },
  {
    key: 'pipeline_precon',
    label: 'Pipeline — Pre-Construction',
    description: 'View and manage pre-construction sales & feasibility',
    pages: ['Sales'],
    group: 'Pipeline',
  },
  {
    key: 'pipeline_projects',
    label: 'Pipeline — Projects',
    description: 'View and manage construction projects',
    pages: ['Projects'],
    group: 'Pipeline',
  },
  {
    key: 'operations',
    label: 'Operations',
    description: 'Scheduler, Budgets, Meetings',
    pages: ['Scheduler', 'Budgets', 'BudgetDetail', 'BudgetWizard', 'Meetings'],
  },
  {
    key: 'insights',
    label: 'Insights',
    description: 'Reports, KPI Dashboard, My Performance',
    pages: ['Reports', 'MyKPIs', 'KPIDashboard', 'KPIAgentChat'],
  },
  {
    key: 'company',
    label: 'Company',
    description: 'Resources, Marketing, Surveys',
    pages: ['CompanyResources', 'MarketingCampaigns', 'Surveys', 'SurveyBuilder', 'SurveyResults'],
  },
  {
    key: 'process_maps',
    label: 'Process Maps',
    description: 'View and manage process maps and SOPs',
    pages: ['ProcessMaps', 'ProcessMapView', 'ProcessMapEditor'],
  },
  {
    key: 'commissions_admin',
    label: 'Commissions Admin',
    description: 'View and manage all commissions',
    pages: ['CommissionsAdmin', 'CommissionRules'],
  },
  {
    key: 'varcomp_admin',
    label: 'Var Comp Admin',
    description: 'Variable compensation rules and payouts',
    pages: ['VarCompAdmin'],
  },
  {
    key: 'company_admin',
    label: 'Company Admin',
    description: 'Company settings, Data Quality, Import, Subtrades, KPI Definitions, Users',
    pages: ['CompanyAdmin', 'DataQuality', 'ImportHistoricalData', 'Subtrades', 'KPIDefinitions', 'CompanySettings'],
  },
];

// Pages every user can always access (no permission needed)
export const ALWAYS_ACCESSIBLE_PAGES = [
  'Dashboard', 'Commissions', 'MyAlerts', 'MyProfitShare', 'MyKPIs',
  'SurveyPublic', 'FeasibilityBuilder',
];

/**
 * Expand a user's stored permission keys, resolving any legacy bundle keys.
 */
function expandPermissions(userPerms) {
  const expanded = [];
  for (const key of userPerms) {
    if (LEGACY_EXPANSION[key]) {
      expanded.push(...LEGACY_EXPANSION[key]);
    } else {
      expanded.push(key);
    }
  }
  return expanded;
}

/**
 * Check if a user has access to a specific page.
 * Admins always have full access.
 */
export function hasPageAccess(user, pageName) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (ALWAYS_ACCESSIBLE_PAGES.includes(pageName)) return true;

  const userPerms = expandPermissions(user.permissions || []);
  return PERMISSION_SECTIONS.some(
    section => userPerms.includes(section.key) && section.pages.includes(pageName)
  );
}

/**
 * Check if a user has a specific permission key.
 * Admins always return true.
 */
export function hasPermission(user, permissionKey) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const userPerms = expandPermissions(user.permissions || []);
  return userPerms.includes(permissionKey);
}