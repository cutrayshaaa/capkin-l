import React, { useState } from 'react';
import { FormField } from './FormField';
import { FormDialog } from './FormDialog';
import { useIKUs } from '../../hooks/useIKUs';
import { apiService } from '../../services/api';
import { toast } from 'sonner';

interface RealisasiCreateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RealisasiCreateForm({ open, onOpenChange, onSuccess }: RealisasiCreateFormProps) {
  const { ikus } = useIKUs();
  const [isLoading, setIsLoading] = useState(false);
  const [periods, setPeriods] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    id_iku: '',
    periode: '',
    id_target: '',
    target: '',
    realisasi: '',
    batas_waktu: '',
    realisasi_proxy: '',
    persenan_tercapai_per_tw: '',
    persenan_tercapai_target_pertahun: '',
    solusi: '',
    kendala: '',
    link_bdk: '',
    status: 'draft'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load periods when component mounts
  React.useEffect(() => {
    const loadPeriods = async () => {
      try {
        const response = await apiService.getActivePeriods();
        const periodsData = Array.isArray(response) ? response : response?.data || [];
        setPeriods(periodsData);
      } catch (error) {

      }
    };
    loadPeriods();
  }, []);

  // Load targets when IKU or period changes
  React.useEffect(() => {
    const loadTargets = async () => {
      if (formData.id_iku && formData.periode) {
        try {
          const response = await apiService.getTargets();
          const targetsData = Array.isArray(response) ? response : response?.data || [];
          const filteredTargets = targetsData.filter((target: any) => 
            target.id_iku === parseInt(formData.id_iku) && 
            target.periode === formData.periode
          );
          setTargets(filteredTargets);
        } catch (error) {

        }
      } else {
        setTargets([]);
      }
    };
    loadTargets();
  }, [formData.id_iku, formData.periode]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Clear target when IKU or period changes
      if (field === 'id_iku' || field === 'periode') {
        newData.id_target = '';
      }
      
      // Auto-calculate persenan fields when realisasi or realisasi_proxy changes
      if (field === 'realisasi' || field === 'realisasi_proxy') {
        const realisasiValue = parseFloat(newData.realisasi) || 0;
        const realisasiProxyValue = parseFloat(newData.realisasi_proxy) || 0;
        
        // Find selected target data for calculations
        const selectedTarget = targets.find(target => 
          target.id_iku === parseInt(newData.id_iku) && 
          target.periode === newData.periode
        );
        
        if (selectedTarget) {
          // Calculate persenan_tercapai_per_tw: (proxy_realisasi / proxy_target)
          if (realisasiProxyValue > 0 && selectedTarget.satuan) {
            const persenanPerTW = Math.min((realisasiProxyValue / selectedTarget.satuan) * 100, 100);
            newData.persenan_tercapai_per_tw = persenanPerTW.toFixed(2);
          }
          
          // Calculate persenan_tercapai_target_pertahun: (realisasi_proxy / target_satuan)
          if (realisasiProxyValue > 0 && selectedTarget.satuan_target) {
            const persenanTargetPertahun = Math.min((realisasiProxyValue / selectedTarget.satuan_target) * 100, 100);
            newData.persenan_tercapai_target_pertahun = persenanTargetPertahun.toFixed(2);
          }
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

    if (!formData.id_iku) newErrors.id_iku = 'IKU wajib dipilih';
    if (!formData.periode) newErrors.periode = 'Periode wajib dipilih';
    if (!formData.id_target) newErrors.id_target = 'Target wajib dipilih';
    if (!formData.realisasi || isNaN(parseFloat(formData.realisasi))) {
      newErrors.realisasi = 'Realisasi harus berupa angka';
    } else {
      const realisasiValue = parseFloat(formData.realisasi);
      if (realisasiValue > 100) {
        newErrors.realisasi = 'Realisasi tidak boleh lebih dari 100%';
      }
    }
    if (formData.target && isNaN(parseFloat(formData.target))) {
      newErrors.target = 'Target harus berupa angka';
    } else if (formData.target) {
      const targetValue = parseFloat(formData.target);
      if (targetValue > 100) {
        newErrors.target = 'Target tidak boleh lebih dari 100%';
      }
    }
    // Persenan tercapai per TW validation - removed because it's auto-calculated
    // Persenan tercapai target pertahun validation - removed because it's auto-calculated

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
      
      // Prepare data for API
      const submitData = {
        ...formData,
        id_iku: parseInt(formData.id_iku),
        id_target: parseInt(formData.id_target),
        target: formData.target ? parseFloat(formData.target) : null,
        realisasi: parseFloat(formData.realisasi),
        realisasi_proxy: formData.realisasi_proxy ? parseFloat(formData.realisasi_proxy) : null,
        batas_waktu: formData.batas_waktu || null,
        solusi: formData.solusi || null,
        kendala: formData.kendala || null,
        link_bdk: formData.link_bdk || null,
      };

      await apiService.createRealisasi(submitData);
      toast.success('Realisasi berhasil dibuat');
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setFormData({
        id_iku: '',
        periode: '',
        id_target: '',
        target: '',
        realisasi: '',
        batas_waktu: '',
        realisasi_proxy: '',
        solusi: '',
        kendala: '',
        link_bdk: '',
        status: 'draft'
      });
      setErrors({});
    } catch (error: any) {

      toast.error(error.message || 'Gagal membuat realisasi');
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'verified', label: 'Verified' },
    { value: 'completed', label: 'Completed' }
  ];

  const ikuOptions = ikus
    .filter(iku => iku.status === 'aktif') // Only active IKUs
    .map(iku => ({
      value: iku.id_iku.toString(),
      label: `${iku.nama_iku} (${iku.tim?.nama_tim || 'No Team'})`
    }));

  const periodOptions = periods.map(period => ({
    value: period.periode,
    label: `${period.nama_periode} - ${period.tahun}`
  }));

  const targetOptions = targets.map(target => ({
    value: target.id_target.toString(),
    label: `Target: ${target.target_iku} (${target.iku?.nama_iku || 'Unknown IKU'})`
  }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tambah Realisasi Baru"
      description="Input realisasi untuk IKU"
      onSubmit={handleSubmit}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="IKU"
            name="id_iku"
            type="select"
            value={formData.id_iku}
            onChange={(value) => handleInputChange('id_iku', value)}
            options={ikuOptions}
            placeholder="Pilih IKU"
            required
            error={errors.id_iku}
          />

          <FormField
            label="Periode"
            name="periode"
            type="select"
            value={formData.periode}
            onChange={(value) => handleInputChange('periode', value)}
            options={periodOptions}
            placeholder="Pilih periode"
            required
            error={errors.periode}
          />
        </div>

        <FormField
          label="Target"
          name="id_target"
          type="select"
          value={formData.id_target}
          onChange={(value) => handleInputChange('id_target', value)}
          options={targetOptions}
          placeholder="Pilih target"
          required
          error={errors.id_target}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Target"
            name="target"
            type="number"
            value={formData.target}
            onChange={(value) => handleInputChange('target', value)}
            placeholder="Masukkan target"
            error={errors.target}
          />

          <FormField
            label="Realisasi"
            name="realisasi"
            type="number"
            value={formData.realisasi}
            onChange={(value) => handleInputChange('realisasi', value)}
            placeholder="Masukkan realisasi"
            required
            error={errors.realisasi}
          />
        </div>

        <FormField
          label="Realisasi Proxy"
          name="realisasi_proxy"
          type="number"
          value={formData.realisasi_proxy}
          onChange={(value) => handleInputChange('realisasi_proxy', value)}
          placeholder="Masukkan realisasi proxy (opsional)"
          error={errors.realisasi_proxy}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Persenan Tercapai per TW"
            name="persenan_tercapai_per_tw"
            type="number"
            value={formData.persenan_tercapai_per_tw}
            onChange={(value) => handleInputChange('persenan_tercapai_per_tw', value)}
            placeholder="Otomatis terisi berdasarkan perhitungan"
            error={errors.persenan_tercapai_per_tw}
            disabled={true}
            className="bg-gray-50"
          />

          <FormField
            label="Persenan Tercapai Target Pertahun"
            name="persenan_tercapai_target_pertahun"
            type="number"
            value={formData.persenan_tercapai_target_pertahun}
            onChange={(value) => handleInputChange('persenan_tercapai_target_pertahun', value)}
            placeholder="Otomatis terisi berdasarkan perhitungan"
            error={errors.persenan_tercapai_target_pertahun}
            disabled={true}
            className="bg-gray-50"
          />
        </div>

        <FormField
          label="Batas Waktu"
          name="batas_waktu"
          type="date"
          value={formData.batas_waktu}
          onChange={(value) => handleInputChange('batas_waktu', value)}
        />

        <FormField
          label="Status"
          name="status"
          type="select"
          value={formData.status}
          onChange={(value) => handleInputChange('status', value)}
          options={statusOptions}
        />

        <FormField
          label="Solusi"
          name="solusi"
          type="textarea"
          value={formData.solusi}
          onChange={(value) => handleInputChange('solusi', value)}
          placeholder="Masukkan solusi yang dilakukan"
        />

        <FormField
          label="Kendala"
          name="kendala"
          type="textarea"
          value={formData.kendala}
          onChange={(value) => handleInputChange('kendala', value)}
          placeholder="Masukkan kendala yang dihadapi"
        />

        <FormField
          label="Link BDK"
          name="link_bdk"
          type="text"
          value={formData.link_bdk}
          onChange={(value) => handleInputChange('link_bdk', value)}
          placeholder="Masukkan link BDK (opsional)"
        />
      </div>
    </FormDialog>
  );
}
