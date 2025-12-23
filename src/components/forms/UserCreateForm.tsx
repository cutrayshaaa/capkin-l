import React, { useState } from 'react';
import { FormField } from './FormField';
import { FormDialog } from './FormDialog';
import { useUsers } from '../../hooks/useUsers';
import { useTeams } from '../../hooks/useTeams';
import { toast } from 'sonner';

interface UserCreateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UserCreateForm({ open, onOpenChange, onSuccess }: UserCreateFormProps) {
  const { createUser } = useUsers();
  const { teams } = useTeams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    password_confirmation: '',
    nama_user: '',
    // email: '', // Field email dikomentar - tidak digunakan dalam form ini
    // nip: '', // Field NIP dikomentar - tidak digunakan dalam form ini
    // tempat_lahir: '', // Field tempat lahir dikomentar - tidak digunakan dalam form ini
    // tanggal_lahir: '', // Field tanggal lahir dikomentar - tidak digunakan dalam form ini
    // jenis_kelamin: '', // Field jenis kelamin dikomentar - tidak digunakan dalam form ini
    // alamat: '', // Field alamat dikomentar - tidak digunakan dalam form ini
    // no_telepon: '', // Field no telepon dikomentar - tidak digunakan dalam form ini
    role: 'staff',
    id_tim: '',
    status: 'aktif'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) newErrors.username = 'Username wajib diisi';
    if (!formData.password.trim()) newErrors.password = 'Password wajib diisi';
    if (formData.password.length < 6) newErrors.password = 'Password minimal 6 karakter';
    if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'Konfirmasi password tidak cocok';
    }
    if (!formData.nama_user.trim()) newErrors.nama_user = 'Nama lengkap wajib diisi';
    // Validasi email dikomentar - field email tidak digunakan dalam form ini
    // if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
    //   newErrors.email = 'Format email tidak valid';
    // }
    if (!formData.role) newErrors.role = 'Role wajib dipilih';
    if (formData.role === 'ketua_tim' && !formData.id_tim) {
      newErrors.id_tim = 'Tim wajib dipilih untuk ketua tim';
    }
    // Staff tidak perlu memilih tim (akan di-assign otomatis)

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
        id_tim: formData.id_tim ? parseInt(formData.id_tim) : null,
        // tanggal_lahir: formData.tanggal_lahir || null,
        // email: formData.email || null,
        // nip: formData.nip || null,
        // tempat_lahir: formData.tempat_lahir || null,
        // alamat: formData.alamat || null,
        // no_telepon: formData.no_telepon || null,
      };

      await createUser(submitData);
      toast.success('User berhasil dibuat');
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setFormData({
        username: '',
        password: '',
        password_confirmation: '',
        nama_user: '',
        // email: '',
        // nip: '',
        // tempat_lahir: '',
        // tanggal_lahir: '',
        // jenis_kelamin: '',
        // alamat: '',
        // no_telepon: '',
        role: 'staff',
        id_tim: '',
        status: 'aktif'
      });
      setErrors({});
    } catch (error: any) {

      toast.error(error.message || 'Gagal membuat user');
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

  const genderOptions = [
    { value: 'Laki-laki', label: 'Laki-laki' },
    { value: 'Perempuan', label: 'Perempuan' }
  ];

  const teamOptions = teams.map(team => ({
    value: team.id_tim.toString(),
    label: team.nama_tim
  }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tambah User Baru"
      description="Buat user baru untuk sistem IKU"
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

          {/* <FormField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={(value) => handleInputChange('email', value)}
            placeholder="Masukkan email"
            error={errors.email}
          /> */}

          {/* <FormField
            label="NIP"
            name="nip"
            value={formData.nip}
            onChange={(value) => handleInputChange('nip', value)}
            placeholder="Masukkan NIP"
            error={errors.nip}
          /> */}
        </div>
      </div>

      {/* Security Section */}
      <div className="space-y-3">
        <div className="border-l-4 border-secondary pl-2">
          <h3 className="text-sm font-semibold text-foreground">Keamanan</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={(value) => handleInputChange('password', value)}
            placeholder="Masukkan password"
            required
            error={errors.password}
          />

          <FormField
            label="Konfirmasi Password"
            name="password_confirmation"
            type="password"
            value={formData.password_confirmation}
            onChange={(value) => handleInputChange('password_confirmation', value)}
            placeholder="Konfirmasi password"
            required
            error={errors.password_confirmation}
          />
        </div>
      </div>

      {/* Personal Information Section */}
      <div className="space-y-3">
        {/*         <div className="border-l-4 border-accent pl-2">
          <h3 className="text-sm font-semibold text-foreground">Informasi Pribadi</h3>
        </div> */}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Field tempat lahir dikomentar - tidak digunakan dalam form ini */}
          {/* <FormField
            label="Tempat Lahir"
            name="tempat_lahir"
            value={formData.tempat_lahir}
            onChange={(value) => handleInputChange('tempat_lahir', value)}
            placeholder="Masukkan tempat lahir"
          /> */}

          {/* Field tanggal lahir dikomentar - tidak digunakan dalam form ini */}
          {/* <FormField
            label="Tanggal Lahir"
            name="tanggal_lahir"
            type="date"
            value={formData.tanggal_lahir}
            onChange={(value) => handleInputChange('tanggal_lahir', value)}
          /> */}

          {/* Field jenis kelamin dikomentar - tidak digunakan dalam form ini */}
          {/* <FormField
            label="Jenis Kelamin"
            name="jenis_kelamin"
            type="select"
            value={formData.jenis_kelamin}
            onChange={(value) => handleInputChange('jenis_kelamin', value)}
            options={genderOptions}
            placeholder="Pilih jenis kelamin"
          /> */}

          {/* Field no telepon dikomentar - tidak digunakan dalam form ini */}
          {/* <FormField
            label="No. Telepon"
            name="no_telepon"
            type="tel"
            value={formData.no_telepon}
            onChange={(value) => handleInputChange('no_telepon', value)}
            placeholder="Masukkan nomor telepon"
          /> */}
        </div>

        {/* Field alamat dikomentar - tidak digunakan dalam form ini */}
        {/* <FormField
          label="Alamat"
          name="alamat"
          type="textarea"
          value={formData.alamat}
          onChange={(value) => handleInputChange('alamat', value)}
          placeholder="Masukkan alamat lengkap"
        /> */}
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

          <FormField
            label="Tim"
            name="id_tim"
            type="select"
            value={formData.id_tim}
            onChange={(value) => handleInputChange('id_tim', value)}
            options={teamOptions}
            placeholder="Pilih tim"
            error={errors.id_tim}
            disabled={formData.role === 'admin' || formData.role === 'staff'}
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
      </div>
    </FormDialog>
  );
}
