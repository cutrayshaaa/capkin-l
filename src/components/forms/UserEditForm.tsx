import React, { useState, useEffect } from 'react';
import { FormField } from './FormField';
import { FormDialog } from './FormDialog';
import { useUsers } from '../../hooks/useUsers';
import { useTeams } from '../../hooks/useTeams';
import { toast } from 'sonner';
import { Label } from '../ui/label';
import type { User } from '../../types/models';

// Interface untuk form data yang konsisten dengan backend
interface UserEditFormData {
  username: string;
  nama_user: string;
  role: 'admin' | 'ketua_tim' | 'staff';
  id_tim: string;
  status: 'aktif' | 'nonaktif';
  password?: string;
  password_confirmation?: string;
}

interface UserEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess?: () => void;
}

export function UserEditForm({ open, onOpenChange, user, onSuccess }: UserEditFormProps) {
  const { updateUser } = useUsers();
  const { teams } = useTeams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UserEditFormData>({
    username: '',
    nama_user: '',
    role: 'staff',
    id_tim: '',
    status: 'aktif',
    password: '',
    password_confirmation: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetPassword, setResetPassword] = useState(false);

  // Helper function untuk transform data dari backend ke frontend
  const transformUserData = (user: User): UserEditFormData => {
    return {
      username: user.username || '',
      nama_user: user.nama_user || '',
      role: user.role as 'admin' | 'ketua_tim' | 'staff' || 'staff',
      id_tim: user.id_tim ? user.id_tim.toString() : '',
      status: user.status as 'aktif' | 'nonaktif' || 'aktif'
    };
  };

  // Populate form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        ...transformUserData(user),
        password: '',
        password_confirmation: ''
      });
      setErrors({});
      setResetPassword(false);
    }
  }, [user]);

  const handleInputChange = (field: keyof UserEditFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Clear team when role changes to staff or admin
      if (field === 'role') {
        if (value === 'staff' || value === 'admin') {
          newData.id_tim = '';
        }
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

    if (!formData.username.trim()) newErrors.username = 'Username wajib diisi';
    if (!formData.nama_user.trim()) newErrors.nama_user = 'Nama lengkap wajib diisi';
    if (!formData.role) newErrors.role = 'Role wajib dipilih';
    if (formData.role === 'ketua_tim' && !formData.id_tim) {
      newErrors.id_tim = 'Tim wajib dipilih untuk ketua tim';
    }

    // Validasi password jika reset password dipilih
    if (resetPassword) {
      if (!formData.password || !formData.password.trim()) {
        newErrors.password = 'Password wajib diisi';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password minimal 8 karakter';
      }
      
      if (!formData.password_confirmation || !formData.password_confirmation.trim()) {
        newErrors.password_confirmation = 'Konfirmasi password wajib diisi';
      } else if (formData.password !== formData.password_confirmation) {
        newErrors.password_confirmation = 'Konfirmasi password tidak cocok';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    if (!validateForm()) {
      toast.error('Mohon perbaiki error yang ada');
      return;
    }

    try {
      setIsLoading(true);
      
      // Prepare data for API - transform to backend format
      const submitData: any = {
        username: formData.username.trim(),
        nama_user: formData.nama_user.trim(),
        role: formData.role,
        id_tim: formData.id_tim ? parseInt(formData.id_tim) : null,
        status: formData.status
      };

      // Tambahkan password jika reset password dipilih
      if (resetPassword && formData.password && formData.password.trim()) {
        submitData.password = formData.password.trim();
        submitData.password_confirmation = formData.password_confirmation?.trim();
      }

      await updateUser(user.id_user, submitData);
      toast.success('User berhasil diperbarui');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {

      
      // Handle specific error messages from backend
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        setErrors(backendErrors);
        toast.error('Terdapat error pada form');
      } else {
        toast.error(error.message || 'Gagal memperbarui user');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'ketua_tim', label: 'Ketua Tim' },
    { value: 'staff', label: 'Staff' }
  ];

  const statusOptions = [
    { value: 'aktif', label: 'Aktif' },
    { value: 'nonaktif', label: 'Nonaktif' }
  ];


  const teamOptions = teams.map(team => ({
    value: team.id_tim.toString(),
    label: team.nama_tim
  }));

  if (!user) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit User"
      description={`Edit data user: ${user.nama_user}`}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    >
      {/* Basic Information Section */}
      <div className="space-y-3">
        <div className="border-l-4 border-primary pl-2">
          <h3 className="text-sm font-semibold text-foreground">Informasi Dasar</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            label="Username"
            name="username"
            value={formData.username}
            onChange={(value) => handleInputChange('username', value)}
            placeholder="Masukkan username"
            required
            error={errors.username}
          />

          <FormField
            label="Nama Lengkap"
            name="nama_user"
            value={formData.nama_user}
            onChange={(value) => handleInputChange('nama_user', value)}
            placeholder="Masukkan nama lengkap"
            required
            error={errors.nama_user}
          />
        </div>
      </div>

      {/* System Access Section */}
      <div className="space-y-3">
        <div className="border-l-4 border-primary pl-2">
          <h3 className="text-sm font-semibold text-foreground">Akses Sistem</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            label="Role"
            name="role"
            type="select"
            value={formData.role}
            onChange={(value) => handleInputChange('role', value)}
            options={roleOptions}
            required
            error={errors.role}
          />

          {formData.role !== 'staff' && (
            <FormField
              label="Tim"
              name="id_tim"
              type="select"
              value={formData.id_tim}
              onChange={(value) => handleInputChange('id_tim', value)}
              options={teamOptions}
              placeholder="Pilih tim"
              error={errors.id_tim}
              disabled={formData.role === 'admin'}
            />
          )}

          <FormField
            label="Status"
            name="status"
            type="select"
            value={formData.status}
            onChange={(value) => handleInputChange('status', value)}
            options={statusOptions}
          />
        </div>
      </div>

      {/* Password Reset Section */}
      <div className="space-y-3">
        <div className="border-l-4 border-primary pl-2">
          <h3 className="text-sm font-semibold text-foreground">Atur Ulang Password</h3>
        </div>
        
        <div className="flex items-center space-x-2 mb-3">
          <input
            type="checkbox"
            id="reset_password"
            checked={resetPassword}
            onChange={(e) => {
              setResetPassword(e.target.checked);
              if (!e.target.checked) {
                setFormData(prev => ({ ...prev, password: '', password_confirmation: '' }));
                setErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.password;
                  delete newErrors.password_confirmation;
                  return newErrors;
                });
              }
            }}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <Label htmlFor="reset_password" className="text-sm font-normal cursor-pointer">
            Atur ulang password untuk user ini
          </Label>
        </div>

        {resetPassword && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              label="Password Baru"
              name="password"
              type="password"
              value={formData.password || ''}
              onChange={(value) => handleInputChange('password', value)}
              placeholder="Masukkan password baru (min. 8 karakter)"
              required
              error={errors.password}
            />

            <FormField
              label="Konfirmasi Password"
              name="password_confirmation"
              type="password"
              value={formData.password_confirmation || ''}
              onChange={(value) => handleInputChange('password_confirmation', value)}
              placeholder="Masukkan ulang password baru"
              required
              error={errors.password_confirmation}
            />
          </div>
        )}
      </div>
    </FormDialog>
  );
}
