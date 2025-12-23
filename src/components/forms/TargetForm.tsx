import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Target, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../services/api';

interface IKU {
  id_iku: number;
  nama_iku: string;
  status: string;
  target_iku?: number;
  persenan_target?: number;
  satuan_target?: number;
  tim?: {
    id_tim: number;
    nama_tim: string;
  };
}

interface Period {
  periode: string;
  tahun: number;
  triwulan?: number;
  bulan?: number;
  periode_type: 'tahunan' | 'triwulanan' | 'bulanan';
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: string;
}

interface TargetFormData {
  id_iku: string;
  periode: string;
  persenan_target: string;
  satuan: string;
  keterangan: string;
  status: 'draft' | 'aktif' | 'selesai';
}

interface TargetFormProps {
  initialData?: Partial<TargetFormData>;
  ikus: IKU[];
  periods: Period[];
  onSubmit: (data: TargetFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
  userRole?: string;
}

const initialFormData: TargetFormData = {
  id_iku: '',
  periode: '',
  persenan_target: '',
  satuan: '',
  keterangan: '',
  status: 'draft',
};

const statusOptions = [
  { value: 'draft', label: 'Draft', description: 'Target masih dalam tahap perencanaan' },
  { value: 'aktif', label: 'Aktif', description: 'Target sudah ditetapkan dan berlaku' },
  { value: 'selesai', label: 'Selesai', description: 'Periode target sudah berakhir' }
];

export function TargetForm({ 
  initialData, 
  ikus, 
  periods, 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  isEdit = false,
  userRole = 'staff'
}: TargetFormProps) {
  const [formData, setFormData] = useState<TargetFormData>({
    ...initialFormData,
    ...initialData
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedIKU, setSelectedIKU] = useState<IKU | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [targets, setTargets] = useState<any[]>([]);
  const [existingTargets, setExistingTargets] = useState<any[]>([]);

  // Load existing targets for auto-fill logic
  useEffect(() => {
    const loadTargets = async () => {
      try {
        const response = await apiService.getTargets();
        const targetsData = Array.isArray(response) ? response : (response as any)?.data || [];
        setTargets(targetsData);
      } catch (error) {
        // console.error('Error loading targets:', error);
      }
    };
    
    loadTargets();
  }, []);

  // Load existing targets for selected IKU
  useEffect(() => {
    if (formData.id_iku) {
      const ikuTargets = targets.filter(t => t.id_iku === parseInt(formData.id_iku));
      setExistingTargets(ikuTargets);
    } else {
      setExistingTargets([]);
    }
  }, [formData.id_iku, targets]);

  // Reset form when initialData changes
  useEffect(() => {
    setFormData({
      ...initialFormData,
      ...initialData
    });
  }, [initialData]);

  // Update selected IKU when id_iku changes
  useEffect(() => {
    if (formData.id_iku) {
      const iku = ikus.find(i => i.id_iku.toString() === formData.id_iku);
      setSelectedIKU(iku || null);
      
      // Auto-fill persenan_target from IKU
      if (iku && iku.persenan_target !== undefined && iku.persenan_target !== null) {
        const persenValue = iku.persenan_target;
        setFormData(prev => ({
          ...prev,
          persenan_target: persenValue.toString()
        }));
      }
    } else {
      setSelectedIKU(null);
    }
  }, [formData.id_iku, ikus]);

  // Update selected period when periode changes
  useEffect(() => {
    if (formData.periode) {
      const period = periods.find(p => p.periode === formData.periode);
      setSelectedPeriod(period || null);
    } else {
      setSelectedPeriod(null);
    }
  }, [formData.periode, periods]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.id_iku) {
      newErrors.id_iku = 'IKU wajib dipilih';
    }

    if (!formData.periode) {
      newErrors.periode = 'Periode wajib dipilih';
    }

    // Remove persenan_target validation (not used)

    // Satuan proxy validation - tidak boleh melebihi satuan_target
    if (formData.satuan.trim()) {
      const satuanValue = parseFloat(formData.satuan);
      const satuanTargetValue = selectedIKU?.satuan_target || 0;
      
      if (isNaN(satuanValue)) {
        newErrors.satuan = 'Satuan proxy harus berupa angka';
      } else if (satuanValue < 0) {
        newErrors.satuan = 'Satuan proxy tidak boleh negatif';
      } else if (satuanTargetValue > 0 && satuanValue > satuanTargetValue) {
        newErrors.satuan = `Satuan proxy tidak boleh melebihi satuan target (${satuanTargetValue})`;
      }
    }

    // Satuan proxy validation
    if (formData.satuan.trim()) {
      const satuanValue = parseFloat(formData.satuan);
    const satuanTargetValue = selectedIKU?.satuan_target || 0;
      
      if (isNaN(satuanValue)) {
        newErrors.satuan = 'Satuan proxy harus berupa angka';
      } else if (satuanValue < 0) {
        newErrors.satuan = 'Satuan proxy tidak boleh negatif';
      } else if (satuanTargetValue > 0 && satuanValue > satuanTargetValue) {
        newErrors.satuan = `Satuan proxy tidak boleh melebihi satuan target (${satuanTargetValue})`;
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

  const handleInputChange = (field: keyof TargetFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear target when IKU changes
    if (field === 'id_iku') {
      setFormData(prev => ({ ...prev, satuan: '' }));
    }
  };

  const formatPeriodLabel = (period: Period): string => {
    const year = period.tahun;
    switch (period.periode_type) {
      case 'tahunan':
        return `Tahun ${year}`;
      case 'triwulanan':
        return `Q${period.triwulan} ${year}`;
      case 'bulanan':
        const monthNames = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${monthNames[(period.bulan || 1) - 1]} ${year}`;
      default:
        return `Periode ${year}`;
    }
  };

  const getTargetInputPlaceholder = (): string => {
    if (!selectedIKU) return 'Masukkan nilai target';
    
    // target_type removed, default to numeric
    return 'Contoh: 100';
  };

  // Filter IKUs based on user role
  const availableIKUs = ikus.filter(iku => {
    if (userRole === 'admin') return iku.status === 'aktif';
    // For ketua_tim and staff, only show IKUs from their team
    return iku.status === 'aktif';
  });

  // Filter periods to only show active ones
  const availablePeriods = periods.filter(period => period.status === 'aktif');

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          {isEdit ? 'Edit Target' : 'Tambah Target Baru'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* IKU and Period Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id_iku">Pilih IKU *</Label>
              <Select 
                value={formData.id_iku} 
                onValueChange={(value) => handleInputChange('id_iku', value)}
              >
                <SelectTrigger className={errors.id_iku ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Pilih IKU" />
                </SelectTrigger>
                <SelectContent>
                  {availableIKUs.map((iku) => (
                    <SelectItem key={iku.id_iku} value={iku.id_iku.toString()}>
                      <div className="flex flex-col">
                        <div className="font-medium">{iku.nama_iku}</div>
                        <div className="text-sm text-gray-500">
                          N/A
                          {iku.tim && ` | Tim: ${iku.tim.nama_tim}`}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.id_iku && (
                <p className="text-sm text-red-500">{errors.id_iku}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="periode">Periode Target *</Label>
              <Select 
                value={formData.periode} 
                onValueChange={(value) => handleInputChange('periode', value)}
              >
                <SelectTrigger className={errors.periode ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.map((period) => (
                    <SelectItem key={period.periode} value={period.periode}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{formatPeriodLabel(period)}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(period.tanggal_mulai).toLocaleDateString('id-ID')} - {' '}
                            {new Date(period.tanggal_selesai).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.periode && (
                <p className="text-sm text-red-500">{errors.periode}</p>
              )}
            </div>
          </div>

        {/* Show IKU Target Reference */}
        {selectedIKU && selectedIKU.target_iku && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Acuan Target:</strong> {selectedIKU.target_iku} ({selectedIKU.persenan_target || 100}%)
            </p>
          </div>
        )}

          {/* Target Values */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* persenan_target removed */}
          </div>

          {/* Riwayat Target untuk IKU yang dipilih */}
          {existingTargets.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Riwayat Target untuk IKU ini:</h4>
              <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-600 mb-2">
                  <div>Periode</div>
                  <div>Satuan Proxy</div>
                </div>
                {existingTargets.map((target, index) => (
                <div key={index} className="grid grid-cols-2 gap-2 text-xs py-1 border-b border-gray-200 last:border-b-0">
                    <div className="font-medium">{target.periode}</div>
                    <div>{target.satuan || '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="satuan">
                Satuan Proxy (Opsional)
                {selectedIKU && (
                  <span className="text-sm font-normal text-gray-500">
                    (Contoh: 10 laporan, 5 dokumen)
                  </span>
                )}
              </Label>
              <Input
                id="satuan"
                type="number"
                step="1"
                value={formData.satuan}
                onChange={(e) => handleInputChange('satuan', e.target.value)}
                placeholder="Masukkan satuan proxy (contoh: 10 laporan)"
                className={errors.satuan ? 'border-red-500' : ''}
              />
              {errors.satuan && (
                <p className="text-sm text-red-500">{errors.satuan}</p>
              )}
            </div>
          </div>

          {/* Description and Status */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keterangan">Keterangan Target *</Label>
              <Textarea
                id="keterangan"
                value={formData.keterangan}
                onChange={(e) => handleInputChange('keterangan', e.target.value)}
                placeholder="Jelaskan detail target, strategi pencapaian, atau catatan penting lainnya"
                rows={4}
                className={errors.keterangan ? 'border-red-500' : ''}
              />
              {errors.keterangan && (
                <p className="text-sm text-red-500">{errors.keterangan}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status Target *</Label>
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
                      <div className="flex flex-col">
                        <div className="font-medium">{status.label}</div>
                        <div className="text-sm text-gray-500">{status.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected IKU Information */}
          {selectedIKU && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Informasi IKU Terpilih:</p>
                  <div className="space-y-1 text-blue-700">
                    <p><strong>Nama:</strong> {selectedIKU.nama_iku}</p>
                    {selectedIKU.target_iku && (
                      <p><strong>Target IKU:</strong> {selectedIKU.target_iku}</p>
                    )}
                    {selectedIKU.persenan_target && (
                      <p><strong>Persenan Target:</strong> {selectedIKU.persenan_target}%</p>
                    )}
                    {selectedIKU.tim && (
                      <p><strong>Tim:</strong> {selectedIKU.tim.nama_tim}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Period Information */}
          {selectedPeriod && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">Informasi Periode Terpilih:</p>
                  <div className="space-y-1 text-green-700">
                    <p><strong>Periode:</strong> {formatPeriodLabel(selectedPeriod)}</p>
                    <p><strong>Tanggal:</strong> {' '}
                      {new Date(selectedPeriod.tanggal_mulai).toLocaleDateString('id-ID')} - {' '}
                      {new Date(selectedPeriod.tanggal_selesai).toLocaleDateString('id-ID')}
                    </p>
                    <p><strong>Tipe:</strong> {selectedPeriod.periode_type}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warning for existing targets */}
          {!isEdit && selectedIKU && selectedPeriod && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Perhatian:</p>
                  <p className="text-yellow-700">
                    Pastikan tidak ada target yang sudah dibuat untuk IKU dan periode yang sama. 
                    Target yang duplikat dapat menyebabkan konflik dalam pelaporan.
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
              {isLoading ? 'Menyimpan...' : (isEdit ? 'Update Target' : 'Buat Target')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
