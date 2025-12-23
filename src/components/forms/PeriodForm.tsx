import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PeriodFormData {
  tahun: string;
  triwulan: string;
  bulan: string;
  periode_type: 'tahunan' | 'triwulanan' | 'bulanan';
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: 'aktif' | 'nonaktif' | 'selesai';
}

interface PeriodFormProps {
  initialData?: Partial<PeriodFormData>;
  onSubmit: (data: PeriodFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

const initialFormData: PeriodFormData = {
  tahun: new Date().getFullYear().toString(),
  triwulan: '',
  bulan: '',
  periode_type: 'tahunan',
  tanggal_mulai: '',
  tanggal_selesai: '',
  status: 'aktif',
};

const periodeTypeOptions = [
  { value: 'tahunan', label: 'Tahunan', description: 'Periode satu tahun penuh' },
  { value: 'triwulanan', label: 'Quarterly', description: 'Periode tiga bulan (kuartal)' },
  { value: 'bulanan', label: 'Bulanan', description: 'Periode satu bulan' }
];

const statusOptions = [
  { value: 'aktif', label: 'Aktif', description: 'Periode sedang berjalan' },
  { value: 'nonaktif', label: 'Non Aktif', description: 'Periode belum dimulai' },
  { value: 'selesai', label: 'Selesai', description: 'Periode sudah berakhir' }
];

const triwulanOptions = [
  { value: '1', label: 'TW 1', months: 'Januari - Maret' },
  { value: '2', label: 'TW 2', months: 'April - Juni' },
  { value: '3', label: 'TW 3', months: 'Juli - September' },
  { value: '4', label: 'TW 4', months: 'Oktober - Desember' }
];

const bulanOptions = [
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' }
];

export function PeriodForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  isEdit = false 
}: PeriodFormProps) {
  const [formData, setFormData] = useState<PeriodFormData>({
    ...initialFormData,
    ...initialData
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when initialData changes
  useEffect(() => {
    setFormData({
      ...initialFormData,
      ...initialData
    });
  }, [initialData]);

  // Auto-generate dates when periode_type, tahun, triwulan, or bulan changes
  useEffect(() => {
    if (formData.tahun && formData.periode_type) {
      const year = parseInt(formData.tahun);
      let startDate = '';
      let endDate = '';

      switch (formData.periode_type) {
        case 'tahunan':
          startDate = `${year}-01-01`;
          endDate = `${year}-12-31`;
          break;
        
        case 'triwulanan':
          if (formData.triwulan) {
            const quarter = parseInt(formData.triwulan);
            const startMonth = (quarter - 1) * 3 + 1;
            const endMonth = quarter * 3;
            
            startDate = `${year}-${startMonth.toString().padStart(2, '0')}-01`;
            
            // Get last day of end month
            const lastDay = new Date(year, endMonth, 0).getDate();
            endDate = `${year}-${endMonth.toString().padStart(2, '0')}-${lastDay}`;
          }
          break;
        
        case 'bulanan':
          if (formData.bulan) {
            const month = parseInt(formData.bulan);
            startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
            
            // Get last day of month
            const lastDay = new Date(year, month, 0).getDate();
            endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
          }
          break;
      }

      if (startDate && endDate) {
        setFormData(prev => ({
          ...prev,
          tanggal_mulai: startDate,
          tanggal_selesai: endDate
        }));
      }
    }
  }, [formData.tahun, formData.periode_type, formData.triwulan, formData.bulan]);

  // Clear triwulan and bulan when periode_type changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      triwulan: formData.periode_type === 'triwulanan' ? prev.triwulan : '',
      bulan: formData.periode_type === 'bulanan' ? prev.bulan : ''
    }));
  }, [formData.periode_type]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.tahun) {
      newErrors.tahun = 'Tahun wajib diisi';
    } else {
      const year = parseInt(formData.tahun);
      const currentYear = new Date().getFullYear();
      if (year < 2020 || year > currentYear + 5) {
        newErrors.tahun = `Tahun harus antara 2020 - ${currentYear + 5}`;
      }
    }

    if (!formData.periode_type) {
      newErrors.periode_type = 'Tipe periode wajib dipilih';
    }

    if (formData.periode_type === 'triwulanan' && !formData.triwulan) {
      newErrors.triwulan = 'Quarter wajib dipilih untuk periode quarterly';
    }

    if (formData.periode_type === 'bulanan' && !formData.bulan) {
      newErrors.bulan = 'Bulan wajib dipilih untuk periode bulanan';
    }

    if (!formData.tanggal_mulai) {
      newErrors.tanggal_mulai = 'Tanggal mulai wajib diisi';
    }

    if (!formData.tanggal_selesai) {
      newErrors.tanggal_selesai = 'Tanggal selesai wajib diisi';
    }

    // Date validation
    if (formData.tanggal_mulai && formData.tanggal_selesai) {
      const startDate = new Date(formData.tanggal_mulai);
      const endDate = new Date(formData.tanggal_selesai);
      
      if (startDate >= endDate) {
        newErrors.tanggal_selesai = 'Tanggal selesai harus setelah tanggal mulai';
      }

      // Check if dates are reasonable for the period type
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (formData.periode_type) {
        case 'tahunan':
          if (daysDiff < 360 || daysDiff > 370) {
            newErrors.tanggal_selesai = 'Periode tahunan harus sekitar 365 hari';
          }
          break;
        case 'triwulanan':
          if (daysDiff < 85 || daysDiff > 95) {
            newErrors.tanggal_selesai = 'Periode triwulanan harus sekitar 90 hari';
          }
          break;
        case 'bulanan':
          if (daysDiff < 25 || daysDiff > 35) {
            newErrors.tanggal_selesai = 'Periode bulanan harus sekitar 30 hari';
          }
          break;
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

  const handleInputChange = (field: keyof PeriodFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let year = 2020; year <= currentYear + 5; year++) {
      years.push({ value: year.toString(), label: year.toString() });
    }
    
    return years;
  };

  const getPeriodLabel = (): string => {
    if (!formData.tahun) return '';
    
    const year = formData.tahun;
    switch (formData.periode_type) {
      case 'tahunan':
        return `Tahun ${year}`;
      case 'triwulanan':
        if (formData.triwulan) {
          const quarter = triwulanOptions.find(t => t.value === formData.triwulan);
          return `${quarter?.label} ${year}`;
        }
        return '';
      case 'bulanan':
        if (formData.bulan) {
          const month = bulanOptions.find(b => b.value === formData.bulan);
          return `${month?.label} ${year}`;
        }
        return '';
      default:
        return '';
    }
  };

  const calculateDuration = (): number => {
    if (!formData.tanggal_mulai || !formData.tanggal_selesai) return 0;
    
    const startDate = new Date(formData.tanggal_mulai);
    const endDate = new Date(formData.tanggal_selesai);
    
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {isEdit ? 'Edit Periode' : 'Tambah Periode Baru'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Period Type and Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periode_type">Tipe Periode *</Label>
              <Select 
                value={formData.periode_type} 
                onValueChange={(value) => handleInputChange('periode_type', value)}
              >
                <SelectTrigger className={errors.periode_type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Pilih tipe periode" />
                </SelectTrigger>
                <SelectContent>
                  {periodeTypeOptions.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.periode_type && (
                <p className="text-sm text-red-500">{errors.periode_type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tahun">Tahun *</Label>
              <Select 
                value={formData.tahun} 
                onValueChange={(value) => handleInputChange('tahun', value)}
              >
                <SelectTrigger className={errors.tahun ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  {generateYearOptions().map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tahun && (
                <p className="text-sm text-red-500">{errors.tahun}</p>
              )}
            </div>
          </div>

          {/* Conditional Fields for Triwulan/Bulan */}
          {formData.periode_type === 'triwulanan' && (
            <div className="space-y-2">
              <Label htmlFor="triwulan">Quarter *</Label>
              <Select 
                value={formData.triwulan} 
                onValueChange={(value) => handleInputChange('triwulan', value)}
              >
                <SelectTrigger className={errors.triwulan ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Pilih triwulan" />
                </SelectTrigger>
                <SelectContent>
                  {triwulanOptions.map((triwulan) => (
                    <SelectItem key={triwulan.value} value={triwulan.value}>
                      <div className="flex flex-col">
                        <div className="font-medium">{triwulan.label}</div>
                        <div className="text-sm text-gray-500">{triwulan.months}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.triwulan && (
                <p className="text-sm text-red-500">{errors.triwulan}</p>
              )}
            </div>
          )}

          {formData.periode_type === 'bulanan' && (
            <div className="space-y-2">
              <Label htmlFor="bulan">Bulan *</Label>
              <Select 
                value={formData.bulan} 
                onValueChange={(value) => handleInputChange('bulan', value)}
              >
                <SelectTrigger className={errors.bulan ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Pilih bulan" />
                </SelectTrigger>
                <SelectContent>
                  {bulanOptions.map((bulan) => (
                    <SelectItem key={bulan.value} value={bulan.value}>
                      {bulan.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bulan && (
                <p className="text-sm text-red-500">{errors.bulan}</p>
              )}
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tanggal_mulai">Tanggal Mulai *</Label>
              <Input
                id="tanggal_mulai"
                type="date"
                value={formData.tanggal_mulai}
                onChange={(e) => handleInputChange('tanggal_mulai', e.target.value)}
                className={errors.tanggal_mulai ? 'border-red-500' : ''}
              />
              {errors.tanggal_mulai && (
                <p className="text-sm text-red-500">{errors.tanggal_mulai}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal_selesai">Tanggal Selesai *</Label>
              <Input
                id="tanggal_selesai"
                type="date"
                value={formData.tanggal_selesai}
                onChange={(e) => handleInputChange('tanggal_selesai', e.target.value)}
                className={errors.tanggal_selesai ? 'border-red-500' : ''}
              />
              {errors.tanggal_selesai && (
                <p className="text-sm text-red-500">{errors.tanggal_selesai}</p>
              )}
            </div>
          </div>

          {/* Status */}
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
                    <div className="flex flex-col">
                      <div className="font-medium">{status.label}</div>
                      <div className="text-sm text-gray-500">{status.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Summary */}
          {getPeriodLabel() && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Ringkasan Periode:</p>
                  <div className="space-y-1 text-blue-700">
                    <p><strong>Nama Periode:</strong> {getPeriodLabel()}</p>
                    <p><strong>Tipe:</strong> {periodeTypeOptions.find(t => t.value === formData.periode_type)?.label}</p>
                    {formData.tanggal_mulai && formData.tanggal_selesai && (
                      <>
                        <p><strong>Tanggal:</strong> {' '}
                          {new Date(formData.tanggal_mulai).toLocaleDateString('id-ID')} - {' '}
                          {new Date(formData.tanggal_selesai).toLocaleDateString('id-ID')}
                        </p>
                        <p><strong>Durasi:</strong> {calculateDuration()} hari</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Information Box */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">Panduan Periode:</p>
                <ul className="space-y-1 text-green-700">
                  <li>• Periode tahunan: Untuk target dan evaluasi tahunan</li>
                  <li>• Periode triwulanan: Untuk monitoring kuartalan</li>
                  <li>• Periode bulanan: Untuk tracking bulanan yang detail</li>
                  <li>• Pastikan tidak ada periode yang tumpang tindih</li>
                  <li>• Status 'Aktif' hanya boleh ada satu per tipe periode</li>
                </ul>
              </div>
            </div>
          </div>

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
              {isLoading ? 'Menyimpan...' : (isEdit ? 'Update Periode' : 'Buat Periode')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
