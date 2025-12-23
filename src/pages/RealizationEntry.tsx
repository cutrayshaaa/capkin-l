import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Plus, FileText, RefreshCw, Edit } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useIKUs } from '../hooks/useIKUs';
import { useTeams } from '../hooks/useTeams';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import type { IKU, Proksi, IndikatorKinerja, Target, Realisasi } from '../types/models';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { RealisasiPeriodTable } from '../components/RealisasiPeriodTable';
import { Pagination } from '../components/Pagination';

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

export function RealizationEntry() {
  const { user } = useAuth();
  const { ikus, isLoading: ikusLoading } = useIKUs();
  const { teams, isLoading: teamsLoading } = useTeams();
  
  const [realisasis, setRealisasis] = useState<Realisasi[]>([]);
  const [proksis, setProksis] = useState<Proksi[]>([]);
  const [indikatorKinerjas, setIndikatorKinerjas] = useState<IndikatorKinerja[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [ikusData, setIkusData] = useState<IKU[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Realisasi | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterJenis, setFilterJenis] = useState<'all' | 'iku' | 'proksi'>('all');
  const [filterTahun, setFilterTahun] = useState<string>('all');
  const [filterPeriode, setFilterPeriode] = useState<string>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  
  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTeam, filterJenis, filterTahun, filterPeriode]);
  
  const [formData, setFormData] = useState({
    jenis_indikator: 'iku' as 'iku' | 'proksi',
    id_iku: '',
    id_proksi: '',
    periode: '',
    realisasi_proxy: '',
    kendala: '',
    solusi: '',
    link_bdk: '',
    batas_waktu: '',
  });
  
  const [editForm, setEditForm] = useState({
    realisasi: '',
    kendala: '',
    solusi: '',
    link_bdk: '',
    batas_waktu: '',
  });
  
  const currentYear = new Date().getFullYear();
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const results = await Promise.allSettled([
        apiService.getRealisasis(),
        apiService.getProksis('indikatorKinerja', 200, 1),
        apiService.getIndikatorKinerjas('tim,iku,proksi', 200, 1),
        apiService.getTargets(),
        apiService.getIKUs('indikatorKinerja', 200, 1),
      ]);

      const getArray = (res: any) => {
        if (res.status !== 'fulfilled') return [];
        const v = res.value;
        if (Array.isArray(v)) return v;
        // Common API shapes:
        // - { data: [...] }
        // - { data: { data: [...] } } (paginated)
        // - direct array
        if (Array.isArray(v?.data)) return v.data;
        if (Array.isArray(v?.data?.data)) return v.data.data;
        return [];
      };

      let realisasisData: any[] = getArray(results[0]);
      const proksisData: any[] = getArray(results[1]);
      const indikatorKinerjasData: any[] = getArray(results[2]);
      const targetsData: any[] = getArray(results[3]);
      let ikusDataArray: any[] = getArray(results[4]);

      // Fallbacks for staff endpoints when main endpoints fail or empty
      if (realisasisData.length === 0 && results[0].status === 'rejected') {
        try {
          const staffReals = await apiService.getStaffRealisasis();
          realisasisData = Array.isArray(staffReals) ? staffReals : staffReals?.data || [];
        } catch {}
      }
      if (ikusDataArray.length === 0 && results[4].status === 'rejected') {
        try {
          const staffIkus = await apiService.getStaffIKUs('indikatorKinerja,tim,targets,realisasis');
          ikusDataArray = Array.isArray(staffIkus) ? staffIkus : staffIkus?.data || [];
        } catch {}
      }

      // console.log('Loaded realisasis:', realisasisData.length);
      // console.log('Loaded proksis:', proksisData.length);
      // console.log('Loaded indikatorKinerjas:', indikatorKinerjasData.length);
      // console.log('Loaded targets:', targetsData.length);
      // console.log('Loaded ikus:', ikusDataArray.length);

      setRealisasis(realisasisData);
      setProksis(proksisData);
      setIndikatorKinerjas(indikatorKinerjasData);
      setTargets(targetsData);
      setIkusData(ikusDataArray);

      const anyRejected = results.some(r => r.status === 'rejected');
      if (anyRejected) {
        toast.warning('Sebagian data gagal dimuat, menampilkan data yang tersedia.');
      }
    } catch (e: any) {
      // console.error('Error loading data:', e);
      toast.error(e?.message || 'Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const availableIKUs = useMemo(() => {
    if (formData.jenis_indikator !== 'iku') return [];
    const ikusToUse = ikusData.length > 0 ? ikusData : ikus;
    return ikusToUse.filter(iku => {
      const indikator = indikatorKinerjas.find(ik => ik.id_indikator_kinerja === iku.id_indikator_kinerja);
      if (!indikator) return false;
      // Skip team filter for ketua_tim as they already see only their team's data
      if (user?.role !== 'ketua_tim' && filterTeam !== 'all' && indikator.id_tim !== parseInt(filterTeam)) return false;
      return true;
    });
  }, [ikus, ikusData, indikatorKinerjas, formData.jenis_indikator, filterTeam, user?.role]);

  const availableProksis = useMemo(() => {
    if (formData.jenis_indikator !== 'proksi') return [];
    return proksis.filter(proksi => {
      const indikator = indikatorKinerjas.find(ik => ik.id_indikator_kinerja === proksi.id_indikator_kinerja);
      if (!indikator) return false;
      // Skip team filter for ketua_tim as they already see only their team's data
      if (user?.role !== 'ketua_tim' && filterTeam !== 'all' && indikator.id_tim !== parseInt(filterTeam)) return false;
      return true;
    });
  }, [proksis, indikatorKinerjas, formData.jenis_indikator, filterTeam, user?.role]);

  useEffect(() => {
    if (!formData.periode) {
      setSelectedTarget(null);
      return;
    }

    const normalizedPeriode = normalizePeriod(formData.periode);
    let targetToUse: Target | null = null;

    if (formData.jenis_indikator === 'iku' && formData.id_iku) {
      targetToUse = targets.find(t => 
        t.id_iku === parseInt(formData.id_iku) && 
        normalizePeriod(t.periode) === normalizedPeriode &&
        (t.tahun === currentYear || !t.tahun)
      ) || null;
    } else if (formData.jenis_indikator === 'proksi' && formData.id_proksi) {
      targetToUse = targets.find(t => 
        t.id_proksi === parseInt(formData.id_proksi) && 
        normalizePeriod(t.periode) === normalizedPeriode &&
        (t.tahun === currentYear || !t.tahun)
      ) || null;
    }

    setSelectedTarget(targetToUse);
  }, [formData.id_iku, formData.id_proksi, formData.jenis_indikator, formData.periode, targets, currentYear]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'jenis_indikator') {
      setFormData(prev => ({
        ...prev,
        jenis_indikator: value as 'iku' | 'proksi',
        id_iku: '',
        id_proksi: '',
        periode: ''
      }));
    }
    
    if (field === 'id_iku' || field === 'id_proksi') {
      setFormData(prev => ({ ...prev, periode: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTarget) {
      toast.error('Target tidak ditemukan. Pastikan IKU/Proksi dan periode sudah dipilih.');
      return;
    }

    const targetToUse = selectedTarget;
    
    if (!targetToUse.id_target) {
      toast.error('ID Target tidak ditemukan.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const selectedYear = targetToUse.tahun || currentYear;
      const realisasiValue = formData.realisasi_proxy ? parseFloat(formData.realisasi_proxy) : 0;
      
      if (isNaN(realisasiValue)) {
        toast.error('Realisasi target harus berupa angka');
        setIsSubmitting(false);
        return;
      }

      const normalizedPeriode = normalizePeriod(formData.periode || targetToUse.periode || '');
      const targetValue = targetToUse.satuan || 0;

      const submitData: any = {
        id_target: targetToUse.id_target,
        periode: normalizedPeriode,
        tahun: selectedYear,
        target: targetValue,
        realisasi: realisasiValue,
        realisasi_proxy: realisasiValue,
      };

      if (formData.jenis_indikator === 'iku' && formData.id_iku) {
        submitData.id_iku = parseInt(formData.id_iku);
      } else if (formData.jenis_indikator === 'proksi' && formData.id_proksi) {
        submitData.id_proksi = parseInt(formData.id_proksi);
      }

      if (formData.kendala && formData.kendala.trim()) {
        submitData.kendala = formData.kendala.trim();
      }
      if (formData.solusi && formData.solusi.trim()) {
        submitData.solusi = formData.solusi.trim();
      }
      if (formData.link_bdk && formData.link_bdk.trim()) {
        submitData.link_bdk = formData.link_bdk.trim();
      }
      if (formData.batas_waktu && formData.batas_waktu.trim()) {
        submitData.batas_waktu = formData.batas_waktu.trim();
      }
      if (user?.id_user) {
        submitData.created_by = user.id_user;
      }

      await apiService.createRealisasi(submitData);
      toast.success('Realisasi berhasil disimpan!');
      
      await loadData();
      
      setFormData({
        jenis_indikator: 'iku',
        id_iku: '',
        id_proksi: '',
        periode: '',
        realisasi_proxy: '',
        kendala: '',
        solusi: '',
        link_bdk: '',
        batas_waktu: '',
      });
      setIsFormOpen(false);
      setSelectedTarget(null);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan realisasi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (item: Realisasi) => {
    setEditingItem(item);
    setEditForm({
      realisasi: item.realisasi?.toString() || '',
      kendala: item.kendala || '',
      solusi: item.solusi || '',
      link_bdk: item.link_bdk || '',
      batas_waktu: item.batas_waktu ? (() => {
        const d = new Date(item.batas_waktu as string);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
      })() : '',
    });
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    try {
      const payload: any = {
        realisasi: editForm.realisasi ? parseFloat(editForm.realisasi) : undefined,
        batas_waktu: editForm.batas_waktu || undefined,
        kendala: editForm.kendala || undefined,
        solusi: editForm.solusi || undefined,
        link_bdk: editForm.link_bdk || undefined,
      };
      
      // Include id_iku or id_proksi from the existing item (required by backend validation)
      if (editingItem.id_iku) {
        payload.id_iku = editingItem.id_iku;
      } else if (editingItem.id_proksi) {
        payload.id_proksi = editingItem.id_proksi;
      }
      
      await apiService.updateRealisasi(editingItem.id_realisasi, payload);
      toast.success('Realisasi berhasil diperbarui');
      setIsEditOpen(false);
      setEditingItem(null);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || 'Gagal memperbarui realisasi');
    }
  };

  const handleDelete = async (item: Realisasi) => {
    const periode = normalizePeriod(item.periode || '');
    const confirmMessage = `Hapus realisasi untuk periode ${periode}?`;
    if (!confirm(confirmMessage)) return;
    try {
      await apiService.deleteRealisasi(item.id_realisasi);
      toast.success(`Realisasi periode ${periode} berhasil dihapus`);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menghapus realisasi');
    }
  };

  const handleAdd = (data: { indikator: IndikatorKinerja; iku?: IKU; proksi?: Proksi; period: string }) => {
    // Set form data berdasarkan data yang dipilih
    if (data.iku) {
      setFormData({
        jenis_indikator: 'iku',
        id_iku: data.iku.id_iku.toString(),
        id_proksi: '',
        periode: data.period,
        realisasi_proxy: '',
        kendala: '',
        solusi: '',
        link_bdk: '',
        batas_waktu: '',
      });
    } else if (data.proksi) {
      setFormData({
        jenis_indikator: 'proksi',
        id_iku: '',
        id_proksi: data.proksi.id_proksi.toString(),
        periode: data.period,
        realisasi_proxy: '',
        kendala: '',
        solusi: '',
        link_bdk: '',
        batas_waktu: '',
      });
    }
    setIsFormOpen(true);
  };

  const quarterOptions = [
    { value: 'TW 1', label: 'TW 1 (Jan-Mar)' },
    { value: 'TW 2', label: 'TW 2 (Apr-Jun)' },
    { value: 'TW 3', label: 'TW 3 (Jul-Sep)' },
    { value: 'TW 4', label: 'TW 4 (Okt-Des)' },
  ];

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    realisasis.forEach(r => {
      if (r.tahun) years.add(r.tahun);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [realisasis]);

  const filteredRealisasis = useMemo(() => {
    let filtered = realisasis;
    const ikusToUse = ikusData.length > 0 ? ikusData : ikus;
    
    // Filter by role - ketua_tim only sees their team's data
    if (user?.role === 'ketua_tim' && user?.id_tim) {
      filtered = filtered.filter(r => {
        if (r.id_iku) {
          const iku = ikusToUse.find(i => i.id_iku === r.id_iku);
          if (!iku) return false;
          const indikator = indikatorKinerjas.find(ik => ik.id_indikator_kinerja === iku.id_indikator_kinerja);
          return indikator?.id_tim === user.id_tim;
        }
        if (r.id_proksi) {
          const proksi = proksis.find(p => p.id_proksi === r.id_proksi);
          if (!proksi) return false;
          const indikator = indikatorKinerjas.find(ik => ik.id_indikator_kinerja === proksi.id_indikator_kinerja);
          return indikator?.id_tim === user.id_tim;
        }
        return false;
      });
    }
    
    // console.log('Filtering realisasis:', filtered.length);
    // console.log('Filter team:', filterTeam);
    // console.log('Filter jenis:', filterJenis);
    // console.log('Filter tahun:', filterTahun);
    // console.log('Filter periode:', filterPeriode);
    
    // Filter by team - skip for ketua_tim as they already see only their team's data
    if (user?.role !== 'ketua_tim' && filterTeam !== 'all') {
      const teamId = parseInt(filterTeam);
      filtered = filtered.filter(r => {
        if (r.id_iku) {
          const iku = ikusToUse.find(i => i.id_iku === r.id_iku);
          if (!iku) return false;
          const indikator = indikatorKinerjas.find(ik => ik.id_indikator_kinerja === iku.id_indikator_kinerja);
          return indikator?.id_tim === teamId;
        }
        if (r.id_proksi) {
          const proksi = proksis.find(p => p.id_proksi === r.id_proksi);
          if (!proksi) return false;
          const indikator = indikatorKinerjas.find(ik => ik.id_indikator_kinerja === proksi.id_indikator_kinerja);
          return indikator?.id_tim === teamId;
        }
        return false;
      });
    }
    
    if (filterJenis !== 'all') {
      filtered = filtered.filter(r => {
        if (filterJenis === 'iku') return !!r.id_iku;
        if (filterJenis === 'proksi') return !!r.id_proksi;
        return true;
      });
    }
    
    if (filterTahun !== 'all') {
      const year = parseInt(filterTahun);
      filtered = filtered.filter(r => r.tahun === year);
    }
    
    if (filterPeriode !== 'all') {
      filtered = filtered.filter(r => normalizePeriod(r.periode) === normalizePeriod(filterPeriode));
    }
    
    // console.log('Filtered realisasis:', filtered.length);
    return filtered;
  }, [realisasis, filterTeam, filterJenis, filterTahun, filterPeriode, ikus, ikusData, proksis, indikatorKinerjas, user?.role, user?.id_tim]);
  
  // Pagination for filtered realisasis
  const totalItems = filteredRealisasis.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedRealisasis = filteredRealisasis.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-start gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-indigo-50 text-indigo-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-lg md:text-2xl font-bold leading-tight">Entry Realisasi IKU &amp; Proksi</div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                    {filteredRealisasis.length} entri
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">Catat realisasi triwulan dengan cepat dan akurat</div>
                <div className="mt-2 h-1 w-32 rounded-full bg-gradient-to-r from-indigo-200 via-indigo-100 to-transparent" />
              </div>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Input Realisasi
              </Button>
            </div>
          </div>
          </CardHeader>
          <CardContent>
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 ${user?.role === 'ketua_tim' ? 'md:grid-cols-3' : ''}`}>
            {user?.role !== 'ketua_tim' && (
              <div className="space-y-2">
                <Label htmlFor="filter-team">Tim</Label>
                <Select value={filterTeam} onValueChange={setFilterTeam}>
                  <SelectTrigger id="filter-team">
                    <SelectValue placeholder="Semua Tim" />
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
            )}
            
            <div className="space-y-2">
              <Label htmlFor="filter-jenis">Jenis Indikator</Label>
              <Select value={filterJenis} onValueChange={setFilterJenis}>
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
            
            <div className="space-y-2">
              <Label htmlFor="filter-tahun">Tahun</Label>
              <Select value={filterTahun} onValueChange={setFilterTahun}>
                <SelectTrigger id="filter-tahun">
                  <SelectValue placeholder="Semua Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year?.toString() || ''}>
                      {year || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="filter-periode">Periode</Label>
              <Select value={filterPeriode} onValueChange={setFilterPeriode}>
                <SelectTrigger id="filter-periode">
                  <SelectValue placeholder="Semua Periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Periode</SelectItem>
                  {quarterOptions.map(q => (
                    <SelectItem key={q.value} value={q.value}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
            </div>

          {filteredRealisasis.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground opacity-50 mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada realisasi yang dibuat</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pilih tim atau input data realisasi baru menggunakan form di bawah
              </p>
            </div>
          ) : (
            <>
              <RealisasiPeriodTable
                realisasis={paginatedRealisasis}
                ikus={ikusData.length > 0 ? ikusData : ikus}
                proksis={proksis}
                indikatorKinerjas={indikatorKinerjas}
                targets={targets}
                onEdit={openEdit}
                onDelete={handleDelete}
                onAdd={handleAdd}
              />
              
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
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Form Input Realisasi IKU
            </DialogTitle>
            <DialogDescription>
              Masukkan data realisasi IKU sesuai dengan target yang telah ditentukan
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jenis_indikator">Jenis Indikator *</Label>
                  <Select 
                    value={formData.jenis_indikator} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        jenis_indikator: value as 'iku' | 'proksi',
                        id_iku: '',
                        id_proksi: '',
                        periode: ''
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis indikator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iku">IKU</SelectItem>
                      <SelectItem value="proksi">Proksi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="periode">Triwulan *</Label>
                  <Select 
                    value={formData.periode} 
                    onValueChange={(value) => handleInputChange('periode', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih triwulan" />
                    </SelectTrigger>
                    <SelectContent>
                      {quarterOptions.map(q => (
                        <SelectItem key={q.value} value={q.value}>
                          {q.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.jenis_indikator === 'iku' ? (
                <div className="space-y-2">
                  <Label htmlFor="id_iku">IKU *</Label>
                <Select 
                  value={formData.id_iku} 
                  onValueChange={(value) => handleInputChange('id_iku', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih IKU" />
                  </SelectTrigger>
                  <SelectContent>
                      {availableIKUs.length > 0 ? (
                        availableIKUs.map(iku => {
                          const indikator = indikatorKinerjas.find(ik => ik.id_indikator_kinerja === iku.id_indikator_kinerja);
                          const indikatorName = indikator?.nama_indikator || iku.indikatorKinerja?.nama_indikator || 'N/A';
                      
                      return (
                        <SelectItem key={iku.id_iku} value={iku.id_iku.toString()}>
                              {indikatorName}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem value="no-data" disabled>
                          Tidak ada IKU tersedia
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                          </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="id_proksi">Proksi *</Label>
                  <Select 
                    value={formData.id_proksi} 
                    onValueChange={(value) => handleInputChange('id_proksi', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Proksi" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProksis.length > 0 ? (
                        availableProksis.map(proksi => {
                          const indikator = indikatorKinerjas.find(ik => ik.id_indikator_kinerja === proksi.id_indikator_kinerja);
                          const indikatorName = indikator?.nama_indikator || proksi.indikatorKinerja?.nama_indikator || 'N/A';
                          
                          return (
                            <SelectItem key={proksi.id_proksi} value={proksi.id_proksi.toString()}>
                              {indikatorName}
                        </SelectItem>
                      );
                        })
                      ) : (
                        <SelectItem value="no-data" disabled>
                          Tidak ada Proksi tersedia
                        </SelectItem>
                      )}
                  </SelectContent>
                </Select>
              </div>
              )}

              {selectedTarget && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                      <span className="text-xs sm:text-sm text-blue-700 block mb-1">Target IKU sebagai Acuan</span>
                      <p className="font-semibold text-blue-900 text-sm sm:text-base">{selectedTarget?.satuan ?? '-'}</p>
                  </div>
                  <div>
                      <span className="text-xs sm:text-sm text-blue-700 block mb-1">Periode</span>
                      <p className="font-semibold text-blue-900 text-sm sm:text-base">{normalizePeriod(selectedTarget?.periode || formData.periode)}</p>
                  </div>
                  <div>
                      <span className="text-xs sm:text-sm text-blue-700 block mb-1">Tahun</span>
                      <p className="font-semibold text-blue-900 text-sm sm:text-base">{selectedTarget?.tahun || currentYear}</p>
                  </div>
                </div>
              </div>
            )}

              <div>
                <Label htmlFor="realisasi_proxy">Realisasi Target *</Label>
                <Input
                  id="realisasi_proxy"
                  type="number"
                  step="0.01"
                  value={formData.realisasi_proxy}
                  onChange={(e) => handleInputChange('realisasi_proxy', e.target.value)}
                  placeholder="Masukkan realisasi target"
                  required
                  className="w-full"
                />
                {selectedTarget && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Target: {selectedTarget?.satuan ?? '-'} untuk periode {formData.periode ? normalizePeriod(formData.periode) : '-'}
                  </p>
                )}
            </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="kendala">Kendala</Label>
                <Textarea
                  id="kendala"
                  value={formData.kendala}
                  onChange={(e) => handleInputChange('kendala', e.target.value)}
                  placeholder="Jelaskan kendala yang dihadapi"
                  rows={3}
                    className="w-full resize-none"
                />
              </div>

              <div>
                <Label htmlFor="solusi">Solusi</Label>
                <Textarea
                  id="solusi"
                  value={formData.solusi}
                  onChange={(e) => handleInputChange('solusi', e.target.value)}
                  placeholder="Jelaskan solusi yang diterapkan"
                  rows={3}
                    className="w-full resize-none"
                />
              </div>
            </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="link_bdk">Link BDK</Label>
                <Input
                  id="link_bdk"
                  type="url"
                  value={formData.link_bdk}
                  onChange={(e) => handleInputChange('link_bdk', e.target.value)}
                    placeholder="https://..."
                    className="w-full"
                />
              </div>

              <div>
                  <Label htmlFor="batas_waktu">Batas Waktu</Label>
                  <Input
                    id="batas_waktu"
                    type="date"
                    value={formData.batas_waktu}
                    onChange={(e) => handleInputChange('batas_waktu', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Realisasi {editingItem?.periode ? `- ${normalizePeriod(editingItem.periode)}` : ''}
            </DialogTitle>
            <DialogDescription>
              Edit data realisasi yang telah diinput sebelumnya
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Realisasi</Label>
              <Input
                type="number"
                step="0.01"
                value={editForm.realisasi}
                onChange={(e) => setEditForm(prev => ({ ...prev, realisasi: e.target.value }))}
              />
            </div>
            <div>
              <Label>Kendala</Label>
              <Textarea
                value={editForm.kendala}
                onChange={(e) => setEditForm(prev => ({ ...prev, kendala: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label>Solusi</Label>
              <Textarea
                value={editForm.solusi}
                onChange={(e) => setEditForm(prev => ({ ...prev, solusi: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label>Link BDK</Label>
              <Input
                type="url"
                value={editForm.link_bdk}
                onChange={(e) => setEditForm(prev => ({ ...prev, link_bdk: e.target.value }))}
              />
            </div>
            <div>
              <Label>Batas Waktu</Label>
              <Input
                type="date"
                value={editForm.batas_waktu}
                onChange={(e) => setEditForm(prev => ({ ...prev, batas_waktu: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={saveEdit}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

