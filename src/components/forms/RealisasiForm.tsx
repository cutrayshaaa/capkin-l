import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle, Calendar, Target, AlertTriangle, FileText, Link, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../services/api';
import type { IKU, Period, Target, Proksi } from '../../types/models';

interface RealisasiFormData {
  jenis_indikator: 'iku' | 'proksi';
  id_iku: string;
  id_proksi: string;
  id_target: string;
  periode: string;
  target: string;
  realisasi: string;
  batas_waktu: string;
  realisasi_proxy: string;
  persenan_tercapai_per_tw: string;
  persenan_tercapai_target_pertahun: string;
  solusi: string;
  kendala: string;
  link_bdk: string;
  status: 'draft' | 'submitted' | 'verified' | 'rejected';
  attachment?: File | null;
}

interface RealisasiFormProps {
  initialData?: Partial<RealisasiFormData>;
  selectedIKU?: string;
  selectedYear?: number;
  selectedQuarter?: string;
  onSubmit: (data: RealisasiFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
  userRole?: string;
}

const initialFormData: RealisasiFormData = {
  jenis_indikator: 'iku',
  id_iku: '',
  id_proksi: '',
  id_target: '',
  periode: '',
  target: '',
  realisasi: '',
  batas_waktu: '',
  realisasi_proxy: '',
  persenan_tercapai_per_tw: '',
  persenan_tercapai_target_pertahun: '',
  solusi: '',
  kendala: '',
  link_bdk: '',
  status: 'draft',
  attachment: null,
};

const statusOptions = [
  { 
    value: 'draft', 
    label: 'Draft', 
    description: 'Realisasi masih dalam tahap penyusunan',
    color: 'bg-gray-100 text-gray-800'
  },
  { 
    value: 'submitted', 
    label: 'Submitted', 
    description: 'Realisasi sudah disubmit untuk verifikasi',
    color: 'bg-blue-100 text-blue-800'
  },
  { 
    value: 'verified', 
    label: 'Verified', 
    description: 'Realisasi sudah diverifikasi dan diterima',
    color: 'bg-green-100 text-green-800'
  },
  { 
    value: 'rejected', 
    label: 'Rejected', 
    description: 'Realisasi ditolak dan perlu diperbaiki',
    color: 'bg-red-100 text-red-800'
  }
];

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

export function RealisasiForm({ 
  initialData, 
  selectedIKU,
  selectedYear,
  selectedQuarter,
  onSubmit, 
  onCancel, 
  isLoading = false, 
  isEdit = false,
  userRole = 'staff'
}: RealisasiFormProps) {
  const [formData, setFormData] = useState<RealisasiFormData>(() => {
    const merged = {
    ...initialFormData,
      ...initialData,
    } as RealisasiFormData;
    if (!merged.jenis_indikator) {
      merged.jenis_indikator = merged.id_proksi ? 'proksi' : 'iku';
    }
    return merged;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ikus, setIkus] = useState<IKU[]>([]);
  const [proksis, setProksis] = useState<Proksi[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedIKUData, setSelectedIKUData] = useState<IKU | null>(null);
  const [selectedProksiData, setSelectedProksiData] = useState<Proksi | null>(null);
  const [selectedPeriodData, setSelectedPeriodData] = useState<Period | null>(null);
  const [selectedTargetData, setSelectedTargetData] = useState<Target | null>(null);
  const [availableTargets, setAvailableTargets] = useState<Target[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const getTargetNumericValue = (target?: Target | null): number | null => {
    if (!target) return null;
    if (typeof target.target_value === 'number') return target.target_value;
    if (typeof target.satuan === 'number') return target.satuan;
    if (typeof target.persenan_target === 'number') return target.persenan_target;
    return null;
  };

  const isTargetPercentage = (target?: Target | null): boolean => {
    if (!target) return false;
    if (typeof target.target_percentage === 'number') return true;
    if (typeof target.persenan_target === 'number') return true;
    if (target.id_proksi) return true;
    return false;
  };

  const formatTargetDisplay = (target?: Target | null): string => {
    if (!target) return '-';
    const value = getTargetNumericValue(target);
    if (value === null) return '-';
    const formatted = value.toLocaleString('id-ID');
    return isTargetPercentage(target) ? `${formatted}%` : formatted;
  };

  const ikuOptions = useMemo(
    () => ikus.map(iku => ({
      value: iku.id_iku.toString(),
      label: iku.nama_iku,
    })),
    [ikus]
  );

  const proksiOptions = useMemo(
    () => proksis.map(proksi => ({
      value: proksi.id_proksi.toString(),
      label: proksi.indikatorKinerja?.nama_indikator || `Proksi ${proksi.id_proksi}`,
    })),
    [proksis]
  );

  const periodOptions = useMemo(() => {
    let relevantTargets: Target[] = [];
    if (formData.jenis_indikator === 'iku' && formData.id_iku) {
      relevantTargets = targets.filter(target => target.id_iku === parseInt(formData.id_iku, 10));
    } else if (formData.jenis_indikator === 'proksi' && formData.id_proksi) {
      relevantTargets = targets.filter(target => target.id_proksi === parseInt(formData.id_proksi, 10));
    }

    const optionMap = new Map<string, string>();
    relevantTargets.forEach(target => {
      const normalized = normalizePeriod(target.periode);
      if (!normalized) return;
      if (!optionMap.has(normalized)) {
        const matchingPeriod = periods.find(period => normalizePeriod(period.triwulan) === normalized);
        const label = matchingPeriod ? formatPeriodLabel(matchingPeriod) : normalized;
        optionMap.set(normalized, matchingPeriod && target.tahun ? `${label} • ${target.tahun}` : label);
      }
    });

    return Array.from(optionMap.entries()).map(([value, label]) => ({ value, label }));
  }, [formData.jenis_indikator, formData.id_iku, formData.id_proksi, targets, periods]);

  const targetOptions = useMemo(() => {
    return availableTargets.map(target => {
      const periodLabel = normalizePeriod(target.periode) || 'Periode tidak diketahui';
      const display = formatTargetDisplay(target);
      return {
        value: target.id_target.toString(),
        label: `${periodLabel} • ${display}`,
      };
    });
  }, [availableTargets]);

  // Load data from API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoadingData(true);

      
      const [ikusResponse, proksiResponse, targetsResponse, periodsResponse] = await Promise.all([
        apiService.getIKUs('indikatorKinerja,tim', 200, 1),
        apiService.getProksis('indikatorKinerja', 200, 1),
        apiService.getTargets(),
        apiService.getActivePeriods()
      ]);

      const ikusData = Array.isArray(ikusResponse) ? ikusResponse : ikusResponse?.data || [];
      const proksiData = Array.isArray(proksiResponse) ? proksiResponse : proksiResponse?.data || [];
      const targetsData = Array.isArray(targetsResponse) ? targetsResponse : targetsResponse?.data || [];
      const periodsData = Array.isArray(periodsResponse) ? periodsResponse : periodsResponse?.data || [];

      setIkus(ikusData);
      setProksis(proksiData);
      setTargets(targetsData);
      setPeriods(periodsData);
      
    } catch (error) {

      toast.error('Gagal memuat data');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Auto-fill form based on props from RealizationEntry
  useEffect(() => {
    if (!selectedIKU || !selectedQuarter || isLoadingData) return;

    const normalizedQuarter = normalizePeriod(selectedQuarter);
      const matchingTarget = targets.find(target => 
      target.id_iku === parseInt(selectedIKU, 10) &&
      normalizePeriod(target.periode) === normalizedQuarter &&
      (!selectedYear || !target.tahun || target.tahun === selectedYear)
      );

    setFormData(prev => {
      const next: RealisasiFormData = {
        ...prev,
        jenis_indikator: 'iku',
        id_iku: selectedIKU,
        id_proksi: '',
        periode: normalizedQuarter,
        id_target: matchingTarget?.id_target ? matchingTarget.id_target.toString() : '',
        target: matchingTarget && getTargetNumericValue(matchingTarget) !== null
          ? String(getTargetNumericValue(matchingTarget))
          : prev.target,
      };
      return next;
    });

      setSelectedIKUData(ikus.find(iku => iku.id_iku.toString() === selectedIKU) || null);
    if (normalizedQuarter) {
      const matchingPeriod = periods.find(period => normalizePeriod(period.triwulan) === normalizedQuarter && (!selectedYear || period.tahun === selectedYear));
      setSelectedPeriodData(matchingPeriod || null);
    } else {
      setSelectedPeriodData(null);
    }
    setSelectedTargetData(matchingTarget || null);
    setSelectedProksiData(null);
  }, [selectedIKU, selectedYear, selectedQuarter, ikus, periods, targets, isLoadingData]);

  // Reset form when initialData changes
  useEffect(() => {
    setFormData(prev => {
      const merged = {
      ...initialFormData,
        ...initialData,
      } as RealisasiFormData;
      if (!merged.jenis_indikator) {
        merged.jenis_indikator = merged.id_proksi ? 'proksi' : 'iku';
      }
      return merged;
    });
  }, [initialData]);

  // Update selected IKU when id_iku changes
  useEffect(() => {
    if (formData.jenis_indikator === 'iku' && formData.id_iku) {
      const iku = ikus.find(i => i.id_iku.toString() === formData.id_iku);
      setSelectedIKUData(iku || null);
    } else {
      setSelectedIKUData(null);
    }
  }, [formData.jenis_indikator, formData.id_iku, ikus]);

  useEffect(() => {
    if (formData.jenis_indikator === 'proksi' && formData.id_proksi) {
      const proksi = proksis.find(p => p.id_proksi.toString() === formData.id_proksi);
      setSelectedProksiData(proksi || null);
    } else {
      setSelectedProksiData(null);
    }
  }, [formData.jenis_indikator, formData.id_proksi, proksis]);

  // Update selected period when periode changes
  useEffect(() => {
    if (formData.periode) {
      const normalized = normalizePeriod(formData.periode);
      const period = periods.find(p => normalizePeriod(p.triwulan) === normalized);
      setSelectedPeriodData(period || null);
    } else {
      setSelectedPeriodData(null);
    }
  }, [formData.periode, periods]);

  // Update available targets when IKU and period are selected
  useEffect(() => {
    if (!formData.periode) {
      setAvailableTargets([]);
      if (formData.id_target) {
        setFormData(prev => ({ ...prev, id_target: '', target: '' }));
      }
      return;
    }

    const normalized = normalizePeriod(formData.periode);
    let filteredTargets: Target[] = [];

    if (formData.jenis_indikator === 'iku' && formData.id_iku) {
      filteredTargets = targets.filter(target =>
        target.id_iku === parseInt(formData.id_iku, 10) &&
        normalizePeriod(target.periode) === normalized
      );
    } else if (formData.jenis_indikator === 'proksi' && formData.id_proksi) {
      filteredTargets = targets.filter(target =>
        target.id_proksi === parseInt(formData.id_proksi, 10) &&
        normalizePeriod(target.periode) === normalized
      );
    }

      setAvailableTargets(filteredTargets);
      
    if (formData.id_target && !filteredTargets.some(t => t.id_target.toString() === formData.id_target)) {
        setFormData(prev => ({ ...prev, id_target: '', target: '' }));
    } else if (!formData.id_target && filteredTargets.length === 1) {
      const first = filteredTargets[0];
      const value = getTargetNumericValue(first);
      setFormData(prev => ({
        ...prev,
        id_target: first.id_target.toString(),
        target: value !== null ? String(value) : prev.target
      }));
    }
  }, [formData.jenis_indikator, formData.id_iku, formData.id_proksi, formData.periode, targets]);

  // Update selected target and auto-fill target value
  useEffect(() => {
    if (!formData.id_target) {
      setSelectedTargetData(null);
      return;
    }

    const target = targets.find(t => t.id_target.toString() === formData.id_target) ||
      availableTargets.find(t => t.id_target.toString() === formData.id_target) ||
      null;

    setSelectedTargetData(target);
      
      if (target) {
      const value = getTargetNumericValue(target);
      if (value !== null) {
        setFormData(prev => (prev.target === String(value) ? prev : { ...prev, target: String(value) }));
      }
    }
  }, [formData.id_target, availableTargets, targets]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (formData.jenis_indikator === 'iku') {
    if (!formData.id_iku) {
      newErrors.id_iku = 'IKU wajib dipilih';
      }
    } else {
      if (!formData.id_proksi) {
        newErrors.id_proksi = 'Proksi wajib dipilih';
      }
    }

    if (!formData.periode) {
      newErrors.periode = 'Periode wajib dipilih';
    }

    if (!formData.id_target) {
      newErrors.id_target = 'Target wajib dipilih';
    }

    if (!formData.realisasi.trim()) {
      newErrors.realisasi = 'Realisasi wajib diisi';
    } else {
      const realisasiValue = parseFloat(formData.realisasi);
      if (isNaN(realisasiValue)) {
        newErrors.realisasi = 'Realisasi harus berupa angka';
      } else if (realisasiValue < 0) {
        newErrors.realisasi = 'Realisasi tidak boleh negatif';
      } else {
        const percentageTarget = isTargetPercentage(selectedTargetData);
        if (percentageTarget && realisasiValue > 100) {
        newErrors.realisasi = 'Realisasi tidak boleh lebih dari 100%';
        }
      }
    }

    // Keterangan validation - removed because field is removed

    if (!formData.batas_waktu) {
      newErrors.batas_waktu = 'Batas waktu wajib diisi';
    } else {
      const deadline = new Date(formData.batas_waktu);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (deadline < today) {
        newErrors.batas_waktu = 'Batas waktu tidak boleh di masa lalu';
      }
    }

    // Persenan tercapai per TW validation - removed because it's auto-calculated
    // Persenan tercapai target pertahun validation - removed because it's auto-calculated

    // URL validation for link_bdk
    if (formData.link_bdk.trim()) {
      try {
        new URL(formData.link_bdk);
      } catch {
        newErrors.link_bdk = 'Format URL tidak valid';
      }
    }

    // Percentage validation for percentage type IKUs
    if (false) { // target_type removed
      const realisasiValue = parseFloat(formData.realisasi);
      if (!isNaN(realisasiValue) && realisasiValue > 100) {
        newErrors.realisasi = 'Realisasi persentase tidak boleh lebih dari 100%';
      }
      
      if (formData.realisasi_proxy.trim()) {
        const proxyValue = parseFloat(formData.realisasi_proxy);
        if (!isNaN(proxyValue) && proxyValue > 100) {
          newErrors.realisasi_proxy = 'Realisasi proxy persentase tidak boleh lebih dari 100%';
        }
      }
    }

    // Conditional validation based on status
    if (formData.status === 'submitted' || formData.status === 'verified') {
      if (!formData.solusi.trim()) {
        newErrors.solusi = 'Solusi wajib diisi untuk status submitted/verified';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Mohon periksa kembali data yang diisi');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {

    }
  };

  const handleInputChange = (field: keyof RealisasiFormData, value: string) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      if (field === 'jenis_indikator') {
        newData.jenis_indikator = value as 'iku' | 'proksi';
        newData.id_iku = value === 'iku' ? newData.id_iku : '';
        newData.id_proksi = value === 'proksi' ? newData.id_proksi : '';
        newData.periode = '';
        newData.id_target = '';
        newData.target = '';
        newData.persenan_tercapai_per_tw = '';
        newData.persenan_tercapai_target_pertahun = '';
      }

      if (field === 'id_iku') {
        newData.id_proksi = '';
        newData.periode = '';
        newData.id_target = '';
        newData.target = '';
        newData.persenan_tercapai_per_tw = '';
        newData.persenan_tercapai_target_pertahun = '';
      }

      if (field === 'id_proksi') {
        newData.id_iku = '';
        newData.periode = '';
        newData.id_target = '';
        newData.target = '';
        newData.persenan_tercapai_per_tw = '';
        newData.persenan_tercapai_target_pertahun = '';
      }

      if (field === 'periode') {
        newData.id_target = '';
        newData.target = '';
        newData.persenan_tercapai_per_tw = '';
        newData.persenan_tercapai_target_pertahun = '';
      }
      
      // Auto-calculate persenan fields when realisasi or realisasi_proxy changes
      if (field === 'realisasi' || field === 'realisasi_proxy') {
        const realisasiProxyValue = parseFloat(newData.realisasi_proxy) || 0;
        const targetBaseline = getTargetNumericValue(selectedTargetData);

        if (realisasiProxyValue > 0 && targetBaseline) {
          const percentage = Math.min((realisasiProxyValue / targetBaseline) * 100, 100);
          newData.persenan_tercapai_per_tw = percentage.toFixed(2);
          newData.persenan_tercapai_target_pertahun = percentage.toFixed(2);
        } else {
          newData.persenan_tercapai_per_tw = '';
          newData.persenan_tercapai_target_pertahun = '';
        }
      }
      
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    if (field === 'jenis_indikator') {
      setErrors(prev => ({
        ...prev,
        id_iku: '',
        id_proksi: ''
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      attachment: file
    }));
  };

  const formatPeriodLabel = (period: Period): string => {
    const year = period.tahun;
    const type = (period as any).type || (period as any).periode_type;
    switch (type) {
      case 'tahunan':
        return `Tahun ${year}`;
      case 'triwulan':
        return `Q${period.triwulan} ${year}`;
      case 'bulanan':
        const monthNames = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${monthNames[(period.bulan || 1) - 1]} ${year}`;
      case 'semester':
        return `Semester ${period.triwulan} ${year}`;
      default:
        return `${period.nama_periode} ${year}`;
    }
  };

  const calculateAchievementPercentage = (): number | null => {
    if (!formData.realisasi || !formData.target) return null;
    
    const realisasi = parseFloat(formData.realisasi);
    const target = parseFloat(formData.target);
    
    if (isNaN(realisasi) || isNaN(target) || target === 0) return null;
    
    return (realisasi / target) * 100;
  };

  const getAchievementColor = (percentage: number): string => {
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Filter IKUs and periods based on user role
  const availableIKUs = ikus.filter(iku => iku.status === 'aktif');
  const availablePeriods = periods.filter(period => period.status === 'aktif');

  const selectedTargetValueDisplay = formatTargetDisplay(selectedTargetData);
  const selectedTargetIsPercentage = isTargetPercentage(selectedTargetData);
  const realisasiNumber = Number(formData.realisasi);
  const realisasiDisplay = formData.realisasi
    ? (!Number.isNaN(realisasiNumber) ? realisasiNumber.toLocaleString('id-ID') : formData.realisasi)
    : '';
  const realisasiProxyNumber = Number(formData.realisasi_proxy);
  const realisasiProxyDisplay = formData.realisasi_proxy
    ? (!Number.isNaN(realisasiProxyNumber) ? realisasiProxyNumber.toLocaleString('id-ID') : formData.realisasi_proxy)
    : '';
  const achievementPercentage = calculateAchievementPercentage();

  // Show loading state
  if (isLoadingData) {
    return (
      <Card className="w-full max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {isEdit ? 'Edit Realisasi' : 'Input Realisasi Baru'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Memuat data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {isEdit ? 'Edit Realisasi' : 'Input Realisasi Baru'}
        </CardTitle>
        {selectedIKUData && selectedPeriodData && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Auto-filled dari RealizationEntry:</strong> {selectedIKUData.nama_iku} - {formatPeriodLabel(selectedPeriodData)}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Indikator & Target Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jenis_indikator">Jenis Indikator *</Label>
              <Select
                value={formData.jenis_indikator}
                onValueChange={(val) => handleInputChange('jenis_indikator', val as 'iku' | 'proksi')}
              >
                <SelectTrigger id="jenis_indikator">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iku">IKU</SelectItem>
                  <SelectItem value="proksi">Proksi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="indikator-select">
                {formData.jenis_indikator === 'iku' ? 'IKU' : 'Proksi'} *
              </Label>
              <Select
                value={formData.jenis_indikator === 'iku' ? formData.id_iku : formData.id_proksi}
                onValueChange={(val) => handleInputChange(formData.jenis_indikator === 'iku' ? 'id_iku' as keyof RealisasiFormData : 'id_proksi', val)}
                disabled={(formData.jenis_indikator === 'iku' && !!selectedIKU && selectedIKU === formData.id_iku)}
              >
                <SelectTrigger id="indikator-select">
                  <SelectValue placeholder={`Pilih ${formData.jenis_indikator === 'iku' ? 'IKU' : 'Proksi'}`} />
                </SelectTrigger>
                <SelectContent>
                  {(formData.jenis_indikator === 'iku' ? ikuOptions : proksiOptions).map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.jenis_indikator === 'iku' && errors.id_iku && (
                <p className="text-sm text-red-500">{errors.id_iku}</p>
              )}
              {formData.jenis_indikator === 'proksi' && errors.id_proksi && (
                <p className="text-sm text-red-500">{errors.id_proksi}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="periode-select">Periode *</Label>
              <Select
                value={formData.periode}
                onValueChange={(val) => handleInputChange('periode', val)}
                disabled={periodOptions.length === 0}
              >
                <SelectTrigger id="periode-select">
                  <SelectValue placeholder={periodOptions.length === 0 ? 'Pilih indikator terlebih dahulu' : 'Pilih periode'} />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.periode && (
                <p className="text-sm text-red-500">{errors.periode}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-select">Target *</Label>
              <Select
                value={formData.id_target}
                onValueChange={(val) => handleInputChange('id_target', val)}
                disabled={targetOptions.length === 0}
              >
                <SelectTrigger id="target-select">
                  <SelectValue placeholder={targetOptions.length === 0 ? 'Pilih periode terlebih dahulu' : 'Pilih target'} />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.id_target && (
                <p className="text-sm text-red-500">{errors.id_target}</p>
              )}
            </div>
          </div>

          {/* Target and Realization Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target">
                Nilai Target
              </Label>
              <Input
                id="target"
                type="text"
                value={selectedTargetValueDisplay}
                readOnly
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="realisasi">
                Realisasi *
                  <span className="text-sm font-normal text-gray-500">
                  {selectedTargetIsPercentage ? '(dalam persen)' : '(dalam nilai)'}
                  </span>
              </Label>
              <Input
                id="realisasi"
                type="number"
                step="0.01"
                value={formData.realisasi}
                onChange={(e) => handleInputChange('realisasi', e.target.value)}
                placeholder="Masukkan nilai realisasi"
                className={errors.realisasi ? 'border-red-500' : ''}
              />
              {errors.realisasi && (
                <p className="text-sm text-red-500">{errors.realisasi}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="realisasi_proxy">
                Realisasi Proxy
                {formData.jenis_indikator === 'proksi' && (
                  <span className="text-sm font-normal text-gray-500">
                    (opsional, alternatif pengukuran)
                  </span>
                )}
              </Label>
              <Input
                id="realisasi_proxy"
                type="number"
                step="0.01"
                value={formData.realisasi_proxy}
                onChange={(e) => handleInputChange('realisasi_proxy', e.target.value)}
                placeholder="Realisasi alternatif (opsional)"
                className={errors.realisasi_proxy ? 'border-red-500' : ''}
              />
              {errors.realisasi_proxy && (
                <p className="text-sm text-red-500">{errors.realisasi_proxy}</p>
              )}
          </div>

          {/* Persenan Tercapai Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="persenan_tercapai_per_tw">
                Persenan Tercapai per TW
                <span className="text-sm font-normal text-gray-500">
                  (proxy_realisasi / proxy_target)
                </span>
              </Label>
              <Input
                id="persenan_tercapai_per_tw"
                type="number"
                step="0.01"
                value={formData.persenan_tercapai_per_tw}
                onChange={(e) => handleInputChange('persenan_tercapai_per_tw', e.target.value)}
                placeholder="Otomatis terisi berdasarkan perhitungan"
                className={`${errors.persenan_tercapai_per_tw ? 'border-red-500' : ''} bg-gray-50`}
                disabled
                readOnly
              />
              {errors.persenan_tercapai_per_tw && (
                <p className="text-sm text-red-500">{errors.persenan_tercapai_per_tw}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="persenan_tercapai_target_pertahun">
                Persenan Tercapai Target Pertahun
                <span className="text-sm font-normal text-gray-500">
                  (realisasi_proxy / target_satuan)
                </span>
              </Label>
              <Input
                id="persenan_tercapai_target_pertahun"
                type="number"
                step="0.01"
                value={formData.persenan_tercapai_target_pertahun}
                onChange={(e) => handleInputChange('persenan_tercapai_target_pertahun', e.target.value)}
                placeholder="Otomatis terisi berdasarkan perhitungan"
                className={`${errors.persenan_tercapai_target_pertahun ? 'border-red-500' : ''} bg-gray-50`}
                disabled
                readOnly
              />
              {errors.persenan_tercapai_target_pertahun && (
                <p className="text-sm text-red-500">{errors.persenan_tercapai_target_pertahun}</p>
              )}
            </div>
          </div>
          {achievementPercentage !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Persentase Pencapaian</p>
                  <p className={`text-2xl font-bold ${getAchievementColor(achievementPercentage)}`}>
                    {achievementPercentage.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Description and Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batas_waktu">Batas Waktu *</Label>
                <Input
                  id="batas_waktu"
                  type="date"
                  value={formData.batas_waktu}
                  onChange={(e) => handleInputChange('batas_waktu', e.target.value)}
                  className={errors.batas_waktu ? 'border-red-500' : ''}
                />
                {errors.batas_waktu && (
                  <p className="text-sm text-red-500">{errors.batas_waktu}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <Badge className={status.color}>
                            {status.label}
                          </Badge>
                          <span className="text-sm">{status.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Solutions, Challenges, and Links */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="solusi">Solusi/Strategi</Label>
                <Textarea
                  id="solusi"
                  value={formData.solusi}
                  onChange={(e) => handleInputChange('solusi', e.target.value)}
                  placeholder="Jelaskan solusi atau strategi yang digunakan untuk mencapai realisasi"
                  rows={3}
                  className={errors.solusi ? 'border-red-500' : ''}
                />
                {errors.solusi && (
                  <p className="text-sm text-red-500">{errors.solusi}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="kendala">Kendala/Hambatan</Label>
                <Textarea
                  id="kendala"
                  value={formData.kendala}
                  onChange={(e) => handleInputChange('kendala', e.target.value)}
                  placeholder="Jelaskan kendala atau hambatan yang dihadapi (jika ada)"
                  rows={3}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="link_bdk">Link Bukti Dukung</Label>
                <Input
                  id="link_bdk"
                  type="url"
                  value={formData.link_bdk}
                  onChange={(e) => handleInputChange('link_bdk', e.target.value)}
                  placeholder="https://example.com/bukti-dukung"
                  className={errors.link_bdk ? 'border-red-500' : ''}
                />
                {errors.link_bdk && (
                  <p className="text-sm text-red-500">{errors.link_bdk}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachment">File Lampiran</Label>
                <Input
                  id="attachment"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
              </div>
            </div>
          </div>

          {/* Selected Information Display */}
          {((formData.jenis_indikator === 'iku' ? selectedIKUData : selectedProksiData) && selectedTargetData) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-2">Ringkasan Realisasi:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-green-700">
                    <div>
                      <p>
                        <strong>{formData.jenis_indikator === 'iku' ? 'IKU' : 'Proksi'}:</strong>{' '}
                        {formData.jenis_indikator === 'iku'
                          ? selectedIKUData.nama_iku
                          : selectedProksiData?.indikatorKinerja?.nama_indikator || selectedProksiData?.id_proksi}
                      </p>
                      <p><strong>Target:</strong> {selectedTargetValueDisplay}</p>
                    </div>
                    <div>
                      {selectedPeriodData && (
                        <p><strong>Periode:</strong> {formatPeriodLabel(selectedPeriodData)}</p>
                      )}
                      {!selectedPeriodData && formData.periode && (
                        <p><strong>Periode:</strong> {formData.periode}</p>
                      )}
                      {formData.realisasi && (
                        <p>
                          <strong>Realisasi:</strong>{' '}
                          {realisasiDisplay}
                          {selectedTargetIsPercentage ? '%' : ''}
                        </p>
                      )}
                      {formData.realisasi_proxy && (
                        <p>
                          <strong>Realisasi Proxy:</strong>{' '}
                          {realisasiProxyDisplay}
                          {selectedTargetIsPercentage ? '%' : ''}
                        </p>
                      )}
                      {achievementPercentage !== null && (
                        <p><strong>Pencapaian:</strong> 
                          <span className={getAchievementColor(achievementPercentage)}>
                            {' '}{achievementPercentage.toFixed(2)}%
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warning for low achievement */}
          {achievementPercentage !== null && achievementPercentage < 80 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Perhatian:</p>
                  <p className="text-yellow-700">
                    Pencapaian realisasi di bawah 80%. Pastikan untuk mengisi kendala dan solusi 
                    yang tepat untuk meningkatkan pencapaian di periode selanjutnya.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Menyimpan...' : (isEdit ? 'Update Realisasi' : 'Simpan Realisasi')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
