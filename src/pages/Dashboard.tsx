import React from 'react';
import { useAuth } from './AuthProvider';
import { DashboardSkeleton } from '../components/LoadingSkeleton';

// Import individual dashboard components
import { AdminDashboard } from './AdminDashboard';
import { LeaderDashboard } from './LeaderDashboard';
import { StaffDashboard } from './StaffDashboard';

export function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  // Render role-based dashboard content
  // Each dashboard component will handle its own loading state
  return (
    <div className="space-y-6">
      {user.role === 'admin' && <AdminDashboard />}
      {user.role === 'ketua_tim' && <LeaderDashboard />}
      {user.role === 'staff' && <StaffDashboard />}
    </div>
  );
}
