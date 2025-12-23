import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { RefreshCw, Target, Users, Edit, Trash2, Zap, TrendingUp, CheckCircle } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useIKUs } from '../hooks/useIKUs';
import { useTeams } from '../hooks/useTeams';
import { apiService } from '../services/api';
import { Target as TargetType } from '../types/models';
import { toast } from 'sonner';
import { TableSkeleton } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { TableEmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';

export function StaffTargetList() {
  const { user } = useAuth();
  const { ikus, isLoading: ikusLoading, refetch: refetchIKUs } = useIKUs();
  const { teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams();
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  
  const [selectedYear, setSelectedYear] = useState<string>('all');
  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTeam]);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  // Staff can see all IKUs from all teams
  const teamIKUs = ikus; // Show all IKUs, not just from staff's team

  // Get team name
  const team = user?.id_tim ? teams.find(t => t.id_tim === user.id_tim) : null;



  const loadTargets = async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingTargets) {
      return;
    }
    
    setIsLoadingTargets(true);
    try {
      setLoading(true);
      
      // Try to load from API first - try general endpoint first, fallback to staff endpoint
      try {
        let response;
        try {
          // Try general endpoint first (staff might have access to see all data)
          response = await apiService.getTargets();
        } catch (generalError) {
          // If general endpoint fails (403), fallback to staff endpoint
          response = await apiService.getStaffTargets();
        }
        
        const allTargets = Array.isArray(response) ? response : (response as any)?.data || [];
        
        // Staff can see all targets from all teams
        setTargets(allTargets);
        
        return; // Success, exit early
      } catch (apiError) {
        // API failed, will use demo data
      }
      
      // Fallback demo data - create more comprehensive demo data
      // Sesuai skema baru: target_iku dan keterangan sudah dihapus dari tabel target
      const demoTargets: TargetType[] = [];
      
      // Create demo targets based on existing IKUs
      const ikusToUse = ikus.length > 0 ? ikus.slice(0, 4) : []; // Use first 4 IKUs
      
      // Create demo targets for each IKU
      // Catatan: target_iku dan satuan_target masih ada di type definition tapi sudah tidak digunakan di backend
      ikusToUse.forEach((iku, index) => {
        demoTargets.push({
          id_target: index * 2 + 1,
          id_iku: iku.id_iku,
          periode: 'TW 1',
          target_iku: 0, // Field ini sudah tidak digunakan di backend (dihapus)
          satuan_target: 0, // Field ini sudah tidak digunakan di backend (dihapus)
          satuan: 80 + (index * 2), // Target proxy
          persenan_target: 100, // Persenan target
          tahun: 2025,
          status: 'pending',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          created_by: user?.id_user || 1
        });
        
        demoTargets.push({
          id_target: index * 2 + 2,
          id_iku: iku.id_iku,
          periode: 'TW 2',
          target_iku: 0, // Field ini sudah tidak digunakan di backend (dihapus)
          satuan_target: 0, // Field ini sudah tidak digunakan di backend (dihapus)
          satuan: 85 + (index * 2), // Target proxy
          persenan_target: 100, // Persenan target
          tahun: 2025,
          status: 'approved',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          created_by: user?.id_user || 1
        });
      });
      
      setTargets(demoTargets);
      
    } catch (error) {
      setTargets([]);
    } finally {
      setLoading(false);
      setIsLoadingTargets(false);
    }
  };

  useEffect(() => {
    if (!ikusLoading && !teamsLoading && !hasLoaded) {
      loadTargets();
      setHasLoaded(true);
    }
  }, [ikusLoading, teamsLoading, hasLoaded]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchIKUs(), refetchTeams(), loadTargets()]);
      toast.success('Data target berhasil diperbarui');
    } catch (error) {
      toast.error('Gagal memperbarui data target');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter targets based on selected team and user role
  const filteredTargets = targets.filter(target => {
    const targetIKU = ikus.find(iku => iku.id_iku === target.id_iku);

    // Team-based visibility
    if (user?.role === 'staff') {
      if (selectedTeam !== 'all' && targetIKU?.id_tim !== parseInt(selectedTeam)) return false;
    } else if (user?.role === 'ketua_tim') {
      if (!targetIKU || targetIKU.id_tim !== user.id_tim) return false;
    } else {
      if (selectedTeam !== 'all' && targetIKU?.id_tim !== parseInt(selectedTeam)) return false;
    }

    // Year filter
    if (selectedYear !== 'all' && target.tahun !== parseInt(selectedYear)) return false;

    // no indicator-type filter (removed)

    return true;
  });

  // Get targets for display with IKU and period details (sama seperti TargetSetting.tsx)
  const targetsWithDetails = filteredTargets
    .map(target => {
      const iku = ikus.find(i => i.id_iku === target.id_iku);
      return {
        ...target,
        iku_name: iku?.nama_iku || 'Unknown',
        iku_type: iku?.jenis || 'iku',
        team_name: iku?.tim?.nama_tim || teams.find(t => t.id_tim === iku?.id_tim)?.nama_tim || 'Unknown',
        period_name: target.periode || 'Unknown',
        tahun: target.tahun || 0,
        triwulan: target.periode || ''
      };
    })
    .sort((a, b) => b.tahun - a.tahun);

  // Group targets by IKU
  // Pagination for targets
  const totalTargets = targetsWithDetails.length;
  const totalPages = Math.ceil(totalTargets / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  
  // Group targets for pagination
  const groupedTargets = Object.values(
    targetsWithDetails.reduce((acc: any, t) => {
      if (!acc[t.id_iku]) acc[t.id_iku] = { iku: t, list: [] as any[] };
      acc[t.id_iku].list.push(t);
      return acc;
    }, {})
  );
  const paginatedGroups = groupedTargets.slice(startIndex, endIndex);

  // Initialize default selected period per IKU when data changes
  useEffect(() => {
    // No per-IKU selected period initialization needed when rendering TW columns.
  }, [targetsWithDetails.length]);


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'approved':
        return <Badge variant="default">Disetujui</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getIKUName = (idIku: number) => {
    // Try to find in team IKUs first
    let iku = teamIKUs.find(i => i.id_iku === idIku);
    
    // If not found in team IKUs, try all IKUs
    if (!iku) {
      iku = ikus.find(i => i.id_iku === idIku);
    }
    
    return iku?.nama_iku || `IKU ID: ${idIku}`;
  };

  if (loading || ikusLoading || teamsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Memuat data target...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section with Gradient Background */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 p-8 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Target className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold">Daftar Target</h1>
            </div>
            <p className="text-orange-100 text-sm">
              {selectedTeam === 'all' 
                ? '🎯 Target dari semua tim' 
                : `🎯 Target dari tim ${teams.find(t => t.id_tim.toString() === selectedTeam)?.nama_tim || 'tidak diketahui'}`
              }
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-white text-orange-600 hover:bg-orange-50 font-medium shadow-lg transition-all duration-200 hover:scale-105"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Target</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{targetsWithDetails.length}</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-lg">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Target Rata-rata</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {targetsWithDetails.length > 0 
                    ? (targetsWithDetails.reduce((sum, t) => sum + (t.satuan || 0), 0) / targetsWithDetails.length).toFixed(0)
                    : 0}
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Tim</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {selectedTeam === 'all' 
                    ? new Set(targetsWithDetails.map(t => t.team_name)).size 
                    : 1}
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Card */}
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-red-50">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-lg font-semibold">Filter Target</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 flex-1">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Pilih Tim:</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-full md:w-80 border-2 border-orange-200 hover:border-orange-400 focus:border-orange-500 transition-colors rounded-lg">
                  <SelectValue placeholder="Pilih tim" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full" />
                      Semua Tim
                    </div>
                  </SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id_tim} value={team.id_tim.toString()}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        {team.nama_tim}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Pilih Tahun:</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-44 border-2 border-orange-200 hover:border-orange-400 focus:border-orange-500 transition-colors rounded-lg">
                  <SelectValue placeholder="Semua Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {Array.from(new Set(targets.map(t => t.tahun).filter(Boolean))).sort((a,b)=>b-a).map((y:any)=> (
                    <SelectItem key={y} value={y?.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Indicator filter removed as requested */}
            {selectedTeam !== 'all' && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 text-sm">
                Filtered
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Target Card */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-lg font-semibold">
                {selectedTeam === 'all' ? 'Target Semua Tim' : 'Target Tim'}
              </span>
              {targetsWithDetails.length > 0 && (
                <Badge className="ml-2 bg-orange-500 text-white border-0 shadow-sm">
                  {targetsWithDetails.length} Target
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {targetsWithDetails.length === 0 ? (
            <div className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-orange-100 rounded-full">
                  <Target className="h-8 w-8 text-orange-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Target</h3>
              <p className="text-gray-600">
                {selectedTeam === 'all' 
                  ? '🎯 Belum ada target yang ditetapkan. Coba pilih tim tertentu atau hubungi ketua tim untuk menambahkan target.'
                  : '🎯 Belum ada target untuk tim yang dipilih. Coba pilih tim lain atau hubungi ketua tim.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 border-b-2">
                  <TableRow className="hover:bg-gray-50">
                        <TableHead className="font-bold text-gray-700 text-center w-16">No</TableHead>
                        <TableHead className="font-bold text-gray-700">Indikator Kinerja</TableHead>
                        <TableHead className="font-bold text-gray-700">Tim</TableHead>
                        <TableHead className="font-bold text-gray-700 text-center">TW I</TableHead>
                        <TableHead className="font-bold text-gray-700 text-center">TW II</TableHead>
                        <TableHead className="font-bold text-gray-700 text-center">TW III</TableHead>
                        <TableHead className="font-bold text-gray-700 text-center">TW IV</TableHead>
                        <TableHead className="font-bold text-gray-700">Tahun</TableHead>
                    
                      </TableRow>
                </TableHeader>
                <TableBody>
                      {paginatedGroups.map((group: any, idx: number) => {
                        const ikuId = group.iku.id_iku as number;
                        const rowNumber = startIndex + idx + 1;
                        const findByPeriod = (pname: string) => group.list.find((r: any) => (r.periode || '').toLowerCase() === pname.toLowerCase());
                        const tw1 = findByPeriod('TW 1') || findByPeriod('TW1');
                        const tw2 = findByPeriod('TW 2') || findByPeriod('TW2');
                        const tw3 = findByPeriod('TW 3') || findByPeriod('TW3');
                        const tw4 = findByPeriod('TW 4') || findByPeriod('TW4');
                        const latest = group.list.sort((a:any,b:any)=> (b.tahun||0)-(a.tahun||0))[0] || {};
                        return (
                          <TableRow key={ikuId} className="hover:bg-orange-50 transition-colors">
                            <TableCell className="text-center font-semibold text-gray-700">{rowNumber}</TableCell>
                            <TableCell className="font-semibold text-gray-800">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-6 bg-orange-400 rounded" />
                                {group.iku.iku_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full" />
                                <span className="font-medium text-gray-700">{group.iku.team_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-block">{tw1 ? <Badge className="bg-orange-100 text-orange-700">{tw1.satuan ?? 'N/A'}</Badge> : '-'}</div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-block">{tw2 ? <Badge className="bg-orange-100 text-orange-700">{tw2.satuan ?? 'N/A'}</Badge> : '-'}</div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-block">{tw3 ? <Badge className="bg-orange-100 text-orange-700">{tw3.satuan ?? 'N/A'}</Badge> : '-'}</div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-block">{tw4 ? <Badge className="bg-orange-100 text-orange-700">{tw4.satuan ?? 'N/A'}</Badge> : '-'}</div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200">{latest?.tahun ?? 'N/A'}</Badge>
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
            <Pagination
              currentPage={currentPage}
              lastPage={totalPages}
              total={totalTargets}
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
    </div>
  );
}
