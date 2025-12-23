import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../pages/AuthProvider';
import type { IKU } from '../types/models';

export function useIKUs() {
  const { user } = useAuth();
  const [ikus, setIKUs] = useState<IKU[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const loadIKUs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsError(false);
      
      // Use different endpoint based on user role
      let response;
      if (user?.role === 'staff') {
        response = await apiService.getStaffIKUs('indikatorKinerja,tim,targets,realisasis');
      } else {
        response = await apiService.getIKUs('indikatorKinerja,tim,picUser');
      }
      
      const ikusData = Array.isArray(response) ? response : response?.data || [];
      setIKUs(ikusData);
    } catch (err: any) {
      // console.warn('Failed to load IKUs:', err);
      setIsError(true);
      
      // Determine error type and message
      const errorMessage = err?.message || 'Gagal memuat data IKU';
      setError(errorMessage);
      
      // Fallback demo data for staff
      if (user?.role === 'staff') {
        const demoIKUs = [
          {
            id_iku: 1,
            nama_iku: 'Peningkatan Kualitas Data Produksi',
            id_tim: user.id_tim || 1,
            pic: String(user.id_user || 1),
            created_at: '2025-01-01',
            targets: [
              { id_target: 1, id_iku: 1, id_period: 1, target_iku: 85.5, target_proxy: 80.0, status: 'pending', created_by: 1, created_at: '2025-01-01', updated_at: '2025-01-01' }
            ],
            realisasis: [
              { id_realisasi: 1, id_iku: 1, id_period: 1, realisasi: 75.5, realisasi_proxy: 70.0, solusi: 'Implementasi strategi baru', kendala: 'Keterbatasan sumber daya', link_bdk: 'https://example.com/bdk', verified_by: 1, created_at: '2025-01-01', updated_at: '2025-01-01', created_by: 1, target: 85.5 }
            ]
          },
          {
            id_iku: 2,
            nama_iku: 'Akurasi Data Pertanian',
            id_tim: user.id_tim || 1,
            pic: String(user.id_user || 1),
            created_at: '2025-01-01',
            targets: [
              { id_target: 2, id_iku: 2, id_period: 1, target_iku: 90.0, target_proxy: 85.0, status: 'pending', created_by: 1, created_at: '2025-01-01', updated_at: '2025-01-01' }
            ],
            realisasis: [
              { id_realisasi: 2, id_iku: 2, id_period: 1, realisasi: 88.0, realisasi_proxy: 83.0, solusi: 'Peningkatan monitoring', kendala: 'Cuaca tidak mendukung', link_bdk: 'https://example.com/bdk2', verified_by: 1, created_at: '2025-01-01', updated_at: '2025-01-01', created_by: 1, target: 90.0 }
            ]
          }
        ];
        setIKUs(demoIKUs);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIKUs();
  }, []);

  const createIKU = async (ikuData: any) => {
    try {
      const response = await apiService.createIKU(ikuData);
      await loadIKUs(); // Reload data
      return response;
    } catch (err) {

      throw err;
    }
  };

  const updateIKU = async (id: number, ikuData: any) => {
    try {
      const response = await apiService.updateIKU(id, ikuData);
      await loadIKUs(); // Reload data
      return response;
    } catch (err) {

      throw err;
    }
  };

  const deleteIKU = async (id: number) => {
    try {
      await apiService.deleteIKU(id);
      await loadIKUs(); // Reload data
    } catch (err) {

      throw err;
    }
  };

  const retry = () => {
    setRetryCount(prev => prev + 1);
    loadIKUs();
  };

  return {
    ikus,
    isLoading,
    error,
    isError,
    loadIKUs,
    refetch: loadIKUs,
    retry,
    createIKU,
    updateIKU,
    deleteIKU
  };
}
