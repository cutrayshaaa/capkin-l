import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { 
  LogOut,
  ChevronDown,
  Key,
  Users,
  Target,
  TrendingUp,
  FileText,
  User
} from 'lucide-react';
import { useAuth } from '../pages/AuthProvider';
import { ChangePasswordDialog } from '../pages/ChangePasswordDialog';

const BPS_LOGO_SRC = '/images/bps_logo.png';

// Role-based Tab Bar Components
function AdminTabsBar() {
  const location = useLocation();
  
  const tabs = [
    { path: '/admin', label: 'Performa', icon: TrendingUp },
    { path: '/admin/users', label: 'User Manajemen', icon: Users },
    { path: '/admin/teams', label: 'Team Manajemen', icon: Users },
    { path: '/admin/iku', label: 'Indikator Kinerja', icon: Target },
    { path: '/admin/targets', label: 'Target', icon: Target },
    { path: '/admin/realization', label: 'Realisasi', icon: TrendingUp },
    { path: '/admin/reporting', label: 'Pelaporan', icon: FileText },
    // { path: '/admin/profile', label: 'Profil', icon: User },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location.pathname === tab.path;
        return (
          <Button 
            key={tab.path}
            variant={isActive ? 'default' : 'outline'}
            onClick={() => window.location.href = tab.path}
            className="flex items-center"
          >
            <Icon className="h-4 w-4 mr-2" />
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}

function LeaderTabsBar() {
  const location = useLocation();
  
  const tabs = [
    { path: '/ketua', label: 'Performa', icon: TrendingUp },
    { path: '/ketua/iku', label: 'Indikator Kinerja', icon: Target },
    { path: '/ketua/targets', label: 'Target', icon: Target },
    { path: '/ketua/realization', label: 'Realisasi', icon: TrendingUp },
    { path: '/ketua/reporting', label: 'Pelaporan', icon: FileText },
    // { path: '/ketua/profile', label: 'Profil', icon: User },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location.pathname === tab.path;
        return (
          <Button 
            key={tab.path}
            variant={isActive ? 'default' : 'outline'}
            onClick={() => window.location.href = tab.path}
            className="flex items-center"
          >
            <Icon className="h-4 w-4 mr-2" />
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}

function StaffTabsBar() {
  const location = useLocation();
  
  const tabs = [
    { path: '/staff', label: 'Performa', icon: TrendingUp },
    { path: '/staff/realization', label: 'Pelaporan', icon: TrendingUp },
    // { path: '/staff/profile', label: 'Profil', icon: User },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location.pathname === tab.path;
        return (
          <Button 
            key={tab.path}
            variant={isActive ? 'default' : 'outline'}
            onClick={() => window.location.href = tab.path}
            className="flex items-center"
          >
            <Icon className="h-4 w-4 mr-2" />
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const renderTabsBar = () => {
    switch (user.role) {
      case 'admin':
        return <AdminTabsBar />;
      case 'ketua_tim':
        return <LeaderTabsBar />;
      case 'staff':
        return <StaffTabsBar />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="mr-3">
                <img src={BPS_LOGO_SRC} alt="Logo BPS" className="h-20 w-20 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl capkin-logo text-gradient-primary">
                  CAPKIN-L
                </h1>
                <p className="text-sm text-muted-foreground">
                  BPS Lhokseumawe • {user.role === 'admin' ? 'Administrator' : user.role === 'ketua_tim' ? 'Ketua Tim' : 'Staff'} - {user.nama_user}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user.tim && (
                <Badge 
                  variant="outline" 
                  className={`hidden sm:flex border-2 font-medium ${
                    user.role === 'admin' && user.id_tim === 0 
                      ? 'text-primary-solid border-primary-solid/30 bg-gradient-light-teal' 
                      : user.role === 'ketua_tim'
                      ? 'text-secondary-solid border-secondary-solid/30 bg-gradient-light-green'
                      : 'text-accent-solid border-accent-solid/30 bg-gradient-light-orange'
                  }`}
                >
                  {user.tim.nama_tim}
                </Badge>
              )}
              
              {/* Admin menu with dropdown */}
              {user.role === 'admin' ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center border-border/30 hover:bg-gradient-light-teal hover:border-primary-solid/30 hover:text-primary-solid transition-all duration-300"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Admin
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <ChangePasswordDialog>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Key className="h-4 w-4 mr-2" />
                        Ubah Password
                      </DropdownMenuItem>
                    </ChangePasswordDialog>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Keluar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="flex items-center border-border/30 hover:bg-gradient-light-teal hover:border-primary-solid/30 hover:text-primary-solid transition-all duration-300"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Keluar
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="mb-6">
          {renderTabsBar()}
        </div>

        {/* Page Content */}
        <Outlet />
      </main>
    </div>
  );
}
