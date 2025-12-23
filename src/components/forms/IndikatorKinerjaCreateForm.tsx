import React, { useState, useEffect } from 'react';
import { FormField } from './FormField';
import { FormDialog } from './FormDialog';
import { useTeams } from '../../hooks/useTeams';
import { useAuth } from '../../pages/AuthProvider';
import { apiService } from '../../services/api';
import { toast } from 'sonner';

interface IndikatorKinerjaCreateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function IndikatorKinerjaCreateForm({ open, onOpenChange, onSuccess }: IndikatorKinerjaCreateFormProps) {
  const { teams } = useTeams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [availableIKUs, setAvailableIKUs] = useState<any[]>([]);
  const [loadingIKUs, setLoadingIKUs] = useState(false);
  const [indikatorKinerjas, setIndikatorKinerjas] = useState<any[]>([]);
  const [selectedIkuForProksi, setSelectedIkuForProksi] = useState<string>('');
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

  // Load IKU and Indikator Kinerja data
  useEffect(() => {
    const loadIKUData = async () => {
      try {
        setLoadingIKUs(true);
        
        // Try to load IKUs - for ketua_tim, they should have access to general endpoint
        let ikusResponse;
        try {
          ikusResponse = await apiService.getIKUs('indikatorKinerja', 100, 1);
        } catch (error) {
          // If general endpoint fails for ketua_tim, try staff endpoint
          if (user?.role === 'ketua_tim' || user?.role === 'staff') {
            try {
              ikusResponse = await apiService.getStaffIKUs('indikatorKinerja', 100, 1);
            } catch (staffError) {
              ikusResponse = { data: [] };
            }
          } else {
            ikusResponse = { data: [] };
          }
        }
        
        const ikusData = Array.isArray(ikusResponse) ? ikusResponse : (ikusResponse?.data || []);
        
        // Filter IKUs by team for ketua_tim
        let filteredIKUs = ikusData;
        if (user?.role === 'ketua_tim' && user.id_tim) {
          filteredIKUs = ikusData.filter((iku: any) => {
            const ikuTeamId = iku.indikatorKinerja?.id_tim || iku.id_tim;
            return ikuTeamId === user.id_tim;
          });
        }
        
        setAvailableIKUs(filteredIKUs);
        
        // Load Indikator Kinerja
        let indikatorResponse;
        try {
          indikatorResponse = await apiService.getIndikatorKinerjas('tim,iku', 100, 1);
        } catch (error) {
          // If general endpoint fails, try staff endpoint
          if (user?.role === 'ketua_tim' || user?.role === 'staff') {
            try {
              indikatorResponse = await apiService.getStaffIndikatorKinerjas('tim,iku', 100, 1);
            } catch (staffError) {
              indikatorResponse = { data: [] };
            }
          } else {
            indikatorResponse = { data: [] };
          }
        }
        
        const indikatorData = Array.isArray(indikatorResponse) ? indikatorResponse : (indikatorResponse?.data || []);
        
        // Filter Indikator Kinerja by team for ketua_tim
        let filteredIndikators = indikatorData;
        if (user?.role === 'ketua_tim' && user.id_tim) {
          filteredIndikators = indikatorData.filter((ik: any) => ik.id_tim === user.id_tim);
        }
        
        setIndikatorKinerjas(filteredIndikators);
      } catch (error) {
        // console.warn('Error loading IKU data:', error);
        setAvailableIKUs([]);
        setIndikatorKinerjas([]);
      } finally {
        setLoadingIKUs(false);
      }
    };
    
    if (open) {
      loadIKUData();
    }
  }, [open, user]);

