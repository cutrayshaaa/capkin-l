import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
// replaced avatar with numbered badges per UI request
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Users, 
  Filter,
    AlertTriangle,
 
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useTeams } from '../hooks/useTeams';
import { useIKUs } from '../hooks/useIKUs';
import { useUsers } from '../hooks/useUsers';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import { ReportExport } from '../components/ReportExport';
import { ErrorState } from '../components/ErrorState';
import { Pagination } from '../components/Pagination';

// Helper utilities used only in this file
function parseNumeric(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizePeriod(p: any): string {
  if (!p && p !== 0) return '';
  const s = String(p).trim();
  const m = s.match(/TW\s*-?\s*([1-4])/i) || s.match(/T\s*W\s*([1-4])/i) || s.match(/Q([1-4])/i) || s.match(/TRIWULAN\s*([1-4])/i);
  if (m && m[1]) return `TW ${m[1]}`;
  // fallback: if contains 1/2/3/4 as standalone
  const digit = s.match(/(^|\D)([1-4])(\D|$)/);
  if (digit && digit[2]) return `TW ${digit[2]}`;
  return s;
}

function getAnnualTargetForIKU(ikuData: any): number {
  if (!ikuData) return 0;
  // Common field names that might contain annual target
  return parseNumeric(ikuData.target_tahunan ?? ikuData.target_tahun ?? ikuData.target ?? ikuData.satuan ?? ikuData.persenan_target ?? 0);
}

function getAnnualTargetForProksi(proksiData: any): number {
  if (!proksiData) return 0;
  return parseNumeric(proksiData.target_tahunan ?? proksiData.target_tahun ?? proksiData.target ?? proksiData.satuan ?? 0);
}

function determineStatus(achievement: number) {
  if (achievement >= 100) return { label: 'Sangat Baik', variant: 'success' };
  if (achievement >= 80) return { label: 'Baik', variant: 'default' };
  if (achievement >= 50) return { label: 'Perlu Perbaikan', variant: 'warning' };
  return { label: 'Kurang', variant: 'destructive' };
}
 

export function AdminReporting() {
  const { user } = useAuth();
  const { teams, isLoading: teamsLoading, isError: teamsError, error: teamsErrorMessage, retry: retryTeams } = useTeams();
  const { ikus, isLoading: ikusLoading, isError: ikusError, error: ikusErrorMessage, retry: retryIKUs } = useIKUs();
  const { users, isLoading: usersLoading, isError: usersError, error: usersErrorMessage, retry: retryUsers } = useUsers();
  
  const [indikatorKinerjas, setIndikatorKinerjas] = useState<any[]>([]);
  const [proksis, setProksis] = useState<any[]>([]);
  const [isLoadingIndikator, setIsLoadingIndikator] = useState(false);
  
  // State management
  const [filters, setFilters] = useState<Filters>({
    team: 'all',
    year: new Date().getFullYear(),
    quarter: 'all'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  // Drag-and-drop ordering state for report rows
  const [order, setOrder] = useState<number[]>([]);
  const orderRef = useRef<number[]>([]);
  const dragRef = useRef<number | null>(null);
  const [dragItemId, setDragItemId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  
  // Pagination state - must be declared before useMemo
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  
  // Pagination state for Issues & Actions section
  const [issuesCurrentPage, setIssuesCurrentPage] = useState(1);
  const [issuesPerPage, setIssuesPerPage] = useState(10);
  
  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
    setIssuesCurrentPage(1);
  }, [filters.team, filters.year, filters.quarter]);

  const orderedReportData = useMemo(() => {
    if (!order || order.length === 0) return reportData;
    return order.map(id => reportData.find(r => r.id_indikator_kinerja === id)).filter(Boolean) as ReportData[];
  }, [order, reportData]);
  
  // Pagination for report data
  const totalItems = orderedReportData.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedReportData = orderedReportData.slice(startIndex, endIndex);
  
  const [expandedByIku, setExpandedByIku] = useState<Record<number, boolean>>({});
  const [expandedIssuesMap, setExpandedIssuesMap] = useState<Record<string, boolean>>({});
  const [resolvedIssues, setResolvedIssues] = useState<Record<string, boolean>>({});
  const [selectedIssue, setSelectedIssue] = useState<{ id: number; periode: string } | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  const [localCommentsMap, setLocalCommentsMap] = useState<Record<string, string[]>>({});
  const [stats, setStats] = useState<Stats>({
    totalIKUs: 0,
    totalProksis: 0,
    totalTargets: 0,
    totalRealisations: 0,
    avgAchievement: 0,
    completionRate: 0
  });

  // Memoized issues list for pagination
  const allIssues = useMemo(() => {
    return reportData.flatMap(item => item.performance
      .filter(p => (p.kendala && p.kendala !== '-') || (p.solusi && p.solusi !== '-'))
      .map(perf => ({ item, perf }))
    );
  }, [reportData]);

  // Pagination for issues
  const issuesTotalItems = allIssues.length;
  const issuesTotalPages = Math.ceil(issuesTotalItems / issuesPerPage);
  const issuesStartIndex = (issuesCurrentPage - 1) * issuesPerPage;
  const issuesEndIndex = issuesStartIndex + issuesPerPage;
  const paginatedIssues = allIssues.slice(issuesStartIndex, issuesEndIndex);

  // Memoized year options
  const yearOptions = useMemo(() => 
    Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 5 + i),
    []
  );

 

  // Load IndikatorKinerja and Proksi data
  useEffect(() => {
    const loadIndikatorData = async () => {
      try {
        setIsLoadingIndikator(true);
        const [indikatorRes, proksiRes] = await Promise.all([
          apiService.getIndikatorKinerjas('tim,iku,proksi', 200, 1),
          apiService.getProksis('indikatorKinerja', 200, 1),
        ]);
        
        const indikatorData = Array.isArray(indikatorRes) ? indikatorRes : (indikatorRes as any)?.data || [];
        const proksiData = Array.isArray(proksiRes) ? proksiRes : (proksiRes as any)?.data || [];
        
        setIndikatorKinerjas(indikatorData);
        setProksis(proksiData);
      } catch (error) {
        // console.error('Error loading indikator data:', error);
      } finally {
        setIsLoadingIndikator(false);
      }
    };
    
    loadIndikatorData();
  }, []);

  const loadReportData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      
      // Parallel API calls for better performance
      const [periods, targets, realisasis] = await Promise.all([
        apiService.getPeriodsByYear(filters.year),
        apiService.getTargets(),
        apiService.getRealisasis()
      ]);
      
      // Process data to create report - group by IndikatorKinerja
      const processedData: ReportData[] = [];
      
      // Process all IndikatorKinerja (both IKU and Proksi)
      for (const indikator of indikatorKinerjas) {
        // Filter by team if specified
        if (filters.team !== 'all' && indikator.id_tim !== parseInt(filters.team)) {
          continue;
        }
        
        const team = teams.find(t => t.id_tim === indikator.id_tim);
        const jenisIndikator = indikator.jenis; // 'iku' or 'proksi'
        
        // Get IKU or Proksi data
        const ikuData = jenisIndikator === 'iku' ? (indikator.iku || ikus.find(i => i.id_indikator_kinerja === indikator.id_indikator_kinerja)) : null;
        const proksiData = jenisIndikator === 'proksi' ? (indikator.proksi || proksis.find(p => p.id_indikator_kinerja === indikator.id_indikator_kinerja)) : null;
        
        // Get targets and realisasis based on jenis
        const indicatorTargets = targets.filter((t: any) => {
          if (jenisIndikator === 'iku' && t.id_iku !== ikuData?.id_iku) return false;
          if (jenisIndikator === 'proksi' && t.id_proksi !== proksiData?.id_proksi) return false;
          if (filters.quarter === 'all') return true;
          return normalizePeriod(t.periode) === normalizePeriod(filters.quarter);
        });
        
        const indicatorRealisasis = realisasis.filter((r: any) => {
          if (jenisIndikator === 'iku' && r.id_iku !== ikuData?.id_iku) return false;
          if (jenisIndikator === 'proksi' && r.id_proksi !== proksiData?.id_proksi) return false;
          if (filters.quarter === 'all') return true;
          const rPeriod = normalizePeriod(r.periode || (() => {
            if (r.id_target) {
              const tById = targets.find((x: any) => x.id_target === r.id_target);
              if (tById?.periode) return normalizePeriod(tById.periode);
            }
            return '';
          })());
          return rPeriod === normalizePeriod(filters.quarter);
        });
        
        const annualTarget = jenisIndikator === 'iku'
          ? getAnnualTargetForIKU(ikuData)
          : getAnnualTargetForProksi(proksiData);
        
        const jenisNilai = jenisIndikator === 'proksi'
          ? 'Persen (%)'
          : (ikuData?.tipe === 'persen' ? 'Persen (%)' : 'Poin (Non %)');
        
        const jenisPeriode: 'triwulanan' | 'tahunan' = 'triwulanan';
        
        const alokasiTarget = {
          'TW 1': 0,
          'TW 2': 0,
          'TW 3': 0,
          'TW 4': 0,
        };
        let maxQuarterTarget = 0;
        
        indicatorTargets.forEach((t: any) => {
          const period = normalizePeriod(t.periode);
          const value = parseNumeric(t.satuan ?? t.persenan_target ?? t.target);
          if (period === 'TW 1' || period === 'TW 2' || period === 'TW 3' || period === 'TW 4') {
            alokasiTarget[period as keyof typeof alokasiTarget] = value;
            if (value > maxQuarterTarget) {
              maxQuarterTarget = value;
            }
          }
        });
        
        const totalTarget = annualTarget || maxQuarterTarget;
        
        const realisasi = {
          'TW 1': 0,
          'TW 2': 0,
          'TW 3': 0,
          'TW 4': 0,
        };
        
        const quarterOrder = ['TW 1', 'TW 2', 'TW 3', 'TW 4'];
        const sortedRealisasis = [...indicatorRealisasis].sort((a: any, b: any) => {
          const aPeriod = normalizePeriod(a.periode);
          const bPeriod = normalizePeriod(b.periode);
          return quarterOrder.indexOf(aPeriod) - quarterOrder.indexOf(bPeriod);
        });
        
        sortedRealisasis.forEach((r: any) => {
          const period = normalizePeriod(r.periode);
          if (period === 'TW 1' || period === 'TW 2' || period === 'TW 3' || period === 'TW 4') {
            const realValue = parseNumeric(r.realisasi);
            realisasi[period as keyof typeof realisasi] = realValue;
          }
        });
        
        let leaderName = 'Belum ditetapkan';
        if (users && Array.isArray(users) && users.length > 0) {
          const indikatorIdTim = Number(indikator.id_tim || 0);
          const teamLeader = users.find(u => {
            const uIdTim = Number(u.id_tim || 0);
            const uRole = String(u.role || '').trim().toLowerCase();
            return uIdTim === indikatorIdTim && uIdTim !== 0 && (uRole === 'ketua_tim' || uRole === 'ketua tim');
          });
          if (teamLeader?.nama_user) {
            leaderName = teamLeader.nama_user;
          }
        }
        
        const performance: PerformanceData[] = sortedRealisasis.map((r: any) => {
          const period = normalizePeriod(r.periode);
          const realValue = parseNumeric(r.realisasi);
          const periodTargetValue = alokasiTarget[period as keyof typeof alokasiTarget] || totalTarget;
          const capaian = periodTargetValue > 0 ? (realValue / periodTargetValue) * 100 : undefined;
          return {
            periode: period,
            kendala: r.kendala || '-',
            solusi: r.solusi || '-',
            batas_waktu: r.batas_waktu || '-',
            link_bdk: r.link_bdk || '-',
            realisasi_proxy: parseNumeric(r.realisasi_proxy),
            target_proxy: periodTargetValue,
            capaian_tw: capaian,
            realisasi_iku_tw: realValue,
            capaian_tahun: totalTarget > 0 ? (realValue / totalTarget) * 100 : undefined,
          };
        });
        
        const latestRealisasiValue = realisasi['TW 4'] || realisasi['TW 3'] || realisasi['TW 2'] || realisasi['TW 1'] || 0;
        const achievement = totalTarget > 0 ? (latestRealisasiValue / totalTarget) * 100 : 0;
        const statusInfo = determineStatus(achievement);
        
        processedData.push({
          id_indikator_kinerja: indikator.id_indikator_kinerja,
          nama_indikator: indikator.nama_indikator,
          jenis_indikator: jenisIndikator,
          jenis_periode: jenisPeriode,
          jenis_nilai: jenisNilai,
          target: totalTarget,
          tim: team?.nama_tim || 'Unknown Team',
          ketua_tim: leaderName,
          alokasi_target: alokasiTarget,
          realisasi: realisasi,
          capaian: achievement,
          status: statusInfo.label,
          statusVariant: statusInfo.variant,
          performance
        });
      }
      
      setReportData(processedData);
      // initialize ordering for drag-and-drop (client-side only)
      const initialOrder = processedData.map(p => p.id_indikator_kinerja);
      orderRef.current = initialOrder.slice();
      setOrder(initialOrder.slice());
      
      const totalIKUs = processedData.length;
      const totalProksis = processedData.filter(it => it.jenis_indikator === 'proksi').length;
      const totalTargets = processedData.reduce((sum, item) => sum + item.target, 0);
      const getFinalRealisasi = (item: ReportData): number => {
        return item.realisasi['TW 4'] || item.realisasi['TW 3'] || item.realisasi['TW 2'] || item.realisasi['TW 1'] || 0;
      };
      const totalRealisations = processedData.reduce((sum, item) => sum + getFinalRealisasi(item), 0);
      const avgAchievement = totalIKUs > 0 ? processedData.reduce((sum, item) => {
        const finalReal = getFinalRealisasi(item);
        const capaian = item.target > 0 ? (finalReal / item.target) * 100 : 0;
        return sum + capaian;
      }, 0) / totalIKUs : 0;
      const completionRate = totalIKUs > 0 ? (processedData.filter(item => getFinalRealisasi(item) > 0).length / totalIKUs) * 100 : 0;
      
      setStats({
        totalIKUs,
        totalProksis,
        totalTargets: Math.round(totalTargets * 100) / 100,
        totalRealisations: Math.round(totalRealisations * 100) / 100,
        avgAchievement: Math.round(avgAchievement * 10) / 10,
        completionRate: Math.round(completionRate * 10) / 10
      });
      
    } catch (error: any) {
      setIsError(true);
      setError(error?.message || 'Gagal memuat data laporan');
      toast.error('Gagal memuat data laporan');
    } finally {
      setIsLoading(false);
    }
  }, [filters, teams, ikus, users, indikatorKinerjas, proksis]);

  // Load data - pastikan semua data ter-load termasuk users
  useEffect(() => {
    // Tunggu sampai semua data ter-load, tapi tidak perlu menunggu users.length > 0 karena mungkin belum ada users
    if (!teamsLoading && !ikusLoading && !usersLoading && !isLoadingIndikator) {
      loadReportData();
    }
  }, [loadReportData, teamsLoading, ikusLoading, usersLoading, isLoadingIndikator]);

  const retry = () => {
    if (teamsError) retryTeams();
    if (ikusError) retryIKUs();
    if (usersError) retryUsers();
    if (isError) loadReportData();
  };

  // Show error state if there's an error in hooks or data loading
  if (teamsError || ikusError || usersError || isError) {
    return (
      <ErrorState 
        message={teamsErrorMessage || ikusErrorMessage || usersErrorMessage || error || 'Gagal memuat data laporan'}
        onRetry={retry}
        type="generic"
      />
    );
  }

  // Show loading state if data is still loading
  if (teamsLoading || ikusLoading || usersLoading || isLoading) {
    return (
      <div className="space-y-6">
        {/* Filter Section Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <Skeleton className="h-4 w-24" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold"><Skeleton className="h-8 w-20" /></div>
                <p className="text-xs text-muted-foreground">
                  <Skeleton className="h-3 w-32 mt-2" />
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Report Table Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {Array.from({ length: 7 }).map((_, ci) => (
                      <th key={ci} className="p-2 text-left"><Skeleton className="h-4 w-24" /></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, ri) => (
                    <tr key={ri} className="odd:bg-white even:bg-gray-50">
                      {Array.from({ length: 7 }).map((__, c2) => (
                        <td key={c2} className="p-2"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-indigo-50 text-indigo-700">
                <Filter className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">Filter Laporan</div>
                <div className="text-sm text-muted-foreground mt-1">Sesuaikan filter untuk menampilkan laporan yang relevan</div>
                <div className="mt-2 h-1 w-36 rounded-full bg-gradient-to-r from-indigo-200 via-indigo-100 to-transparent" />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Tim</Label>
              <Select value={filters.team} onValueChange={(value) => setFilters({...filters, team: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tim</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id_tim} value={team.id_tim.toString()}>
                      {team.nama_tim}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Tahun</Label>
              <Select value={filters.year.toString()} onValueChange={(value) => setFilters({...filters, year: parseInt(value)})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Triwulan</Label>
              <Select value={filters.quarter} onValueChange={(value) => setFilters({...filters, quarter: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Triwulan</SelectItem>
                  <SelectItem value="TW 1">TW 1</SelectItem>
                  <SelectItem value="TW 2">TW 2</SelectItem>
                  <SelectItem value="TW 3">TW 3</SelectItem>
                  <SelectItem value="TW 4">TW 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <ReportExport 
                periode={filters.year.toString()}
                tahun={filters.year}
                title="Laporan Kinerja IKU"
                reportData={reportData}
                stats={stats}
                filters={filters}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 py-2">
        <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 transition-all duration-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Total IKU</h3>
            <div className="p-2 bg-indigo-200 rounded-lg">
              <Target className="h-4 w-4 text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-indigo-600 mb-1">{stats.totalIKUs}</p>
          <p className="text-xs text-gray-600">IKU dalam filter</p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:border-blue-400 transition-all duration-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Total Proksi</h3>
            <div className="p-2 bg-blue-200 rounded-lg">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-600 mb-1">{stats.totalProksis}</p>
          <p className="text-xs text-gray-600">Proksi dalam filter</p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 hover:border-green-400 transition-all duration-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Total Target</h3>
            <div className="p-2 bg-green-200 rounded-lg">
              <BarChart3 className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600 mb-1">{Math.round(stats.totalTargets).toLocaleString('id-ID')}</p>
          <p className="text-xs text-gray-600">Target ditetapkan</p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 hover:border-orange-400 transition-all duration-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Total Realisasi</h3>
            <div className="p-2 bg-orange-200 rounded-lg">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-orange-600 mb-1">{Math.round(stats.totalRealisations).toLocaleString('id-ID')}</p>
          <p className="text-xs text-gray-600">Data realisasi</p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 hover:border-purple-400 transition-all duration-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Pencapaian</h3>
            <div className="p-2 bg-purple-200 rounded-lg">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-600 mb-1">{stats.avgAchievement}%</p>
          <p className="text-xs text-gray-600">Rata-rata pencapaian</p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-200 hover:border-cyan-400 transition-all duration-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Kelengkapan</h3>
            <div className="p-2 bg-cyan-200 rounded-lg">
              <Users className="h-4 w-4 text-cyan-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-cyan-600 mb-1">{stats.completionRate}%</p>
          <p className="text-xs text-gray-600">Data lengkap</p>
        </div>
      </div>

      {/* Detail Report Table */}
      <Card>
        <CardHeader>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-300 text-white shadow">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-extrabold tracking-tight">Detail Laporan Indikator Kinerja</CardTitle>
                <div className="mt-1 text-sm text-muted-foreground">Ringkasan kinerja per indikator dan realisasi triwulanan</div>
              </div>
            </div>
          </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
              <Table className="min-w-[1100px] text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[320px]">Indikator & PIC</TableHead>
                  <TableHead className="text-center">Target Per Tahun</TableHead>
                  <TableHead colSpan={4} className="text-center">Alokasi Target (Kumulatif)</TableHead>
                  <TableHead colSpan={4} className="text-center">Realisasi (Kumulatif)</TableHead>
                  <TableHead className="text-center">Capaian (%)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead />
                  <TableHead />
                  <TableHead className="text-center">TW I</TableHead>
                  <TableHead className="text-center">TW II</TableHead>
                  <TableHead className="text-center">TW III</TableHead>
                  <TableHead className="text-center">TW IV</TableHead>
                  <TableHead className="text-center">TW I</TableHead>
                  <TableHead className="text-center">TW II</TableHead>
                  <TableHead className="text-center">TW III</TableHead>
                  <TableHead className="text-center">TW IV</TableHead>
                  <TableHead className="text-center">&nbsp;</TableHead>
                  <TableHead className="text-center">&nbsp;</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReportData.map((item, idx) => (
                  <TableRow
                    key={item.id_indikator_kinerja}
                    className={`odd:bg-white even:bg-gray-50 hover:bg-gray-50 cursor-grab active:cursor-grabbing ${dragOverId === item.id_indikator_kinerja ? 'bg-blue-50' : ''}`}
                    draggable
                    onDragStart={() => {
                      (dragRef.current as any) = item.id_indikator_kinerja;
                      setDragItemId(item.id_indikator_kinerja);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverId(item.id_indikator_kinerja);
                    }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromId = dragRef.current as number | null;
                      const toId = item.id_indikator_kinerja;
                      if (fromId == null || fromId === toId) return;
                      const current = Array.from(orderRef.current);
                      const fromIndex = current.indexOf(fromId);
                      const toIndex = current.indexOf(toId);
                      if (fromIndex === -1 || toIndex === -1) return;
                      current.splice(fromIndex, 1);
                      current.splice(toIndex, 0, fromId);
                      orderRef.current = current;
                      setOrder(current.slice());
                      setDragItemId(null);
                      setDragOverId(null);
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold">{order.indexOf(item.id_indikator_kinerja) + 1}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{item.nama_indikator}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.tim}</div>
                          <div className="text-xs text-muted-foreground">PIC: {item.ketua_tim}</div>
                          <div className="mt-2 flex items-center gap-2">
                            {item.jenis_indikator === 'iku' ? (
                              <Badge variant="default" className="text-xs">IKU</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">PROKSI</Badge>
                            )}

                            {item.jenis_nilai === 'Poin' ? (
                              <span className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 font-semibold text-xs">Poin</span>
                            ) : (item.jenis_nilai && String(item.jenis_nilai).toLowerCase().includes('pers')) ? (
                              <span className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold text-xs">Persentase (%)</span>
                            ) : (
                              item.jenis_nilai && <Badge className="text-xs" variant="outline">{item.jenis_nilai}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center align-middle text-lg font-semibold">{item.target?.toLocaleString?.('id-ID') ?? item.target}</TableCell>
                    <TableCell className="text-center">{item.alokasi_target?.['TW 1'] ?? 0}</TableCell>
                    <TableCell className="text-center">{item.alokasi_target?.['TW 2'] ?? 0}</TableCell>
                    <TableCell className="text-center">{item.alokasi_target?.['TW 3'] ?? 0}</TableCell>
                    <TableCell className="text-center">{item.alokasi_target?.['TW 4'] ?? 0}</TableCell>
                    <TableCell className="text-center">{item.realisasi?.['TW 1'] ?? 0}</TableCell>
                    <TableCell className="text-center">{item.realisasi?.['TW 2'] ?? 0}</TableCell>
                    <TableCell className="text-center">{item.realisasi?.['TW 3'] ?? 0}</TableCell>
                    <TableCell className="text-center">{item.realisasi?.['TW 4'] ?? 0}</TableCell>
                    <TableCell className="text-center font-semibold">{typeof item.capaian === 'number' ? `${Math.round(item.capaian * 10) / 10}%` : (item.capaian ?? '-')}</TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const s = item.status || '';
                        if (!s) return <span className="text-muted-foreground">-</span>;
                        if (s.toLowerCase().includes('sangat') || s.toLowerCase().includes('baik')) {
                          return <span className="inline-block px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">{s}</span>;
                        }
                        if (s.toLowerCase().includes('perlu') || s.toLowerCase().includes('perbaikan')) {
                          return <span className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold">{s}</span>;
                        }
                        return <span className="inline-block px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{s}</span>;
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
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
          )}
        </CardContent>
      </Card>

      {/* Filter Active Indicator */}
      {(filters.team !== 'all' || filters.quarter !== 'all') && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Filter Aktif:</span>
              <div className="flex flex-wrap gap-2">
                {filters.team !== 'all' && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">Tim: {teams.find(t => t.id_tim === parseInt(filters.team))?.nama_tim}</Badge>
                )}
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Tahun: {filters.year}</Badge>
                {filters.quarter !== 'all' && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">Triwulan: {filters.quarter}</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issues & Actions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between w-full">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-yellow-50 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Issues & Actions</CardTitle>
                <div className="text-sm text-muted-foreground">Kendala, solusi, dan rencana tindak lanjut dari realisasi IKU</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {paginatedIssues.map(({ item, perf }) => {
              const key = `${item.id_indikator_kinerja}::${perf.periode}`;
              const isResolved = !!resolvedIssues[key];
              const isExpanded = !!expandedIssuesMap[key];
              const localComments = localCommentsMap[key] || [];

              return (
                <div key={key} className={`rounded-lg border ${isResolved ? 'bg-green-50 border-green-200' : 'bg-white shadow-sm border-gray-100'}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 font-semibold text-[12px] leading-tight max-w-[160px] whitespace-normal">{item.tim}</div>
                        <div>
                          <div className="font-semibold">{item.nama_indikator}</div>
                          <div className="text-xs text-muted-foreground mt-1">PIC: {item.ketua_tim} • {String(filters?.year || new Date().getFullYear())} • {perf.periode}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.jenis_indikator === 'iku' ? (
                          <Badge className="text-xs" variant="default">IKU</Badge>
                        ) : (
                          <Badge className="text-xs" variant="secondary">PROKSI</Badge>
                        )}

                        {item.jenis_nilai === 'Poin' ? (
                          <span className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 font-semibold text-xs">Poin</span>
                        ) : (item.jenis_nilai && (item.jenis_nilai.toLowerCase().includes('persen') || item.jenis_nilai.toLowerCase().includes('persentase'))) ? (
                          <span className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold text-xs">Persentase (%)</span>
                        ) : (
                          <Badge className="text-xs" variant="outline">{item.jenis_nilai}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {perf.batas_waktu && perf.batas_waktu !== '-' && (
                        <Badge className="text-xs" variant={new Date(perf.batas_waktu) < new Date() ? 'destructive' : new Date(perf.batas_waktu) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'secondary' : 'default'}>
                          {new Date(perf.batas_waktu) < new Date() ? 'Terlambat' : new Date(perf.batas_waktu) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'Mendekati Batas' : 'Sesuai Jadwal'}
                        </Badge>
                      )}

                      <Button size="sm" variant="ghost" onClick={() => setExpandedIssuesMap(prev => ({ ...prev, [key]: !prev[key] }))}>{isExpanded ? 'Tutup' : 'Detail'}</Button>

                      <Dialog open={commentDialogOpen && selectedIssue?.id === item.id_indikator_kinerja && selectedIssue?.periode === perf.periode} onOpenChange={(open) => setCommentDialogOpen(open)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedIssue({ id: item.id_indikator_kinerja, periode: perf.periode }); setCommentDialogOpen(true); }}>Komentar</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Tambah Komentar</DialogTitle>
                            <DialogDescription>Tambahkan catatan atau tindak lanjut untuk issue ini</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2">
                            <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Batal</Button>
                            </DialogClose>
                            <Button onClick={() => {
                              if (!selectedIssue) return;
                              const k = `${selectedIssue.id}::${selectedIssue.periode}`;
                              setLocalCommentsMap(prev => ({ ...prev, [k]: [...(prev[k] || []), commentText] }));
                              setCommentText('');
                              setCommentDialogOpen(false);
                              toast.success('Komentar ditambahkan');
                            }}>Kirim</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button size="sm" variant="secondary" onClick={() => { setResolvedIssues(prev => ({ ...prev, [key]: true })); toast.success('Issue ditandai selesai'); }}>{isResolved ? 'Selesai' : 'Tandai Selesai'}</Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 p-4 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="font-medium text-sm text-red-700">Kendala</div>
                            <div className="text-sm text-red-800">{perf.kendala}</div>
                          </div>
                          <div>
                            <div className="font-medium text-sm text-green-700">Solusi</div>
                            <div className="text-sm text-green-800">{perf.solusi}</div>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          {perf.link_bdk && perf.link_bdk !== '-' && (
                            <a href={perf.link_bdk} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-500">
                              <BarChart3 className="h-4 w-4" /> Buka Link BDK
                            </a>
                          )}

                          {perf.batas_waktu && perf.batas_waktu !== '-' && (
                            <div className="text-xs text-muted-foreground">Batas waktu: {new Date(perf.batas_waktu).toLocaleDateString('id-ID')}</div>
                          )}

                          {localComments.length > 0 && (
                            <div className="space-y-1">
                              <div className="font-medium">Komentar</div>
                              {localComments.map((c, i) => (
                                <div key={i} className="text-sm p-2 bg-gray-50 rounded">{c}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {allIssues.length === 0 && (
              <div className="text-center py-8 text-gray-500">Tidak ada issues & actions yang tercatat untuk periode yang dipilih.</div>
            )}
          </div>
          
          {/* Pagination for Issues & Actions */}
          {issuesTotalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={issuesCurrentPage}
                lastPage={issuesTotalPages}
                total={issuesTotalItems}
                perPage={issuesPerPage}
                onPageChange={setIssuesCurrentPage}
                onPerPageChange={(newPerPage) => {
                  setIssuesPerPage(newPerPage);
                  setIssuesCurrentPage(1);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
