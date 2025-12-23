import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from './AuthProvider';

const BPS_LOGO_SRC = '/images/bps_logo.png';



export function LoginPage() {
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
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
      
      // Get user role from localStorage
      const storedUser = localStorage.getItem('iku_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          const dashboardPath = getDashboardPath(userData.role);

          navigate(dashboardPath, { replace: true });
        } catch (error) {

        }
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Auto-detect role based on username pattern
  useEffect(() => {
    if (username === 'admin') {
      // Admin user - no team selection needed
    } else if (username.includes('ketua') || username.includes('leader')) {
      // Ketua tim user
    } else if (username.includes('staff')) {
      // Staff user
    }
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!username.trim()) {
      setError('Username harus diisi');
      return;
    }

    if (!password.trim()) {
      setError('Password harus diisi');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    try {
      const success = await login(username.trim(), password);
      
      if (success) {
        // Login successful, redirect will be handled by useEffect

      } else {
        setError('Username atau password tidak sesuai. Silakan coba lagi.');
      }
    } catch (error) {

      setError('Terjadi kesalahan saat login. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4 relative">
      <div className="w-full absolute top-1 left-0 flex justify-center z-20 px-4">
        <div className="max-w-3xl w-full marquee">
          <div className="marquee__inner">Selamat Datang di Sistem Capkin - L Badan Pusat Statistik Kota Lhokseumawe. Pantau data, kelola laporan, dan akses fitur utama dengan mudah.</div>
        </div>
      </div>
      <Card className="w-full max-w-md shadow-lg border border-gray-100 relative z-10">
         <CardHeader className="text-center pb-6">
           <div className="mx-auto mb-4 w-fit">
             <img src={BPS_LOGO_SRC} alt="Logo BPS" className="h-20 w-20 object-contain" />
           </div>
          <CardTitle className="text-2xl sm:text-3xl md:text-4xl capkin-logo mb-3">
            <div className="text-gradient-collaboration">
              CAPKIN-L
            </div>
          </CardTitle>
          <p className="text-muted-foreground mb-2">Badan Pusat Statistik Kota Lhokseumawe</p>
          <p className="text-muted-foreground text-sm">Masuk ke sistem untuk mengelola capaian kinerja tim Anda</p>

        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                disabled={isLoading}
                className="bg-input-background border-border focus:border-primary focus:ring-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  disabled={isLoading}
                  className="pr-10 bg-input-background border-border focus:border-primary focus:ring-primary"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-muted"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-collaboration hover:hover-collaboration-effect text-white font-medium py-2.5 rounded-lg transition-colors duration-200" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Masuk ke sistem...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="w-full absolute bottom-3 left-0 flex justify-center z-20 pointer-events-none">
        <div className="text-xs text-white/70">© 2025 Badan Pusat Statistik Kota Lhokseumawe | IT
        </div>
      </div>
      {/* Decorative image removed as requested */}
    </div>
  );
}
