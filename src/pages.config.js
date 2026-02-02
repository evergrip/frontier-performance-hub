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
import Clients from './pages/Clients';
import CommissionRules from './pages/CommissionRules';
import Commissions from './pages/Commissions';
import CommissionsAdmin from './pages/CommissionsAdmin';
import CompanyAdmin from './pages/CompanyAdmin';
import CompanySettings from './pages/CompanySettings';
import Dashboard from './pages/Dashboard';
import ImportHistoricalData from './pages/ImportHistoricalData';
import KPIManagement from './pages/KPIManagement';
import Leads from './pages/Leads';
import Projects from './pages/Projects';
import ProjectsAdmin from './pages/ProjectsAdmin';
import Relationships from './pages/Relationships';
import Reports from './pages/Reports';
import Sales from './pages/Sales';
import ScheduleView from './pages/ScheduleView';
import Scheduler from './pages/Scheduler';
import UsersAdmin from './pages/UsersAdmin';
import KPIDefinitions from './pages/KPIDefinitions';
import MyKPIs from './pages/MyKPIs';
import KPIReview from './pages/KPIReview';
import KPIDashboard from './pages/KPIDashboard';
import MyKPIScorecard from './pages/MyKPIScorecard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Clients": Clients,
    "CommissionRules": CommissionRules,
    "Commissions": Commissions,
    "CommissionsAdmin": CommissionsAdmin,
    "CompanyAdmin": CompanyAdmin,
    "CompanySettings": CompanySettings,
    "Dashboard": Dashboard,
    "ImportHistoricalData": ImportHistoricalData,
    "KPIManagement": KPIManagement,
    "Leads": Leads,
    "Projects": Projects,
    "ProjectsAdmin": ProjectsAdmin,
    "Relationships": Relationships,
    "Reports": Reports,
    "Sales": Sales,
    "ScheduleView": ScheduleView,
    "Scheduler": Scheduler,
    "UsersAdmin": UsersAdmin,
    "KPIDefinitions": KPIDefinitions,
    "MyKPIs": MyKPIs,
    "KPIReview": KPIReview,
    "KPIDashboard": KPIDashboard,
    "MyKPIScorecard": MyKPIScorecard,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};