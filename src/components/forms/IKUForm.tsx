import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Target, User, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../../pages/AuthProvider';
import { toast } from 'sonner';

interface Team {
  id_tim: number;
  nama_tim: string;
  status: string;
  users?: User[];
}

interface User {
  id_user: number;
  nama_user: string;
  role: string;
  status: string;
  id_tim?: number;
}

interface IKUFormData {
  nama_iku: string;
  // deskripsi: string; // Field deskripsi dikomentar - tidak digunakan dalam aplikasi saat ini
  id_tim: string;
  // pic: string; // Field PIC dikomentar - PIC otomatis dari ketua tim, tidak perlu input manual
  status: 'aktif' | 'nonaktif';
}

interface IKUFormProps {
  initialData?: Partial<IKUFormData>;
  teams: Team[];
  users: User[];
  onSubmit: (data: IKUFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

const initialFormData: IKUFormData = {
  nama_iku: '',
  // deskripsi: '', // Field deskripsi dikomentar - tidak digunakan dalam aplikasi saat ini
  id_tim: '',
  // pic: '', // Field PIC dikomentar - PIC otomatis dari ketua tim, tidak perlu input manual
  status: 'aktif',
};

const statusOptions = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'nonaktif', label: 'Non Aktif' }
];

export function IKUForm({ 
  initialData, 
  teams, 
  users, 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  isEdit = false 
}: IKUFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<IKUFormData>({
    ...initialFormData,
    ...initialData
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // const [availablePICs, setAvailablePICs] = useState<User[]>([]); // Field PIC dikomentar - PIC otomatis dari ketua tim

  // Reset form when initialData changes
  useEffect(() => {
    setFormData({
      ...initialFormData,
      ...initialData
    });
  }, [initialData]);

  // Auto-fill team for team leaders when creating new IKU
  useEffect(() => {
    if (!isEdit && user && user.role === 'ketua_tim' && user.id_tim && teams.length > 0) {
      const userTeam = teams.find(team => team.id_tim === user.id_tim);
      if (userTeam) {
        setFormData(prev => ({
          ...prev,
          id_tim: user.id_tim!.toString()
          // pic: user.id_user.toString() // Field PIC dikomentar - PIC otomatis dari ketua tim
        }));
      }
    }
  }, [user, teams, isEdit]);

  // Field PIC dikomentar - PIC otomatis dari ketua tim
  // useEffect(() => {
  //   if (formData.id_tim) {
  //     const selectedTeam = teams.find(team => team.id_tim.toString() === formData.id_tim);
  //     if (selectedTeam) {
  //       // Get users from the selected team
  //       const teamUsers = users.filter(user => 
  //         user.id_tim?.toString() === formData.id_tim && 
  //         user.status === 'aktif'
  //       );
  //       setAvailablePICs(teamUsers);
  //       
  //       // Clear PIC if current PIC is not in the selected team
  //       if (formData.pic && !teamUsers.find(user => user.id_user.toString() === formData.pic)) {
  //         setFormData(prev => ({ ...prev, pic: '' }));
  //       }
  //     }
  //   } else {
  //     setAvailablePICs([]);
  //     setFormData(prev => ({ ...prev, pic: '' }));
  //   }
  // }, [formData.id_tim, teams, users]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.nama_iku.trim()) {
      newErrors.nama_iku = 'Nama IKU wajib diisi';
    } else if (formData.nama_iku.length < 5) {
      newErrors.nama_iku = 'Nama IKU minimal 5 karakter';
    }

    // Field deskripsi dikomentar - tidak digunakan dalam aplikasi saat ini
    // if (!formData.deskripsi.trim()) {
    //   newErrors.deskripsi = 'Deskripsi IKU wajib diisi';
    // } else if (formData.deskripsi.length < 10) {
    //   newErrors.deskripsi = 'Deskripsi minimal 10 karakter';
    // }

    if (!formData.id_tim) {
      newErrors.id_tim = 'Tim wajib dipilih';
    }

    // Field PIC dikomentar - PIC otomatis dari ketua tim
    // if (!formData.pic) {
    //   newErrors.pic = 'PIC (Person In Charge) wajib dipilih';
    // }


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

  const handleInputChange = (field: keyof IKUFormData, value: string) => {
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
          <Target className="h-5 w-5" />
          {isEdit ? 'Edit IKU' : 'Tambah IKU Baru'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama_iku">Nama IKU *</Label>
              <Input
                id="nama_iku"
                value={formData.nama_iku}
                onChange={(e) => handleInputChange('nama_iku', e.target.value)}
                placeholder="Masukkan nama Indikator Kinerja Utama"
                className={errors.nama_iku ? 'border-red-500' : ''}
              />
              {errors.nama_iku && (
                <p className="text-sm text-red-500">{errors.nama_iku}</p>
              )}
            </div>

            {/* Field deskripsi dikomentar - tidak digunakan dalam aplikasi saat ini */}
            {/* <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi IKU *</Label>
              <Textarea
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) => handleInputChange('deskripsi', e.target.value)}
                placeholder="Jelaskan secara detail tentang IKU ini, tujuan, dan cara pengukurannya"
                rows={4}
                className={errors.deskripsi ? 'border-red-500' : ''}
              />
              {errors.deskripsi && (
                <p className="text-sm text-red-500">{errors.deskripsi}</p>
              )}
            </div> */}
          </div>

          {/* Team Assignment */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id_tim">Tim Penanggung Jawab *</Label>
              <Select 
                value={formData.id_tim} 
                onValueChange={(value) => handleInputChange('id_tim', value)}
                disabled={user?.role === 'ketua_tim' && !isEdit}
              >
                <SelectTrigger className={errors.id_tim ? 'border-red-500' : ''}>
                  <SelectValue placeholder={
                    user?.role === 'ketua_tim' && !isEdit 
                      ? "Tim Anda (Otomatis)" 
                      : "Pilih tim"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {teams.filter(team => team.status === 'aktif').map((team) => (
                    <SelectItem key={team.id_tim} value={team.id_tim.toString()}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {team.nama_tim}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {user?.role === 'ketua_tim' && !isEdit && (
                <p className="text-sm text-blue-600">
                  Tim Anda akan dipilih otomatis sebagai penanggung jawab
                </p>
              )}
              {errors.id_tim && (
                <p className="text-sm text-red-500">{errors.id_tim}</p>
              )}
            </div>

            {/* Field PIC dikomentar - PIC otomatis dari ketua tim */}
            {/* <div className="space-y-2">
              <Label htmlFor="pic">PIC (Person In Charge) *</Label>
              <Select 
                value={formData.pic} 
                onValueChange={(value) => handleInputChange('pic', value)}
                disabled={!formData.id_tim || (user?.role === 'ketua_tim' && !isEdit)}
              >
                <SelectTrigger className={errors.pic ? 'border-red-500' : ''}>
                  <SelectValue placeholder={
                    user?.role === 'ketua_tim' && !isEdit
                      ? "Anda (Otomatis)"
                      : !formData.id_tim 
                        ? "Pilih tim terlebih dahulu" 
                        : availablePICs.length === 0 
                          ? "Tidak ada anggota tim aktif"
                          : "Pilih PIC"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availablePICs.map((user) => (
                    <SelectItem key={user.id_user} value={user.id_user.toString()}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{user.nama_user}</div>
                          <div className="text-sm text-gray-500 capitalize">
                            {user.role.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {user?.role === 'ketua_tim' && !isEdit && (
                <p className="text-sm text-blue-600">
                  Anda akan menjadi PIC secara otomatis sebagai ketua tim
                </p>
              )}
              {errors.pic && (
                <p className="text-sm text-red-500">{errors.pic}</p>
              )}
            </div> */}
          </div>

          {/* Status Configuration */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
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

          {/* Information Box */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">Panduan IKU:</p>
                <ul className="space-y-1 text-green-700">
                  <li>• IKU harus spesifik, terukur, dan dapat dicapai</li>
                  <li>• Pilih PIC yang memiliki kompetensi dan tanggung jawab terkait</li>
                  <li>• Satuan pengukuran harus jelas dan konsisten</li>
                  <li>• Deskripsi yang baik membantu dalam penetapan target</li>
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
              {isLoading ? 'Menyimpan...' : (isEdit ? 'Update IKU' : 'Buat IKU')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
