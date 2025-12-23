import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Target, 
  TrendingUp, 
  Users,
  BarChart3,
  Info,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  FileText,
  Zap,
  Award,
  Activity
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { Pagination } from '../components/Pagination';
import type { IKU, Target as TargetType, Realisasi, Proksi, IndikatorKinerja } from '../types/models';
import { CardSkeleton, TableSkeleton } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

interface IndikatorKinerjaPerformance {
  id: number;
  id_indikator_kinerja: number;
  nama: string;
  jenis: 'iku' | 'proksi';
  totalTarget: number;
  totalRealisasi: number;
  achievement: number;
  status: string;
  hasIssues: boolean;
}

// Normalisasi label triwulan ke bentuk standar: TW 1..TW 4
const normalizePeriod = (value: string | undefined | null): string => {
  if (!value) return '';
  const v = String(value).trim().toUpperCase();
  if (v.startsWith('TW')) {
    const num = v.replace(/\s+/g, '').replace('TW', '');
    return `TW ${num}`;
  }
  if (v === 'I' || v === '1') return 'TW 1';
  if (v === 'II' || v === '2') return 'TW 2';
  if (v === 'III' || v === '3') return 'TW 3';
  if (v === 'IV' || v === '4') return 'TW 4';
  return value;
};

export function StaffDashboard() {
  const { user } = useAuth();
  
  // State management
  const [indikatorKinerjas, setIndikatorKinerjas] = useState<IndikatorKinerja[]>([]);
  const [ikus, setIkus] = useState<IKU[]>([]);
  const [proksis, setProksis] = useState<Proksi[]>([]);
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [realisasis, setRealisasis] = useState<Realisasi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Load data from API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsError(false);

      // Load Indikator Kinerja for current team with error handling
      let teamIndikators: IndikatorKinerja[] = [];
      let teamIKUs: IKU[] = [];
      let teamProksis: Proksi[] = [];
      
      try {
        // Try general endpoint first (staff might have access to see all data)
        let indikatorResponse, ikusResponse, proksisResponse;
        try {
          [indikatorResponse, ikusResponse, proksisResponse] = await Promise.all([
            apiService.getIndikatorKinerjas('tim,iku,proksi', 100, 1),
            apiService.getIKUs('indikatorKinerja,tim,targets,realisasis', 100, 1),
            apiService.getProksis('indikatorKinerja,tim,targets,realisasis', 100, 1)
          ]);
        } catch (generalError) {
          // If general endpoint fails (403), fallback to staff endpoint
          [indikatorResponse, ikusResponse, proksisResponse] = await Promise.all([
            apiService.getStaffIndikatorKinerjas('tim,iku,proksi', 100, 1),
            apiService.getStaffIKUs('indikatorKinerja,tim,targets,realisasis', 100, 1),
            apiService.getStaffProksis('indikatorKinerja,tim,targets,realisasis', 100, 1)
          ]);
        }
        
        const indikatorData = Array.isArray(indikatorResponse) ? indikatorResponse : (indikatorResponse as any)?.data || [];
        const ikusData = Array.isArray(ikusResponse) ? ikusResponse : (ikusResponse as any)?.data || [];
        const proksisData = Array.isArray(proksisResponse) ? proksisResponse : (proksisResponse as any)?.data || [];
        
        // Staff can see all indikator kinerja from all teams
        teamIndikators = indikatorData;
        setIndikatorKinerjas(teamIndikators);

        // Staff can see all IKUs from all teams
        teamIKUs = ikusData.filter((iku: IKU) => {
          const indikator = teamIndikators.find(ind => ind.id_indikator_kinerja === iku.id_indikator_kinerja);
          return indikator !== undefined;
        });
        setIkus(teamIKUs);

        // Staff can see all Proksis from all teams
        teamProksis = proksisData.filter((proksi: Proksi) => {
          const indikator = teamIndikators.find(ind => ind.id_indikator_kinerja === proksi.id_indikator_kinerja);
          return indikator !== undefined;
        });
        setProksis(teamProksis);
      } catch (error) {
        // console.warn('Failed to load Indikator Kinerja:', error);
        // Fallback demo data for staff dashboard
        const demoIKUs: IKU[] = [
          {
            id_iku: 1,
            id_indikator_kinerja: 1,
            nama_iku: 'Peningkatan Kualitas Data Produksi',
            id_tim: user?.id_tim || 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setIkus(demoIKUs);
        setProksis([]);
      }
      
      // Load Targets with error handling - try general endpoint first
      try {
        let targetsResponse;
        try {
          targetsResponse = await apiService.getTargets();
        } catch (generalError) {
          // If general endpoint fails (403), fallback to staff endpoint
          targetsResponse = await apiService.getStaffTargets();
        }
        const targetsData = Array.isArray(targetsResponse) ? targetsResponse : (targetsResponse as any)?.data || [];
        // Staff can see all targets from all teams
        const teamTargets = targetsData.filter((target: TargetType) => 
          teamIKUs.some((iku: IKU) => iku.id_iku === target.id_iku) ||
          teamProksis.some((proksi: Proksi) => proksi.id_proksi === target.id_proksi)
        );
        setTargets(teamTargets);
      } catch (error) {
        // console.warn('Failed to load targets:', error);
        // Fallback demo targets (sesuai skema baru)
        const demoTargets: TargetType[] = [
          {
            id_target: 1,
            id_iku: 1,
            periode: 'TW 1',
            tahun: 2025,
            target_iku: 0, // Field ini sudah tidak digunakan di backend (dihapus)
            satuan_target: 0, // Field ini sudah tidak digunakan di backend (dihapus)
            persenan_target: 100, // Persenan target
            satuan: 80, // Target proxy
            status: 'pending',
            created_by: user?.id_user || 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id_target: 2,
            id_iku: 2,
            periode: 'TW 1',
            tahun: 2025,
            target_iku: 0, // Field ini sudah tidak digunakan di backend (dihapus)
            satuan_target: 0, // Field ini sudah tidak digunakan di backend (dihapus)
            persenan_target: 100, // Persenan target
            satuan: 85, // Target proxy
            status: 'pending',
            created_by: user?.id_user || 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id_target: 3,
            id_iku: 3,
            periode: 'TW 1',
            tahun: 2025,
            target_iku: 0, // Field ini sudah tidak digunakan di backend (dihapus)
            satuan_target: 0, // Field ini sudah tidak digunakan di backend (dihapus)
            persenan_target: 100, // Persenan target
            satuan: 82, // Target proxy
            status: 'pending',
            created_by: user?.id_user || 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setTargets(demoTargets);
      }
      
      // Load Realisasi with error handling - try general endpoint first
      try {
        let realisasisResponse;
        try {
          realisasisResponse = await apiService.getRealisasis();
        } catch (generalError) {
          // If general endpoint fails (403), fallback to staff endpoint
          realisasisResponse = await apiService.getStaffRealisasis();
        }
        const realisasisData = Array.isArray(realisasisResponse) ? realisasisResponse : (realisasisResponse as any)?.data || [];
        // Staff can see all realisasis from all teams
        const teamRealisasis = realisasisData.filter((realisasi: Realisasi) => 
          teamIKUs.some((iku: IKU) => iku.id_iku === realisasi.id_iku) ||
          teamProksis.some((proksi: Proksi) => proksi.id_proksi === realisasi.id_proksi)
        );
        setRealisasis(teamRealisasis);
      } catch (error) {
        // console.warn('Failed to load realisasis:', error);
        // Fallback demo realisasis (sesuai skema baru - integer, tanpa verified_by)
        const demoRealisasis: Realisasi[] = [
          {
            id_realisasi: 1,
            id_iku: 1,
            periode: 'TW 1',
            tahun: 2025,
            realisasi: 82,
            realisasi_proxy: 78,
            solusi: 'Implementasi sistem monitoring',
            kendala: 'Keterbatasan sumber daya',
            link_bdk: 'https://example.com/bdk1',
            created_by: user?.id_user || 1,
            target: 85,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id_realisasi: 2,
            id_iku: 2,
            periode: 'TW 1',
            tahun: 2025,
            realisasi: 88,
            realisasi_proxy: 83,
            solusi: 'Pelatihan tim',
            kendala: '',
            link_bdk: 'https://example.com/bdk2',
            created_by: user?.id_user || 1,
            target: 90,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id_realisasi: 3,
            id_iku: 3,
            periode: 'TW 1',
            tahun: 2025,
            realisasi: 84,
            realisasi_proxy: 80,
            solusi: 'Optimasi proses',
            kendala: 'Kendala teknis',
            link_bdk: 'https://example.com/bdk3',
            created_by: user?.id_user || 1,
            target: 87,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setRealisasis(demoRealisasis);
      }
      
    } catch (error) {
      // console.error('Error loading dashboard data:', error);
      setIsError(true);
      setError(error?.message || 'Gagal memuat data dashboard. Silakan coba lagi.');
      toast.error('Gagal memuat data dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const retry = () => {
    loadData();
  };

  // Calculate Indikator Kinerja performance (IKU + Proksi)
  const getIndikatorKinerjaPerformance = (): IndikatorKinerjaPerformance[] => {
    const results: IndikatorKinerjaPerformance[] = [];

    // Process IKUs
    ikus.forEach(iku => {
      if (!iku || !iku.id_iku) return;

      const indikator = indikatorKinerjas.find(ind => ind.id_indikator_kinerja === iku.id_indikator_kinerja);
      if (!indikator) return;

      // Target IKU diambil dari master IKU (bukan dari tabel target)
      const totalTarget = Number(iku.target_iku || iku.target_per_tahun || 0);
      
      // Realisasi IKU adalah total dari semua realisasi untuk IKU ini
      const ikuRealisasis = realisasis.filter(r => r.id_iku === iku.id_iku);
      const totalRealisasi = ikuRealisasis.reduce((sum, r) => sum + (Number(r.realisasi || 0)), 0);
      
      const achievement = totalTarget > 0 ? (totalRealisasi / totalTarget) * 100 : 0;
      
      // Tentukan status berdasarkan persentase pencapaian
      let status = 'pending';
      if (achievement >= 95) {
        status = 'on_track';
      } else if (achievement >= 80) {
        status = 'at_risk';
      } else if (achievement >= 60) {
        status = 'behind';
      }
      
      // Tentukan apakah ada kendala
      const hasIssues = ikuRealisasis.some(r => r.kendala && r.kendala.trim() !== '') || achievement < 100;
      
      results.push({
        id: iku.id_iku,
        id_indikator_kinerja: iku.id_indikator_kinerja,
        nama: indikator.nama_indikator || 'IKU Tidak Diketahui',
        jenis: 'iku',
        totalTarget: Number(totalTarget) || 0,
        totalRealisasi: Number(totalRealisasi) || 0,
        achievement: Math.round(achievement),
        status,
        hasIssues
      });
    });

    // Process Proksis
    proksis.forEach(proksi => {
      if (!proksi || !proksi.id_proksi) return;

      const indikator = indikatorKinerjas.find(ind => ind.id_indikator_kinerja === proksi.id_indikator_kinerja);
      if (!indikator) return;

      // Target Proksi
      const totalTarget = Number(proksi.target_per_tahun || 0);
      
      // Realisasi Proksi adalah total dari semua realisasi untuk Proksi ini
      const proksiRealisasis = realisasis.filter(r => r.id_proksi === proksi.id_proksi);
      const totalRealisasi = proksiRealisasis.reduce((sum, r) => sum + (Number(r.realisasi || 0)), 0);
      
      const achievement = totalTarget > 0 ? (totalRealisasi / totalTarget) * 100 : 0;
      
      // Tentukan status berdasarkan persentase pencapaian
      let status = 'pending';
      if (achievement >= 95) {
        status = 'on_track';
      } else if (achievement >= 80) {
        status = 'at_risk';
      } else if (achievement >= 60) {
        status = 'behind';
      }
      
      // Tentukan apakah ada kendala
      const hasIssues = proksiRealisasis.some(r => r.kendala && r.kendala.trim() !== '') || achievement < 100;
      
      results.push({
        id: proksi.id_proksi,
        id_indikator_kinerja: proksi.id_indikator_kinerja,
        nama: indikator.nama_indikator || 'Proksi Tidak Diketahui',
        jenis: 'proksi',
        totalTarget: Number(totalTarget) || 0,
        totalRealisasi: Number(totalRealisasi) || 0,
        achievement: Math.round(achievement),
        status,
        hasIssues
      });
    });

    return results;
  };

  // Calculate team performance summary
  const getTeamPerformance = () => {
    const indikatorPerformance = getIndikatorKinerjaPerformance();
    
    if (indikatorPerformance.length === 0) {
      return { achievement: 0, completion: 0, issues: 0 };
    }
    
    const totalAchievement = indikatorPerformance.reduce((sum, ind) => sum + ind.achievement, 0);
    const avgAchievement = totalAchievement / indikatorPerformance.length;
    const completionCount = indikatorPerformance.filter(ind => ind.achievement >= 95).length;
    const completionRate = (completionCount / indikatorPerformance.length) * 100;
    const issueCount = indikatorPerformance.filter(ind => ind.hasIssues).length;
    
    return {
      achievement: Math.round(avgAchievement),
      completion: Math.round(completionRate),
      issues: issueCount
    };
  };

  const indikatorPerformance = getIndikatorKinerjaPerformance();
  const teamPerformance = getTeamPerformance();
  
  // Pagination for indikator performance list
  const totalItems = indikatorPerformance.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedIndikatorPerformance = indikatorPerformance.slice(startIndex, endIndex);

  // Show error state
  if (isError) {
    return (
      <ErrorState 
        message={error || 'Gagal memuat data dashboard'}
        onRetry={retry}
        type="generic"
      />
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton count={4} />
        </div>
        
        {/* Performance Table Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={5} columns={6} />
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header Section with Gradient Background */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 p-8 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Dashboard Staff</h1>
                <p className="text-green-100 text-sm">Selamat datang, {user?.nama_user} 👋</p>
              </div>
            </div>
          </div>
          <Button
            onClick={loadData}
            disabled={isLoading}
            className="bg-white text-green-600 hover:bg-green-50 font-medium shadow-lg transition-all duration-200 hover:scale-105"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pencapaian Tim card removed per request */}

        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Indikator Terselesaikan</CardTitle>
            <div className="p-2 bg-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{teamPerformance.completion}%</div>
            <p className="text-xs text-gray-600 mt-1">
              ✅ dari total Indikator Kinerja tim
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-gradient-to-br from-indigo-50 to-indigo-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Total IKU</CardTitle>
            <div className="p-2 bg-indigo-200 rounded-lg">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">{ikus.length}</div>
            <p className="text-xs text-gray-600 mt-1">total IKU</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Proksi</CardTitle>
            <div className="p-2 bg-purple-200 rounded-lg">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{proksis.length}</div>
            <p className="text-xs text-gray-600 mt-1">total Proksi</p>
          </CardContent>
        </Card>

        {/* Perhatian card removed per request */}
      </div>

      {/* Indikator Kinerja Performance per Item */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-lg font-semibold">Capaian Indikator Kinerja per Item</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {indikatorPerformance.length > 0 ? (
            <div className="space-y-5">
              {paginatedIndikatorPerformance.map((ind, idx) => {
                const actualIdx = startIndex + idx;
                return (
                <div key={`${ind.jenis}-${ind.id}`} className="p-4 rounded-lg border-2 border-gray-200 hover:border-green-300 transition-colors bg-gray-50 hover:bg-green-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-2 h-8 bg-gradient-to-b from-green-400 to-emerald-600 rounded-full" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{ind.nama}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            className={`px-2 py-0.5 rounded text-xs font-medium border-0 ${
                              ind.jenis === 'iku' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-purple-500 text-white'
                            }`}
                          >
                            {ind.jenis === 'iku' ? '📊 IKU' : '📈 PROKSI'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{ind.achievement.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                  <Progress value={Math.min(ind.achievement, 100)} className="h-2 mb-3" />
                  <div className="flex justify-between text-xs text-gray-600 gap-4">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">🎯 Target:</span>
                      <span className="font-bold text-gray-900">{Number(ind.totalTarget || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">📈 Realisasi:</span>
                      <span className="font-bold text-gray-900">{Number(ind.totalRealisasi || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                );
              })}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={currentPage}
                    lastPage={totalPages}
                    total={totalItems}
                    perPage={perPage}
                    onPageChange={setCurrentPage}
                    onPerPageChange={(newPerPage) => {
                      setPerPage(newPerPage);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500 font-medium">
                Belum ada data Indikator Kinerja untuk ditampilkan
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ringkasan Tim removed per request */}
    </div>
  );
}
