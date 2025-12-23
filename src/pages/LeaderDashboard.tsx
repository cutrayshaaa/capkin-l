import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { 
  Target, 
  RefreshCw,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Users
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { Pagination } from '../components/Pagination';
import type { IKU, Target as TargetType, Realisasi, Proksi, IndikatorKinerja } from '../types/models';

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

export function LeaderDashboard() {
  const { user } = useAuth();
  
  // State management
  const [indikatorKinerjas, setIndikatorKinerjas] = useState<IndikatorKinerja[]>([]);
  const [ikus, setIkus] = useState<IKU[]>([]);
  const [proksis, setProksis] = useState<Proksi[]>([]);
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [realisasis, setRealisasis] = useState<Realisasi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  // Load data from API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load Indikator Kinerja for current team
      const indikatorResponse = await apiService.getIndikatorKinerjas('tim,iku,proksi', 100, 1);
      const indikatorData = Array.isArray(indikatorResponse) ? indikatorResponse : (indikatorResponse as any)?.data || [];
      const teamIndikators = indikatorData.filter((ind: IndikatorKinerja) => ind.id_tim === user?.id_tim);
      setIndikatorKinerjas(teamIndikators);

      // Load IKUs for current team
      const ikusResponse = await apiService.getIKUs('indikatorKinerja,tim,targets,realisasis', 100, 1);
      const ikusData = Array.isArray(ikusResponse) ? ikusResponse : (ikusResponse as any)?.data || [];
      const teamIKUs = ikusData.filter((iku: IKU) => {
        const indikator = teamIndikators.find(ind => ind.id_indikator_kinerja === iku.id_indikator_kinerja);
        return indikator !== undefined;
      });
      setIkus(teamIKUs);

      // Load Proksis for current team
      const proksisResponse = await apiService.getProksis('indikatorKinerja,tim,targets,realisasis', 100, 1);
      const proksisData = Array.isArray(proksisResponse) ? proksisResponse : (proksisResponse as any)?.data || [];
      const teamProksis = proksisData.filter((proksi: Proksi) => {
        const indikator = teamIndikators.find(ind => ind.id_indikator_kinerja === proksi.id_indikator_kinerja);
        return indikator !== undefined;
      });
      setProksis(teamProksis);
      
      // Load Targets
      const targetsResponse = await apiService.getTargets();
      const targetsData = Array.isArray(targetsResponse) ? targetsResponse : (targetsResponse as any)?.data || [];
      const teamTargets = targetsData.filter((target: TargetType) => 
        teamIKUs.some((iku: IKU) => iku.id_iku === target.id_iku) ||
        teamProksis.some((proksi: Proksi) => proksi.id_proksi === target.id_proksi)
      );
      setTargets(teamTargets);
      
      // Load Realisasi
      const realisasisResponse = await apiService.getRealisasis();
      const realisasisData = Array.isArray(realisasisResponse) ? realisasisResponse : (realisasisResponse as any)?.data || [];
      const teamRealisasis = realisasisData.filter((realisasi: Realisasi) => 
        teamIKUs.some((iku: IKU) => iku.id_iku === realisasi.id_iku) ||
        teamProksis.some((proksi: Proksi) => proksi.id_proksi === realisasi.id_proksi)
      );
      setRealisasis(teamRealisasis);
      
    } catch (error) {
      setError('Gagal memuat data dashboard');
      toast.error('Gagal memuat data dashboard');
    } finally {
      setIsLoading(false);
    }
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
  
  // Pagination for indikator performance table
  const totalItems = indikatorPerformance.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedIndikatorPerformance = indikatorPerformance.slice(startIndex, endIndex);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadData} className="bg-primary text-white">
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Ketua Tim</h1>
          <p className="text-muted-foreground">Selamat datang, {user?.nama_user}</p>
          <p className="text-sm text-muted-foreground">Ketua Tim: {user?.nama_user}</p>
        </div>
        <Button
          variant="outline"
          onClick={loadData}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Muat Ulang
        </Button>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pencapaian Rata-rata</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamPerformance.achievement}%</div>
            <p className="text-xs text-muted-foreground">
              dari target yang ditetapkan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tingkat Penyelesaian</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamPerformance.completion}%</div>
            <p className="text-xs text-muted-foreground">
              Indikator yang sudah direalisasi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Indikator Bermasalah</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamPerformance.issues}</div>
            <p className="text-xs text-muted-foreground">
              Indikator yang memiliki kendala
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Indikator Kinerja Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Performa Indikator Kinerja Tim
          </CardTitle>
        </CardHeader>
        <CardContent>
          {indikatorPerformance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada Indikator Kinerja yang ditetapkan untuk tim ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center w-16">No</TableHead>
                    <TableHead>Indikator Kinerja</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Realisasi</TableHead>
                    <TableHead>Pencapaian</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Kendala</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedIndikatorPerformance.map((ind, idx) => {
                    const actualIdx = startIndex + idx;
                    const rowNumber = actualIdx + 1;
                    return (
                    <TableRow key={`${ind.jenis}-${ind.id}`}>
                      <TableCell className="text-center font-semibold text-gray-700">
                        {rowNumber}
                      </TableCell>
                      <TableCell className="font-medium">{ind.nama}</TableCell>
                      <TableCell>
                        <Badge 
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            ind.jenis === 'iku' 
                              ? 'bg-blue-100 text-blue-800 border-blue-200' 
                              : 'bg-purple-100 text-purple-800 border-purple-200'
                          }`}
                        >
                          {ind.jenis === 'iku' ? 'IKU' : 'PROKSI'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {Number(ind.totalTarget)}
                      </TableCell>
                      <TableCell>
                        {Number(ind.totalRealisasi)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(ind.achievement, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium min-w-[3rem]">{ind.achievement}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            ind.status === 'on_track' ? 'bg-green-100 text-green-800 border-green-200' :
                            ind.status === 'at_risk' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                            ind.status === 'behind' ? 'bg-red-100 text-red-800 border-red-200' : 
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }`}
                        >
                          {ind.status === 'on_track' ? 'Tepat Sasaran' :
                           ind.status === 'at_risk' ? 'Berisiko' :
                           ind.status === 'behind' ? 'Terlambat' : 'Menunggu'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ind.hasIssues ? (
                          <Badge className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border-red-200">
                            Ada Kendala
                          </Badge>
                        ) : (
                          <Badge className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border-gray-200">
                            Lancar
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
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
        </CardContent>
      </Card>

      {/* Team Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ringkasan Tim
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Team Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Informasi Tim</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Ketua Tim (PIC):</p>
                  <p className="font-medium">{user?.nama_user || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ID Tim:</p>
                  <p className="font-medium">{user?.id_tim || 'Tidak ada tim'}</p>
                </div>
              </div>
            </div>
            
            {/* Performance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{indikatorKinerjas.length}</div>
                <div className="text-sm text-blue-600">Total Indikator</div>
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{ikus.length}</div>
                <div className="text-sm text-indigo-600">IKU</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{proksis.length}</div>
                <div className="text-sm text-purple-600">Proksi</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{targets.length}</div>
                <div className="text-sm text-green-600">Target Aktif</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{teamPerformance.issues}</div>
                <div className="text-sm text-orange-600">Bermasalah</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
