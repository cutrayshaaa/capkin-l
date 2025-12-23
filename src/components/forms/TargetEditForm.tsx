import React, { useState, useEffect } from 'react';
import { FormField } from './FormField';
import { FormDialog } from './FormDialog';
import { useAuth } from '../../pages/AuthProvider';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import type { Target, IndikatorKinerja, IKU, Proksi } from '../../types/models';

// Interface untuk form data yang konsisten dengan backend
interface TargetEditFormData {
  jenis_indikator: 'iku' | 'proksi';
  id_indikator_kinerja: string;
  id_iku: string;
  id_proksi: string;
  periode: string;
  tahun: string;
  satuan: string;
}

interface TargetEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: any;
  ikus: any[];
  proksis?: any[];
  indikatorKinerjas?: any[];
  onSuccess?: () => void;
}

export function TargetEditForm({ open, onOpenChange, target, ikus, proksis = [], indikatorKinerjas = [], onSuccess }: TargetEditFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [targets, setTargets] = useState<any[]>([]);
  const [existingTargets, setExistingTargets] = useState<any[]>([]);
  const [formData, setFormData] = useState<TargetEditFormData>({
    jenis_indikator: 'iku',
    id_indikator_kinerja: '',
    id_iku: '',
    id_proksi: '',
    periode: '',
    tahun: '',
    satuan: '',
  });
  const [selectedIndikator, setSelectedIndikator] = useState<IndikatorKinerja | null>(null);
  const [selectedIKU, setSelectedIKU] = useState<IKU | null>(null);
  const [selectedProksi, setSelectedProksi] = useState<Proksi | null>(null);
  const [indikatorKinerjasState, setIndikatorKinerjasState] = useState<IndikatorKinerja[]>([]);
  const [ikusState, setIkusState] = useState<IKU[]>([]);
  const [proksisState, setProksisState] = useState<Proksi[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load Indikator Kinerja, IKU, and Proksi data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load Indikator Kinerja
        const indikatorResponse = await apiService.getIndikatorKinerjas('tim,iku,proksi', 100, 1);
        const indikatorData = Array.isArray(indikatorResponse) ? indikatorResponse : indikatorResponse?.data || [];
        setIndikatorKinerjasState(indikatorData);
        
        // Load IKUs
        const ikusResponse = await apiService.getIKUs('indikatorKinerja', 100, 1);
        const ikusData = Array.isArray(ikusResponse) ? ikusResponse : ikusResponse?.data || [];
        setIkusState(ikusData);
        
        // Load Proksis
        const proksisResponse = await apiService.getProksis('indikatorKinerja', 100, 1);
        const proksisData = Array.isArray(proksisResponse) ? proksisResponse : proksisResponse?.data || [];
        setProksisState(proksisData);
        
        // Load Targets
        const response = await apiService.getTargets();
        const targetsData = Array.isArray(response) ? response : (response as any)?.data || [];
        setTargets(targetsData);
      } catch (error) {
        // console.error('Error loading data:', error);
      }
    };
    
    if (open) {
      loadData();
    }
  }, [open]);

  // Load existing targets and set selected indikator/IKU/Proksi
  useEffect(() => {
    if (formData.id_indikator_kinerja) {
      const indikator = indikatorKinerjasState.find(ik => ik.id_indikator_kinerja === parseInt(formData.id_indikator_kinerja));
      setSelectedIndikator(indikator || null);
      
      if (formData.jenis_indikator === 'iku' && formData.id_iku) {
        const iku = ikusState.find(i => i.id_iku === parseInt(formData.id_iku));
        setSelectedIKU(iku || null);
        setSelectedProksi(null);
        
        // Load existing targets for IKU
        const ikuTargets = targets.filter(t => t.id_iku === parseInt(formData.id_iku));
        setExistingTargets(ikuTargets);
      } else if (formData.jenis_indikator === 'proksi' && formData.id_proksi) {
        const proksi = proksisState.find(p => p.id_proksi === parseInt(formData.id_proksi));
        setSelectedProksi(proksi || null);
        setSelectedIKU(null);
        
        // Load existing targets for Proksi
        const proksiTargets = targets.filter(t => t.id_proksi === parseInt(formData.id_proksi));
        setExistingTargets(proksiTargets);
      } else {
        setExistingTargets([]);
        setSelectedIKU(null);
        setSelectedProksi(null);
      }
    } else {
      setExistingTargets([]);
      setSelectedIndikator(null);
      setSelectedIKU(null);
      setSelectedProksi(null);
    }
  }, [formData.id_indikator_kinerja, formData.jenis_indikator, formData.id_iku, formData.id_proksi, targets, indikatorKinerjasState, ikusState, proksisState]);

  // Populate form when target changes
  useEffect(() => {
    if (target && indikatorKinerjasState.length > 0 && ikusState.length > 0 && proksisState.length > 0) {
      // Determine jenis based on target
      const jenis = target.id_iku ? 'iku' : 'proksi';
      let idIndikatorKinerja = '';
      
      if (target.id_iku) {
        const iku = ikusState.find(i => i.id_iku === target.id_iku);
        idIndikatorKinerja = iku?.id_indikator_kinerja?.toString() || '';
      } else if (target.id_proksi) {
        const proksi = proksisState.find(p => p.id_proksi === target.id_proksi);
        idIndikatorKinerja = proksi?.id_indikator_kinerja?.toString() || '';
      }
      
      setFormData({
        jenis_indikator: jenis,
        id_indikator_kinerja: idIndikatorKinerja,
        id_iku: target.id_iku?.toString() || '',
        id_proksi: target.id_proksi?.toString() || '',
        periode: target.periode || '',
        tahun: target.tahun?.toString() || new Date().getFullYear().toString(),
        satuan: target.satuan?.toString() || '',
      });
      setErrors({});
    }
  }, [target, indikatorKinerjasState, ikusState, proksisState]);

  const handleInputChange = (field: keyof TargetEditFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset related fields when jenis_indikator or id_indikator_kinerja changes
      if (field === 'jenis_indikator') {
        newData.id_indikator_kinerja = '';
        newData.id_iku = '';
        newData.id_proksi = '';
        newData.satuan = '';
      } else if (field === 'id_indikator_kinerja') {
        // Auto-set id_iku or id_proksi based on jenis
        const indikator = indikatorKinerjasState.find(ik => ik.id_indikator_kinerja === parseInt(value));
        if (indikator) {
          if (newData.jenis_indikator === 'iku' && indikator.iku) {
            newData.id_iku = indikator.iku.id_iku.toString();
            newData.id_proksi = '';
          } else if (newData.jenis_indikator === 'proksi' && indikator.proksi) {
            newData.id_proksi = indikator.proksi.id_proksi.toString();
            newData.id_iku = '';
          }
        }
        newData.satuan = '';
      }
      
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.id_indikator_kinerja) {
      newErrors.id_indikator_kinerja = 'Indikator Kinerja wajib dipilih';
    }
    
    if (formData.jenis_indikator === 'iku' && !formData.id_iku) {
      newErrors.id_iku = 'IKU wajib dipilih';
    }
    
    if (formData.jenis_indikator === 'proksi' && !formData.id_proksi) {
      newErrors.id_proksi = 'Proksi wajib dipilih';
    }

    if (!formData.periode) {
      newErrors.periode = 'Periode wajib dipilih';
    }
    
    if (!formData.tahun) {
      newErrors.tahun = 'Tahun wajib diisi';
    }

    // Satuan validation - now required
    if (!formData.satuan) {
      newErrors.satuan = 'Satuan wajib diisi';
    } else if (isNaN(parseFloat(formData.satuan))) {
      newErrors.satuan = 'Satuan harus berupa angka';
    } else {
      const satuanValue = parseFloat(formData.satuan);
      if (satuanValue < 0) {
        newErrors.satuan = 'Satuan tidak boleh negatif';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!target) return;
    
    if (!validateForm()) {
      toast.error('Mohon perbaiki error yang ada');
      return;
    }

    try {
      setIsLoading(true);
      

      
      // Prepare data for API - clean and format according to backend expectations
      const submitData: any = {
        periode: formData.periode,
        tahun: parseInt(formData.tahun),
        satuan: parseInt(formData.satuan),
      };

      // Set id_iku or id_proksi based on jenis
      if (formData.jenis_indikator === 'iku' && formData.id_iku) {
        submitData.id_iku = parseInt(formData.id_iku);
        submitData.id_proksi = null;
      } else if (formData.jenis_indikator === 'proksi' && formData.id_proksi) {
        submitData.id_proksi = parseInt(formData.id_proksi);
        submitData.id_iku = null;
      }


      
      const response = await apiService.put(`/targets/${target.id_target}`, submitData);
      

      
      toast.success('Target berhasil diperbarui');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {

      
      // Handle specific error messages from backend
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;

        
        // Show specific field errors
        Object.entries(backendErrors).forEach(([field, messages]: [string, any]) => {
          if (Array.isArray(messages)) {
            messages.forEach((message: string) => toast.error(`${field}: ${message}`));
          } else {
            toast.error(`${field}: ${messages}`);
          }
        });
      } else {
        toast.error(error.message || 'Gagal memperbarui target');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Filter Indikator Kinerja based on user role and jenis
  const getFilteredIndikatorKinerjas = () => {
    let filtered = indikatorKinerjasState.filter(ik => ik.jenis === formData.jenis_indikator);
    
    if (user?.role === 'admin') {
      return filtered;
    }
    
    return filtered.filter(ik => ik.id_tim === user?.id_tim);
  };

  const indikatorOptions = getFilteredIndikatorKinerjas().map(ik => ({
    value: ik.id_indikator_kinerja.toString(),
    label: `${ik.nama_indikator} (${ik.tim?.nama_tim || 'No Team'})`
  }));

  const jenisOptions = [
    { value: 'iku', label: 'IKU' },
    { value: 'proksi', label: 'Proksi' }
  ];

  // Get period options - menggunakan data dinamis dari API
  const periodOptions = [
    { value: 'TW 1', label: 'TW 1' },
    { value: 'TW 2', label: 'TW 2' },
    { value: 'TW 3', label: 'TW 3' },
    { value: 'TW 4', label: 'TW 4' }
  ];

  const selectedIKUTargetPerTahun =
    selectedIKU && (selectedIKU.target_per_tahun ?? (selectedIKU as any)?.target_per_tahun_iku ?? null);
  const selectedProksiTargetPerTahun =
    selectedProksi && (selectedProksi.target_per_tahun ?? (selectedProksi as any)?.target_per_tahun ?? null);


  if (!target) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Target"
      description="Perbarui informasi target Indikator Kinerja (IKU atau Proksi) yang sudah ada"
      onSubmit={handleSubmit}
      isLoading={isLoading}
    >
      {/* Target Information Section */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Jenis Indikator"
            name="jenis_indikator"
            type="select"
            value={formData.jenis_indikator}
            onChange={(value) => handleInputChange('jenis_indikator', value)}
            options={jenisOptions}
            placeholder="Pilih jenis indikator"
            required
            error={errors.jenis_indikator}
            disabled={true}
          />

          <FormField
            label="Indikator Kinerja"
            name="id_indikator_kinerja"
            type="select"
            value={formData.id_indikator_kinerja}
            onChange={(value) => handleInputChange('id_indikator_kinerja', value)}
            options={indikatorOptions}
            placeholder="Pilih Indikator Kinerja"
            required
            error={errors.id_indikator_kinerja}
            disabled={true}
          />

          <FormField
            label="Periode"
            name="periode"
            type="select"
            value={formData.periode}
            onChange={(value) => handleInputChange('periode', value)}
            options={periodOptions}
            placeholder="Pilih Periode"
            required
            error={errors.periode}
          />

          <FormField
            label="Tahun"
            name="tahun"
            type="number"
            value={formData.tahun}
            onChange={(value) => handleInputChange('tahun', value)}
            placeholder="Masukkan tahun"
            required
            error={errors.tahun}
          />
        </div>

        {/* Show Target Reference */}
        {selectedIndikator && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Indikator:</strong> {selectedIndikator.nama_indikator} ({selectedIndikator.jenis.toUpperCase()})
            </p>
            {selectedIKU && (
              <p className="text-sm text-blue-800 mt-1">
                <strong>Tipe IKU:</strong>{' '}
                {selectedIKU.tipe === 'poin' ? 'Poin (Non %)' : selectedIKU.tipe === 'persen' ? 'Persen (%)' : (selectedIKU.tipe && (selectedIKU.tipe.charAt(0).toUpperCase() + selectedIKU.tipe.slice(1)))}
                {selectedIKU.tipe === 'poin' && selectedIKU.target_poin && ` - Target: ${selectedIKU.target_poin}`}
                {selectedIKU.tipe === 'persen' && selectedIKU.target_persentase && ` - Target: ${selectedIKU.target_persentase}%`}
              </p>
            )}
            {selectedIKU && selectedIKUTargetPerTahun !== null && selectedIKUTargetPerTahun !== undefined && (
              <p className="text-sm text-blue-800 mt-1">
                <strong>Target Per Tahun:</strong>{' '}
                {selectedIKU.tipe === 'persen'
                  ? `${selectedIKUTargetPerTahun}`
                  : selectedIKUTargetPerTahun}
              </p>
            )}
            {selectedProksi && selectedProksiTargetPerTahun !== null && selectedProksiTargetPerTahun !== undefined && (
              <p className="text-sm text-blue-800 mt-1">
                <strong>Target Per Tahun:</strong> {selectedProksiTargetPerTahun}
              </p>
            )}
            {/* Satuan Information */}
            {(() => {
              // Show satuan from form if already filled (real-time update)
              if (formData.satuan && String(formData.satuan).trim() !== '') {
                return (
                  <p className="text-sm text-blue-800 mt-1">
                    <strong>Target Per Triwulan:</strong> {formData.satuan}
                  </p>
                );
              }
              
              // Show satuan from existing targets if available
              if (existingTargets && existingTargets.length > 0) {
                // Find first valid satuan from existing targets
                for (const targetItem of existingTargets) {
                  const satuan = targetItem.satuan;
                  if (satuan !== null && satuan !== undefined && satuan !== '' && satuan !== 0) {
                    const satuanValue = typeof satuan === 'number' ? satuan : (typeof satuan === 'string' ? parseFloat(satuan) : null);
                    if (satuanValue !== null && !isNaN(satuanValue) && satuanValue > 0) {
                      return (
                        <p className="text-sm text-blue-800 mt-1">
                          <strong>Satuan:</strong> {satuanValue}
                        </p>
                      );
                    }
                  }
                }
              }
              
              return null;
            })()}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <FormField
            label="Target per Triwulan"
            name="satuan"
            type="number"
            value={formData.satuan}
            onChange={(value) => handleInputChange('satuan', value)}
            placeholder="Masukkan target per triwulan"
            required
            error={errors.satuan}
          />
        </div>

        {/* Riwayat Target untuk Indikator Kinerja yang dipilih */}
        {existingTargets.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Riwayat Target untuk Indikator Kinerja ini:</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-600 mb-2">
                <div>Periode</div>
                <div>Tahun</div>
                <div>Target per Triwulan</div>
              </div>
              {existingTargets.map((target, index) => (
                <div key={index} className="grid grid-cols-3 gap-2 text-xs py-1 border-b border-gray-200 last:border-b-0">
                  <div className="font-medium">{target.periode || '-'}</div>
                  <div>{target.tahun || '-'}</div>
                  <div>{target.satuan || '-'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </FormDialog>
  );
}
