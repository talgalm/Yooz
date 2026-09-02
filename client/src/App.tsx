import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ensureOfflineQueueListeners } from './utils/offlineQueue';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { ManagerAuthProvider, useManagerAuth } from './context/ManagerAuthContext';
import { ManageAuthProvider, useManageAuth } from './context/ManageAuthContext';
import { LanguageProvider } from './context/LanguageContext';
import PlayPage from './pages/PlayPage';
import HomePage from './pages/HomePage';
import StoryModulePage from './pages/StoryModulePage';
import MissionPage from './pages/MissionPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminCreateActivityPage from './pages/admin/AdminCreateActivityPage';
import AdminViewActivityPage from './pages/admin/AdminViewActivityPage';
import AdminGameConfigPage from './pages/admin/AdminGameConfigPage';
import AdminMissionConfigPage from './pages/admin/AdminMissionConfigPage';
import AdminStationConfigPage from './pages/admin/AdminStationConfigPage';
import AdminPortalConfigPage from './pages/admin/AdminPortalConfigPage';
import PortalPage from './pages/portal/PortalPage';
import ManagerLoginPage from './pages/manager/ManagerLoginPage';
import ManagerDashboardPage from './pages/manager/ManagerDashboardPage';
import OrderSurveyPresentPage from './pages/manager/OrderSurveyPresentPage';
import ManageLoginPage from './pages/manage/ManageLoginPage';
import ManageLayout from './pages/manage/ManageLayout';
import ManagePlaceholderPage from './pages/manage/ManagePlaceholderPage';
import ManageClientsPage from './pages/manage/ManageClientsPage';
import ManageClientPage from './pages/manage/ManageClientPage';
import ManageProjectsPage from './pages/manage/ManageProjectsPage';
import ManageProjectPage from './pages/manage/ManageProjectPage';
import ManageMyWorkPage from './pages/manage/ManageMyWorkPage';
import ManageHoursPage from './pages/manage/ManageHoursPage';
import ManageTasksPage from './pages/manage/ManageTasksPage';
import ManageDashboardPage from './pages/manage/ManageDashboardPage';
import ManageCalendarPage from './pages/manage/ManageCalendarPage';
import ManageFinancePage from './pages/manage/ManageFinancePage';
import ManageReportsPage from './pages/manage/ManageReportsPage';
import ManageEmployeesPage from './pages/manage/ManageEmployeesPage';
import ManageSettingsPage from './pages/manage/ManageSettingsPage';
import { ManageTimerProvider } from './pages/manage/TimerContext';
import PrivacyPage from './pages/PrivacyPage';
import ArDemoPage from './pages/ArDemoPage';
import SharedStatsPage from './pages/shared/SharedStatsPage';
import ErrorBoundary from './components/ErrorBoundary';
import { HelpChatProvider, HelpChatFab } from './components/HelpChat';
import AdminHelpChat from './components/AdminHelpChat';
import { MobileContainer } from './components/MobileContainer';
import ParticipantActivityScope from './components/ParticipantActivityScope';
import ParticipantLandingRedirect from './components/ParticipantLandingRedirect';
import './App.css';
import { participantPlayPath, resolveParticipantActivityCode } from './utils/participantActivity';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { code: urlCode } = useParams<{ code?: string }>();
  const { pathname } = useLocation();
  if (isAuthenticated) return <>{children}</>;
  const activityCode = resolveParticipantActivityCode({ urlCode, pathname });
  return <Navigate to={participantPlayPath(activityCode)} replace />;
}

/** Unknown paths: keep participants on their activity login, not the marketing landing page. */
function FallbackRedirect() {
  const { pathname } = useLocation();
  if (
    pathname.startsWith('/admin')
    || pathname.startsWith('/manager')
    || pathname.startsWith('/manage')
    || pathname.startsWith('/portal')
    || pathname.startsWith('/stats')
    || pathname === '/privacy'
  ) {
    return <Navigate to="/" replace />;
  }
  const activityCode = resolveParticipantActivityCode({ pathname });
  return <Navigate to={participantPlayPath(activityCode)} replace />;
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAdminAuthenticated } = useAdminAuth();
  return isAdminAuthenticated ? (
    <>
      {children}
      <AdminHelpChat />
    </>
  ) : (
    <Navigate to="/admin/login" replace />
  );
}

function AdminPublicRoute({ children }: { children: React.ReactNode }) {
  const { isAdminAuthenticated } = useAdminAuth();
  return isAdminAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <>{children}</>;
}

function ManagerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isManagerAuthenticated } = useManagerAuth();
  return isManagerAuthenticated ? <>{children}</> : <Navigate to="/manager" replace />;
}

function ManageProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isManageAuthenticated } = useManageAuth();
  return isManageAuthenticated ? <>{children}</> : <Navigate to="/manage/login" replace />;
}

function ManagePublicRoute({ children }: { children: React.ReactNode }) {
  const { isManageAuthenticated } = useManageAuth();
  return isManageAuthenticated ? <Navigate to="/manage/my-work" replace /> : <>{children}</>;
}

function ManagerPublicRoute({ children }: { children: React.ReactNode }) {
  const { isManagerAuthenticated } = useManagerAuth();
  return isManagerAuthenticated ? <Navigate to="/manager/dashboard" replace /> : <>{children}</>;
}

