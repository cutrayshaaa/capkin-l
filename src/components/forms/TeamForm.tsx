import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Users, User } from 'lucide-react';
import { toast } from 'sonner';
import type { Team } from '../../types/models';

// Interface untuk user data yang konsisten
interface UserData {
  id_user: number;
  nama_user: string;
  username: string;
  role: 'admin' | 'ketua_tim' | 'staff';
  status: 'aktif' | 'nonaktif';
  id_tim?: number;
}

// Interface untuk form data yang konsisten dengan backend
interface TeamFormData {
  nama_tim: string;
  deskripsi: string;
  ketua_tim: string;
  status: 'aktif' | 'nonaktif';
}

interface TeamFormProps {
  initialData?: Partial<TeamFormData>;
  users: UserData[];
  onSubmit: (data: TeamFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

const initialFormData: TeamFormData = {
  nama_tim: '',
  deskripsi: '',
  ketua_tim: '',
  status: 'aktif',
};

const statusOptions = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'nonaktif', label: 'Non Aktif' }
];

export function TeamForm({ 
  initialData, 
  users, 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  isEdit = false 
}: TeamFormProps) {
  const [formData, setFormData] = useState<TeamFormData>({
    ...initialFormData,
    ...initialData
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when initialData changes
  useEffect(() => {
    setFormData({
      ...initialFormData,
      ...initialData
    });
  }, [initialData]);

  // Filter users who can be team leaders
  const eligibleLeaders = users.filter(user => {
    // Only staff who are not in any team and are active
    return user.role === 'staff' && 
           !user.id_tim && 
           user.status === 'aktif';
  });


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

    if (!formData.ketua_tim) {
      newErrors.ketua_tim = 'Ketua tim wajib dipilih';
    } else {
      // Validate that selected user is available
      const selectedUser = users.find(u => u.id_user.toString() === formData.ketua_tim);
      if (selectedUser) {
        if (selectedUser.role !== 'staff') {
          newErrors.ketua_tim = 'Hanya staff yang dapat menjadi ketua tim';
        }
        if (selectedUser.id_tim) {
          newErrors.ketua_tim = 'User sudah menjadi anggota tim lain';
        }
      }
    }

    if (!formData.status) {
      newErrors.status = 'Status wajib dipilih';
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

      
      // Prepare data for API - clean and format
      const submitData = {
        nama_tim: formData.nama_tim.trim(),
        deskripsi: formData.deskripsi.trim() || null,
        ketua_tim: parseInt(formData.ketua_tim),
        status: formData.status
      };
      

      await onSubmit(submitData);
    } catch (error) {

    }
  };

  const handleInputChange = (field: keyof TeamFormData, value: string) => {
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {isEdit ? 'Edit Tim' : 'Tambah Tim Baru'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama_tim">Nama Tim *</Label>
              <Input
                id="nama_tim"
                value={formData.nama_tim}
                onChange={(e) => handleInputChange('nama_tim', e.target.value)}
                placeholder="Masukkan nama tim"
                className={errors.nama_tim ? 'border-red-500' : ''}
              />
              {errors.nama_tim && (
                <p className="text-sm text-red-500">{errors.nama_tim}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) => handleInputChange('deskripsi', e.target.value)}
                placeholder="Masukkan deskripsi tim (opsional)"
                rows={4}
              />
            </div>
          </div>

          {/* Team Leader Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ketua_tim">Ketua Tim *</Label>
              <Select 
                value={formData.ketua_tim} 
                onValueChange={(value) => handleInputChange('ketua_tim', value)}
              >
                <SelectTrigger className={errors.ketua_tim ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Pilih ketua tim" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleLeaders.length > 0 ? (
                    eligibleLeaders.map((user) => (
                      <SelectItem key={user.id_user} value={user.id_user.toString()}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{user.nama_user}</div>
                            <div className="text-sm text-gray-500">
                              @{user.username} • {user.role}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      Tidak ada staff yang tersedia untuk menjadi ketua tim
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.ketua_tim && (
                <p className="text-sm text-red-500">{errors.ketua_tim}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
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
              {errors.status && (
                <p className="text-sm text-red-500">{errors.status}</p>
              )}
            </div>
          </div>

          {/* Warning if no eligible leaders */}
          {eligibleLeaders.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Perhatian:</p>
                  <p>Tidak ada staff yang tersedia untuk menjadi ketua tim. Pastikan ada staff yang belum ditugaskan ke tim lain.</p>
                </div>
              </div>
            </div>
          )}

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Informasi Tim:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Tim yang dibuat akan dapat mengelola IKU dan target</li>
                  <li>• Ketua tim akan memiliki akses penuh untuk mengelola tim</li>
                  <li>• Status tim dapat diubah sewaktu-waktu</li>
                  <li>• Pastikan staff yang dipilih belum menjadi anggota tim lain</li>
                </ul>
              </div>
            </div>
          </div>

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
              {isLoading ? 'Menyimpan...' : (isEdit ? 'Update Tim' : 'Buat Tim')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
