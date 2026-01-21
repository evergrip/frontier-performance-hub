import Clients from './pages/Clients';
import CommissionRules from './pages/CommissionRules';
import Commissions from './pages/Commissions';
import CommissionsAdmin from './pages/CommissionsAdmin';
import Dashboard from './pages/Dashboard';
import KPIManagement from './pages/KPIManagement';
import Leads from './pages/Leads';
import Projects from './pages/Projects';
import Relationships from './pages/Relationships';
import Sales from './pages/Sales';
import UsersAdmin from './pages/UsersAdmin';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Clients": Clients,
    "CommissionRules": CommissionRules,
    "Commissions": Commissions,
    "CommissionsAdmin": CommissionsAdmin,
    "Dashboard": Dashboard,
    "KPIManagement": KPIManagement,
    "Leads": Leads,
    "Projects": Projects,
    "Relationships": Relationships,
    "Sales": Sales,
    "UsersAdmin": UsersAdmin,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};