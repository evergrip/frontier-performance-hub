/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';

const AgendaTemplates = lazy(() => import('./pages/AgendaTemplates'));
const BudgetDetail = lazy(() => import('./pages/BudgetDetail'));
const BudgetWizard = lazy(() => import('./pages/BudgetWizard'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Clients = lazy(() => import('./pages/Clients'));
const CommissionRules = lazy(() => import('./pages/CommissionRules'));
const Commissions = lazy(() => import('./pages/Commissions'));
const CommissionsAdmin = lazy(() => import('./pages/CommissionsAdmin'));
const CompanyAdmin = lazy(() => import('./pages/CompanyAdmin'));
const CompanySettings = lazy(() => import('./pages/CompanySettings'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DataQuality = lazy(() => import('./pages/DataQuality'));
const DisqualifiedLeads = lazy(() => import('./pages/DisqualifiedLeads'));
const ImportHistoricalData = lazy(() => import('./pages/ImportHistoricalData'));
const KPIAgentChat = lazy(() => import('./pages/KPIAgentChat'));
const KPIDashboard = lazy(() => import('./pages/KPIDashboard'));
const KPIDefinitions = lazy(() => import('./pages/KPIDefinitions'));
const Leads = lazy(() => import('./pages/Leads'));
const MarketingCampaigns = lazy(() => import('./pages/MarketingCampaigns'));
const Meetings = lazy(() => import('./pages/Meetings'));
const MyAlerts = lazy(() => import('./pages/MyAlerts'));
const MyKPIs = lazy(() => import('./pages/MyKPIs'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectsAdmin = lazy(() => import('./pages/ProjectsAdmin'));
const Relationships = lazy(() => import('./pages/Relationships'));
const Reports = lazy(() => import('./pages/Reports'));
const Sales = lazy(() => import('./pages/Sales'));
const ScheduleView = lazy(() => import('./pages/ScheduleView'));
const Scheduler = lazy(() => import('./pages/Scheduler'));
const Subtrades = lazy(() => import('./pages/Subtrades'));
const SurveyBuilder = lazy(() => import('./pages/SurveyBuilder'));
// SurveyPublic is handled directly in App.jsx without Layout wrapper
const SurveyResults = lazy(() => import('./pages/SurveyResults'));
const Surveys = lazy(() => import('./pages/Surveys'));
const UsersAdmin = lazy(() => import('./pages/UsersAdmin'));
import __Layout from './Layout.jsx';


export const PAGES = {
    "AgendaTemplates": AgendaTemplates,
    "BudgetDetail": BudgetDetail,
    "BudgetWizard": BudgetWizard,
    "Budgets": Budgets,
    "Clients": Clients,
    "CommissionRules": CommissionRules,
    "Commissions": Commissions,
    "CommissionsAdmin": CommissionsAdmin,
    "CompanyAdmin": CompanyAdmin,
    "CompanySettings": CompanySettings,
    "Dashboard": Dashboard,
    "DataQuality": DataQuality,
    "DisqualifiedLeads": DisqualifiedLeads,
    "ImportHistoricalData": ImportHistoricalData,
    "KPIAgentChat": KPIAgentChat,
    "KPIDashboard": KPIDashboard,
    "KPIDefinitions": KPIDefinitions,
    "Leads": Leads,
    "MarketingCampaigns": MarketingCampaigns,
    "Meetings": Meetings,
    "MyAlerts": MyAlerts,
    "MyKPIs": MyKPIs,
    "Projects": Projects,
    "ProjectsAdmin": ProjectsAdmin,
    "Relationships": Relationships,
    "Reports": Reports,
    "Sales": Sales,
    "ScheduleView": ScheduleView,
    "Scheduler": Scheduler,
    "Subtrades": Subtrades,
    "SurveyBuilder": SurveyBuilder,
    "SurveyResults": SurveyResults,
    "Surveys": Surveys,
    "UsersAdmin": UsersAdmin,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};