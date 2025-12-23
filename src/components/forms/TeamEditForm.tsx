import React, { useState, useEffect } from 'react';
import { FormField } from './FormField';
import { FormDialog } from './FormDialog';
import { useTeams } from '../../hooks/useTeams';
import { useUsers } from '../../hooks/useUsers';
import { toast } from 'sonner';
import type { Team } from '../../types/models';

// Interface untuk form data yang konsisten dengan backend
interface TeamEditFormData {
  nama_tim: string;
  deskripsi: string;
  status: 'aktif' | 'nonaktif';
}

interface TeamEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  onSuccess?: () => void;
}

export function TeamEditForm({ open, onOpenChange, team, onSuccess }: TeamEditFormProps) {
  const { updateTeam } = useTeams();
  const { users } = useUsers();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<TeamEditFormData>({
    nama_tim: '',
    deskripsi: '',
    status: 'aktif'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when team changes
  useEffect(() => {
    if (team) {
      setFormData({
        nama_tim: team.nama_tim || '',
        deskripsi: team.deskripsi || '',
        status: (team.status as 'aktif' | 'nonaktif') || 'aktif'
      });
      setErrors({});
    }
  }, [team]);

  const handleInputChange = (field: keyof TeamEditFormData, value: any) => {
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
    if (!team) return;
    
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


      
      const response = await updateTeam(team.id_tim, submitData);
      

      
      toast.success('Tim berhasil diperbarui');
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
        toast.error(error.message || 'Gagal memperbarui tim');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions = [
    { value: 'aktif', label: 'Aktif' },
    { value: 'nonaktif', label: 'Nonaktif' }
  ];

  // Get current team leader info
  const currentTeamLeader = team ? users.find(u => u.id_tim === team.id_tim && u.role === 'ketua_tim') : null;


  if (!team) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Tim"
      description={`Edit data tim: ${team.nama_tim}`}
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

        {/* <FormField
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
