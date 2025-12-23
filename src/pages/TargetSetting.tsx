import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { GripVertical } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';
import { Plus, Target as TargetIcon, RefreshCw, Edit, Trash2, Filter } from 'lucide-react';
import { apiService } from '../services/api';
import type { IKU, Target, IndikatorKinerja, Proksi, Team } from '../types/models';
import { TargetCreateForm } from '../components/forms/TargetCreateForm';
import { TargetEditForm } from '../components/forms/TargetEditForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Pagination } from '../components/Pagination';

type TargetJenis = 'iku' | 'proksi';

interface EnrichedTarget extends Target {
  jenis: TargetJenis;
  indikator?: IndikatorKinerja;
  ikuRelation?: IKU;
  proksiRelation?: Proksi;
  team?: Team;
  indikatorName: string;
  teamName: string;
  periodeLabel: string;
  tahunNumber?: number;
  targetValue?: number | null;
}

export function TargetSetting() {
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAddTargetDialogOpen, setIsAddTargetDialogOpen] = useState(false);
  const [isEditTargetDialogOpen, setIsEditTargetDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  
  const [targets, setTargets] = useState<Target[]>([]);
  const [ikus, setIkus] = useState<IKU[]>([]);
  const [proksis, setProksis] = useState<Proksi[]>([]);
  const [indikatorKinerjas, setIndikatorKinerjas] = useState<IndikatorKinerja[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [filterJenis, setFilterJenis] = useState<'all' | TargetJenis>('all');
  const [filterTim, setFilterTim] = useState<string>('all');
  const [filterTahun, setFilterTahun] = useState<string>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  
  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterJenis, filterTim, filterTahun]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const [
        indikatorResult,
        ikuResult,
        proksiResult,
        targetResult,
        teamResult,
      ] = await Promise.allSettled([
        apiService.getIndikatorKinerjas('tim,iku,proksi', 200, 1),
        apiService.getIKUs('indikatorKinerja,tim', 200, 1),
        apiService.getProksis('indikatorKinerja', 200, 1),
        apiService.getTargets(),
        apiService.getTeams(),
      ]);

      const indikatorData = indikatorResult.status === 'fulfilled'
        ? (Array.isArray(indikatorResult.value) ? indikatorResult.value : indikatorResult.value?.data || [])
        : indikatorKinerjas;

      const ikuData = ikuResult.status === 'fulfilled'
        ? (Array.isArray(ikuResult.value) ? ikuResult.value : ikuResult.value?.data || [])
        : ikus;

      const proksiData = proksiResult.status === 'fulfilled'
        ? (Array.isArray(proksiResult.value) ? proksiResult.value : proksiResult.value?.data || [])
        : proksis;

      const targetData = targetResult.status === 'fulfilled'
        ? (Array.isArray(targetResult.value) ? targetResult.value : (targetResult.value as any)?.data || [])
        : targets;

      const teamData = teamResult.status === 'fulfilled'
        ? (Array.isArray(teamResult.value) ? teamResult.value : teamResult.value?.data || [])
        : teams;

      // console.log('Loaded data:', {
      //   indikatorKinerjas: indikatorData.length,
      //   ikus: ikuData.length,
      //   proksis: proksiData.length,
      //   targets: targetData.length,
      //   teams: teamData.length,
      // });

      // Debug: Check for "bleble" indikator
      // const blebleIndikator = indikatorData.find((ik: any) => 
      //   ik.nama_indikator?.toLowerCase().includes('bleble')
      // );
      // if (blebleIndikator) {
      //   console.log('Found "bleble" indikator:', blebleIndikator);
      //   const blebleIKU = ikuData.find((iku: any) => 
      //     iku.id_indikator_kinerja === blebleIndikator.id_indikator_kinerja
      //   );
      //   const blebleProksi = proksiData.find((proksi: any) => 
      //     proksi.id_indikator_kinerja === blebleIndikator.id_indikator_kinerja
      //   );
      //   const blebleTargets = targetData.filter((target: any) => 
      //     (blebleIKU && target.id_iku === blebleIKU.id_iku) ||
      //     (blebleProksi && target.id_proksi === blebleProksi.id_proksi)
      //   );
      //   console.log('"bleble" related data:', {
      //     iku: blebleIKU,
      //     proksi: blebleProksi,
      //     targets: blebleTargets,
      //   });
      // }

      setIndikatorKinerjas(indikatorData);
      setIkus(ikuData);
      setProksis(proksiData);
      setTargets(targetData);
      setTeams(teamData);
    } catch (error) {
      // console.error('Error loading targets:', error);
      toast.error('Gagal memuat data target');
    } finally {
      setIsLoading(false);
    }
  };

  const enrichedTargets = useMemo<EnrichedTarget[]>(() => {
    // console.log('Enriching targets:', {
    //   targetsCount: targets.length,
    //   ikusCount: ikus.length,
    //   proksisCount: proksis.length,
    //   indikatorKinerjasCount: indikatorKinerjas.length,
    // });

    const toNumber = (val: any): number | null => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'number' ? val : Number(val);
      return Number.isFinite(num) ? num : null;
    };

    return targets
      .map((target) => {
        // Find IKU or Proksi relation
        const ikuRelation = target.id_iku
          ? target.iku || ikus.find((i) => i.id_iku === target.id_iku)
          : undefined;
        const proksiRelation = target.id_proksi
          ? target.proksi || proksis.find((p) => p.id_proksi === target.id_proksi)
          : undefined;

        // Find indikator kinerja - try multiple sources
        let indikator: IndikatorKinerja | undefined;
        
        if (ikuRelation?.indikatorKinerja) {
          indikator = ikuRelation.indikatorKinerja;
        } else if (proksiRelation?.indikatorKinerja) {
          indikator = proksiRelation.indikatorKinerja;
        } else if (ikuRelation?.id_indikator_kinerja) {
          // Try to find from indikatorKinerjas array
          indikator = indikatorKinerjas.find(
            (ik) => ik.id_indikator_kinerja === ikuRelation.id_indikator_kinerja
          );
        } else if (proksiRelation?.id_indikator_kinerja) {
          // Try to find from indikatorKinerjas array
          indikator = indikatorKinerjas.find(
            (ik) => ik.id_indikator_kinerja === proksiRelation.id_indikator_kinerja
          );
        }

        // Find team
        const team = indikator?.tim
          || (indikator?.id_tim ? teams.find((t) => t.id_tim === indikator.id_tim) : undefined);

        const jenis: TargetJenis = target.id_iku ? 'iku' : 'proksi';
        const tahunNumber = typeof target.tahun === 'number' ? target.tahun : parseInt(String(target.tahun || ''), 10);

        let targetValue = toNumber(target.target_value);
        if (targetValue === null) {
          targetValue = toNumber(target.satuan);
        }

        if (targetValue === null) {
          targetValue = toNumber(target.persenan_target);
        }

        if (jenis === 'proksi') {
          const fallback = toNumber(proksiRelation?.target_per_tahun);
          if (targetValue === null) {
            targetValue = fallback;
          }
        } else {
          const ikuType = ikuRelation?.tipe;
          if (ikuType === 'persen') {
            const fallback = toNumber(ikuRelation?.target_per_tahun) ?? toNumber(ikuRelation?.target_persentase);
            if (targetValue === null) {
              targetValue = fallback;
            }
          } else {
            const fallback = toNumber(ikuRelation?.target_per_tahun) ?? toNumber(ikuRelation?.target_poin);
            if (targetValue === null) {
              targetValue = fallback;
            }
          }
        }

        const enriched = {
          ...target,
          jenis,
          indikator,
          ikuRelation,
          proksiRelation,
          team,
          indikatorName: indikator?.nama_indikator || '-',
          teamName: team?.nama_tim || '-',
          periodeLabel: target.periode || '-',
          tahunNumber: isNaN(tahunNumber) ? undefined : tahunNumber,
          targetValue,
        } as EnrichedTarget;

        // Debug log for missing indikator
        if (!indikator) {
          // console.warn('Target without indikator:', {
          //   targetId: target.id_target,
          //   id_iku: target.id_iku,
          //   id_proksi: target.id_proksi,
          //   ikuRelation: ikuRelation ? { id: ikuRelation.id_iku, hasIndikator: !!ikuRelation.indikatorKinerja } : null,
          //   proksiRelation: proksiRelation ? { id: proksiRelation.id_proksi, hasIndikator: !!proksiRelation.indikatorKinerja } : null,
          // });
        }

        return enriched;
      })
      .filter((item) => {
        if (user?.role === 'admin') return true;
        if (!user?.id_tim) return false;
        return item.team?.id_tim === user.id_tim;
      })
      .sort((a, b) => {
        const yearDiff = (b.tahunNumber || 0) - (a.tahunNumber || 0);
        if (yearDiff !== 0) return yearDiff;
        return a.periodeLabel.localeCompare(b.periodeLabel);
      });
  }, [targets, ikus, proksis, indikatorKinerjas, teams, user]);

  const availableYears = useMemo(() => {
    const setYears = new Set<number>();
    enrichedTargets.forEach((t) => {
      if (t.tahunNumber) setYears.add(t.tahunNumber);
    });
    return Array.from(setYears).sort((a, b) => b - a);
  }, [enrichedTargets]);

  const availableTeams = useMemo(() => {
    const map = new Map<number, string>();
    enrichedTargets.forEach((t) => {
      if (t.team?.id_tim) {
        map.set(t.team.id_tim, t.team.nama_tim || '-');
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [enrichedTargets]);

  const filteredTargets = useMemo(() => {
    return enrichedTargets.filter((target) => {
      if (filterJenis !== 'all' && target.jenis !== filterJenis) {
        return false;
      }

      if (filterTim !== 'all') {
        const timId = parseInt(filterTim, 10);
        if (!target.team || target.team.id_tim !== timId) {
          return false;
        }
      }

      if (filterTahun !== 'all') {
        const tahunFilter = parseInt(filterTahun, 10);
        if (target.tahunNumber !== tahunFilter) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedTargets, filterJenis, filterTim, filterTahun]);

  const formatNumber = (value: number | null | undefined) => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value.toLocaleString('id-ID');
    }
    return null;
  };

  // Grouping by indikator name only so that Proksi entries are shown under their parent IKU
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; header: EnrichedTarget; list: EnrichedTarget[] }>();
    filteredTargets.forEach((t) => {
      // Group only by indikatorName so proksi (which are derivative) appear under the same IKU group
      const key = `${t.indikatorName}`;
      if (!map.has(key)) {
        map.set(key, { key, header: t, list: [t] });
      } else {
        map.get(key)!.list.push(t);
      }
    });
    return Array.from(map.values());
  }, [filteredTargets]);
  
  // Drag and drop ordering state - must be declared before orderedGroups
  const orderRef = useRef<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  
  // Pagination for groups - apply to ordered groups
  const orderedGroups = useMemo(() => {
    if (!order || order.length === 0) return groups;
    return order.map(key => groups.find(g => g.key === key)).filter(Boolean) as typeof groups;
  }, [order, groups]);
  
  const totalGroups = orderedGroups.length;
  const totalPages = Math.ceil(totalGroups / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedGroups = orderedGroups.slice(startIndex, endIndex);

  const [selectedPeriodByKey, setSelectedPeriodByKey] = useState<Record<string, string>>({});
  const [expandedByKey, setExpandedByKey] = useState<Record<string, boolean>>({});
  const [dragItemKey, setDragItemKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, string> = { ...selectedPeriodByKey };
    groups.forEach((g) => {
      const uniquePeriods = Array.from(new Set(g.list.map((x) => x.periodeLabel).filter(Boolean)));
      if (!next[g.key]) next[g.key] = uniquePeriods[0] || '';
    });
    setSelectedPeriodByKey(next);
    // keep expandedByKey as-is
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.length]);

  // Initialize ordering for drag-and-drop when groups change
  useEffect(() => {
    const keys = groups.map(g => g.key);
    orderRef.current = keys;
    setOrder(keys);
  }, [groups.map?.(g => g.key).join('|')]);

  const handleDragStart = (key: string) => {
    setDragItemKey(key);
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    setDragOverKey(key);
  };

  const handleDragLeave = () => {
    setDragOverKey(null);
  };

  const handleDrop = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    if (!dragItemKey) return;
    if (dragItemKey === key) return;
    const current = Array.from(orderRef.current);
    const fromIndex = current.indexOf(dragItemKey);
    const toIndex = current.indexOf(key);
    if (fromIndex === -1 || toIndex === -1) return;
    // remove fromIndex and insert at toIndex
    current.splice(fromIndex, 1);
    current.splice(toIndex, 0, dragItemKey);
    orderRef.current = current;
    setOrder(current.slice());
    setDragItemKey(null);
    setDragOverKey(null);
  };

  const handleEditTarget = (targetId: number) => {
    const targetToEdit = targets.find((t) => t.id_target === targetId);
    if (targetToEdit) {
      setEditingTarget(targetToEdit);
      setIsEditTargetDialogOpen(true);
    }
  };

  const handleEditTargetSuccess = () => {
    loadData();
  };

  const handleDeleteTarget = async (targetId: number, indikatorName: string) => {
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus target "${indikatorName}"?`);
    if (!confirmed) return;

      try {
        setIsDeleting(targetId);
      await apiService.deleteTarget(targetId);
      toast.success('Target berhasil dihapus');
        await loadData();
      } catch (error: any) {
      // console.error('Error deleting target:', error);
      const message = error.response?.data?.message || error.message || 'Gagal menghapus target';
      toast.error(message);
      } finally {
        setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat data target...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-start gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-indigo-50 text-indigo-600">
              <TargetIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg md:text-2xl font-bold leading-tight">Manajemen Target</div>
              <div className="text-sm text-muted-foreground mt-1">Kelola target IKU &amp; Proksi — tambah, edit, dan pantau pencapaian.</div>
              <div className="mt-2 flex items-center gap-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">{filteredTargets.length} Target</span>
                <div className="h-1 w-32 rounded-full bg-gradient-to-r from-indigo-200 via-indigo-100 to-transparent" />
              </div>
            </div>
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={loadData}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button 
              onClick={() => setIsAddTargetDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Tambah Target
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filter Data
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filter-jenis">Jenis Indikator</Label>
                <Select value={filterJenis} onValueChange={(value) => setFilterJenis(value as 'all' | TargetJenis)}>
                  <SelectTrigger id="filter-jenis">
                    <SelectValue placeholder="Semua Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis</SelectItem>
                    <SelectItem value="iku">IKU</SelectItem>
                    <SelectItem value="proksi">Proksi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {user?.role === 'admin' && (
                <div className="space-y-2">
                  <Label htmlFor="filter-tim">Tim</Label>
                  <Select value={filterTim} onValueChange={setFilterTim}>
                    <SelectTrigger id="filter-tim">
                      <SelectValue placeholder="Semua Tim" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Tim</SelectItem>
                      {availableTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="filter-tahun">Tahun</Label>
                <Select value={filterTahun} onValueChange={setFilterTahun}>
                  <SelectTrigger id="filter-tahun">
                    <SelectValue placeholder="Semua Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tahun</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(filterJenis !== 'all' || filterTim !== 'all' || filterTahun !== 'all') && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterJenis('all');
                    setFilterTim('all');
                    setFilterTahun('all');
                  }}
                >
                  Reset Filter
                </Button>
              </div>
            )}
          </div>

          {groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TargetIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada target yang sesuai dengan filter</p>
              <p className="text-sm">Coba ubah filter atau tambahkan target baru</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-green-100 rounded-lg shadow-sm bg-white/60">
              <Table className="text-center min-w-[900px] [&>thead>tr>th]:px-4 [&>tbody>tr>td]:px-4">
                  <TableHeader className="[_&_th]:text-center bg-green-50">
                    <TableRow>
                      <TableHead className="w-12 bg-green-50" />
                      <TableHead className="w-16 bg-green-50 text-center">No</TableHead>
                      <TableHead className="text-left">Indikator Kinerja</TableHead>
                      <TableHead className="hidden">Jenis</TableHead>
                      <TableHead className="hidden">Tim</TableHead>
                      <TableHead>TW I</TableHead>
                      <TableHead>TW II</TableHead>
                      <TableHead>TW III</TableHead>
                      <TableHead>TW IV</TableHead>
                      <TableHead>Tahun</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedGroups.map((group, idx) => {
                      const key = group.key;
                      const rowNumber = startIndex + idx + 1;
                    const periods = Array.from(new Set(group.list.map((x) => x.periodeLabel).filter(Boolean)));
                    const selectedPeriod = selectedPeriodByKey[group.key] || periods[0] || '';
                    const selectedRow = group.list.find((x) => x.periodeLabel === selectedPeriod) || group.list[0];
                    const findByQuarter = (list: EnrichedTarget[], q: number) => {
                      const romans = ['i','ii','iii','iv'];
                      const qDigit = String(q);
                      const qRoman = romans[q-1];
                      return list.find((item) => {
                        const s = (item.periodeLabel || '').toLowerCase();
                        if (!s) return false;
                        if (s.includes(qDigit)) return true;
                        if (s.includes(qRoman)) return true;
                        if (s.includes(`tw ${q}`)) return true;
                        if (s.includes(`tw${q}`)) return true;
                        if (s.includes(`triwulan ${q}`)) return true;
                        if (s.includes(`triwulan ${qRoman}`)) return true;
                        if (s.includes(`triwulan${q}`)) return true;
                        return false;
                      });
                    };
                    const tw1 = findByQuarter(group.list, 1);
                    const tw2 = findByQuarter(group.list, 2);
                    const tw3 = findByQuarter(group.list, 3);
                    const tw4 = findByQuarter(group.list, 4);
                    const isExpanded = !!expandedByKey[group.key];
                    return (
                      <React.Fragment key={group.key}>
                        <TableRow
                          draggable
                          onDragStart={() => handleDragStart(group.key)}
                          onDragOver={(e) => handleDragOver(e, group.key)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, group.key)}
                          className={`${dragOverKey === group.key ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                        >
                          <TableCell className={`text-center font-medium border-r border-border/20 cursor-grab active:cursor-grabbing ${dragOverKey === group.key ? 'bg-blue-50' : 'bg-green-50'}`} onClick={(e) => e.stopPropagation()}>
                            <GripVertical className="h-4 w-4 text-gray-400 inline-block" />
                          </TableCell>
                          <TableCell className={`text-center font-semibold text-gray-700 ${dragOverKey === group.key ? 'bg-blue-50' : 'bg-green-50'}`}>
                            {rowNumber}
                          </TableCell>
                          <TableCell className="font-medium text-left">
                            <div className="flex items-center">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm mb-1">{group.header.indikatorName}</div>
                                <div className="text-xs text-muted-foreground mb-2">{group.header.teamName} • {group.header.tahunNumber ?? new Date().getFullYear()}</div>
                                <div className="flex gap-2 flex-wrap">
                                  {/* Determine group type: prefer 'iku' when group contains any iku, otherwise 'proksi' */}
                                  {(() => {
                                    const hasIku = group.list.some((l) => l.jenis === 'iku');
                                    const groupType = hasIku ? 'iku' : 'proksi';
                                    return (
                                      <Badge variant={groupType === 'iku' ? 'default' : 'secondary'} className="text-xs w-fit uppercase">{groupType}</Badge>
                                    );
                                  })()}

                                  {/* Tipe / Persentase pill - if any item in group uses 'poin' show Point, otherwise Persentase */}
                                  {(() => {
                                    const hasPoint = group.list.some((l) => l.ikuRelation?.tipe === 'poin' || l.proksiRelation?.tipe === 'poin');
                                    return hasPoint ? (
                                      <span className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 font-semibold text-xs">Point</span>
                                    ) : (
                                      <span className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold text-xs">Persentase (%)</span>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {(() => {
                              const valueLabel = formatNumber(tw1?.targetValue ?? null);
                              return valueLabel ? (
                                <span className="font-semibold text-blue-600">{valueLabel}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-center">
                            {(() => {
                              const valueLabel = formatNumber(tw2?.targetValue ?? null);
                              return valueLabel ? (
                                <span className="font-semibold text-blue-600">{valueLabel}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-center">
                            {(() => {
                              const valueLabel = formatNumber(tw3?.targetValue ?? null);
                              return valueLabel ? (
                                <span className="font-semibold text-blue-600">{valueLabel}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-center">
                            {(() => {
                              const valueLabel = formatNumber(tw4?.targetValue ?? null);
                              return valueLabel ? (
                                <span className="font-semibold text-blue-600">{valueLabel}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              );
                            })()}
                          </TableCell>
                          <TableCell>{selectedRow?.tahunNumber ?? '-'}</TableCell>
                          <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleEditTarget(selectedRow.id_target)}
                            title="Edit Target"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-destructive hover:text-destructive hover:bg-red-50"
                                onClick={() => handleDeleteTarget(selectedRow.id_target, group.header.indikatorName)}
                                disabled={isDeleting === selectedRow.id_target}
                            title="Hapus Target"
                          >
                                {isDeleting === selectedRow.id_target ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={8}>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {group.list
                                  .slice()
                                  .sort((a, b) => (a.periodeLabel || '').localeCompare(b.periodeLabel || ''))
                                  .map((row) => (
                                    <div key={row.id_target} className="border rounded-md p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="font-medium">{row.periodeLabel}</div>
                                        <div className="text-xs text-muted-foreground">Tahun {row.tahunNumber ?? '-'}</div>
                                      </div>
                                      <div className="text-sm">
                                        Target Nilai:{' '}
                                        {(() => {
                                          const valueLabel = formatNumber(row.targetValue ?? null);
                                          return valueLabel ? valueLabel : '-';
                                        })()}
                                      </div>
                                      <div className="flex items-center gap-2 mt-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEditTarget(row.id_target)}
                                          title="Edit Target"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-destructive hover:text-destructive hover:bg-red-50"
                                          onClick={() => handleDeleteTarget(row.id_target, group.header.indikatorName)}
                                          disabled={isDeleting === row.id_target}
                                          title="Hapus Target"
                                        >
                                          {isDeleting === row.id_target ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                                          ) : (
                                            <Trash2 className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
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
              total={totalGroups}
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

      <TargetCreateForm
        open={isAddTargetDialogOpen}
        onOpenChange={setIsAddTargetDialogOpen}
        onSuccess={loadData}
      />

      <TargetEditForm
        open={isEditTargetDialogOpen}
        onOpenChange={setIsEditTargetDialogOpen}
        target={editingTarget}
        ikus={ikus}
        proksis={proksis}
        indikatorKinerjas={indikatorKinerjas}
        onSuccess={handleEditTargetSuccess}
      />
    </div>
  );
}
