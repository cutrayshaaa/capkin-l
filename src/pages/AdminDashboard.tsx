import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  BarChart3, 
  TrendingUp, 
  Target,
  Users,
  Filter,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import type { IKU, Target as TargetType, Realisasi, Team, User, Period, Proksi, IndikatorKinerja } from '../types/models';

export function AdminDashboard() {
  const { user } = useAuth();
  
  // Local state management
  const [reportData, setReportData] = useState<any>(null);
  const [indikatorKinerjas, setIndikatorKinerjas] = useState<IndikatorKinerja[]>([]);
  const [ikus, setIkus] = useState<IKU[]>([]);
  const [proksis, setProksis] = useState<Proksi[]>([]);
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [realisasis, setRealisasis] = useState<Realisasi[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({
    team: 'all',
    period: 'all',
    year: new Date().getFullYear()
  });

  // Load data from API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      
      // Load all data with relationships
      const [indikatorResponse, ikusResponse, proksisResponse, targetsResponse, realisasisResponse, teamsResponse, usersResponse, periodsResponse] = await Promise.all([
        apiService.getIndikatorKinerjas('tim,iku,proksi', 1000, 1),
        apiService.getIKUs('indikatorKinerja,tim,targets,realisasis', 1000, 1),
        apiService.getProksis('indikatorKinerja,tim,targets,realisasis', 1000, 1),
        apiService.getTargets(),
        apiService.getRealisasis(),
        apiService.getTeams(),
        apiService.getUsers(),
        apiService.getActivePeriods()
      ]);
      
      // Process responses
      const indikatorData = Array.isArray(indikatorResponse) ? indikatorResponse : (indikatorResponse as any)?.data || [];
      const ikusData = Array.isArray(ikusResponse) ? ikusResponse : (ikusResponse as any)?.data || [];
      const proksisData = Array.isArray(proksisResponse) ? proksisResponse : (proksisResponse as any)?.data || [];
      const targetsData = Array.isArray(targetsResponse) ? targetsResponse : (targetsResponse as any)?.data || [];
      const realisasisData = Array.isArray(realisasisResponse) ? realisasisResponse : (realisasisResponse as any)?.data || [];
      const teamsData = Array.isArray(teamsResponse) ? teamsResponse : (teamsResponse as any)?.data || [];
      const usersData = Array.isArray(usersResponse) ? usersResponse : (usersResponse as any)?.data || [];
      const periodsData = Array.isArray(periodsResponse) ? periodsResponse : (periodsResponse as any)?.data || [];
      
      setIndikatorKinerjas(indikatorData);
      setIkus(ikusData);
      setProksis(proksisData);
      setTargets(targetsData);
      setRealisasis(realisasisData);
      setTeams(teamsData);
      setUsers(usersData);
      setPeriods(periodsData);
      
      } catch (error) {

      setError('Gagal memuat data dashboard');
      toast.error('Gagal memuat data dashboard');
      } finally {
      setIsLoading(false);
    }
  };

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

  // Get filtered data based on selections
  const getFilteredData = () => {
    let filteredIndikators = indikatorKinerjas || [];
    let filteredIKUs = ikus || [];
    let filteredProksis = proksis || [];
    let filteredTargets = targets || [];
    let filteredRealisasis = realisasis || [];

    // Filter by team
    if (filters.team !== 'all') {
      const teamId = parseInt(filters.team);
      filteredIndikators = (indikatorKinerjas || []).filter(ind => ind.id_tim === teamId);
      filteredIKUs = (ikus || []).filter(iku => {
        const indikator = filteredIndikators.find(ind => ind.id_indikator_kinerja === iku.id_indikator_kinerja);
        return indikator !== undefined;
      });
      filteredProksis = (proksis || []).filter(proksi => {
        const indikator = filteredIndikators.find(ind => ind.id_indikator_kinerja === proksi.id_indikator_kinerja);
        return indikator !== undefined;
      });
    }

    // Filter by year
    filteredTargets = filteredTargets.filter(target => target.tahun === filters.year);
    filteredRealisasis = filteredRealisasis.filter(realisasi => realisasi.tahun === filters.year);

    // Filter targets and realisasis by filtered IKUs and Proksis
    const ikuIds = filteredIKUs.map(iku => iku.id_iku);
    const proksiIds = filteredProksis.map(proksi => proksi.id_proksi);
    filteredTargets = filteredTargets.filter(target => 
      ikuIds.includes(target.id_iku || 0) || proksiIds.includes(target.id_proksi || 0)
    );
    filteredRealisasis = filteredRealisasis.filter(realisasi => 
      ikuIds.includes(realisasi.id_iku || 0) || proksiIds.includes(realisasi.id_proksi || 0)
    );

    return { filteredIndikators, filteredIKUs, filteredProksis, filteredTargets, filteredRealisasis };
  };

  const { filteredIndikators, filteredIKUs, filteredProksis, filteredTargets, filteredRealisasis } = getFilteredData();

  // Calculate statistics
  const calculateStats = () => {
    const totalIndikators = filteredIndikators.length;
    const totalIKUs = filteredIKUs.length;
    const totalProksis = filteredProksis.length;
    const totalTargets = filteredTargets.length;
    const totalRealisations = filteredRealisasis.length;
    
    let totalAchievement = 0;
    let achievementCount = 0;
    
    // Hitung achievement berdasarkan target IKU dari master IKU dan realisasi
    filteredIKUs.forEach(iku => {
      // Target IKU dari master IKU (bukan dari tabel target)
      const targetIku = Number(iku.target_iku || iku.target_per_tahun || 0);
      if (targetIku === 0) return;
      
      // Total realisasi untuk IKU ini
      const ikuRealisasis = filteredRealisasis.filter(r => r.id_iku === iku.id_iku);
      const totalRealisasi = ikuRealisasis.reduce((sum, r) => sum + Number(r.realisasi || 0), 0);
      
      if (targetIku > 0) {
        totalAchievement += (totalRealisasi / targetIku) * 100;
        achievementCount++;
      }
    });

    // Hitung achievement untuk Proksi
    filteredProksis.forEach(proksi => {
      const targetProksi = Number(proksi.target_per_tahun || 0);
      if (targetProksi === 0) return;
      
      const proksiRealisasis = filteredRealisasis.filter(r => r.id_proksi === proksi.id_proksi);
      const totalRealisasi = proksiRealisasis.reduce((sum, r) => sum + Number(r.realisasi || 0), 0);
      
      if (targetProksi > 0) {
        totalAchievement += (totalRealisasi / targetProksi) * 100;
        achievementCount++;
      }
    });
    
    const avgAchievement = achievementCount > 0 ? totalAchievement / achievementCount : 0;
    
    return {
      totalIndikators,
      totalIKUs,
      totalProksis,
      totalTargets,
      totalRealisations,
      avgAchievement: Math.round(avgAchievement)
    };
  };

  const stats = calculateStats();

  // Return a pair of colors (light -> main) based on percent (0..100)
  const getProgressColors = (percent: number) => {
    const p = Math.max(0, Math.min(100, Number(percent) || 0));
    const hue = Math.round((p / 100) * 120); // 0 = red, 120 = green
    const main = `hsl(${hue} 70% 45%)`;
    const light = `hsl(${hue} 85% 65%)`;
    return { light, main };
  };



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

  // Calculate additional statistics for the new layout
  const totalTeams = teams?.length ?? 0;
  const totalUsers = users?.filter((u: any) => u.role === 'ketua_tim').length ?? 0;
  const totalIndikators = indikatorKinerjas?.length ?? 0;
  const totalIKUs = ikus?.length ?? 0;
  const totalProksis = proksis?.length ?? 0;
  const totalTargets = targets?.length ?? 0;

  // Calculate achievement rate - menggunakan logic yang sama dengan calculateStats
  const achievementRate = () => {
    if ((!ikus || ikus.length === 0) && (!proksis || proksis.length === 0)) return 0;
    
    let totalAchievement = 0;
    let achievementCount = 0;
    
    // Hitung achievement berdasarkan target IKU dari master IKU dan realisasi
    ikus.forEach((iku: any) => {
      // Target IKU dari master IKU (bukan dari tabel target)
      const targetIku = Number(iku.target_iku || iku.target_per_tahun || 0);
      if (targetIku === 0) return;
      
      // Filter realisasi berdasarkan tahun yang dipilih
      const currentYear = filters.year || new Date().getFullYear();
      const ikuRealisasis = (realisasis || []).filter((r: any) => 
        r.id_iku === iku.id_iku && (r.tahun === currentYear || !r.tahun)
      );
      
      // Total realisasi untuk IKU ini
      const totalRealisasi = ikuRealisasis.reduce((sum: number, r: any) => 
        sum + Number(r.realisasi || 0), 0
      );
      
      if (targetIku > 0) {
        totalAchievement += (totalRealisasi / targetIku) * 100;
        achievementCount++;
      }
    });

    // Hitung achievement untuk Proksi
    proksis.forEach((proksi: any) => {
      const targetProksi = Number(proksi.target_per_tahun || 0);
      if (targetProksi === 0) return;
      
      const currentYear = filters.year || new Date().getFullYear();
      const proksiRealisasis = (realisasis || []).filter((r: any) => 
        r.id_proksi === proksi.id_proksi && (r.tahun === currentYear || !r.tahun)
      );
      
      const totalRealisasi = proksiRealisasis.reduce((sum: number, r: any) => 
        sum + Number(r.realisasi || 0), 0
      );
      
      if (targetProksi > 0) {
        totalAchievement += (totalRealisasi / targetProksi) * 100;
        achievementCount++;
      }
    });
    
    return achievementCount > 0 ? totalAchievement / achievementCount : 0;
  };

  // Get teams with their performance
  const teamsWithPerformance = teams?.map((team: any) => {
    const teamIndikators = indikatorKinerjas?.filter((ind: any) => ind.id_tim === team.id_tim) || [];
    const teamIKUs = ikus?.filter((iku: any) => {
      const indikator = teamIndikators.find((ind: any) => ind.id_indikator_kinerja === iku.id_indikator_kinerja);
      return indikator !== undefined;
    }) || [];
    const teamProksis = proksis?.filter((proksi: any) => {
      const indikator = teamIndikators.find((ind: any) => ind.id_indikator_kinerja === proksi.id_indikator_kinerja);
      return indikator !== undefined;
    }) || [];
    const teamTargets = targets?.filter((target: any) =>
      teamIKUs.some((iku: any) => iku.id_iku === target.id_iku) ||
      teamProksis.some((proksi: any) => proksi.id_proksi === target.id_proksi)
    ) || [];
    const teamRealisasis = realisasis?.filter((realisasi: any) =>
      teamIKUs.some((iku: any) => iku.id_iku === realisasi.id_iku) ||
      teamProksis.some((proksi: any) => proksi.id_proksi === realisasi.id_proksi)
    ) || [];

    let achievement = 0;
    if (teamTargets.length > 0 || teamIKUs.length > 0 || teamProksis.length > 0) {
      let totalAch = 0;
      let count = 0;
      
      // Hitung achievement berdasarkan target IKU dari master IKU dan realisasi
      teamIKUs.forEach((iku: any) => {
        const targetIku = Number(iku.target_iku || iku.target_per_tahun || 0);
        if (targetIku === 0) return;
        
        const ikuRealisasis = teamRealisasis.filter((r: any) => r.id_iku === iku.id_iku);
        const totalRealisasi = ikuRealisasis.reduce((sum: number, r: any) => sum + Number(r.realisasi || 0), 0);
        
        if (targetIku > 0) {
          totalAch += (totalRealisasi / targetIku) * 100;
          count++;
        }
      });

      // Hitung achievement untuk Proksi
      teamProksis.forEach((proksi: any) => {
        const targetProksi = Number(proksi.target_per_tahun || 0);
        if (targetProksi === 0) return;
        
        const proksiRealisasis = teamRealisasis.filter((r: any) => r.id_proksi === proksi.id_proksi);
        const totalRealisasi = proksiRealisasis.reduce((sum: number, r: any) => sum + Number(r.realisasi || 0), 0);
        
        if (targetProksi > 0) {
          totalAch += (totalRealisasi / targetProksi) * 100;
          count++;
        }
      });
      
      achievement = count > 0 ? totalAch / count : 0;
    }

    // Find team leader name - dengan fallback yang lebih robust
    let nama_ketua = 'Belum ditetapkan';
    
    // Priority 1: Cari dari users array berdasarkan id_tim dan role
    if (users && Array.isArray(users) && users.length > 0) {
      const teamIdTim = Number(team.id_tim || 0);
      // Debug: Uncomment untuk troubleshooting
      // console.log('Searching for leader - Team ID:', teamIdTim, 'Available users:', users.length);
      
      const teamLeader = users.find((u: any) => {
        const uIdTim = Number(u.id_tim || 0);
        const uRole = String(u.role || '').trim().toLowerCase();
        const matchesTeam = uIdTim === teamIdTim && uIdTim !== 0;
        const matchesRole = uRole === 'ketua_tim' || uRole === 'ketua tim';
        
        // Debug: Uncomment untuk troubleshooting
        // if (matchesTeam) {
        //   console.log('  Found matching team member:', u.nama_user, 'Role:', uRole, 'Matches role:', matchesRole);
        // }
        
        return matchesTeam && matchesRole;
      });
      
      if (teamLeader && teamLeader.nama_user) {
        nama_ketua = teamLeader.nama_user;
        // Debug: Uncomment untuk troubleshooting
        // console.log('✓ Found team leader:', nama_ketua);
      } else {
        // Debug: Uncomment untuk troubleshooting
        // console.log('✗ Team leader not found for team:', teamIdTim);
      }
    } else {
      // Debug: Uncomment untuk troubleshooting
      // console.log('✗ Users array is empty or not loaded');
    }
    
    // Priority 2: Coba dari team.users relationship jika ada
    if (nama_ketua === 'Belum ditetapkan' && (team as any).users) {
      const teamUsers = (team as any).users || [];
      if (Array.isArray(teamUsers) && teamUsers.length > 0) {
        const teamLeaderFromRelation = teamUsers.find((u: any) => {
          const uRole = String(u.role || '').trim().toLowerCase();
          return uRole === 'ketua_tim' || uRole === 'ketua tim';
        });
        if (teamLeaderFromRelation && teamLeaderFromRelation.nama_user) {
          nama_ketua = teamLeaderFromRelation.nama_user;
        }
      }
    }

    return {
      ...team,
      totalIndikators: teamIndikators.length,
      totalIKUs: teamIKUs.length,
      totalProksis: teamProksis.length,
      totalTargets: teamTargets.length,
      totalRealisasis: teamRealisasis.length,
      achievement: achievement,
      nama_ketua: nama_ketua,
      hasData: teamIndikators.length > 0 || teamIKUs.length > 0 || teamProksis.length > 0 || teamTargets.length > 0 || teamRealisasis.length > 0
    };
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-emerald-50/60 p-6">
        <div className="flex items-start">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-indigo-600 drop-shadow-sm">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2 text-lg">Dashboard administrator untuk monitoring sistem secara keseluruhan</p>
            <div className="mt-3 h-1 w-36 rounded-full bg-gradient-to-r from-indigo-200 via-indigo-100 to-transparent" />
          </div>
          <div className="ml-4">
            <Button
              variant="outline"
              onClick={loadData}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Performance Overview Content */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between w-full">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-semibold">Performance Semua Tim</h3>
                <p className="text-sm text-muted-foreground mt-1">Monitoring komprehensif semua tim, Indikator Kinerja (IKU & Proksi), dan pencapaian dalam satu tampilan</p>
                <div className="mt-3 h-1 w-40 rounded-full bg-gradient-to-r from-indigo-200 via-indigo-100 to-transparent" />
              </div>
            </div>
            <div className="hidden md:flex items-center">
              <Badge variant="outline" className="text-sm px-3 py-1">{teamsWithPerformance.length} Tim Aktif</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* System Statistics - Horizontal Scrolling Like Staff */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-min">
              {/* Total Tim */}
              <div className="min-w-[220px] p-5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:border-blue-400 transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Total Tim</h3>
                  <div className="p-2 bg-blue-200 rounded-lg">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-blue-600 mb-1">{totalTeams}</p>
                <p className="text-xs text-gray-600">Tim aktif dalam sistem</p>
              </div>

              {/* Ketua Tim */}
              <div className="min-w-[220px] p-5 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 hover:border-green-400 transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Ketua Tim</h3>
                  <div className="p-2 bg-green-200 rounded-lg">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-600 mb-1">{totalUsers}</p>
                <p className="text-xs text-gray-600">Pengguna ketua tim terdaftar</p>
              </div>

              {/* Total Indikator */}
              <div className="min-w-[220px] p-5 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 hover:border-purple-400 transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Total Indikator</h3>
                  <div className="p-2 bg-purple-200 rounded-lg">
                    <Target className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-purple-600 mb-1">{totalIndikators}</p>
                <p className="text-xs text-gray-600">Indikator kinerja terdaftar</p>
              </div>

              {/* IKU */}
              <div className="min-w-[220px] p-5 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">IKU</h3>
                  <div className="p-2 bg-indigo-200 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-indigo-600 mb-1">{totalIKUs}</p>
                <p className="text-xs text-gray-600">Indikator Kinerja Utama</p>
              </div>

              {/* Proksi */}
              <div className="min-w-[220px] p-5 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 hover:border-orange-400 transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Proksi</h3>
                  <div className="p-2 bg-orange-200 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-orange-600 mb-1">{totalProksis}</p>
                <p className="text-xs text-gray-600">Indikator pengganti terdaftar</p>
              </div>
            </div>
          </div>

          {/* Team Performance Overview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Performance Tim</h3>
              <Badge variant="outline">{teamsWithPerformance.length} Tim Aktif</Badge>
            </div>
            
            {teamsWithPerformance.map((team) => (
              <Card key={team.id_tim} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{team.nama_tim}</CardTitle>
                      {team.nama_ketua && (
                        <p className="text-sm text-muted-foreground mt-1">Ketua Tim (PIC): {team.nama_ketua}</p>
                      )}
                    </div>
                    <Badge 
                      variant={team.achievement >= 80 ? "default" : team.achievement >= 60 ? "secondary" : "destructive"}
                      className="text-sm px-3 py-1"
                    >
                      {team.achievement.toFixed(1)}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Team Metrics */}
                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-blue-600">{team.totalIndikators}</div>
                      <p className="text-xs text-muted-foreground">Indikator</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-indigo-600">{team.totalIKUs}</div>
                      <p className="text-xs text-muted-foreground">IKU</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-purple-600">{team.totalProksis}</div>
                      <p className="text-xs text-muted-foreground">Proksi</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-primary">{team.totalTargets}</div>
                      <p className="text-xs text-muted-foreground">Target</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-orange-600">{team.achievement.toFixed(1)}%</div>
                      <p className="text-xs text-muted-foreground">Achievement</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress:</span>
                      <span>{team.achievement.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      {(() => {
                        const pct = Math.min(Math.max(team.achievement || 0, 0), 100);
                        const { light, main } = getProgressColors(pct);
                        return (
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${light} 0%, ${main} 100%)`
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
