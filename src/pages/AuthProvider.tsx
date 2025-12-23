import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService, LoginRequest } from '../services/api';

export interface User {
  id_user: number;
  nama_user: string;
  username: string;
  email?: string;
  nip?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenis_kelamin?: string;
  alamat?: string;
  no_telepon?: string;
  foto_profil?: string;
  role: 'admin' | 'ketua_tim' | 'staff';
  id_tim: number;
  tim?: {
    id_tim: number;
    nama_tim: string;
    nama_ketua: string;
  };
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, teamId?: number) => Promise<boolean>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem('iku_user');
        const storedToken = localStorage.getItem('iku_token');
        
        if (storedUser && storedToken) {
          // Set token and user data directly
          apiService.setToken(storedToken);
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } else {
        }
      } catch (error) {

        // Clear invalid data
        localStorage.removeItem('iku_user');
        localStorage.removeItem('iku_token');
        apiService.setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string, teamId?: number): Promise<boolean> => {
    if (!username.trim() || !password.trim()) {

      return false;
    }

    setIsLoading(true);
    
    try {
      const response = await apiService.login({ username: username.trim(), password });
      
      if (response?.token && response?.user) {
        // Set token for future requests
        apiService.setToken(response.token);
        localStorage.setItem('iku_token', response.token);
        
        // Build user object with team data
        const userWithTeam: User = {
          id_user: response.user.id_user,
          nama_user: response.user.nama_user,
          username: response.user.username,
          email: response.user.email,
          nip: response.user.nip,
          no_telepon: response.user.no_telepon,
          alamat: response.user.alamat,
          jenis_kelamin: response.user.jenis_kelamin,
          tanggal_lahir: response.user.tanggal_lahir,
          foto_profil: response.user.foto_profil,
          role: response.user.role as 'admin' | 'ketua_tim' | 'staff',
          id_tim: response.user.id_tim || 0,
          tim: response.user.tim ? {
            id_tim: response.user.tim.id_tim,
            nama_tim: response.user.tim.nama_tim,
            nama_ketua: response.user.tim.ketua?.nama_user || 'Belum ditentukan',
          } : undefined
        };

        setUser(userWithTeam);
        localStorage.setItem('iku_user', JSON.stringify(userWithTeam));
        return true;
      } else {

        return false;
      }
    } catch (error) {

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {

    }
    
    apiService.setToken(null);
    localStorage.removeItem('iku_user');
    localStorage.removeItem('iku_token');
    setUser(null);
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await apiService.changePassword(oldPassword, newPassword);
      setIsLoading(false);
      return true;
    } catch (error) {

      setIsLoading(false);
      return false;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('iku_user', JSON.stringify(updatedUser));

  };

  const refreshUser = async () => {
    try {

      const profile = await apiService.getProfile();



      
      if (profile) {
        const updatedUser: User = {
          id_user: profile.id_user,
          nama_user: profile.nama_user,
          username: profile.username,
          email: profile.email,
          nip: profile.nip,
          no_telepon: profile.no_telepon,
          alamat: profile.alamat,
          jenis_kelamin: profile.jenis_kelamin,
          tanggal_lahir: profile.tanggal_lahir,
          foto_profil: profile.foto_profil,
          role: profile.role as 'admin' | 'ketua_tim' | 'staff',
          id_tim: profile.id_tim || 0,
          tim: profile.tim
        };
        setUser(updatedUser);
        localStorage.setItem('iku_user', JSON.stringify(updatedUser));
      }
    } catch (error) {

    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      changePassword, 
      updateUser,
      refreshUser,
      isLoading,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// No exports needed - all mock data removed
