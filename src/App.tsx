import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './pages/AuthProvider';
import { DataProvider } from './pages/DataProvider';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { AdminReporting } from './pages/AdminReporting';
import { LeaderReporting } from './pages/LeaderReporting';
import { UserManagement } from './pages/UserManagement';
import { TeamManagement } from './pages/TeamManagement';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { IKUEntry } from './pages/IKUEntry';
import { TargetSetting } from './pages/TargetSetting';
import { RealizationEntry } from './pages/RealizationEntry';
import { ProfilePage } from './pages/ProfilePage';
import { SimpleProfilePage } from './pages/SimpleProfilePage';
import { StaffIKUList } from './pages/StaffIKUList';
import { StaffTargetList } from './pages/StaffTargetList';
import { StaffRealisasiList } from './pages/StaffRealisasiList';
import { AppLayout } from './components/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    document.title = 'CAPKIN-L';
  }, []);

  // Debug logging
  // useEffect(() => {
  // }, [user, isLoading, isAuthenticated]);

  // Show loading only during initial auth check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-primary-solid border-r-secondary-solid border-b-accent-solid mx-auto mb-6 shadow-lg"></div>
          <div className="bg-gradient-primary text-transparent bg-clip-text">
            <p className="text-xl font-semibold">Loading CAPKIN-L...</p>
          </div>
          <p className="text-muted-foreground mt-2">Memuat data sistem informasi</p>
        </div>
      </div>
    );
  }

  // Helper to get dashboard path by role
  const getDashboardPath = (role: string) => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'ketua_tim':
        return '/ketua';
      case 'staff':
        return '/staff';
      default:
        return '/login';
    }
  };

  // Assume user object has 'role' property
  const dashboardPath = user ? getDashboardPath(user.role) : '/login';

  return (
    <Router>
      <Routes>
        {/* Login Route */}
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <LoginPage />
            ) : (
              <Navigate to={dashboardPath} replace />
            )
          }
        />
        
        {/* Root redirect */}
        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated ? dashboardPath : '/login'} replace />
          }
        />
        
        {/* Protected Routes with Layout */}
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <AppLayout />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          {/* Main Dashboard Routes */}
          <Route
            path="admin"
            element={user && user.role === 'admin' ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="ketua"
            element={user && user.role === 'ketua_tim' ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="staff"
            element={user && user.role === 'staff' ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          
          {/* Admin-specific Routes */}
          <Route
            path="admin/reporting"
            element={user && user.role === 'admin' ? <AdminReporting /> : <Navigate to="/login" replace />}
          />
          
          {/* Leader-specific Routes */}
          <Route
            path="ketua/reporting"
            element={user && user.role === 'ketua_tim' ? <LeaderReporting /> : <Navigate to="/login" replace />}
          />
          <Route
            path="admin/users"
            element={user && user.role === 'admin' ? <UserManagement /> : <Navigate to="/login" replace />}
          />
          <Route
            path="admin/teams"
            element={user && user.role === 'admin' ? <TeamManagement /> : <Navigate to="/login" replace />}
          />
          <Route
            path="admin/teams/:teamId"
            element={user && user.role === 'admin' ? <TeamDetailPage /> : <Navigate to="/login" replace />}
          />
          
          {/* IKU Management Routes (Admin and Leader) */}
          <Route
            path="admin/iku"
            element={user && user.role === 'admin' ? <IKUEntry /> : <Navigate to="/login" replace />}
          />
          <Route
            path="ketua/iku"
            element={user && user.role === 'ketua_tim' ? <IKUEntry /> : <Navigate to="/login" replace />}
          />
          
          {/* Target Setting Routes (Admin and Leader) */}
          <Route
            path="admin/targets"
            element={user && user.role === 'admin' ? <TargetSetting /> : <Navigate to="/login" replace />}
          />
          <Route
            path="ketua/targets"
            element={user && user.role === 'ketua_tim' ? <TargetSetting /> : <Navigate to="/login" replace />}
          />
          
          {/* Realization Entry Routes (All roles) */}
          <Route
            path="admin/realization"
            element={user && user.role === 'admin' ? <RealizationEntry /> : <Navigate to="/login" replace />}
          />
          <Route
            path="ketua/realization"
            element={user && user.role === 'ketua_tim' ? <RealizationEntry /> : <Navigate to="/login" replace />}
          />
          <Route
            path="staff/realization"
            element={user && user.role === 'staff' ? <StaffRealisasiList /> : <Navigate to="/login" replace />}
          />
          
          {/* Staff Read-Only Pages */}
          <Route
            path="staff/iku"
            element={user && user.role === 'staff' ? <StaffIKUList /> : <Navigate to="/login" replace />}
          />
          <Route
            path="staff/targets"
            element={user && user.role === 'staff' ? <StaffTargetList /> : <Navigate to="/login" replace />}
          />
        
          
          {/* Profile Routes (All roles) */}
          <Route
            path="admin/profile"
            element={user && user.role === 'admin' ? <ProfilePage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="ketua/profile"
            element={user && user.role === 'ketua_tim' ? <ProfilePage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="staff/profile"
            element={user && user.role === 'staff' ? <ProfilePage /> : <Navigate to="/login" replace />}
          />
          
          {/* User Profile Routes (Admin only) */}
          <Route
            path="admin/users/:userId"
            element={user && user.role === 'admin' ? <SimpleProfilePage /> : <Navigate to="/login" replace />}
          />
          
          
          {/* Default route: redirect to dashboard */}
          <Route
            path=""
            element={<Navigate to={dashboardPath} replace />}
          />
          
          {/* Catch-all route for 404 */}
          <Route
            path="*"
            element={<Navigate to={dashboardPath} replace />}
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <AppContent />
          <Toaster />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
