import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Edit, Trash2, BarChart3, Plus, GripVertical } from 'lucide-react';
import type { Realisasi, IKU, Proksi, IndikatorKinerja, Target } from '../types/models';

interface RealisasiPeriodTableProps {
  realisasis: Realisasi[];
  ikus: IKU[];
  proksis: Proksi[];
  indikatorKinerjas: IndikatorKinerja[];
  targets: Target[];
  onEdit?: (realisasi: Realisasi) => void;
  onDelete?: (realisasi: Realisasi) => void;
  onAdd?: (data: { indikator: IndikatorKinerja; iku?: IKU; proksi?: Proksi; period: string }) => void;
}

interface PeriodData {
  value: number | null;
  target: number | null;
  progress: number;
  realisasi?: Realisasi;
}

const PERIOD_ORDER = ['TW 1', 'TW 2', 'TW 3', 'TW 4'] as const;

const parseNumeric = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(num) ? num : 0;
};

const getAnnualTargetForIKU = (iku?: IKU): number => {
  if (!iku) return 0;
  if (iku.tipe === 'persen') {
    return parseNumeric(iku.target_per_tahun ?? iku.target_persentase);
  }
  return parseNumeric(iku.target_per_tahun ?? iku.target_poin);
};

const getAnnualTargetForProksi = (proksi?: Proksi): number => {
  if (!proksi) return 0;
  return parseNumeric(proksi.target_per_tahun);
};

