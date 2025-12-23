import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../pages/AuthProvider';
import type { Team } from '../types/models';

export function useTeams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const loadTeams = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsError(false);
      
      // Use different endpoint based on user role
      let response;
      if (user?.role === 'staff' || user?.role === 'ketua_tim') {
        response = await apiService.getStaffTeams();
      } else {
        response = await apiService.getTeams();
      }
      
      const teamsData = Array.isArray(response) ? response : response?.data || [];
      setTeams(teamsData);
    } catch (err: any) {
      // console.warn('Failed to load teams:', err);
      setIsError(true);
      
      const errorMessage = err?.message || 'Gagal memuat data tim';
      setError(errorMessage);
      
      // Fallback demo data for staff and ketua_tim - ALL TEAMS
      if (user?.role === 'staff' || user?.role === 'ketua_tim') {
        const demoTeams = [
          {
            id_tim: 1,
            nama_tim: 'Tim Statistik Produksi',
            nama_ketua: 'Dr. Ahmad Rizki, S.Si, M.Si',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
          },
          {
            id_tim: 2,
            nama_tim: 'Tim Statistik Sosial',
            nama_ketua: 'Dr. Siti Aminah, S.Si, M.Si',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
          },
          {
            id_tim: 3,
            nama_tim: 'Tim Statistik Distribusi',
            nama_ketua: 'Dr. Muhammad Yusuf, S.Si, M.Si',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
          },
          {
            id_tim: 4,
            nama_tim: 'Tim Neraca Wilayah',
            nama_ketua: 'Dr. Fatimah Zahra, S.Si, M.Si',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
          },
          {
            id_tim: 5,
            nama_tim: 'Tim Diseminasi',
            nama_ketua: 'Dr. Abdul Rahman, S.Si, M.Si',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
          }
        ];
        setTeams(demoTeams);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const createTeam = async (teamData: any) => {
    try {
      const response = await apiService.createTeam(teamData);
      await loadTeams(); // Reload data
      return response;
    } catch (err) {

      throw err;
    }
  };

  const updateTeam = async (id: number, teamData: any) => {
    try {
      const response = await apiService.updateTeam(id, teamData);
      await loadTeams(); // Reload data
      return response;
    } catch (err) {

      throw err;
    }
  };

  const deleteTeam = async (id: number) => {
    try {
      await apiService.deleteTeam(id);
      await loadTeams(); // Reload data
    } catch (err) {

      throw err;
    }
  };

  const retry = () => {
    setRetryCount(prev => prev + 1);
    loadTeams();
  };

  return {
    teams,
    isLoading,
    error,
    isError,
    loadTeams,
    refetch: loadTeams,
    retry,
    createTeam,
    updateTeam,
    deleteTeam
  };
}
