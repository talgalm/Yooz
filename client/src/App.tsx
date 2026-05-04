import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import LandingPage from './pages/LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import { HelpChatProvider, HelpChatFab } from './components/HelpChat';
import { MobileContainer } from './components/MobileContainer';
import './App.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <>{children}</>;
  const lastCode = sessionStorage.getItem('yooz_play_code');
  return <Navigate to={lastCode ? `/play/${lastCode}` : '/'} replace />;
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAdminAuthenticated } = useAdminAuth();
  return isAdminAuthenticated ? <>{children}</> : <Navigate to="/admin/login" replace />;
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

                {/* Participant routes — mobile layout */}
                <Route path="/play/:code" element={<MobileContainer><HelpChatProvider variant="fab"><PlayPage /><HelpChatFab /></HelpChatProvider></MobileContainer>} />
                <Route path="/home" element={<MobileContainer><HelpChatProvider variant="header"><ProtectedRoute><HomePage /></ProtectedRoute></HelpChatProvider></MobileContainer>} />
                <Route path="/story/:code" element={<MobileContainer><HelpChatProvider variant="header" hideLogin><ProtectedRoute><StoryModulePage /></ProtectedRoute></HelpChatProvider></MobileContainer>} />
                <Route path="/mission/:code" element={<MobileContainer><HelpChatProvider variant="fab" hideLogin><ProtectedRoute><MissionPage /></ProtectedRoute><HelpChatFab /></HelpChatProvider></MobileContainer>} />

                {/* Portal route — public */}
                <Route path="/portal/:code" element={<PortalPage />} />

                {/* Default: YOOZ landing page — responsive (mobile + desktop) */}
                <Route path="/" element={<LandingPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ManagerAuthProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </LanguageProvider>
    </ErrorBoundary>
  );
}