export function RealisasiPeriodTable({
  realisasis,
  ikus,
  proksis,
  indikatorKinerjas,
  targets,
  onEdit,
  onDelete,
  onAdd
}: RealisasiPeriodTableProps) {
  const [order, setOrder] = useState<number[]>([]);
  const orderRef = useRef<number[]>([]);
  const [dragItem, setDragItem] = useState<number | null>(null);
  const [dragOverItemKey, setDragOverItemKey] = useState<number | null>(null);

  const handleDragStart = (key: number) => {
    setDragItem(key);
  };

  const handleDragOver = (e: React.DragEvent, key: number) => {
    e.preventDefault();
    setDragOverItemKey(key);
  };

  const handleDragLeave = () => {
    setDragOverItemKey(null);
  };

  const handleDrop = (e: React.DragEvent, key: number) => {
    e.preventDefault();
    if (dragItem == null) return;
    if (dragItem === key) return;
    const current = Array.from(orderRef.current);
    const from = current.indexOf(dragItem);
    const to = current.indexOf(key);
    if (from === -1 || to === -1) return;
    current.splice(from, 1);
    current.splice(to, 0, dragItem);
    orderRef.current = current;
    setOrder(current.slice());
    setDragItem(null);
    setDragOverItemKey(null);
  };
  
  const normalizePeriod = (period: string | undefined | null): string => {
    if (!period) return '';
    const v = String(period).trim().toUpperCase();
    if (v.startsWith('TW')) {
      const num = v.replace(/\s+/g, '').replace('TW', '');
      return `TW ${num}`;
    }
    if (v === 'I' || v === '1') return 'TW 1';
    if (v === 'II' || v === '2') return 'TW 2';
    if (v === 'III' || v === '3') return 'TW 3';
    if (v === 'IV' || v === '4') return 'TW 4';
    return period;
  };
  
  // Helper to get average target IKU/Proxy (average of all period targets)
  const getAverageTarget = (group: {
    periods: {
      'TW 1': PeriodData;
      'TW 2': PeriodData;
      'TW 3': PeriodData;
      'TW 4': PeriodData;
    };
  }): number | null => {
    const targetValues = [
      group.periods['TW 1'].target,
      group.periods['TW 2'].target,
      group.periods['TW 3'].target,
      group.periods['TW 4'].target,
    ].filter((t): t is number => t !== null);
    
    if (targetValues.length === 0) return null;
    const sum = targetValues.reduce((a, b) => a + b, 0);
    return sum / targetValues.length;
  };
  
  // Group realisasis by indikator kinerja - use useMemo to ensure it's created before useEffect
  const groupedData = useMemo(() => {
    const map = new Map<number, {
      indikator: IndikatorKinerja;
      iku?: IKU;
      proksi?: Proksi;
      periods: {
        'TW 1': PeriodData;
        'TW 2': PeriodData;
        'TW 3': PeriodData;
        'TW 4': PeriodData;
      };
    }>();

    // Process each realisasi
    realisasis.forEach(realisasi => {
    let indikator: IndikatorKinerja | undefined;
    let iku: IKU | undefined;
    let proksi: Proksi | undefined;
    let indikatorId: number | undefined;

    if (realisasi.id_iku) {
      iku = ikus.find(i => i.id_iku === realisasi.id_iku);
      if (iku) {
        indikatorId = iku.id_indikator_kinerja;
        if (iku.indikatorKinerja) {
          indikator = iku.indikatorKinerja;
        }
      }
    } else if (realisasi.id_proksi) {
      proksi = proksis.find(p => p.id_proksi === realisasi.id_proksi);
      if (proksi) {
        indikatorId = proksi.id_indikator_kinerja;
        if (proksi.indikatorKinerja) {
          indikator = proksi.indikatorKinerja;
        }
      }
    }

    // If indikator not found from relation, search by id_indikator_kinerja
    if (!indikator && indikatorId) {
      indikator = indikatorKinerjas.find(ik => ik.id_indikator_kinerja === indikatorId);
    }

    // Last resort: search by iku/proksi relation in indikatorKinerjas
    if (!indikator) {
      if (realisasi.id_iku) {
        indikator = indikatorKinerjas.find(ik => ik.iku?.id_iku === realisasi.id_iku);
      } else if (realisasi.id_proksi) {
        indikator = indikatorKinerjas.find(ik => ik.proksi?.id_proksi === realisasi.id_proksi);
      }
    }

    if (!indikator) {
      // Try resolve via target reference
      if (realisasi.id_target) {
        const target = targets.find(t => t.id_target === realisasi.id_target);
        if (target?.id_iku) {
          if (!iku) {
            iku = ikus.find(i => i.id_iku === target.id_iku);
          }
          indikatorId = iku?.id_indikator_kinerja;
          if (!indikator && indikatorId) {
            indikator = indikatorKinerjas.find(ik => ik.id_indikator_kinerja === indikatorId);
          }
        } else if (target?.id_proksi) {
          if (!proksi) {
            proksi = proksis.find(p => p.id_proksi === target.id_proksi);
          }
          indikatorId = proksi?.id_indikator_kinerja;
          if (!indikator && indikatorId) {
            indikator = indikatorKinerjas.find(ik => ik.id_indikator_kinerja === indikatorId);
          }
        }
      }
    }

    if (!indikator) {
      // Build minimal fallback indikator so row tetap tampil
      if (iku) {
        indikator = {
          id_indikator_kinerja: iku.id_indikator_kinerja,
          nama_indikator: iku.indikatorKinerja?.nama_indikator || `Indikator IKU #${iku.id_indikator_kinerja}`,
          jenis: 'iku',
          id_tim: undefined,
          created_at: undefined,
          updated_at: undefined,
          tim: undefined,
          iku: iku,
          ikus: undefined,
          proksi: undefined
        };
      } else if (proksi) {
        indikator = {
          id_indikator_kinerja: proksi.id_indikator_kinerja,
          nama_indikator: proksi.indikatorKinerja?.nama_indikator || `Indikator Proksi #${proksi.id_indikator_kinerja}`,
          jenis: 'proksi',
          id_tim: undefined,
          created_at: undefined,
          updated_at: undefined,
          tim: undefined,
          iku: undefined,
          ikus: undefined,
          proksi: proksi
        };
      }
    }

    if (!indikator) {
      // console.warn('Indikator not found for realisasi:', realisasi.id_realisasi, 'id_iku:', realisasi.id_iku, 'id_proksi:', realisasi.id_proksi);
      return;
    }

      const key = indikator.id_indikator_kinerja;
      
      if (!map.has(key)) {
        map.set(key, {
          indikator,
          iku,
          proksi,
          periods: {
            'TW 1': { value: null, target: null, progress: 0 },
            'TW 2': { value: null, target: null, progress: 0 },
            'TW 3': { value: null, target: null, progress: 0 },
            'TW 4': { value: null, target: null, progress: 0 },
          }
        });
      }

      const group = map.get(key)!;
      const period = normalizePeriod(realisasi.periode);
      
      if (period && (period === 'TW 1' || period === 'TW 2' || period === 'TW 3' || period === 'TW 4')) {
        // Find target for this period
        let targetValue: number | null = null;
        if (realisasi.id_target) {
          const target = targets.find(t => t.id_target === realisasi.id_target);
          targetValue = target?.satuan || null;
        } else if (realisasi.id_iku) {
          const target = targets.find(t => {
            if (!t.id_iku) return false;
            const targetPeriod = normalizePeriod(t.periode);
            return t.id_iku === realisasi.id_iku && targetPeriod === period;
          });
          targetValue = target?.satuan || null;
        } else if (realisasi.id_proksi) {
          const target = targets.find(t => {
            if (!t.id_proksi) return false;
            const targetPeriod = normalizePeriod(t.periode);
            return t.id_proksi === realisasi.id_proksi && targetPeriod === period;
          });
          targetValue = target?.satuan || null;
        }

        const value = realisasi.realisasi || 0;
        // Progress akan dihitung ulang menggunakan target tahunan nanti
        // Simpan target per periode untuk referensi
        const progress = 0; // Akan dihitung ulang setelah kita punya annualTarget

        group.periods[period] = {
          value,
          target: targetValue,
          progress,
          realisasi
        };
      }
    });
  
    // Hitung ulang progress menggunakan target tahunan untuk setiap group
    map.forEach((group) => {
      const annualTarget = group.proksi
        ? getAnnualTargetForProksi(group.proksi)
        : getAnnualTargetForIKU(group.iku);
      
      // Jika tidak ada target tahunan, gunakan average target sebagai fallback
      const averageTarget = getAverageTarget(group);
      const targetToUse = annualTarget > 0 ? annualTarget : (averageTarget ?? 0);
      
      // Update progress untuk setiap periode menggunakan target tahunan
      PERIOD_ORDER.forEach((period) => {
        const periodData = group.periods[period];
        if (periodData.value !== null && targetToUse > 0) {
          periodData.progress = (periodData.value / targetToUse) * 100;
        } else {
          periodData.progress = 0;
        }
      });
    });
    
    return map;
  }, [realisasis, ikus, proksis, indikatorKinerjas, targets]);

  useEffect(() => {
    const keys = Array.from(groupedData.keys());
    orderRef.current = keys;
    setOrder(keys);
  }, [groupedData]);

  const formatNumber = (val: number | null): string => {
    if (val === null || val === undefined) return '-';
    return val.toFixed(2);
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressTextColor = (progress: number): string => {
    if (!Number.isFinite(progress)) return 'text-muted-foreground';
    if (progress >= 100) return 'text-green-600';
    if (progress >= 80) return 'text-yellow-600';
    if (progress > 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const formatStatusLabel = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'verified':
        return 'Verified';
      case 'submitted':
        return 'Submitted';
      case 'draft':
        return 'Draft';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  // Helper to format date (DD/MM/YYYY)
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  };

  // console.log('Grouped data size:', groupedData.size);
  // console.log('Grouped data keys:', Array.from(groupedData.keys()));

  if (groupedData.size === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Belum ada data realisasi</p>
        <p className="text-sm text-muted-foreground mt-1">
          Total realisasis: {realisasis.length}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-green-100 rounded-lg shadow-sm bg-white/60">
      <Table className="text-center min-w-[1000px] [&>thead>tr>th]:px-4 [&>tbody>tr>td]:px-4">
        <TableHeader className="[&_th]:text-center bg-green-50">
          <TableRow>
            <TableHead rowSpan={2} className="w-12 bg-green-50" />
            <TableHead rowSpan={2} className="w-[250px]">
              Indikator Kinerja
            </TableHead>
            <TableHead rowSpan={2} className="text-center w-[120px]">
              Target IKU/Proksi
            </TableHead>
            <TableHead colSpan={4} className="text-center">
              Periode
            </TableHead>
            <TableHead rowSpan={2} className="text-center w-[120px]">
              Pencapaian Tahunan
            </TableHead>
            <TableHead rowSpan={2} className="text-center w-[150px]">
              Tanggal
            </TableHead>
          </TableRow>
          <TableRow>
            <TableHead className="text-center">TW 1</TableHead>
            <TableHead className="text-center">TW 2</TableHead>
            <TableHead className="text-center">TW 3</TableHead>
            <TableHead className="text-center">TW 4</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.filter(key => groupedData.has(key)).map((key, idx) => {
            const group = groupedData.get(key);
            if (!group) return null;
            const indikator = group.indikator;
            if (!indikator) return null;
            const jenis = indikator.jenis.toUpperCase();
            const tipe = group.iku?.tipe || 'persen';
            const tahun = new Date().getFullYear();
            const averageTarget = getAverageTarget(group);
            const annualTarget = group.proksi
              ? getAnnualTargetForProksi(group.proksi)
              : getAnnualTargetForIKU(group.iku);
            const displayTarget = annualTarget > 0 ? annualTarget : (averageTarget ?? 0);
            const isPercentage = group.proksi !== undefined || tipe === 'persen';
            const latestPeriodKey = [...PERIOD_ORDER].reverse().find(
              (period) => group.periods[period].value !== null
            );
            const latestPeriodData = latestPeriodKey ? group.periods[latestPeriodKey] : undefined;
            
            // Hitung capaian tahunan: realisasi terakhir / target tahunan
            const annualProgress = latestPeriodData && displayTarget > 0
              ? (latestPeriodData.value! / displayTarget) * 100
              : 0;
            
            return (
              <TableRow
                key={indikator.id_indikator_kinerja}
                draggable
                onDragStart={() => handleDragStart(indikator.id_indikator_kinerja)}
                onDragOver={(e) => handleDragOver(e, indikator.id_indikator_kinerja)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, indikator.id_indikator_kinerja)}
                className={`${dragOverItemKey === indikator.id_indikator_kinerja ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
              >
                <TableCell className={`text-center font-medium border-r border-border/20 cursor-grab active:cursor-grabbing ${dragOverItemKey === indikator.id_indikator_kinerja ? 'bg-blue-50' : 'bg-green-50'}`} onClick={(e) => e.stopPropagation()}>
                  <GripVertical className="h-4 w-4 text-gray-400 inline-block" />
                </TableCell>
                {/* Indikator Kinerja Column */}
                <TableCell className="text-left">
                  <div className="flex items-center">
                    <div className="flex-1 min-w-0 pl-1">
                      <div className="font-medium text-sm mb-1">
                        {indikator.nama_indikator}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {indikator.tim?.nama_tim || 'Tim'} • {tahun}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {jenis === 'IKU' ? (
                          <Badge variant="default" className="text-xs">
                            IKU
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            PROKSI
                          </Badge>
                        )}

                        {group.iku && (
                          <>
                            {tipe === 'poin' ? (
                              <span className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 font-semibold text-xs">Point</span>
                            ) : (
                              <span className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold text-xs">Persentase (%)</span>
                            )}
                          </>
                        )}

                        {group.proksi && (
                          <span className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold text-xs">Persentase (%)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Target IKU/Proxy Column */}
                <TableCell className="text-center">
                  {displayTarget > 0 ? (
                    <div className="text-sm font-medium">
                      {formatNumber(displayTarget)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>

                {/* Period Columns */}
                {PERIOD_ORDER.map((period) => {
                  const periodData = group.periods[period];
                  const hasData = periodData.value !== null;
                  const realisasiForPeriod = periodData.realisasi;

                  return (
                    <TableCell key={period} className="text-center">
                  {hasData ? (
                        <div className="space-y-1.5">
                          <div className="text-xs text-muted-foreground">
                            Realisasi:
                          </div>
                          <div className="text-sm font-semibold">
                            {formatNumber(periodData.value)}
                          </div>
                          {periodData.target !== null && (
                            <>
                              <div className="text-xs text-muted-foreground">
                                Target:
                              </div>
                              <div className="text-sm font-semibold">
                                {formatNumber(periodData.target)}
                              </div>
                            </>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            Progress:
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getProgressColor(periodData.progress)}`}
                              style={{ width: `${Math.min(periodData.progress, 100)}%` }}
                            />
                          </div>
                          <div className={`text-xs font-medium ${getProgressTextColor(periodData.progress)}`}>
                            {Number.isFinite(periodData.progress)
                              ? `${periodData.progress.toFixed(0)}%`
                              : '-'}
                          </div>
                          {/* Action buttons for this period */}
                          {realisasiForPeriod && (
                            <div className="flex items-center justify-center gap-1 pt-1 border-t mt-1">
                              {onEdit && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(realisasiForPeriod);
                                  }}
                                  title={`Edit ${period}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              )}
                              {onDelete && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(realisasiForPeriod);
                                  }}
                                  title={`Hapus ${period}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-2">
                          <span className="text-muted-foreground text-sm mb-2">-</span>
                          {onAdd && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-3 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAdd({
                                  indikator: group.indikator,
                                  iku: group.iku,
                                  proksi: group.proksi,
                                  period: period
                                });
                              }}
                              title={`Tambah realisasi ${period}`}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  );
                })}

                {/* Overall Capaian Column */}
                <TableCell className="text-center">
                  {latestPeriodData && displayTarget > 0 ? (
                    <div className="space-y-1">
                      <div className={`text-sm font-semibold ${getProgressTextColor(annualProgress)}`}>
                        {annualProgress.toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatNumber(latestPeriodData.value)} / {formatNumber(displayTarget)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>

                {/* Tanggal Column */}
                <TableCell className="text-center">
                  <div className="space-y-1 text-xs">
                    {PERIOD_ORDER.map((period) => {
                      const periodData = group.periods[period];
                      const realisasiForPeriod = periodData.realisasi;
                      // Prioritize batas_waktu, fallback to created_at
                      const tanggal = realisasiForPeriod?.batas_waktu || realisasiForPeriod?.created_at;
                      
                      if (!tanggal || !realisasiForPeriod) return null;
                      
                      // Map period to Roman numeral for display
                      const periodLabel = period === 'TW 1' ? 'TW I' : 
                                        period === 'TW 2' ? 'TW II' : 
                                        period === 'TW 3' ? 'TW III' : 
                                        'TW IV';
                      
                      return (
                        <div key={period} className="text-center">
                          <div className="font-medium">{periodLabel}</div>
                          <div className="text-muted-foreground">{formatDate(tanggal)}</div>
                        </div>
                      );
                    })}
                    {!PERIOD_ORDER.some(period => {
                      const periodData = group.periods[period];
                      return periodData.realisasi && (periodData.realisasi.batas_waktu || periodData.realisasi.created_at);
                    }) && (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>

              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}