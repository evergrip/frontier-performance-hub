import Clients from './pages/Clients';
import Commissions from './pages/Commissions';
import CommissionsAdmin from './pages/CommissionsAdmin';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Projects from './pages/Projects';
import Sales from './pages/Sales';
import UsersAdmin from './pages/UsersAdmin';
import CommissionRules from './pages/CommissionRules';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Clients": Clients,
    "Commissions": Commissions,
    "CommissionsAdmin": CommissionsAdmin,
    "Dashboard": Dashboard,
    "Leads": Leads,
    "Projects": Projects,
    "Sales": Sales,
    "UsersAdmin": UsersAdmin,
    "CommissionRules": CommissionRules,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};