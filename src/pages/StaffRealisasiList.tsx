import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RefreshCw, TrendingUp, Users, BarChart3, Zap, CheckCircle, X, ExternalLink } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { apiService } from '../services/api';
import { useUsers } from '../hooks/useUsers';
import { Realisasi, IndikatorKinerja, IKU, Proksi } from '../types/models';
import { toast } from 'sonner';
import { ErrorState } from '../components/ErrorState';
import { TableEmptyState } from '../components/EmptyState';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

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

export function StaffRealisasiList() {
  const { user } = useAuth();
  const { users: usersFromHook, isLoading: usersLoading } = useUsers();
  
  // State management
  const [realisasis, setRealisasis] = useState<Realisasi[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [indikatorKinerjas, setIndikatorKinerjas] = useState<IndikatorKinerja[]>([]);
  const [proksis, setProksis] = useState<Proksi[]>([]);
  const [ikus, setIkus] = useState<IKU[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [usersFromTeams, setUsersFromTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [selectedRealisasi, setSelectedRealisasi] = useState<Realisasi | null>(null);
  
  // Combine users from hook and from teams relationship
  const users = useMemo(() => {
    const allUsers: any[] = [];
    const userMap = new Map();
    
    // Add users from hook first
    if (usersFromHook && Array.isArray(usersFromHook) && usersFromHook.length > 0) {
      usersFromHook.forEach((u: any) => {
        if (u.id_user && !userMap.has(u.id_user)) {
          userMap.set(u.id_user, u);
          allUsers.push(u);
        }
      });
    }
    
    // Add users from teams relationship
    if (usersFromTeams && Array.isArray(usersFromTeams) && usersFromTeams.length > 0) {
      usersFromTeams.forEach((u: any) => {
        if (u.id_user && !userMap.has(u.id_user)) {
          userMap.set(u.id_user, u);
          allUsers.push(u);
        }
      });
    }
    
    return allUsers;
  }, [usersFromHook, usersFromTeams]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  // Load data realisasi dan targets
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load Indikator Kinerja and Proksi - try general endpoint first, fallback to staff endpoint
      // Include 'users' in tim relationship to get team leader info
      let indikatorResponse, proksisResponse;
      try {
        [indikatorResponse, proksisResponse] = await Promise.all([
          apiService.getIndikatorKinerjas('tim.users,tim,iku,proksi', 1000, 1),
          apiService.getProksis('indikatorKinerja,tim.users,tim,targets,realisasis', 1000, 1)
        ]);
      } catch (generalError) {
        // If general endpoint fails (403), fallback to staff endpoint
        [indikatorResponse, proksisResponse] = await Promise.all([
          apiService.getStaffIndikatorKinerjas('tim.users,tim,iku,proksi', 1000, 1).catch(() => ({ data: [] })),
          apiService.getStaffProksis('indikatorKinerja,tim.users,tim,targets,realisasis', 1000, 1).catch(() => ({ data: [] }))
        ]);
      }
      
      const indikatorData = Array.isArray(indikatorResponse) ? indikatorResponse : (indikatorResponse as any)?.data || [];
      const proksisData = Array.isArray(proksisResponse) ? proksisResponse : (proksisResponse as any)?.data || [];
      
      // Staff can see all indikator kinerja from all teams
      const teamIndikators = indikatorData;
      const teamProksis = proksisData;
      
      setIndikatorKinerjas(teamIndikators);
      setProksis(teamProksis);
      
      // Extract IKUs from indikatorKinerjas
      const extractedIKUs: IKU[] = [];
      teamIndikators.forEach((ind: any) => {
        if (ind.iku && Array.isArray(ind.iku)) {
          extractedIKUs.push(...ind.iku);
        } else if (ind.iku) {
          extractedIKUs.push(ind.iku);
        }
      });
      setIkus(extractedIKUs);
      
      // Extract teams from indikatorKinerjas
      const extractedTeams: any[] = [];
      teamIndikators.forEach((ind: any) => {
        if (ind.tim && !extractedTeams.find(t => t.id_tim === ind.tim.id_tim)) {
          extractedTeams.push(ind.tim);
        }
      });
      setTeams(extractedTeams);
      
      // Extract users from teams relationship - this is important for getting PIC
      const extractedUsers: any[] = [];
      const userMap = new Map();
      
      // Extract from extractedTeams
      extractedTeams.forEach((team: any) => {
        if (team.users && Array.isArray(team.users)) {
          team.users.forEach((u: any) => {
            if (u.id_user && !userMap.has(u.id_user)) {
              userMap.set(u.id_user, u);
              extractedUsers.push(u);
            }
          });
        }
      });
      
      // Also extract from indikator.tim.users if available (this is crucial!)
      teamIndikators.forEach((ind: any) => {
        if (ind.tim) {
          // Check if tim has users array
          if (ind.tim.users && Array.isArray(ind.tim.users)) {
            ind.tim.users.forEach((u: any) => {
              if (u.id_user && !userMap.has(u.id_user)) {
                userMap.set(u.id_user, u);
                extractedUsers.push(u);
              }
            });
          }
        }
      });
      
      // Also extract from proksis if they have tim relationship
      teamProksis.forEach((proksi: any) => {
        if (proksi.indikatorKinerja && proksi.indikatorKinerja.tim) {
          const proksiTeam = proksi.indikatorKinerja.tim;
          if (proksiTeam.users && Array.isArray(proksiTeam.users)) {
            proksiTeam.users.forEach((u: any) => {
              if (u.id_user && !userMap.has(u.id_user)) {
                userMap.set(u.id_user, u);
                extractedUsers.push(u);
              }
            });
          }
        }
      });
      
      setUsersFromTeams(extractedUsers);
      
      // Load targets - try general endpoint first, fallback to staff endpoint
      let targetsResponse;
      try {
        targetsResponse = await apiService.getTargets();
      } catch (generalError) {
        // If general endpoint fails (403), fallback to staff endpoint
        try {
          targetsResponse = await apiService.getStaffTargets();
        } catch (staffError) {
          // Fallback jika endpoint staff tidak tersedia
          targetsResponse = [];
        }
      }
        
        const targetsData = Array.isArray(targetsResponse) ? targetsResponse : (targetsResponse as any)?.data || [];
        
      // Staff can see all targets from all teams
      const filteredTargets = targetsData.filter((target: any) => {
        if (target.id_iku) {
          return extractedIKUs.some(iku => iku.id_iku === target.id_iku);
        }
        if (target.id_proksi) {
          return teamProksis.some(proksi => proksi.id_proksi === target.id_proksi);
        }
        return false;
      });
      
      setTargets(filteredTargets);
      
      // Load realisasis - try general endpoint first, fallback to staff endpoint
      let realisasiResponse;
      try {
        realisasiResponse = await apiService.getRealisasis();
      } catch (generalError) {
        // If general endpoint fails (403), fallback to staff endpoint
        realisasiResponse = await apiService.getStaffRealisasis();
      }
      const allRealisasis = Array.isArray(realisasiResponse) ? realisasiResponse : (realisasiResponse as any)?.data || [];
      
      // Staff can see all realisasis from all teams
      const teamRealisasis = allRealisasis.filter((realisasi: Realisasi) => {
        if (realisasi.id_iku) {
          return extractedIKUs.some(iku => iku.id_iku === realisasi.id_iku);
        }
        if (realisasi.id_proksi) {
          return teamProksis.some(proksi => proksi.id_proksi === realisasi.id_proksi);
        }
        return false;
      });
      
      setRealisasis(teamRealisasis);
    } catch (error: any) {
      setError(error?.message || 'Gagal memuat data realisasi');
      setRealisasis([]);
      setTargets([]);
      toast.error('Gagal memuat data realisasi');
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedTeam]);
  
  // Effect untuk load data awal
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedYear]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
      toast.success('Data realisasi berhasil diperbarui');
    } catch (error) {
      toast.error('Gagal memperbarui data realisasi');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Process data untuk format tabel pelaporan
  const reportData = useMemo(() => {
    const processedData: Array<{
      id_indikator_kinerja: number;
      nama_indikator: string;
      jenis_indikator: 'iku' | 'proksi';
      tim: string;
      ketua_tim: string;
      target_per_tahun: number;
      alokasi_target: { 'TW 1': number; 'TW 2': number; 'TW 3': number; 'TW 4': number };
      realisasi: { 'TW 1': number; 'TW 2': number; 'TW 3': number; 'TW 4': number };
      capaian: number;
      status: string;
      statusVariant: 'success' | 'warning' | 'destructive' | 'secondary';
      unitType: 'persen' | 'poin';
    }> = [];

    // Process each Indikator Kinerja
    indikatorKinerjas.forEach(indikator => {
      // Team filter: if a specific team is selected, only include its indikator
      if (selectedTeam !== 'all' && Number(indikator.id_tim) !== parseInt(selectedTeam)) return;
      // Staff can see all indikator kinerja from all teams; ketua_tim should only see their team
      if (user?.role === 'ketua_tim') {
        if (indikator.id_tim !== user.id_tim) return;
      }

      const jenisIndikator = indikator.jenis;
      // Get IKU data - check if it's in the indikator relationship or find in ikus array
      let ikuData: IKU | null = null;
      if (jenisIndikator === 'iku') {
        if ((indikator as any).iku) {
          ikuData = Array.isArray((indikator as any).iku) ? (indikator as any).iku[0] : (indikator as any).iku;
        } else {
          ikuData = ikus.find(i => i.id_indikator_kinerja === indikator.id_indikator_kinerja) || null;
        }
      }
      
      // Get Proksi data
      let proksiData: Proksi | null = null;
      if (jenisIndikator === 'proksi') {
        if ((indikator as any).proksi) {
          proksiData = Array.isArray((indikator as any).proksi) ? (indikator as any).proksi[0] : (indikator as any).proksi;
        } else {
          proksiData = proksis.find(p => p.id_indikator_kinerja === indikator.id_indikator_kinerja) || null;
        }
      }

      // Get annual target
      let annualTarget = 0;
      if (jenisIndikator === 'iku' && ikuData) {
        annualTarget = Number(ikuData.target_iku || ikuData.target_per_tahun || 0);
      } else if (jenisIndikator === 'proksi' && proksiData) {
        annualTarget = Number(proksiData.target_per_tahun || 0);
      }

      // Get team info - check if it's in the indikator relationship or find in teams array
      let teamName = 'Unknown Team';
      let team: any = null;
      if ((indikator as any).tim) {
        team = (indikator as any).tim;
        teamName = team.nama_tim || 'Unknown Team';
      } else {
        team = teams.find(t => t.id_tim === indikator.id_tim);
        teamName = team?.nama_tim || 'Unknown Team';
      }

      // Get ketua tim - dengan multiple fallback strategies
      let ketuaTim = 'Belum ditetapkan';
      const indikatorIdTim = Number(indikator.id_tim || 0);
      
      // Priority 1: Cari dari indikator.tim.users relationship (most reliable for staff if API returns it)
      // This should work now that backend controller processes tim.users
      if ((indikator as any).tim) {
        const indikatorTeam = (indikator as any).tim;
        
        // Check users array from indikator.tim.users
        if (indikatorTeam.users && Array.isArray(indikatorTeam.users) && indikatorTeam.users.length > 0) {
          const indikatorTeamUsers = indikatorTeam.users || [];
          const teamLeader = indikatorTeamUsers.find((u: any) => {
            const uRole = String(u.role || '').trim().toLowerCase();
            return uRole === 'ketua_tim' || uRole === 'ketua tim' || uRole === 'ketua';
          });
          if (teamLeader && teamLeader.nama_user) {
            ketuaTim = teamLeader.nama_user;
          }
        }
        
        // Also check nama_ketua from indikator.tim
        if (ketuaTim === 'Belum ditetapkan' && indikatorTeam.nama_ketua) {
          ketuaTim = indikatorTeam.nama_ketua;
        }
      }
      
      // Priority 2: Cari dari team.users relationship jika ada (team dari teams array)
      if (ketuaTim === 'Belum ditetapkan' && team) {
        if ((team as any).users && Array.isArray((team as any).users)) {
          const teamUsers = (team as any).users || [];
          if (teamUsers.length > 0) {
            const teamLeader = teamUsers.find((u: any) => {
              const uRole = String(u.role || '').trim().toLowerCase();
              return uRole === 'ketua_tim' || uRole === 'ketua tim' || uRole === 'ketua';
            });
            if (teamLeader && teamLeader.nama_user) {
              ketuaTim = teamLeader.nama_user;
            }
          }
        }
        
        // Also check nama_ketua from team
        if (ketuaTim === 'Belum ditetapkan' && (team as any).nama_ketua) {
          ketuaTim = (team as any).nama_ketua;
        }
      }
      
      // Priority 3: Cari dari teams array yang sudah di-extract (cari team berdasarkan id_tim)
      if (ketuaTim === 'Belum ditetapkan' && indikatorIdTim > 0) {
        const foundTeam = teams.find((t: any) => Number(t.id_tim) === indikatorIdTim);
        if (foundTeam && (foundTeam as any).users && Array.isArray((foundTeam as any).users)) {
          const teamUsers = (foundTeam as any).users || [];
          if (teamUsers.length > 0) {
            const teamLeader = teamUsers.find((u: any) => {
              const uRole = String(u.role || '').trim().toLowerCase();
              return uRole === 'ketua_tim' || uRole === 'ketua tim' || uRole === 'ketua';
            });
            if (teamLeader && teamLeader.nama_user) {
              ketuaTim = teamLeader.nama_user;
            }
          }
        }
      }
      
      // Priority 4: Cari dari users array (combined from hook and teams) berdasarkan id_tim dan role
      // This should work if useUsers hook successfully loaded data
      if (ketuaTim === 'Belum ditetapkan' && users && Array.isArray(users) && users.length > 0 && indikatorIdTim > 0) {
        const teamLeader = users.find((u: any) => {
          const uIdTim = Number(u.id_tim || 0);
          const uRole = String(u.role || '').trim().toLowerCase();
          const matchesTeam = uIdTim === indikatorIdTim && uIdTim !== 0;
          const matchesRole = uRole === 'ketua_tim' || uRole === 'ketua tim' || uRole === 'ketua';
          return matchesTeam && matchesRole;
        });
        if (teamLeader && teamLeader.nama_user) {
          ketuaTim = teamLeader.nama_user;
        }
      }

      // Process targets and realisasis
      const indicatorTargets = targets.filter((t: any) => {
        if (jenisIndikator === 'iku') {
          if (!ikuData || t.id_iku !== ikuData.id_iku) return false;
        } else if (jenisIndikator === 'proksi') {
          if (!proksiData || t.id_proksi !== proksiData.id_proksi) return false;
        } else {
          return false;
        }
        if (t.tahun !== selectedYear) return false;
        return true;
      });

      const indicatorRealisasis = realisasis.filter((r: any) => {
        if (jenisIndikator === 'iku') {
          if (!ikuData || r.id_iku !== ikuData.id_iku) return false;
        } else if (jenisIndikator === 'proksi') {
          if (!proksiData || r.id_proksi !== proksiData.id_proksi) return false;
        } else {
          return false;
        }
        if (r.tahun && r.tahun !== selectedYear) return false;
        return true;
      });

      // Build alokasi target per triwulan
      const alokasiTarget = {
        'TW 1': 0,
        'TW 2': 0,
        'TW 3': 0,
        'TW 4': 0,
      };

      indicatorTargets.forEach((t: any) => {
        const period = normalizePeriod(t.periode);
        // For IKU, use satuan or persenan_target; for Proksi, use satuan
        const value = Number(t.satuan || t.persenan_target || t.target_iku || 0);
        if (period === 'TW 1' || period === 'TW 2' || period === 'TW 3' || period === 'TW 4') {
          alokasiTarget[period as keyof typeof alokasiTarget] = value;
        }
      });

      // Build realisasi per triwulan
      const realisasi = {
        'TW 1': 0,
        'TW 2': 0,
        'TW 3': 0,
        'TW 4': 0,
      };

      indicatorRealisasis.forEach((r: any) => {
        const period = normalizePeriod(r.periode);
        const value = Number(r.realisasi || 0);
        if (period === 'TW 1' || period === 'TW 2' || period === 'TW 3' || period === 'TW 4') {
          realisasi[period as keyof typeof realisasi] = value;
        }
      });

      // Calculate achievement
      const latestRealisasi = realisasi['TW 4'] || realisasi['TW 3'] || realisasi['TW 2'] || realisasi['TW 1'] || 0;
      const achievement = annualTarget > 0 ? (latestRealisasi / annualTarget) * 100 : 0;

      // Determine status
      let status: string;
      let statusVariant: 'success' | 'warning' | 'destructive' | 'secondary';
      if (achievement >= 100) {
        status = 'Tercapai';
        statusVariant = 'success';
      } else if (achievement >= 80) {
        status = 'Progres Baik';
        statusVariant = 'warning';
      } else if (achievement > 0) {
        status = 'Perlu Perhatian';
        statusVariant = 'destructive';
      } else {
        status = 'Belum Ada Realisasi';
        statusVariant = 'secondary';
      }

      // determine unit type and label
      let unitType: 'persen' | 'poin' = 'poin';
      if (jenisIndikator === 'iku' && ikuData && (ikuData as any).tipe) {
        unitType = (ikuData as any).tipe === 'persen' ? 'persen' : 'poin';
      } else if (jenisIndikator === 'proksi' && proksiData) {
        unitType = (proksiData as any).target_persentase ? 'persen' : 'poin';
      }

      processedData.push({
        id_indikator_kinerja: indikator.id_indikator_kinerja,
        nama_indikator: indikator.nama_indikator,
        jenis_indikator: jenisIndikator,
        tim: teamName,
        ketua_tim: ketuaTim,
        target_per_tahun: annualTarget,
        alokasi_target: alokasiTarget,
        realisasi: realisasi,
        capaian: achievement,
        status,
        statusVariant,
        unitType
      });
    });

    return processedData;
  }, [indikatorKinerjas, ikus, proksis, targets, realisasis, teams, users, user, selectedYear, selectedTeam]);
  
  // Pagination for report data
  const totalItems = reportData.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedReportData = reportData.slice(startIndex, endIndex);

  // Helper functions
  const getIKUName = (idIku: number) => {
    const iku = ikus.find(i => i.id_iku === idIku);
    return iku?.nama_iku || '-';
  };

  const getTargetValue = (realisasi: Realisasi) => {
    // Target IKU diambil dari master IKU
    const iku = ikus.find(i => i.id_iku === realisasi.id_iku);
    if (iku?.target_iku) {
      return parseInt(String(iku.target_iku)) || 0;
    }
    // Fallback ke realisasi.target jika tersedia
    if (realisasi.target && realisasi.target > 0) {
      return parseInt(String(realisasi.target)) || 0;
    }
    return 0;
  };

  const getPeriod = (realisasi: Realisasi) => {
    // Jika periode sudah ada, gunakan langsung
    if (realisasi.periode) {
      return realisasi.periode;
    }
    
    // Fallback: cari dari target berdasarkan id_target
    if (realisasi.id_target && targets.length > 0) {
      const target = targets.find(t => t.id_target === realisasi.id_target);
      if (target?.periode) {
        return target.periode;
      }
    }
    
    // Fallback kedua: cari dari target berdasarkan id_iku (ambil yang pertama)
    if (targets.length > 0) {
      const target = targets.find(t => t.id_iku === realisasi.id_iku);
      if (target?.periode) {
        return target.periode;
      }
    }
    
    return null;
  };

  const getYear = (realisasi: Realisasi) => {
    // Jika tahun sudah ada, gunakan langsung
    if (realisasi.tahun) {
      return realisasi.tahun;
    }
    
    // Fallback: cari dari target berdasarkan id_target
    if (realisasi.id_target && targets.length > 0) {
      const target = targets.find(t => t.id_target === realisasi.id_target);
      if (target?.tahun) {
        return target.tahun;
      }
    }
    
    // Fallback kedua: cari dari target berdasarkan id_iku (ambil yang pertama)
    if (targets.length > 0) {
      const target = targets.find(t => t.id_iku === realisasi.id_iku);
      if (target?.tahun) {
        return target.tahun;
      }
    }
    
    // Fallback terakhir: gunakan tahun sekarang
    return new Date().getFullYear();
  };

  const getTargetProxyValue = (realisasi: Realisasi) => {
    if (!targets || targets.length === 0) return 0;
    
    // Gunakan periode yang sudah diambil dengan fallback
    const periode = getPeriod(realisasi);
    if (!periode) {
      // Jika masih tidak ada periode, coba berdasarkan id_target
      if (realisasi.id_target) {
        const byId = targets.find(t => t.id_target === realisasi.id_target);
        if (byId?.satuan !== undefined && byId.satuan !== null) {
          return parseInt(String(byId.satuan)) || 0;
        }
      }
      return 0;
    }
    
    // Normalisasi periode
    const normalizedPeriod = normalizePeriod(periode);
    if (!normalizedPeriod) return 0;
    
    // Cari target berdasarkan id_iku DAN periode yang sudah dinormalisasi
    const associatedTarget = targets.find(t => {
      if (!t?.periode || t.id_iku !== realisasi.id_iku) return false;
      const targetPeriodNormalized = normalizePeriod(t.periode);
      return targetPeriodNormalized === normalizedPeriod;
    });
    
    // Jika tidak ditemukan berdasarkan periode, coba berdasarkan id_target
    if (!associatedTarget && realisasi.id_target) {
      const byId = targets.find(t => t.id_target === realisasi.id_target);
      if (byId?.satuan !== undefined && byId.satuan !== null) {
        return parseInt(String(byId.satuan)) || 0;
      }
    }
    
    // Return satuan jika ditemukan
    if (associatedTarget?.satuan !== undefined && associatedTarget.satuan !== null) {
      return parseInt(String(associatedTarget.satuan)) || 0;
    }
    
    return 0;
  };

  const statusBadgeClassMap: Record<'success' | 'warning' | 'destructive' | 'secondary', string> = {
    success: 'bg-green-100 text-green-700 border border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    destructive: 'bg-red-100 text-red-700 border border-red-200',
    secondary: 'bg-gray-100 text-gray-600 border border-gray-200',
  };

  // Year options
  const yearOptions = useMemo(() => 
    Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 5 + i),
    []
  );

  // Error state
  if (error) {
    return (
      <ErrorState 
        message={error}
        onRetry={loadData}
        type="generic"
      />
    );
  }

  // Loading state
  if (loading) {
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
              <p className="text-muted-foreground">Memuat data realisasi...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section with Gradient Background */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-300 via-blue-400 to-blue-500 p-8 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold">Daftar Pelaporan</h1>
            </div>
            <p className="text-blue-100 text-sm">
              {user?.role === 'staff' || user?.role === 'ketua_tim'
                ? `📈 Pelaporan tim Anda`
                : '📈 Pelaporan dari semua tim'
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
        {/* Total Realisasi card removed as requested */}

        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Capaian Rata-rata</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {reportData.length > 0
                    ? (reportData.reduce((sum, r) => sum + (Number.isFinite(r.capaian) ? r.capaian : 0), 0) / reportData.length).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Target/Tahun</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {reportData.reduce((sum, r) => sum + (r.target_per_tahun || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Realisasi/Tahun</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {reportData.reduce((sum, r) => 
                    sum + Object.values(r.realisasi).reduce((s: number, v: any) => s + (Number(v) || 0), 0), 
                    0
                  )}
                </p>
              </div>
              <div className="p-3 bg-orange-200 rounded-lg">
                <Zap className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Card */}
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-lg font-semibold">Filter Pelaporan</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 flex-1">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Pilih Tahun:</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-full md:w-48 border-2 border-purple-200 hover:border-purple-400 focus:border-purple-500 transition-colors rounded-lg">
                  <SelectValue placeholder="Pilih tahun" />
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
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Pilih Tim:</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-full md:w-48 border-2 border-purple-200 hover:border-purple-400 focus:border-purple-500 transition-colors rounded-lg">
                  <SelectValue placeholder="Semua Tim" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tim</SelectItem>
                  {teams.map((t:any) => (
                    <SelectItem key={t.id_tim} value={t.id_tim?.toString()}> {t.nama_tim} </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 text-sm">
              {selectedYear}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Realisasi Table Card */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-lg font-semibold">
                Detail Pelaporan Kinerja Tahun {selectedYear}
              </span>
              {reportData.length > 0 && (
                <Badge className="ml-2 bg-purple-500 text-white border-0 shadow-sm">
                  {reportData.length} Indikator
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {reportData.length === 0 ? (
            <div className="p-8">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-purple-100 rounded-full">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Data Realisasi</h3>
                <p className="text-gray-600">
                  {!user?.id_tim 
                    ? '📋 Anda belum ditugaskan ke tim. Hubungi admin untuk menambahkan Anda ke tim terlebih dahulu.'
                      : indikatorKinerjas.length === 0 
                        ? '📋 Tim Anda belum memiliki Indikator Kinerja. Hubungi admin untuk menambahkan Indikator Kinerja terlebih dahulu.'
                        : '📋 Belum ada realisasi yang dilaporkan untuk tahun yang dipilih.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="min-w-[1600px] w-full border-collapse">
                <thead>
                  <tr>
                    <th rowSpan={2} className="text-center align-middle bg-gradient-to-b from-purple-100 to-purple-50 border-2 border-purple-200 p-2 font-bold text-gray-800" style={{ minWidth: '240px' }}>Indikator &amp; PIC</th>
                    <th rowSpan={2} className="text-center align-middle bg-gradient-to-b from-purple-100 to-purple-50 border-2 border-purple-200 p-2 font-bold text-gray-800" style={{ minWidth: '100px' }}>Target Per Tahun</th>
                    <th colSpan={4} className="text-center bg-gradient-to-b from-green-100 to-green-50 border-2 border-green-200 p-2 font-bold text-gray-800">Alokasi Target (Kumulatif)</th>
                    <th colSpan={4} className="text-center bg-gradient-to-b from-blue-100 to-blue-50 border-2 border-blue-200 p-2 font-bold text-gray-800">Realisasi (Kumulatif)</th>
                    <th rowSpan={2} className="text-center align-middle bg-gradient-to-b from-orange-100 to-orange-50 border-2 border-orange-200 p-2 font-bold text-gray-800" style={{ minWidth: '100px' }}>Capaian</th>
                    <th rowSpan={2} className="text-center align-middle bg-gradient-to-b from-pink-100 to-pink-50 border-2 border-pink-200 p-2 font-bold text-gray-800" style={{ minWidth: '120px' }}>Status</th>
                  </tr>
                  <tr>
                    <th className="text-center bg-green-50 border border-green-200 p-2 font-semibold text-gray-700" style={{ minWidth: '100px' }}>TW I</th>
                    <th className="text-center bg-green-50 border border-green-200 p-2 font-semibold text-gray-700" style={{ minWidth: '100px' }}>TW II</th>
                    <th className="text-center bg-green-50 border border-green-200 p-2 font-semibold text-gray-700" style={{ minWidth: '100px' }}>TW III</th>
                    <th className="text-center bg-green-50 border border-green-200 p-2 font-semibold text-gray-700" style={{ minWidth: '100px' }}>TW IV</th>
                    <th className="text-center bg-blue-50 border border-blue-200 p-2 font-semibold text-gray-700" style={{ minWidth: '100px' }}>TW I</th>
                    <th className="text-center bg-blue-50 border border-blue-200 p-2 font-semibold text-gray-700" style={{ minWidth: '100px' }}>TW II</th>
                    <th className="text-center bg-blue-50 border border-blue-200 p-2 font-semibold text-gray-700" style={{ minWidth: '100px' }}>TW III</th>
                    <th className="text-center bg-blue-50 border border-blue-200 p-2 font-semibold text-gray-700" style={{ minWidth: '100px' }}>TW IV</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReportData.map((item, idx) => {
                    const rowNumber = startIndex + idx + 1;
                    return (
                    <tr key={item.id_indikator_kinerja} className={idx % 2 === 0 ? 'bg-white hover:bg-purple-50' : 'bg-gray-50 hover:bg-purple-50'}>
                      <td className="border border-gray-200 p-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold uppercase shadow-md ${
                            item.jenis_indikator === 'iku' 
                              ? 'bg-gradient-to-br from-blue-500 to-blue-700' 
                              : 'bg-gradient-to-br from-purple-500 to-purple-700'
                          }`}>
                            {rowNumber}
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="font-semibold text-sm leading-snug max-w-[280px] text-gray-900">
                              {item.nama_indikator}
                            </div>
                            <div className="text-xs text-gray-600">
                              🏢 {item.tim}
                            </div>
                            <div className="text-xs text-gray-600">
                              👤 PIC: {item.ketua_tim}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <Badge className={`text-xs font-medium shadow-sm border-0 ${
                                item.jenis_indikator === 'iku' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {item.jenis_indikator === 'iku' ? '📊 IKU' : '📈 Proksi'}
                              </Badge>
                              <Badge className={`text-xs font-medium shadow-sm border-0 ${
                                item.unitType === 'persen' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {item.unitType === 'persen' ? 'Persentase (%)' : 'Poin (Non %)'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center whitespace-nowrap border border-gray-200 p-2 font-bold text-gray-900 bg-gray-50">
                        {item.target_per_tahun > 0 ? item.target_per_tahun.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="text-center whitespace-nowrap border border-green-200 p-2 font-medium text-green-700 bg-green-50">
                        {item.alokasi_target['TW 1'] > 0 ? item.alokasi_target['TW 1'].toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="text-center whitespace-nowrap border border-green-200 p-2 font-medium text-green-700 bg-green-50">
                        {item.alokasi_target['TW 2'] > 0 ? item.alokasi_target['TW 2'].toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="text-center whitespace-nowrap border border-green-200 p-2 font-medium text-green-700 bg-green-50">
                        {item.alokasi_target['TW 3'] > 0 ? item.alokasi_target['TW 3'].toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="text-center whitespace-nowrap border border-green-200 p-2 font-medium text-green-700 bg-green-50">
                        {item.alokasi_target['TW 4'] > 0 ? item.alokasi_target['TW 4'].toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="text-center whitespace-nowrap border border-blue-200 p-2 font-medium text-blue-700 bg-blue-50">
                        {item.realisasi['TW 1'] > 0 ? item.realisasi['TW 1'].toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="text-center whitespace-nowrap border border-blue-200 p-2 font-medium text-blue-700 bg-blue-50">
                        {item.realisasi['TW 2'] > 0 ? item.realisasi['TW 2'].toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="text-center whitespace-nowrap border border-blue-200 p-2 font-medium text-blue-700 bg-blue-50">
                        {item.realisasi['TW 3'] > 0 ? item.realisasi['TW 3'].toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="text-center whitespace-nowrap border border-blue-200 p-2 font-medium text-blue-700 bg-blue-50">
                        {item.realisasi['TW 4'] > 0 ? item.realisasi['TW 4'].toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="text-center whitespace-nowrap border border-orange-200 p-2 font-bold text-orange-700 bg-orange-50">
                        {Number.isFinite(item.capaian) ? `${item.capaian.toFixed(2)}%` : '-'}
                      </td>
                      <td className="text-center whitespace-nowrap border border-pink-200 p-2 bg-pink-50">
                        <Badge className={`font-medium shadow-sm border-0 ${statusBadgeClassMap[item.statusVariant]}`}>
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
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

      {/* Issues & Actions Section */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="border-b bg-yellow-50">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <CardTitle className="text-lg font-semibold">Issues & Actions</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {realisasis.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Tidak ada data realisasi yang dilaporkan</p>
            </div>
          ) : (
            <div className="space-y-4 p-6">
              {realisasis
                .filter(r => {
                  if (selectedTeam !== 'all') {
                    const rIku = ikus.find(i => i.id_iku === r.id_iku);
                    const rProksi = proksis.find(p => p.id_proksi === r.id_proksi);
                    const rTeamId = rIku?.id_indikator_kinerja ? indikatorKinerjas.find(ind => ind.id_indikator_kinerja === rIku.id_indikator_kinerja)?.id_tim : 
                                    rProksi?.id_indikator_kinerja ? indikatorKinerjas.find(ind => ind.id_indikator_kinerja === rProksi.id_indikator_kinerja)?.id_tim : null;
                    if (rTeamId !== parseInt(selectedTeam)) return false;
                  }
                  if (r.tahun !== selectedYear) return false;
                  return true;
                })
                .map((realisasi, idx) => {
                  const ikuData = ikus.find(i => i.id_iku === realisasi.id_iku);
                  const proksiData = proksis.find(p => p.id_proksi === realisasi.id_proksi);
                  const indikator = ikuData 
                    ? indikatorKinerjas.find(ind => ind.id_indikator_kinerja === ikuData.id_indikator_kinerja)
                    : proksiData
                    ? indikatorKinerjas.find(ind => ind.id_indikator_kinerja === proksiData.id_indikator_kinerja)
                    : null;
                  
                  if (!indikator) return null;

                  const teamName = (indikator as any).tim?.nama_tim || 'Unknown Team';
                  const namaIndikator = indikator.nama_indikator;
                  const jenisIndikator = indikator.jenis;
                  const picName = indikator.tim?.users?.find((u: any) => u.role === 'ketua_tim')?.nama_user || 'Unknown PIC';
                  const tahun = realisasi.tahun || selectedYear;
                  const periode = realisasi.periode || '';
                  
                  return (
                    <div key={`${realisasi.id_realisasi}-${idx}`} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-orange-100 text-orange-700">{teamName}</Badge>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">{namaIndikator}</h3>
                          <p className="text-sm text-gray-600 mb-2">PIC: {picName} • {tahun} • {periode}</p>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs font-medium shadow-sm border-0 ${
                              jenisIndikator === 'iku' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {jenisIndikator === 'iku' ? 'IKU' : 'Proksi'}
                            </Badge>
                            <Badge className="text-xs font-medium shadow-sm border-0 bg-emerald-100 text-emerald-700">
                              Poin (Non %)
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={() => {
                            setSelectedRealisasi(realisasi);
                          }}
                        >
                          Detail
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal Dialog */}
      {selectedRealisasi && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b sticky top-0 bg-white flex items-center justify-between">
              <CardTitle>Detail</CardTitle>
              <button
                onClick={() => setSelectedRealisasi(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Content */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-red-600 font-semibold">Kendala</Label>
                  <p className="text-gray-700 mt-1 p-3 bg-gray-50 rounded min-h-[80px]">
                    {selectedRealisasi.kendala || 'nnnnnn'}
                  </p>
                </div>
                <div>
                  <Label className="text-green-600 font-semibold">Solusi</Label>
                  <p className="text-gray-700 mt-1 p-3 bg-gray-50 rounded min-h-[80px]">
                    {selectedRealisasi.solusi || 'nnnnnnnnn'}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-blue-600 font-semibold flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Buka Link BDK
                </Label>
                {selectedRealisasi.link_bdk ? (
                  <a
                    href={selectedRealisasi.link_bdk}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline mt-2 block"
                  >
                    {selectedRealisasi.link_bdk}
                  </a>
                ) : (
                  <p className="text-gray-500 mt-2">Tidak ada link BDK</p>
                )}
              </div>
              <div>
                <Label className="text-gray-600">Batas waktu</Label>
                <p className="text-gray-700 mt-1">
                  {selectedRealisasi.batas_waktu 
                    ? new Date(selectedRealisasi.batas_waktu).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })
                    : 'Tidak ada'}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSelectedRealisasi(null)}
              >
                Tutup
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  );
}
