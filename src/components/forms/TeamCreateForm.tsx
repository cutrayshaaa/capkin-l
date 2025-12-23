import React, { useState, useEffect } from 'react';
import { FormField } from './FormField';
import { FormDialog } from './FormDialog';
import { useTeams } from '../../hooks/useTeams';
import { toast } from 'sonner';
import type { Team } from '../../types/models';

// Interface untuk form data yang konsisten dengan backend
interface TeamCreateFormData {
  nama_tim: string;
  deskripsi: string;
  status: 'aktif' | 'nonaktif';
}

interface TeamCreateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TeamCreateForm({ open, onOpenChange, onSuccess }: TeamCreateFormProps) {
  const { createTeam } = useTeams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<TeamCreateFormData>({
    nama_tim: '',
    deskripsi: '',
    status: 'aktif'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        nama_tim: '',
        deskripsi: '',
        status: 'aktif'
      });
      setErrors({});
    }
  }, [open]);

  const handleInputChange = (field: keyof TeamCreateFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.nama_tim.trim()) {
      newErrors.nama_tim = 'Nama tim wajib diisi';
    } else if (formData.nama_tim.length < 3) {
      newErrors.nama_tim = 'Nama tim minimal 3 karakter';
    } else if (formData.nama_tim.length > 100) {
      newErrors.nama_tim = 'Nama tim maksimal 100 karakter';
    }

    if (!formData.status) {
      newErrors.status = 'Status wajib dipilih';
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
      

      
      // Prepare data for API - clean and format according to backend expectations
      const submitData = {
        nama_tim: formData.nama_tim.trim(),
        deskripsi: formData.deskripsi.trim() || null,
        status: formData.status
      };


      
      const response = await createTeam(submitData);
      

      
      toast.success('Tim berhasil dibuat');
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setFormData({
        nama_tim: '',
        deskripsi: '',
        status: 'aktif'
      });
      setErrors({});
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
        toast.error(error.message || 'Gagal membuat tim');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions = [
    { value: 'aktif', label: 'Aktif' },
    { value: 'nonaktif', label: 'Nonaktif' }
  ];



  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tambah Tim Baru"
      description="Buat tim baru untuk sistem IKU"
      onSubmit={handleSubmit}
      isLoading={isLoading}
    >
      {/* Team Information Section */}
      <div className="space-y-3">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            label="Nama Tim"
            name="nama_tim"
            value={formData.nama_tim}
            onChange={(value) => handleInputChange('nama_tim', value)}
            placeholder="Masukkan nama tim"
            required
            error={errors.nama_tim}
          />

          <FormField
            label="Status"
            name="status"
            type="select"
            value={formData.status}
            onChange={(value) => handleInputChange('status', value)}
            options={statusOptions}
          />
        </div>
{/* 
        <FormField
          label="Deskripsi"
          name="deskripsi"
          type="textarea"
          value={formData.deskripsi}
          onChange={(value) => handleInputChange('deskripsi', value)}
          placeholder="Masukkan deskripsi tim"
        /> */}
      </div>

      
    </FormDialog>
  );
}
