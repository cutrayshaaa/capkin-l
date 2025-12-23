import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Eye, EyeOff, User, Mail, Phone, MapPin, Calendar, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface Team {
  id_tim: number;
  nama_tim: string;
  status: string;
}

interface UserFormData {
  username: string;
  password: string;
  password_confirmation: string;
  nama_user: string;
  // email: string; // Field email dikomentar - tidak digunakan dalam form ini
  // nip: string; // Field NIP dikomentar - tidak digunakan dalam form ini
  // tempat_lahir: string; // Field tempat lahir dikomentar - tidak digunakan dalam form ini
  // tanggal_lahir: string; // Field tanggal lahir dikomentar - tidak digunakan dalam form ini
  // jenis_kelamin: 'L' | 'P' | ''; // Field jenis kelamin dikomentar - tidak digunakan dalam form ini
  // alamat: string; // Field alamat dikomentar - tidak digunakan dalam form ini
  // no_telepon: string; // Field no telepon dikomentar - tidak digunakan dalam form ini
  // foto_profil?: string; // Field foto profil dikomentar - tidak digunakan dalam form ini
  role: 'admin' | 'ketua_tim' | 'staff';
  id_tim: string;
  status: 'aktif' | 'nonaktif';
}

interface UserFormProps {
  initialData?: Partial<UserFormData>;
  teams: Team[];
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

const initialFormData: UserFormData = {
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
  // foto_profil: '', // Field foto profil dikomentar - tidak digunakan dalam form ini
  role: 'staff',
  id_tim: '',
  status: 'aktif',
};

const roleOptions = [
  { value: 'admin', label: 'Administrator', icon: Shield },
  { value: 'ketua_tim', label: 'Ketua Tim', icon: User },
  { value: 'staff', label: 'Staff', icon: User }
];

const genderOptions = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' }
];

const statusOptions = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'nonaktif', label: 'Non Aktif' }
];

