import { Suspense, lazy } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const VarCompAdmin = lazy(() => import('./pages/VarCompAdmin'));
const MyProfitShare = lazy(() => import('./pages/MyProfitShare'));
const FeasibilityBuilder = lazy(() => import('./pages/FeasibilityBuilder'));
const CompanyResources = lazy(() => import('./pages/CompanyResources'));
const ProcessMaps = lazy(() => import('./pages/ProcessMaps'));
const ProcessMapEditor = lazy(() => import('./pages/ProcessMapEditor'));
const ProcessMapView = lazy(() => import('./pages/ProcessMapView'));
const SurveyPublicPage = lazy(() => import('./pages/SurveyPublic'));
const DevelopmentLogPage = lazy(() => import('./pages/DevelopmentLog'));



const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const PageSuspense = ({ children }) => (
  <Suspense fallback={
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  }>
    {children}
  </Suspense>
);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const PUBLIC_PATHS = ['/SurveyPublic'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const isPublicPage = PUBLIC_PATHS.some(p => location.pathname.startsWith(p));

  // Show loading spinner while checking app public settings or auth
  // Public pages skip ALL auth gates — render immediately
  if (!isPublicPage && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors — skip for public pages
  if (authError && !isPublicPage) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <PageSuspense>
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="/VarCompAdmin" element={<LayoutWrapper currentPageName="VarCompAdmin"><VarCompAdmin /></LayoutWrapper>} />
        <Route path="/MyProfitShare" element={<LayoutWrapper currentPageName="MyProfitShare"><MyProfitShare /></LayoutWrapper>} />
        <Route path="/FeasibilityBuilder" element={<FeasibilityBuilder />} />
        <Route path="/SurveyPublic" element={<PageSuspense><SurveyPublicPage /></PageSuspense>} />
        <Route path="/CompanyResources" element={<LayoutWrapper currentPageName="CompanyResources"><CompanyResources /></LayoutWrapper>} />
        <Route path="/ProcessMaps" element={<LayoutWrapper currentPageName="ProcessMaps"><ProcessMaps /></LayoutWrapper>} />
        <Route path="/ProcessMapEditor" element={<LayoutWrapper currentPageName="ProcessMapEditor"><ProcessMapEditor /></LayoutWrapper>} />
        <Route path="/ProcessMapView" element={<LayoutWrapper currentPageName="ProcessMapView"><ProcessMapView /></LayoutWrapper>} />
        <Route path="/DevelopmentLog" element={<LayoutWrapper currentPageName="DevelopmentLog"><DevelopmentLogPage /></LayoutWrapper>} />

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </PageSuspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App