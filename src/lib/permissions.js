/**
 * Central permission definitions.
 * Every app section must be registered here.
 * When adding a new section, add it to PERMISSION_SECTIONS below.
 */

export const PERMISSION_SECTIONS = [
  {
    key: 'pipeline',
    label: 'Pipeline',
    description: 'Clients, Leads, Pre-Construction, Projects',
    pages: ['Clients', 'Leads', 'Sales', 'Projects'],
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
 * Check if a user has access to a specific page.
 * Admins always have full access.
 */
export function hasPageAccess(user, pageName) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (ALWAYS_ACCESSIBLE_PAGES.includes(pageName)) return true;

  const userPerms = user.permissions || [];
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
  return (user.permissions || []).includes(permissionKey);
}