export function UserForm({ 
  initialData, 
  teams, 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  isEdit = false 
}: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    ...initialFormData,
    ...initialData
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when initialData changes
  useEffect(() => {
    setFormData({
      ...initialFormData,
      ...initialData
    });
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username wajib diisi';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username minimal 3 karakter';
    }

    if (!isEdit && !formData.password) {
      newErrors.password = 'Password wajib diisi';
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password minimal 8 karakter';
    }

    if (formData.password && formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'Konfirmasi password tidak cocok';
    }

    if (!formData.nama_user.trim()) {
      newErrors.nama_user = 'Nama lengkap wajib diisi';
    }

    // Validasi email dikomentar - field email tidak digunakan dalam form ini
    // if (!formData.email.trim()) {
    //   newErrors.email = 'Email wajib diisi';
    // } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    //   newErrors.email = 'Format email tidak valid';
    // }

    // Validasi NIP dikomentar - field NIP tidak digunakan dalam form ini
    // if (!formData.nip.trim()) {
    //   newErrors.nip = 'NIP wajib diisi';
    // }

    // Validasi jenis kelamin dikomentar - field jenis kelamin tidak digunakan dalam form ini
    // if (!formData.jenis_kelamin) {
    //   newErrors.jenis_kelamin = 'Jenis kelamin wajib dipilih';
    // }

    if (!formData.role) {
      newErrors.role = 'Role wajib dipilih';
    }

    if (formData.role !== 'admin' && !formData.id_tim) {
      newErrors.id_tim = 'Tim wajib dipilih untuk role selain admin';
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

  const handleInputChange = (field: keyof UserFormData, value: string) => {
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

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {isEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Masukkan username"
                className={errors.username ? 'border-red-500' : ''}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => handleInputChange('role', value)}
              >
                <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        <role.icon className="h-4 w-4" />
                        {role.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role}</p>
              )}
            </div>
          </div>

          {/* Password Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                Password {!isEdit && '*'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder={isEdit ? 'Kosongkan jika tidak ingin mengubah' : 'Masukkan password'}
                  className={errors.password ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password_confirmation">
                Konfirmasi Password {!isEdit && '*'}
              </Label>
              <div className="relative">
                <Input
                  id="password_confirmation"
                  type={showPasswordConfirm ? 'text' : 'password'}
                  value={formData.password_confirmation}
                  onChange={(e) => handleInputChange('password_confirmation', e.target.value)}
                  placeholder="Konfirmasi password"
                  className={errors.password_confirmation ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                >
                  {showPasswordConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password_confirmation && (
                <p className="text-sm text-red-500">{errors.password_confirmation}</p>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nama_user">Nama Lengkap *</Label>
              <Input
                id="nama_user"
                value={formData.nama_user}
                onChange={(e) => handleInputChange('nama_user', e.target.value)}
                placeholder="Masukkan nama lengkap"
                className={errors.nama_user ? 'border-red-500' : ''}
              />
              {errors.nama_user && (
                <p className="text-sm text-red-500">{errors.nama_user}</p>
              )}
            </div>

            {/* Field email dikomentar - tidak digunakan dalam form ini */}
            {/* <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="nama@email.com"
                  className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div> */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field NIP dikomentar - tidak digunakan dalam form ini */}
            {/* <div className="space-y-2">
              <Label htmlFor="nip">NIP *</Label>
              <Input
                id="nip"
                value={formData.nip}
                onChange={(e) => handleInputChange('nip', e.target.value)}
                placeholder="Masukkan NIP"
                className={errors.nip ? 'border-red-500' : ''}
              />
              {errors.nip && (
                <p className="text-sm text-red-500">{errors.nip}</p>
              )}
            </div> */}

            {/* Field no telepon dikomentar - tidak digunakan dalam form ini */}
            {/* <div className="space-y-2">
              <Label htmlFor="no_telepon">No. Telepon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="no_telepon"
                  value={formData.no_telepon}
                  onChange={(e) => handleInputChange('no_telepon', e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="pl-10"
                />
              </div>
            </div> */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Field tempat lahir dikomentar - tidak digunakan dalam form ini */}
            {/* <div className="space-y-2">
              <Label htmlFor="tempat_lahir">Tempat Lahir</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="tempat_lahir"
                  value={formData.tempat_lahir}
                  onChange={(e) => handleInputChange('tempat_lahir', e.target.value)}
                  placeholder="Kota kelahiran"
                  className="pl-10"
                />
              </div>
            </div> */}

            {/* Field tanggal lahir dikomentar - tidak digunakan dalam form ini */}
            {/* <div className="space-y-2">
              <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="tanggal_lahir"
                  type="date"
                  value={formData.tanggal_lahir}
                  onChange={(e) => handleInputChange('tanggal_lahir', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div> */}

            {/* Field jenis kelamin dikomentar - tidak digunakan dalam form ini */}
            {/* <div className="space-y-2">
              <Label htmlFor="jenis_kelamin">Jenis Kelamin *</Label>
              <Select 
                value={formData.jenis_kelamin} 
                onValueChange={(value) => handleInputChange('jenis_kelamin', value)}
              >
                <SelectTrigger className={errors.jenis_kelamin ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Pilih jenis kelamin" />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map((gender) => (
                    <SelectItem key={gender.value} value={gender.value}>
                      {gender.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.jenis_kelamin && (
                <p className="text-sm text-red-500">{errors.jenis_kelamin}</p>
              )}
            </div> */}
          </div>

          {/* Field alamat dikomentar - tidak digunakan dalam form ini */}
          {/* <div className="space-y-2">
            <Label htmlFor="alamat">Alamat</Label>
            <Textarea
              id="alamat"
              value={formData.alamat}
              onChange={(e) => handleInputChange('alamat', e.target.value)}
              placeholder="Masukkan alamat lengkap"
              rows={3}
            />
          </div> */}

          {/* Team Assignment */}
          {formData.role !== 'admin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id_tim">Tim *</Label>
                <Select 
                  value={formData.id_tim} 
                  onValueChange={(value) => handleInputChange('id_tim', value)}
                >
                  <SelectTrigger className={errors.id_tim ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Pilih tim" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.filter(team => team.status === 'aktif').map((team) => (
                      <SelectItem key={team.id_tim} value={team.id_tim.toString()}>
                        {team.nama_tim}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.id_tim && (
                  <p className="text-sm text-red-500">{errors.id_tim}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
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
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

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
              {isLoading ? 'Menyimpan...' : (isEdit ? 'Update' : 'Simpan')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
