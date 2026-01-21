import Clients from './pages/Clients';
import CommissionRules from './pages/CommissionRules';
import Commissions from './pages/Commissions';
import CommissionsAdmin from './pages/CommissionsAdmin';
import CompanySettings from './pages/CompanySettings';
import Dashboard from './pages/Dashboard';
import KPIManagement from './pages/KPIManagement';
import Leads from './pages/Leads';
import PreconReporting from './pages/PreconReporting';
import Projects from './pages/Projects';
import Relationships from './pages/Relationships';
import Sales from './pages/Sales';
import UsersAdmin from './pages/UsersAdmin';
import Reporting from './pages/Reporting';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Clients": Clients,
    "CommissionRules": CommissionRules,
    "Commissions": Commissions,
    "CommissionsAdmin": CommissionsAdmin,
    "CompanySettings": CompanySettings,
    "Dashboard": Dashboard,
    "KPIManagement": KPIManagement,
    "Leads": Leads,
    "PreconReporting": PreconReporting,
    "Projects": Projects,
    "Relationships": Relationships,
    "Sales": Sales,
    "UsersAdmin": UsersAdmin,
    "Reporting": Reporting,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};