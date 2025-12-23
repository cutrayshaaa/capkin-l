import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useAuth } from './AuthProvider';
import { useTeams } from '../hooks/useTeams';
import { useUsers } from '../hooks/useUsers';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { Target, RefreshCw, Users, TrendingUp, AlertCircle, CheckCircle2, Activity } from 'lucide-react';
import type { IKU, Team, Proksi, IndikatorKinerja } from '../types/models';
import { TableSkeleton } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { TableEmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';

export function StaffIKUList() {
  const { user } = useAuth();
  const { teams, isLoading: teamsLoading, isError: teamsError, error: teamsErrorMessage, retry: retryTeams, refetch: refetchTeams } = useTeams();
  const { users, isLoading: usersLoading, refetch: refetchUsers } = useUsers();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  
  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTeam]);
  const [indikatorKinerjas, setIndikatorKinerjas] = useState<IndikatorKinerja[]>([]);
  const [proksis, setProksis] = useState<Proksi[]>([]);
  const [ikus, setIkus] = useState<IKU[]>([]);
  const [isLoadingIndikator, setIsLoadingIndikator] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  // Load Indikator Kinerja and Proksi - try general endpoint first, fallback to staff endpoint
  useEffect(() => {
    const loadIndikatorData = async () => {
      try {
        setIsLoadingIndikator(true);
        
        // Try general endpoint first (staff might have access to see all data)
        let indikatorResponse, proksisResponse;
        try {
          [indikatorResponse, proksisResponse] = await Promise.all([
            apiService.getIndikatorKinerjas('tim,iku,proksi', 1000, 1),
            apiService.getProksis('indikatorKinerja,tim,targets,realisasis', 1000, 1)
          ]);
        } catch (generalError) {
          // If general endpoint fails (403), fallback to staff endpoint
          [indikatorResponse, proksisResponse] = await Promise.all([
            apiService.getStaffIndikatorKinerjas('tim,iku,proksi', 1000, 1),
            apiService.getStaffProksis('indikatorKinerja,tim,targets,realisasis', 1000, 1)
          ]);
        }
        
        const indikatorData = Array.isArray(indikatorResponse) ? indikatorResponse : (indikatorResponse as any)?.data || [];
        const proksisData = Array.isArray(proksisResponse) ? proksisResponse : (proksisResponse as any)?.data || [];
        
        // Staff can see all indikator kinerja from all teams
        setIndikatorKinerjas(indikatorData);
        setProksis(proksisData);
        
        // Extract IKUs from indikatorKinerjas (from all teams)
        const extractedIKUs: IKU[] = [];
        indikatorData.forEach((ind: any) => {
          if (ind.iku && Array.isArray(ind.iku)) {
            extractedIKUs.push(...ind.iku);
          } else if (ind.iku) {
            extractedIKUs.push(ind.iku);
          }
        });
        setIkus(extractedIKUs);
      } catch (error) {
        // console.warn('Failed to load Indikator Kinerja:', error);
      } finally {
        setIsLoadingIndikator(false);
      }
    };
    
    loadIndikatorData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchTeams(), refetchUsers()]);
      // Reload indikator data - try general endpoint first, fallback to staff endpoint
      let indikatorResponse, proksisResponse;
      try {
        [indikatorResponse, proksisResponse] = await Promise.all([
          apiService.getIndikatorKinerjas('tim,iku,proksi', 1000, 1),
          apiService.getProksis('indikatorKinerja,tim,targets,realisasis', 1000, 1)
        ]);
      } catch (generalError) {
        // If general endpoint fails (403), fallback to staff endpoint
        [indikatorResponse, proksisResponse] = await Promise.all([
          apiService.getStaffIndikatorKinerjas('tim,iku,proksi', 1000, 1),
          apiService.getStaffProksis('indikatorKinerja,tim,targets,realisasis', 1000, 1)
        ]);
      }
      const indikatorData = Array.isArray(indikatorResponse) ? indikatorResponse : (indikatorResponse as any)?.data || [];
      const proksisData = Array.isArray(proksisResponse) ? proksisResponse : (proksisResponse as any)?.data || [];
      setIndikatorKinerjas(indikatorData);
      setProksis(proksisData);
      
      // Extract IKUs from indikatorKinerjas (from all teams)
      const extractedIKUs: IKU[] = [];
      indikatorData.forEach((ind: any) => {
        if (ind.iku && Array.isArray(ind.iku)) {
          extractedIKUs.push(...ind.iku);
        } else if (ind.iku) {
          extractedIKUs.push(ind.iku);
        }
      });
      setIkus(extractedIKUs);
      toast.success('Data Indikator Kinerja berhasil diperbarui');
    } catch (error) {
      toast.error('Gagal memperbarui data Indikator Kinerja');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show error state if there's an error
  if (teamsError) {
    return (
      <ErrorState 
        message={teamsErrorMessage || 'Gagal memuat data Indikator Kinerja'}
        onRetry={() => {
          if (teamsError) retryTeams();
        }}
        type="generic"
      />
    );
  }

  // Show loading state if data is still loading
  if (teamsLoading || isLoadingIndikator) {
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
            <TableSkeleton rows={8} columns={4} />
          </CardContent>
        </Card>
      </div>
    );
  }


  // Get all Indikator Kinerja (IKU + Proksi) combined
  const getAllIndikatorKinerjas = () => {
    const results: Array<{
      id: number;
      id_indikator_kinerja: number;
      nama: string;
      jenis: 'iku' | 'proksi';
      id_tim?: number;
      tim?: Team;
      targets?: any[];
      realisasis?: any[];
    }> = [];

    // Add IKUs
    ikus.forEach(iku => {
      const indikator = indikatorKinerjas.find(ind => ind.id_indikator_kinerja === iku.id_indikator_kinerja);
      if (indikator) {
        results.push({
          id: iku.id_iku,
          id_indikator_kinerja: iku.id_indikator_kinerja,
          nama: indikator.nama_indikator || iku.nama_iku || 'IKU Tidak Diketahui',
          jenis: 'iku',
          id_tim: indikator.id_tim,
          tim: indikator.tim,
          targets: iku.targets,
          realisasis: iku.realisasis
        });
      }
    });

    // Add Proksis
    proksis.forEach(proksi => {
      const indikator = indikatorKinerjas.find(ind => ind.id_indikator_kinerja === proksi.id_indikator_kinerja);
      if (indikator) {
        results.push({
          id: proksi.id_proksi,
          id_indikator_kinerja: proksi.id_indikator_kinerja,
          nama: indikator.nama_indikator || 'Proksi Tidak Diketahui',
          jenis: 'proksi',
          id_tim: indikator.id_tim,
          tim: indikator.tim,
          targets: proksi.targets,
          realisasis: proksi.realisasis
        });
      }
    });

    return results;
  };

  // Filter Indikator Kinerja based on selected team
  const getFilteredIndikatorKinerjas = () => {
    const allIndikators = getAllIndikatorKinerjas();
    if (selectedTeam === 'all') {
      return allIndikators; // Show all Indikator Kinerja
    }
    return allIndikators.filter(ind => ind.id_tim === parseInt(selectedTeam));
  };

  const getIndikatorStats = (indikator: { targets?: any[]; realisasis?: any[] }) => {
    // Use data from relationships if available
    const totalTargets = indikator.targets?.length || 0;
    const totalRealisasis = indikator.realisasis?.length || 0;
    return {
      totalTargets,
      totalRealisasis
    };
  };

  // Get the name of the PIC (Ketua Tim)
  const getPICName = (idTim?: number, tim?: Team) => {
    if (!idTim) return 'Ketua tidak diketahui';
    
    // Priority 1: Cari ketua tim dari users array yang sudah ter-load
    if (users && Array.isArray(users) && users.length > 0) {
      const teamLeader = users.find(u => 
        u.id_tim === idTim && 
        u.role === 'ketua_tim'
      );
      if (teamLeader && teamLeader.nama_user) {
        return teamLeader.nama_user;
      }
    }
    
    // Priority 2: Coba dari relationship team.users jika ada
    if (tim?.users && Array.isArray(tim.users) && tim.users.length > 0) {
      const teamLeader = tim.users.find((u: any) => 
        u.role === 'ketua_tim'
      );
      if (teamLeader && teamLeader.nama_user) {
        return teamLeader.nama_user;
      }
    }
    
    // Priority 3: Cari dari teams.users jika tim di-load dengan users
    const team = teams.find((t: Team) => t.id_tim === idTim);
    if (team && (team as any).users && Array.isArray((team as any).users)) {
      const teamLeader = (team as any).users.find((u: any) => 
        u.role === 'ketua_tim'
      );
      if (teamLeader && teamLeader.nama_user) {
        return teamLeader.nama_user;
      }
    }
    
    return 'Ketua tidak diketahui';
  };

  // Get team name, fallback to team relationship or by lookup
  const getTeamName = (idTim?: number, tim?: Team) => {
    if (tim && tim.nama_tim) return tim.nama_tim;
    if (idTim) {
      const team = teams.find((t: Team) => t.id_tim === idTim);
      if (team && team.nama_tim) return team.nama_tim;
    }
    return 'Tim tidak diketahui';
  };

  const filteredIndikators = getFilteredIndikatorKinerjas();
  
  // Pagination for filtered indicators
  const totalItems = filteredIndikators.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedIndicators = filteredIndikators.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Header Section with Gradient Background */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-500 via-blue-600 to-teal-600 p-8 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Target className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold">Daftar Indikator Kinerja</h1>
            </div>
            <p className="text-blue-100 text-sm">
              {selectedTeam === 'all' 
                ? '📊 Indikator Kinerja dari semua tim' 
                : `📊 Indikator Kinerja dari tim ${teams.find(t => t.id_tim.toString() === selectedTeam)?.nama_tim || 'tidak diketahui'}`
              }
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-white text-blue-600 hover:bg-blue-50 font-medium shadow-lg transition-all duration-200 hover:scale-105"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Indikator</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{filteredIndikators.length}</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Target</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {filteredIndikators.reduce((sum, ind) => sum + (getIndikatorStats(ind).totalTargets || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Realisasi</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {filteredIndikators.reduce((sum, ind) => sum + (getIndikatorStats(ind).totalRealisasis || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Tim</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {selectedTeam === 'all' ? teams.length : 1}
                </p>
              </div>
              <div className="p-3 bg-orange-200 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Card */}
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-teal-50">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-lg font-semibold">Filter Indikator Kinerja</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 flex-1">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Pilih Tim:</label>
              <Select 
                value={selectedTeam} 
                onValueChange={setSelectedTeam}
              >
                <SelectTrigger className="w-full md:w-80 border-2 border-blue-200 hover:border-blue-400 focus:border-blue-500 transition-colors rounded-lg">
                  <SelectValue placeholder="Pilih tim" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
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
            {selectedTeam !== 'all' && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-sm">
                Filtered
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Indikator Kinerja Card */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-teal-50 to-blue-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Target className="h-5 w-5 text-teal-600" />
              </div>
              <span className="text-lg font-semibold">
                {selectedTeam === 'all' ? 'Indikator Kinerja Semua Tim' : 'Indikator Kinerja Tim'}
              </span>
              {filteredIndikators.length > 0 && (
                <Badge className="ml-2 bg-teal-500 text-white border-0 shadow-sm">
                  {filteredIndikators.length} Indikator
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredIndikators.length === 0 ? (
            <TableEmptyState 
              message={selectedTeam === 'all' 
                ? '📋 Belum ada Indikator Kinerja yang ditetapkan. Hubungi admin untuk menambahkan Indikator Kinerja.' 
                : '📋 Belum ada Indikator Kinerja untuk tim yang dipilih. Coba pilih tim lain atau hubungi ketua tim.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 border-b-2">
                  <TableRow className="hover:bg-gray-50">
                    <TableHead className="font-bold text-gray-700 text-center w-16">No</TableHead>
                    <TableHead className="font-bold text-gray-700">Nama Indikator</TableHead>
                    <TableHead className="font-bold text-gray-700">Jenis</TableHead>
                    <TableHead className="font-bold text-gray-700">Tim</TableHead>
                    <TableHead className="font-bold text-gray-700">Ketua Tim</TableHead>
                    <TableHead className="font-bold text-gray-700">Target</TableHead>
                    <TableHead className="font-bold text-gray-700">Realisasi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedIndicators.map((ind, idx) => {
                    const stats = getIndikatorStats(ind);
                    const timName = getTeamName(ind.id_tim, ind.tim);
                    const picName = getPICName(ind.id_tim, ind.tim);
                    const rowNumber = startIndex + idx + 1;

                    return (
                      <TableRow 
                        key={`${ind.jenis}-${ind.id}`}
                        className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        <TableCell className="text-center font-semibold text-gray-700">
                          {rowNumber}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-800">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-6 bg-blue-400 rounded" />
                            {ind.nama}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm border-0 ${
                              ind.jenis === 'iku' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-purple-500 text-white'
                            }`}
                          >
                            {ind.jenis === 'iku' ? '📊 IKU' : '📈 PROKSI'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full" />
                            <span className="font-medium text-gray-700">{timName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-700">
                            <Users className="h-4 w-4 text-blue-500" />
                            {picName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-gradient-to-r from-green-400 to-green-600 text-white border-0 shadow-sm px-3 py-1 rounded-full font-medium">
                            {stats.totalTargets} Target
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-gradient-to-r from-purple-400 to-purple-600 text-white border-0 shadow-sm px-3 py-1 rounded-full font-medium">
                            {stats.totalRealisasis} Realisasi
                          </Badge>
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
    </div>
  );
}
