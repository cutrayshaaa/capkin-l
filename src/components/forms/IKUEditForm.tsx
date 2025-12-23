import React, { useState, useEffect } from 'react';
import { FormField } from './FormField';
import { FormDialog } from './FormDialog';
import { useIKUs } from '../../hooks/useIKUs';
import { useTeams } from '../../hooks/useTeams';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../pages/AuthProvider';
import { toast } from 'sonner';
import type { IKU } from '../../types/models';

// Interface untuk form data yang konsisten dengan backend
interface IKUEditFormData {
  nama_iku: string;
  id_tim: string;
  target_iku: string;
  persenan_target: string;
}

interface IKUEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  iku: IKU | null;
  onSuccess?: () => void;
}

export function IKUEditForm({ open, onOpenChange, iku, onSuccess }: IKUEditFormProps) {
  const { updateIKU } = useIKUs();
  const { teams } = useTeams();
  const { users } = useUsers();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<IKUEditFormData>({
    nama_iku: '',
    id_tim: '',
    target_iku: '',
    persenan_target: '100'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when IKU changes
  useEffect(() => {
    if (iku) {
      setFormData({
        nama_iku: iku.nama_iku || '',
        id_tim: iku.id_tim?.toString() || '',
        target_iku: iku.target_iku?.toString() || '',
        persenan_target: iku.persenan_target?.toString() || '100'
      });
      setErrors({});
    }
  }, [iku]);

  // Auto-fill team for team leaders if IKU belongs to their team
  useEffect(() => {
    if (user && user.role === 'ketua_tim' && user.id_tim && iku && iku.id_tim === user.id_tim) {
      setFormData(prev => ({
        ...prev,
        id_tim: user.id_tim.toString()
      }));
    }
  }, [user, iku]);

  const handleInputChange = (field: keyof IKUEditFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.nama_iku.trim()) {
      newErrors.nama_iku = 'Nama IKU wajib diisi';
    } else if (formData.nama_iku.length < 3) {
      newErrors.nama_iku = 'Nama IKU minimal 3 karakter';
    } else if (formData.nama_iku.length > 200) {
      newErrors.nama_iku = 'Nama IKU maksimal 200 karakter';
    }

    if (!formData.id_tim) {
      newErrors.id_tim = 'Tim wajib dipilih';
    }

    // Validate target_iku if provided
    if (formData.target_iku) {
      const targetValue = parseInt(formData.target_iku);
      if (isNaN(targetValue)) {
        newErrors.target_iku = 'Target IKU harus berupa angka bulat';
      } else if (targetValue < 0) {
        newErrors.target_iku = 'Target IKU tidak boleh negatif';
      } else if (!Number.isInteger(parseFloat(formData.target_iku))) {
        newErrors.target_iku = 'Target IKU harus berupa angka bulat';
      }
    }

    // Validate persenan_target
    if (formData.persenan_target) {
      const persenanValue = parseFloat(formData.persenan_target);
      if (isNaN(persenanValue)) {
        newErrors.persenan_target = 'Persenan target harus berupa angka';
      } else if (persenanValue < 0 || persenanValue > 100) {
        newErrors.persenan_target = 'Persenan target harus antara 0-100%';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!iku) return;
    
    if (!validateForm()) {
      toast.error('Mohon perbaiki error yang ada');
      return;
    }

    try {
      setIsLoading(true);
      

      
      // Prepare data for API - clean and format according to backend expectations
      const submitData = {
        nama_iku: formData.nama_iku.trim(),
        id_tim: parseInt(formData.id_tim),
        target_iku: formData.target_iku ? parseInt(formData.target_iku) : null,
        persenan_target: formData.persenan_target ? parseFloat(formData.persenan_target) : 100
      };


      
      const response = await updateIKU(iku.id_iku, submitData);
      

      
      toast.success('IKU berhasil diperbarui');
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
        toast.error(error.message || 'Gagal memperbarui IKU');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Get team options
  const teamOptions = teams
    .map(team => ({
      value: team.id_tim.toString(),
      label: team.nama_tim
    }));



  if (!iku) return null;

  return (
     <FormDialog
       open={open}
       onOpenChange={onOpenChange}
       title="Edit IKU"
       description="Perbarui informasi IKU yang ada"
       onSubmit={handleSubmit}
       isLoading={isLoading}
     >
      {/* IKU Information Section */}
      <div className="space-y-3">

        
        <FormField
          label="Nama IKU"
          name="nama_iku"
          value={formData.nama_iku}
          onChange={(value) => handleInputChange('nama_iku', value)}
          placeholder="Masukkan nama IKU"
          required
          error={errors.nama_iku}
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
          disabled={user?.role === 'ketua_tim' && iku?.id_tim === user.id_tim}
        />
      </div>

      {/* Target Penetapan Section */}
      <div className="space-y-3">
        <div className="border-l-4 border-accent pl-2">
          <h3 className="text-sm font-semibold text-foreground">Penetapan Target</h3>
        </div>
        
        <FormField
          label="Target IKU"
          name="target_iku"
          value={formData.target_iku}
          onChange={(value) => handleInputChange('target_iku', value)}
          placeholder="Masukkan target jumlah IKU (contoh: 100)"
          type="number"
          error={errors.target_iku}
        />

        <FormField
          label="Persenan Target"
          name="persenan_target"
          type="number"
          value={formData.persenan_target}
          onChange={(value) => handleInputChange('persenan_target', value)}
          placeholder="Masukkan persenan target (default: 100%)"
          error={errors.persenan_target}
        />
      </div>
      
    </FormDialog>
  );
}
