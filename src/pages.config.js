import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Leads from './pages/Leads';
import Sales from './pages/Sales';
import Projects from './pages/Projects';
import Commissions from './pages/Commissions';
import CommissionsAdmin from './pages/CommissionsAdmin';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Clients": Clients,
    "Leads": Leads,
    "Sales": Sales,
    "Projects": Projects,
    "Commissions": Commissions,
    "CommissionsAdmin": CommissionsAdmin,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};