export default function App() {
  ensureOfflineQueueListeners();
  return (
    <ErrorBoundary>
    <LanguageProvider>
      <AuthProvider>
        <AdminAuthProvider>
          <ManagerAuthProvider>
            <ManageAuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Admin routes — full width desktop */}
                <Route path="/admin/login" element={<AdminPublicRoute><AdminLoginPage /></AdminPublicRoute>} />
                <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboardPage /></AdminProtectedRoute>} />
                <Route path="/admin/activities/new" element={<AdminProtectedRoute><AdminCreateActivityPage /></AdminProtectedRoute>} />
                <Route path="/admin/activities/:id/edit" element={<AdminProtectedRoute><AdminCreateActivityPage /></AdminProtectedRoute>} />
                <Route path="/admin/activities/:id" element={<AdminProtectedRoute><AdminViewActivityPage /></AdminProtectedRoute>} />
                <Route path="/admin/games/new" element={<AdminProtectedRoute><AdminGameConfigPage /></AdminProtectedRoute>} />
                <Route path="/admin/games/:id" element={<AdminProtectedRoute><AdminGameConfigPage /></AdminProtectedRoute>} />
                <Route path="/admin/missions/new" element={<AdminProtectedRoute><AdminMissionConfigPage /></AdminProtectedRoute>} />
                <Route path="/admin/missions/:id" element={<AdminProtectedRoute><AdminMissionConfigPage /></AdminProtectedRoute>} />
                <Route path="/admin/stations/new" element={<AdminProtectedRoute><AdminStationConfigPage /></AdminProtectedRoute>} />
                <Route path="/admin/stations/:id" element={<AdminProtectedRoute><AdminStationConfigPage /></AdminProtectedRoute>} />
                <Route path="/admin/portals/new" element={<AdminProtectedRoute><AdminPortalConfigPage /></AdminProtectedRoute>} />
                <Route path="/admin/portals/:id" element={<AdminProtectedRoute><AdminPortalConfigPage /></AdminProtectedRoute>} />

                {/* Manager routes — full width desktop */}
                <Route path="/manager" element={<ManagerPublicRoute><ManagerLoginPage /></ManagerPublicRoute>} />
                <Route path="/manager/dashboard" element={<ManagerProtectedRoute><ManagerDashboardPage /></ManagerProtectedRoute>} />
                <Route path="/manager/present" element={<ManagerProtectedRoute><OrderSurveyPresentPage /></ManagerProtectedRoute>} />

                {/* Yooz-Manage routes — internal business management, full width desktop */}
                <Route path="/manage/login" element={<ManagePublicRoute><ManageLoginPage /></ManagePublicRoute>} />
                <Route
                  path="/manage"
                  element={(
                    <ManageProtectedRoute>
                      <ManageTimerProvider><ManageLayout /></ManageTimerProvider>
                    </ManageProtectedRoute>
                  )}
                >
                  <Route index element={<Navigate to="/manage/my-work" replace />} />
                  <Route path="my-work" element={<ManageMyWorkPage />} />
                  <Route path="hours" element={<ManageHoursPage />} />
                  <Route path="dashboard" element={<ManageDashboardPage />} />
                  <Route path="tasks" element={<ManageTasksPage />} />
                  <Route path="calendar" element={<ManageCalendarPage />} />
                  <Route path="finance" element={<ManageFinancePage />} />
                  <Route path="reports" element={<ManageReportsPage />} />
                  <Route path="employees" element={<ManageEmployeesPage />} />
                  <Route path="settings" element={<ManageSettingsPage />} />
                  <Route path="clients" element={<ManageClientsPage />} />
                  <Route path="clients/:id" element={<ManageClientPage />} />
                  <Route path="projects" element={<ManageProjectsPage />} />
                  <Route path="projects/:id" element={<ManageProjectPage />} />
                  <Route path=":section" element={<ManagePlaceholderPage />} />
                </Route>

                {/* Participant routes — mobile layout */}
                <Route path="/play/:code/join/:inviteToken" element={<ParticipantActivityScope><MobileContainer><HelpChatProvider variant="fab"><PlayPage /><HelpChatFab /></HelpChatProvider></MobileContainer></ParticipantActivityScope>} />
                <Route path="/play/:code" element={<ParticipantActivityScope><MobileContainer><HelpChatProvider variant="fab"><PlayPage /><HelpChatFab /></HelpChatProvider></MobileContainer></ParticipantActivityScope>} />
                <Route path="/home" element={<ParticipantActivityScope><MobileContainer><HelpChatProvider variant="header"><ProtectedRoute><HomePage /></ProtectedRoute></HelpChatProvider></MobileContainer></ParticipantActivityScope>} />
                <Route path="/story/:code" element={<ParticipantActivityScope><MobileContainer><HelpChatProvider variant="header" hideLogin><ProtectedRoute><StoryModulePage /></ProtectedRoute></HelpChatProvider></MobileContainer></ParticipantActivityScope>} />
                <Route path="/mission/:code" element={<ParticipantActivityScope><MobileContainer><HelpChatProvider variant="fab" hideLogin><ProtectedRoute><MissionPage /></ProtectedRoute><HelpChatFab /></HelpChatProvider></MobileContainer></ParticipantActivityScope>} />

                {/* Portal route — public */}
                <Route path="/portal/:code" element={<PortalPage />} />

                {/* Privacy policy — public, responsive */}
                <Route path="/privacy" element={<PrivacyPage />} />

                {/* AR demo (camera + GPS + compass) */}
                <Route path="/ar-demo" element={<ArDemoPage />} />

                {/* Public read-only statistics share link */}
                <Route path="/stats/:token" element={<SharedStatsPage />} />

                {/* Default: YOOZ landing page — responsive (mobile + desktop) */}
                <Route path="/" element={<ParticipantLandingRedirect />} />
                <Route path="*" element={<FallbackRedirect />} />
              </Routes>
            </BrowserRouter>
            </ManageAuthProvider>
          </ManagerAuthProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </LanguageProvider>
    </ErrorBoundary>
  );
}