  // Auto-fill team for team leaders
  useEffect(() => {
    if (user && user.role === 'ketua_tim' && user.id_tim && teams.length > 0) {
      const userTeam = teams.find(team => team.id_tim === user.id_tim);
      if (userTeam) {
        setFormData(prev => ({
          ...prev,
          id_tim: user.id_tim!.toString()
        }));
      }
    }
  }, [user, teams]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset IKU/Proksi fields when jenis changes
      if (field === 'jenis') {
        if (value === 'iku') {
          newData.tipe = 'poin';
          newData.target_poin = '';
          newData.target_persentase = '';
          newData.target_per_tahun_iku = '';
          newData.target_per_tahun = '';
          newData.target_persentase_proksi = '';
          setSelectedIkuForProksi('');
        } else {
          // When switching to proksi, try to auto-fill nama_indikator from existing IKU
          newData.target_per_tahun = '';
          newData.target_persentase_proksi = '';
          newData.target_poin = '';
          newData.target_persentase = '';
          newData.target_per_tahun_iku = '';
          
          // If nama_indikator already filled and matches an existing IKU, keep it
          // Otherwise, we'll let user select from dropdown
        }
      }
      
      // When IKU is selected for Proksi, auto-fill nama_indikator and tim
      // Note: This is now handled in the onChange handler above for better reactivity
      if (field === 'selected_iku_for_proksi') {
        // This block is kept for backward compatibility but the main logic is in onChange
        if (!value) {
          // Reset to manual entry mode
          newData.nama_indikator = '';
          if (user?.role !== 'ketua_tim') {
            newData.id_tim = '';
          }
        } else {
          const selectedIku = availableIKUs.find(iku => iku.id_iku?.toString() === value);
          const indikatorReference = indikatorKinerjas.find((ik: any) => ik.id_indikator_kinerja === selectedIku?.id_indikator_kinerja);

          if (selectedIku || indikatorReference) {
            const namaIndikator = indikatorReference?.nama_indikator
              || selectedIku?.indikatorKinerja?.nama_indikator
              || '';

            if (namaIndikator) {
              newData.nama_indikator = namaIndikator;
            }

            const teamId = indikatorReference?.id_tim
              ?? selectedIku?.indikatorKinerja?.id_tim;

            if (teamId != null) {
              newData.id_tim = teamId.toString();
            } else if (user?.role !== 'ketua_tim') {
              newData.id_tim = '';
            }
          }
        }
      }
      
      // When tim changes and proksi is selected, reset IKU selection if it doesn't match
      if (field === 'id_tim' && newData.jenis === 'proksi' && selectedIkuForProksi) {
        const selectedIku = availableIKUs.find(iku => iku.id_iku?.toString() === selectedIkuForProksi);
        if (selectedIku && selectedIku.indikatorKinerja?.id_tim?.toString() !== value) {
          setSelectedIkuForProksi('');
          newData.nama_indikator = '';
        }
      }
      
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
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
      // Validate IKU selection is required for Proksi
      if (!selectedIkuForProksi) {
        newErrors.selected_iku_for_proksi = 'Pilihan IKU Parent wajib dipilih untuk membuat Proksi';
      }
      
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
    if (!validateForm()) {
      toast.error('Mohon perbaiki error yang ada');
      return;
    }

    try {
      setIsLoading(true);
      
      // Step 1: Get parent IKU for Proksi or create new Indikator Kinerja
      let idIndikatorKinerja: number | null = null;
      let parentIKU: any = null;
      let isUsingExisting = false;
      let namaIndikator = formData.nama_indikator.trim();
      
      if (formData.jenis === 'proksi' && selectedIkuForProksi) {
        // For Proksi: Get the parent IKU info
        parentIKU = availableIKUs.find(iku => iku.id_iku?.toString() === selectedIkuForProksi);
        // Don't set idIndikatorKinerja yet - will create new one for Proksi
      }
      
      // Step 2: For IKU, check or create indikator kinerja
      if (formData.jenis === 'iku') {
        try {
          // Try to find existing indikator with same name, same jenis, and same team
          const existingIndikators = await apiService.getIndikatorKinerjas('tim', 100, 1);
          const existingData = Array.isArray(existingIndikators) ? existingIndikators : existingIndikators?.data || [];
          const existing = existingData.find((ik: any) => 
            ik.nama_indikator?.toLowerCase().trim() === namaIndikator.toLowerCase() &&
            ik.jenis === formData.jenis && // Must have same jenis (IKU or Proksi)
            ik.id_tim === parseInt(formData.id_tim)
          );
          
          if (existing) {
            idIndikatorKinerja = existing.id_indikator_kinerja;
            isUsingExisting = true;
          }
        } catch (error) {
          // console.warn('Error checking existing indikator:', error);
        }
        
        // Create new Indikator Kinerja if not exists
        if (!idIndikatorKinerja) {
          const indikatorData = {
            nama_indikator: namaIndikator,
            jenis: formData.jenis,
            id_tim: parseInt(formData.id_tim),
          };
          
          const indikatorResponse = await apiService.createIndikatorKinerja(indikatorData);
          idIndikatorKinerja = indikatorResponse.id_indikator_kinerja || indikatorResponse.data?.id_indikator_kinerja;
          
          if (!idIndikatorKinerja) {
            throw new Error('Gagal mendapatkan ID Indikator Kinerja');
          }
        }
      } else if (formData.jenis === 'proksi') {
        // For Proksi: Create new IndikatorKinerja with jenis='proksi' and custom name
        if (!parentIKU) {
          throw new Error('Gagal mendapatkan data parent IKU. Pastikan IKU parent sudah dipilih dengan benar.');
        }
        
        try {
          // Check if Proksi indikator with this name already exists
          const existingIndikators = await apiService.getIndikatorKinerjas('tim', 100, 1);
          const existingData = Array.isArray(existingIndikators) ? existingIndikators : existingIndikators?.data || [];
          
          // Get team from parent IKU
          const teamId = parentIKU.indikatorKinerja?.id_tim || formData.id_tim;
          
          const existing = existingData.find((ik: any) => 
            ik.nama_indikator?.toLowerCase().trim() === namaIndikator.toLowerCase() &&
            ik.jenis === 'proksi' && 
            ik.id_tim === parseInt(teamId)
          );
          
          if (existing) {
            idIndikatorKinerja = existing.id_indikator_kinerja;
            isUsingExisting = true;
          } else {
            // Create new Proksi IndikatorKinerja
            const indikatorData = {
              nama_indikator: namaIndikator,
              jenis: 'proksi',
              id_tim: parseInt(teamId),
            };
            
            const indikatorResponse = await apiService.createIndikatorKinerja(indikatorData);
            idIndikatorKinerja = indikatorResponse.id_indikator_kinerja || indikatorResponse.data?.id_indikator_kinerja;
            
            if (!idIndikatorKinerja) {
              throw new Error('Gagal membuat Proksi IndikatorKinerja');
            }
          }
        } catch (error: any) {
          throw new Error('Error saat membuat/mencari Proksi IndikatorKinerja: ' + error.message);
        }
      }
      
      // Step 3: Check if IKU or Proksi already exists for this indikator
      if (formData.jenis === 'iku') {
        // Check if IKU already exists for this indikator
        try {
          const existingIKUs = await apiService.getIKUs('indikatorKinerja', 100, 1);
          const ikusData = Array.isArray(existingIKUs) ? existingIKUs : existingIKUs?.data || [];
          const existingIKU = ikusData.find((i: any) => i.id_indikator_kinerja === idIndikatorKinerja);
          
          if (existingIKU) {
            // Update existing IKU
            const ikuData: any = {
              tipe: formData.tipe,
            };
            
            // Always set both fields, one with value and one as null
            if (formData.tipe === 'poin') {
              const poinValue = parseInt(formData.target_poin);
              if (isNaN(poinValue)) {
                throw new Error('Target Poin harus berupa angka yang valid');
              }
              ikuData.target_poin = poinValue;
              ikuData.target_persentase = null;
            } else {
              const persenValue = parseInt(formData.target_persentase);
              if (isNaN(persenValue)) {
                throw new Error('Target Persentase harus berupa angka yang valid');
              }
              ikuData.target_persentase = persenValue;
              ikuData.target_poin = null;
            }
            
            // Always include target_per_tahun, even if empty (send null)
            if (formData.target_per_tahun_iku && formData.target_per_tahun_iku.trim() !== '') {
              const tahunValue = parseInt(formData.target_per_tahun_iku);
              if (!isNaN(tahunValue)) {
                ikuData.target_per_tahun = tahunValue;
              } else {
                ikuData.target_per_tahun = null;
              }
            } else {
              ikuData.target_per_tahun = null;
            }
            
            // console.log('Updating IKU with data:', ikuData);
            await apiService.updateIKU(existingIKU.id_iku, ikuData);
            toast.success('IKU berhasil diperbarui untuk Indikator Kinerja yang sudah ada');
          } else {
            // Create new IKU
            const ikuData: any = {
              id_indikator_kinerja: idIndikatorKinerja,
              tipe: formData.tipe,
            };
            
            // Always set both fields, one with value and one as null
            if (formData.tipe === 'poin') {
              const poinValue = parseInt(formData.target_poin);
              if (isNaN(poinValue)) {
                throw new Error('Target Poin harus berupa angka yang valid');
              }
              ikuData.target_poin = poinValue;
              ikuData.target_persentase = null;
            } else {
              const persenValue = parseInt(formData.target_persentase);
              if (isNaN(persenValue)) {
                throw new Error('Target Persentase harus berupa angka yang valid');
              }
              ikuData.target_persentase = persenValue;
              ikuData.target_poin = null;
            }
            
            // Always include target_per_tahun, even if empty (send null)
            if (formData.target_per_tahun_iku && formData.target_per_tahun_iku.trim() !== '') {
              const tahunValue = parseInt(formData.target_per_tahun_iku);
              if (!isNaN(tahunValue)) {
                ikuData.target_per_tahun = tahunValue;
              } else {
                ikuData.target_per_tahun = null;
              }
            } else {
              ikuData.target_per_tahun = null;
            }
            
            // console.log('Creating IKU with data:', ikuData);
            await apiService.createIKU(ikuData);
          }
        } catch (error: any) {
          // console.error('Error creating/updating IKU:', error);
          throw new Error('Gagal membuat/memperbarui IKU: ' + (error.message || 'Unknown error'));
        }
      } else if (formData.jenis === 'proksi') {
        // Check if Proksi already exists for this indikator
        try {
          const existingProksis = await apiService.getProksis('indikatorKinerja', 100, 1);
          const proksisData = Array.isArray(existingProksis) ? existingProksis : existingProksis?.data || [];
          const existingProksi = proksisData.find((p: any) => p.id_indikator_kinerja === idIndikatorKinerja);
          
          if (existingProksi) {
            // Update existing Proksi
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
            
            await apiService.updateProksi(existingProksi.id_proksi, proksiData);
            toast.success('Proksi berhasil diperbarui untuk Indikator Kinerja yang sudah ada');
          } else {
            // Create new Proksi
            const proksiData: any = {
              id_indikator_kinerja: idIndikatorKinerja,
              target_persentase: formData.target_persentase_proksi ? parseInt(formData.target_persentase_proksi) : null,
            };
            
            // Link to parent IKU if exists
            if (parentIKU && parentIKU.id_iku) {
              proksiData.id_iku = parentIKU.id_iku;
            }
            
            // Add target_per_tahun if provided
            if (formData.target_per_tahun && formData.target_per_tahun.trim() !== '') {
              const tahunValue = parseInt(formData.target_per_tahun);
              if (!isNaN(tahunValue)) {
                proksiData.target_per_tahun = tahunValue;
              }
            } else {
              proksiData.target_per_tahun = null;
            }
            
            await apiService.createProksi(proksiData);
          }
        } catch (error: any) {
          // console.error('Error creating/updating Proksi:', error);
          throw new Error('Gagal membuat/memperbarui Proksi: ' + (error.message || 'Unknown error'));
        }
      }
      
      // Success message based on whether we created new or used existing
      if (isUsingExisting) {
        toast.success('Indikator Kinerja berhasil diperbarui (menggunakan nama yang sudah ada)');
      } else {
        toast.success('Indikator Kinerja berhasil dibuat');
      }
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setFormData({
        nama_indikator: '',
        jenis: 'iku',
        id_tim: '',
        tipe: 'poin',
        target_poin: '',
        target_persentase: '',
        target_per_tahun_iku: '',
        target_persentase_proksi: '',
        target_per_tahun: '',
      });
      setSelectedIkuForProksi('');
      setErrors({});
    } catch (error: any) {
      // console.error('Error creating indikator kinerja:', error);
      toast.error(error.message || 'Gagal membuat Indikator Kinerja');
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

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tambah Indikator Kinerja Baru"
      description="Buat Indikator Kinerja baru (IKU atau Proksi)"
      onSubmit={handleSubmit}
      isLoading={isLoading}
    >
      {/* Basic Information Section */}
      <div className="space-y-3">
        <div className="border-l-4 border-primary pl-2">
          <h3 className="text-sm font-semibold text-foreground">Informasi Dasar</h3>
        </div>
        
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
        />

        {/* Show IKU selector for Proksi */}
        {formData.jenis === 'proksi' && (
          <FormField
            label="Pilih IKU Parent"
            name="selected_iku_for_proksi"
            type="select"
            value={selectedIkuForProksi || ''}
            onChange={(value) => {
              setSelectedIkuForProksi(value || '');
              
              // Auto-fill team when IKU is selected
              if (value && value !== '') {
                const selectedIku = availableIKUs.find(iku => iku.id_iku?.toString() === value);
                const indikatorReference = indikatorKinerjas.find((ik: any) => ik.id_indikator_kinerja === selectedIku?.id_indikator_kinerja);

                if (selectedIku || indikatorReference) {
                  const teamId = indikatorReference?.id_tim
                    ?? selectedIku?.indikatorKinerja?.id_tim
                    ?? null;

                  if (teamId != null && user?.role !== 'ketua_tim') {
                    setFormData(prev => ({
                      ...prev,
                      id_tim: teamId.toString(),
                      // Don't auto-fill nama_indikator anymore - user will enter manually
                      nama_indikator: prev.nama_indikator
                    }));
                  }
                }
              }
              
              handleInputChange('selected_iku_for_proksi', value);
            }}
            options={(() => {
              const baseOptions: { value: string; label: string }[] = [];
              
              if (!availableIKUs || availableIKUs.length === 0) {
                return baseOptions;
              }
              
              const ikuOptions = availableIKUs
                .filter(iku => {
                  // For ketua_tim, filter by their team
                  if (user?.role === 'ketua_tim' && user.id_tim) {
                    const ikuTeamId = iku.indikatorKinerja?.id_tim 
                      || indikatorKinerjas.find((ik: any) => ik.id_indikator_kinerja === iku.id_indikator_kinerja)?.id_tim;
                    return ikuTeamId === user.id_tim;
                  }
                  return true;
                })
                .map(iku => {
                  const indikatorReference = indikatorKinerjas.find((ik: any) => ik.id_indikator_kinerja === iku.id_indikator_kinerja);
                  const namaIndikator = indikatorReference?.nama_indikator
                    || iku.indikatorKinerja?.nama_indikator
                    || `IKU ${iku.id_iku}`;
                  const teamName = indikatorReference?.tim?.nama_tim
                    || iku.indikatorKinerja?.tim?.nama_tim
                    || '';
                  
                  return {
                    value: iku.id_iku?.toString() || '',
                    label: `${namaIndikator}${teamName ? ` (${teamName})` : ''}`
                  };
                });
              
              return ikuOptions;
            })()}
            placeholder="Pilih IKU yang akan menjadi induk Proksi"
            required
            error={errors.selected_iku_for_proksi}
          />
        )}

        {/* Show nama_indikator for IKU only */}
        {formData.jenis === 'iku' && (
          <FormField
            label="Nama Indikator"
            name="nama_indikator"
            value={formData.nama_indikator}
            onChange={(value) => handleInputChange('nama_indikator', value)}
            placeholder="Masukkan nama indikator"
            required
            error={errors.nama_indikator}
          />
        )}

        {/* Show nama_indikator input for Proksi (manual entry) */}
        {formData.jenis === 'proksi' && (
          <FormField
            label="Nama Proksi"
            name="nama_indikator"
            value={formData.nama_indikator}
            onChange={(value) => handleInputChange('nama_indikator', value)}
            placeholder="Masukkan nama proksi ini"
            required
            error={errors.nama_indikator}
          />
        )}

        {/* Tim selection */}
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
          disabled={user?.role === 'ketua_tim'}
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
            placeholder="Masukkan Target IKU"
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
            placeholder="Masukkan Target Proksi"
            error={errors.target_per_tahun}
          />
        </div>
      )}
    </FormDialog>
  );
}

