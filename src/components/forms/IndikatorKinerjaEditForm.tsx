import React, { useState, useEffect } from 'react';
import { FormField } from './FormField';
import { FormDialog } from './FormDialog';
import { useTeams } from '../../hooks/useTeams';
import { useAuth } from '../../pages/AuthProvider';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import type { IndikatorKinerja, IKU, Proksi } from '../../types/models';

interface IndikatorKinerjaEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indikator: IndikatorKinerja | null;
  onSuccess?: () => void;
}

export function IndikatorKinerjaEditForm({ open, onOpenChange, indikator, onSuccess }: IndikatorKinerjaEditFormProps) {
  const { teams } = useTeams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [iku, setIku] = useState<IKU | null>(null);
  const [proksi, setProksi] = useState<Proksi | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const [formData, setFormData] = useState({
    nama_indikator: '',
    jenis: 'iku' as 'iku' | 'proksi',
    id_tim: '',
    // IKU fields
    tipe: 'poin' as 'poin' | 'persen',
    target_poin: '',
    target_persentase: '',
    target_per_tahun_iku: '', // target_per_tahun untuk IKU
    // Proksi fields
    target_persentase_proksi: '', // Target persentase untuk Proksi
    target_per_tahun: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load IKU or Proksi details when indikator changes
  useEffect(() => {
    if (indikator) {
      setLoadingDetails(true);
      loadDetails();
    }
  }, [indikator]);

  const loadDetails = async () => {
    if (!indikator) return;
    
    try {
      if (indikator.jenis === 'iku') {
        const ikusResponse = await apiService.getIKUs('indikatorKinerja', 100, 1);
        const ikusData = Array.isArray(ikusResponse) ? ikusResponse : ikusResponse?.data || [];
        const foundIku = ikusData.find((i: IKU) => i.id_indikator_kinerja === indikator.id_indikator_kinerja);
        setIku(foundIku || null);
      } else if (indikator.jenis === 'proksi') {
        const proksisResponse = await apiService.getProksis('indikatorKinerja', 100, 1);
        const proksisData = Array.isArray(proksisResponse) ? proksisResponse : proksisResponse?.data || [];
        const foundProksi = proksisData.find((p: Proksi) => p.id_indikator_kinerja === indikator.id_indikator_kinerja);
        setProksi(foundProksi || null);
      }
    } catch (error) {
      // console.error('Error loading details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Populate form when indikator or details change
  useEffect(() => {
    if (indikator) {
      setFormData({
        nama_indikator: indikator.nama_indikator || '',
        jenis: indikator.jenis || 'iku',
        id_tim: indikator.id_tim?.toString() || '',
        tipe: iku?.tipe || 'poin',
        target_poin: iku?.target_poin?.toString() || '',
        target_persentase: iku?.target_persentase?.toString() || '',
        target_per_tahun_iku: iku?.target_per_tahun?.toString() || '',
        target_persentase_proksi: (proksi as any)?.target_persentase?.toString() || '',
        target_per_tahun: proksi?.target_per_tahun?.toString() || '',
      });
      setErrors({});
    }
  }, [indikator, iku, proksi]);

  // Auto-fill team for team leaders
  useEffect(() => {
    if (user && user.role === 'ketua_tim' && user.id_tim && indikator && indikator.id_tim === user.id_tim) {
      setFormData(prev => ({
        ...prev,
        id_tim: user.id_tim.toString()
      }));
    }
  }, [user, indikator]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nama_indikator.trim()) {
      newErrors.nama_indikator = 'Nama Indikator wajib diisi';
    }

    if (!formData.id_tim) {
      newErrors.id_tim = 'Tim wajib dipilih';
    }

    // Validate IKU fields if jenis is iku
    if (formData.jenis === 'iku') {
      if (!formData.tipe) {
        newErrors.tipe = 'Tipe IKU wajib dipilih';
      }
      
      if (formData.tipe === 'poin') {
        if (!formData.target_poin) {
          newErrors.target_poin = 'Target Poin wajib diisi untuk tipe poin';
        } else {
          const targetValue = parseInt(formData.target_poin);
          if (isNaN(targetValue) || targetValue < 0) {
            newErrors.target_poin = 'Target Poin harus berupa angka positif';
          }
        }
      } else if (formData.tipe === 'persen') {
        if (!formData.target_persentase) {
          newErrors.target_persentase = 'Target Persentase wajib diisi untuk tipe persen';
        } else {
          const targetValue = parseInt(formData.target_persentase);
          if (isNaN(targetValue) || targetValue < 0 || targetValue > 100) {
            newErrors.target_persentase = 'Target Persentase harus berupa angka antara 0-100';
          }
        }
      }
      
      // Validate target_per_tahun for IKU (optional but recommended)
      if (formData.target_per_tahun_iku) {
        const targetValue = parseInt(formData.target_per_tahun_iku);
        if (isNaN(targetValue) || targetValue < 0) {
          newErrors.target_per_tahun_iku = 'Target IKU/Proksi harus berupa angka positif';
        }
      }
    }
    
    // Validate Proksi fields if jenis is proksi
    if (formData.jenis === 'proksi') {
      if (!formData.target_persentase_proksi) {
        newErrors.target_persentase_proksi = 'Target Persentase wajib diisi';
      } else {
        const targetValue = parseInt(formData.target_persentase_proksi);
        if (isNaN(targetValue) || targetValue < 0 || targetValue > 100) {
          newErrors.target_persentase_proksi = 'Target Persentase harus berupa angka antara 0-100';
        }
      }
      
      if (formData.target_per_tahun) {
        const targetValue = parseInt(formData.target_per_tahun);
        if (isNaN(targetValue) || targetValue < 0) {
          newErrors.target_per_tahun = 'Target IKU/Proksi harus berupa angka positif';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!indikator) return;
    
    if (!validateForm()) {
      toast.error('Mohon perbaiki error yang ada');
      return;
    }

    try {
      setIsLoading(true);
      
      // Step 1: Update Indikator Kinerja
      const indikatorData = {
        nama_indikator: formData.nama_indikator.trim(),
        id_tim: parseInt(formData.id_tim),
      };
      
      await apiService.updateIndikatorKinerja(indikator.id_indikator_kinerja, indikatorData);
      
      // Step 2: Update IKU or Proksi based on jenis
      if (formData.jenis === 'iku' && iku) {
        const ikuData: any = {
          tipe: formData.tipe,
        };
        
        if (formData.tipe === 'poin') {
          ikuData.target_poin = parseInt(formData.target_poin);
          ikuData.target_persentase = null;
        } else {
          ikuData.target_persentase = parseInt(formData.target_persentase);
          ikuData.target_poin = null;
        }
        
        // Add target_per_tahun if provided
        if (formData.target_per_tahun_iku) {
          ikuData.target_per_tahun = parseInt(formData.target_per_tahun_iku);
        } else {
          ikuData.target_per_tahun = null;
        }
        
        await apiService.updateIKU(iku.id_iku, ikuData);
      } else if (formData.jenis === 'proksi' && proksi) {
        const proksiData: any = {
          target_persentase: formData.target_persentase_proksi ? parseInt(formData.target_persentase_proksi) : null,
        };
        
        // Add target_per_tahun if provided
        if (formData.target_per_tahun && formData.target_per_tahun.trim() !== '') {
          const tahunValue = parseInt(formData.target_per_tahun);
          if (!isNaN(tahunValue)) {
            proksiData.target_per_tahun = tahunValue;
          }
        } else {
          proksiData.target_per_tahun = null;
        }
        
        await apiService.updateProksi(proksi.id_proksi, proksiData);
      }
      
      toast.success('Indikator Kinerja berhasil diperbarui');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      // console.error('Error updating indikator kinerja:', error);
      
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        Object.entries(backendErrors).forEach(([field, messages]: [string, any]) => {
          if (Array.isArray(messages)) {
            messages.forEach((message: string) => toast.error(`${field}: ${message}`));
          } else {
            toast.error(`${field}: ${messages}`);
          }
        });
      } else {
        toast.error(error.message || 'Gagal memperbarui Indikator Kinerja');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const jenisOptions = [
    { value: 'iku', label: 'IKU' },
    { value: 'proksi', label: 'Proksi' }
  ];

  const tipeOptions = [
    { value: 'poin', label: 'Poin (Non %)' },
    { value: 'persen', label: 'Persen (%)' }
  ];

  const teamOptions = teams.map(team => ({
    value: team.id_tim.toString(),
    label: team.nama_tim
  }));

  if (!indikator) return null;

  if (loadingDetails) {
    return (
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Edit Indikator Kinerja"
        description="Memuat data..."
        onSubmit={() => {}}
        isLoading={true}
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Memuat data...</span>
        </div>
      </FormDialog>
    );
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Indikator Kinerja"
      description="Perbarui informasi Indikator Kinerja yang ada"
      onSubmit={handleSubmit}
      isLoading={isLoading}
    >
      {/* Basic Information Section */}
      <div className="space-y-3">
        <div className="border-l-4 border-primary pl-2">
          <h3 className="text-sm font-semibold text-foreground">Informasi Dasar</h3>
        </div>
        
        <FormField
          label="Nama Indikator"
          name="nama_indikator"
          value={formData.nama_indikator}
          onChange={(value) => handleInputChange('nama_indikator', value)}
          placeholder="Masukkan nama indikator kinerja"
          required
          error={errors.nama_indikator}
        />

        <FormField
          label="Jenis"
          name="jenis"
          type="select"
          value={formData.jenis}
          onChange={(value) => handleInputChange('jenis', value)}
          options={jenisOptions}
          placeholder="Pilih jenis indikator"
          required
          error={errors.jenis}
          disabled={true}
        />

        <FormField
          label="Tim"
          name="id_tim"
          type="select"
          value={formData.id_tim}
          onChange={(value) => handleInputChange('id_tim', value)}
          options={teamOptions}
          placeholder="Pilih tim"
          required
          error={errors.id_tim}
          disabled={user?.role === 'ketua_tim' && indikator?.id_tim === user.id_tim}
        />
      </div>

      {/* IKU Configuration Section */}
      {formData.jenis === 'iku' && (
        <div className="space-y-3">
          <div className="border-l-4 border-accent pl-2">
            <h3 className="text-sm font-semibold text-foreground">Konfigurasi IKU</h3>
          </div>
          
          <FormField
            label="Tipe IKU"
            name="tipe"
            type="select"
            value={formData.tipe}
            onChange={(value) => handleInputChange('tipe', value)}
            options={tipeOptions}
            placeholder="Pilih tipe IKU"
            required
            error={errors.tipe}
          />

          {formData.tipe === 'poin' && (
            <FormField
              label="Target Poin"
              name="target_poin"
              value={formData.target_poin}
              onChange={(value) => handleInputChange('target_poin', value)}
              placeholder="Masukkan target poin (contoh: 100)"
              type="number"
              required
              error={errors.target_poin}
            />
          )}

          {formData.tipe === 'persen' && (
            <FormField
              label="Target Persentase"
              name="target_persentase"
              type="number"
              value={formData.target_persentase}
              onChange={(value) => handleInputChange('target_persentase', value)}
              placeholder="Masukkan target persentase (0-100)"
              required
              error={errors.target_persentase}
            />
          )}

          <FormField
            label="Target IKU"
            name="target_per_tahun_iku"
            type="number"
            value={formData.target_per_tahun_iku}
            onChange={(value) => handleInputChange('target_per_tahun_iku', value)}
            placeholder="Masukkan Target IKU - Opsional"
            error={errors.target_per_tahun_iku}
          />
        </div>
      )}

      {/* Proksi Configuration Section */}
      {formData.jenis === 'proksi' && (
        <div className="space-y-3">
          <div className="border-l-4 border-accent pl-2">
            <h3 className="text-sm font-semibold text-foreground">Konfigurasi Proksi</h3>
          </div>
          
          <FormField
            label="Target Persentase"
            name="target_persentase_proksi"
            type="number"
            value={formData.target_persentase_proksi}
            onChange={(value) => handleInputChange('target_persentase_proksi', value)}
            placeholder="Masukkan target persentase (0-100)"
            required
            error={errors.target_persentase_proksi}
          />
          
          <FormField
            label="Target Proksi"
            name="target_per_tahun"
            type="number"
            value={formData.target_per_tahun}
            onChange={(value) => handleInputChange('target_per_tahun', value)}
            placeholder="Masukkan Target Proksi - Opsional"
            error={errors.target_per_tahun}
          />
        </div>
      )}
    </FormDialog>
  );
}

