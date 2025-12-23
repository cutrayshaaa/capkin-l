import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { User } from '../types/models';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsError(false);
      const response = await apiService.getUsers();
      const usersData = Array.isArray(response) ? response : response?.data || [];
      setUsers(usersData);
    } catch (err: any) {
      // For staff role, users endpoint may not be accessible (403)
      // This is expected, so we don't treat it as an error
      if (err?.message?.includes('403') || err?.message?.includes('Akses ditolak')) {
        setIsError(false);
        setError(null);
        setUsers([]); // Set empty array for staff
      } else {
        setIsError(true);
        const errorMessage = err?.message || 'Gagal memuat data user';
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const createUser = async (userData: any) => {
    try {
      const response = await apiService.createUser(userData);
      await loadUsers(); // Reload data
      return response;
    } catch (err) {

      throw err;
    }
  };

  const updateUser = async (id: number, userData: any) => {
    try {
      const response = await apiService.updateUser(id, userData);
      await loadUsers(); // Reload data
      return response;
    } catch (err) {

      throw err;
    }
  };

  const deleteUser = async (id: number) => {
    try {
      await apiService.deleteUser(id);
      await loadUsers(); // Reload data
    } catch (err) {

      throw err;
    }
  };

  const retry = () => {
    setRetryCount(prev => prev + 1);
    loadUsers();
  };

  return {
    users,
    isLoading,
    error,
    isError,
    loadUsers,
    refetch: loadUsers,
    retry,
    createUser,
    updateUser,
    deleteUser
  };
}
