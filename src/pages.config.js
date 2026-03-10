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
import AgendaTemplates from './pages/AgendaTemplates';
import BudgetDetail from './pages/BudgetDetail';
import BudgetWizard from './pages/BudgetWizard';
import Budgets from './pages/Budgets';
import Clients from './pages/Clients';
import CommissionRules from './pages/CommissionRules';
import Commissions from './pages/Commissions';
import CommissionsAdmin from './pages/CommissionsAdmin';
import CompanyAdmin from './pages/CompanyAdmin';
import CompanySettings from './pages/CompanySettings';
import Dashboard from './pages/Dashboard';
import DataQuality from './pages/DataQuality';
import DisqualifiedLeads from './pages/DisqualifiedLeads';
import ImportHistoricalData from './pages/ImportHistoricalData';
import KPIAgentChat from './pages/KPIAgentChat';
import KPIDashboard from './pages/KPIDashboard';
import KPIDefinitions from './pages/KPIDefinitions';
import Leads from './pages/Leads';
import MarketingCampaigns from './pages/MarketingCampaigns';
import Meetings from './pages/Meetings';
import MyKPIs from './pages/MyKPIs';
import Projects from './pages/Projects';
import ProjectsAdmin from './pages/ProjectsAdmin';
import Relationships from './pages/Relationships';
import Reports from './pages/Reports';
import Sales from './pages/Sales';
import ScheduleView from './pages/ScheduleView';
import Scheduler from './pages/Scheduler';
import Subtrades from './pages/Subtrades';
import SurveyBuilder from './pages/SurveyBuilder';
import SurveyPublic from './pages/SurveyPublic';
import SurveyResults from './pages/SurveyResults';
import Surveys from './pages/Surveys';
import UsersAdmin from './pages/UsersAdmin';
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
    "SurveyPublic": SurveyPublic,
    "SurveyResults": SurveyResults,
    "Surveys": Surveys,
    "UsersAdmin": UsersAdmin,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};