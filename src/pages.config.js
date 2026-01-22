import Clients from './pages/Clients';
import CommissionRules from './pages/CommissionRules';
import Commissions from './pages/Commissions';
import CommissionsAdmin from './pages/CommissionsAdmin';
import CompanySettings from './pages/CompanySettings';
import Dashboard from './pages/Dashboard';
import KPIManagement from './pages/KPIManagement';
import Leads from './pages/Leads';
import Projects from './pages/Projects';
import Relationships from './pages/Relationships';
import Reports from './pages/Reports';
import Sales from './pages/Sales';
import Scheduler from './pages/Scheduler';
import UsersAdmin from './pages/UsersAdmin';
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
    "Projects": Projects,
    "Relationships": Relationships,
    "Reports": Reports,
    "Sales": Sales,
    "Scheduler": Scheduler,
    "UsersAdmin": UsersAdmin,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};