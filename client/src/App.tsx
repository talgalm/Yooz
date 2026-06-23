import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ensureOfflineQueueListeners } from './utils/offlineQueue';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { ManagerAuthProvider, useManagerAuth } from './context/ManagerAuthContext';
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
import PrivacyPage from './pages/PrivacyPage';
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

                {/* Public read-only statistics share link */}
                <Route path="/stats/:token" element={<SharedStatsPage />} />

                {/* Default: YOOZ landing page — responsive (mobile + desktop) */}
                <Route path="/" element={<ParticipantLandingRedirect />} />
                <Route path="*" element={<FallbackRedirect />} />
              </Routes>
            </BrowserRouter>
          </ManagerAuthProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </LanguageProvider>
    </ErrorBoundary>
  );
}
