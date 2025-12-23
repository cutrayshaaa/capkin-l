import React, { useState, useEffect } from 'react';
import { FormField } from './FormField';
import { FormDialog } from './FormDialog';
import { useIKUs } from '../../hooks/useIKUs';
import { useTeams } from '../../hooks/useTeams';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../pages/AuthProvider';
import { toast } from 'sonner';

interface IKUCreateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function IKUCreateForm({ open, onOpenChange, onSuccess }: IKUCreateFormProps) {
  const { createIKU } = useIKUs();
  const { teams } = useTeams();
  const { users } = useUsers();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nama_iku: '',
    // deskripsi: '', // Field deskripsi dikomentar - tidak digunakan dalam aplikasi saat ini
    id_tim: '',
    // pic: '', // Field PIC dikomentar - PIC otomatis dari ketua tim, tidak perlu input manual
    target_iku: '',
    persenan_target: '100',
    status: 'aktif'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fill team for team leaders
  useEffect(() => {
    if (user && user.role === 'ketua_tim' && user.id_tim && teams.length > 0) {
      const userTeam = teams.find(team => team.id_tim === user.id_tim);
      if (userTeam) {
        setFormData(prev => ({
          ...prev,
          id_tim: user.id_tim!.toString()
          // pic: user.id_user.toString() // Field PIC dikomentar - PIC otomatis dari ketua tim
        }));
      }
    }
  }, [user, teams]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-set PIC when team is selected
      // Field PIC dikomentar - PIC otomatis dari ketua tim
      // if (field === 'id_tim' && value) {
      //   const selectedTeam = teams.find(team => team.id_tim.toString() === value);
      //   
      //   if (selectedTeam && selectedTeam.id_ketua) {
      //     // Verify that the ketua exists in users table
      //     const ketuaUser = users.find(user => user.id_user === selectedTeam.id_ketua);
      //     if (ketuaUser) {
      //       newData.pic = selectedTeam.id_ketua.toString();
      //     } else {
      //       // Find any user from the team as fallback
      //       const teamUser = users.find(user => user.id_tim === selectedTeam.id_tim);
      //       if (teamUser) {
      //         newData.pic = teamUser.id_user.toString();
      //       } else {
      //         newData.pic = '';
      //       }
      //     }
      //   } else {
      //     // Find any user from the team as fallback
      //     const teamUser = users.find(user => user.id_tim === parseInt(value));
      //     if (teamUser) {
      //       newData.pic = teamUser.id_user.toString();
      //     } else {
      //       newData.pic = '';
      //     }
      //   }
      // }
      
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nama_iku.trim()) newErrors.nama_iku = 'Nama IKU wajib diisi';
    if (!formData.id_tim) newErrors.id_tim = 'Tim wajib dipilih';
    // Field PIC dikomentar - PIC otomatis dari ketua tim
    // if (!formData.pic) newErrors.pic = 'PIC tidak ditemukan untuk tim yang dipilih';

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
    if (!validateForm()) {
      toast.error('Mohon perbaiki error yang ada');
      return;
    }

    try {
      setIsLoading(true);
      
      // Prepare data for API
      const submitData = {
        ...formData,
        id_tim: parseInt(formData.id_tim),
        // pic: formData.pic, // Field PIC dikomentar - PIC otomatis dari ketua tim
        // deskripsi: formData.deskripsi || null, // Field deskripsi dikomentar - tidak digunakan dalam aplikasi saat ini
        target_iku: formData.target_iku ? parseInt(formData.target_iku) : null,
        persenan_target: formData.persenan_target ? parseFloat(formData.persenan_target) : 100,
      };






      await createIKU(submitData);
      toast.success('IKU berhasil dibuat');
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setFormData({
        nama_iku: '',
        // deskripsi: '', // Field deskripsi dikomentar - tidak digunakan dalam aplikasi saat ini
        id_tim: '',
        // pic: '', // Field PIC dikomentar - PIC otomatis dari ketua tim
        target_iku: '',
        persenan_target: '100',
        status: 'aktif'
      });
      setErrors({});
    } catch (error: any) {

      toast.error(error.message || 'Gagal membuat IKU');
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions = [
    { value: 'aktif', label: 'Aktif' },
    { value: 'nonaktif', label: 'Nonaktif' }
  ];


  const teamOptions = teams.map(team => ({
    value: team.id_tim.toString(),
    label: team.nama_tim
  }));


  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tambah IKU Baru"
      description="Buat IKU baru untuk sistem"
      onSubmit={handleSubmit}
      isLoading={isLoading}
    >
      {/* IKU Information Section */}
      <div className="space-y-3">
        <div className="border-l-4 border-primary pl-2">
          <h3 className="text-sm font-semibold text-foreground">Informasi IKU</h3>
        </div>
        
        <FormField
          label="Nama IKU"
          name="nama_iku"
          value={formData.nama_iku}
          onChange={(value) => handleInputChange('nama_iku', value)}
          placeholder="Masukkan nama IKU"
          required
          error={errors.nama_iku}
        />

        {/* Field deskripsi dikomentar - tidak digunakan dalam aplikasi saat ini */}
        {/* <FormField
          label="Deskripsi"
          name="deskripsi"
          type="textarea"
          value={formData.deskripsi}
          onChange={(value) => handleInputChange('deskripsi', value)}
          placeholder="Masukkan deskripsi IKU"
        /> */}
      </div>

      {/* Team Assignment Section */}
      <div className="space-y-3">
        <div className="border-l-4 border-secondary pl-2">
          <h3 className="text-sm font-semibold text-foreground">Penugasan Tim</h3>
        </div>
        
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
          disabled={user?.role === 'ketua_tim'}
        />
        
        {/* Field PIC dikomentar - PIC otomatis dari ketua tim */}
        {/* {formData.id_tim && !formData.pic && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Error:</strong> Tim yang dipilih tidak memiliki user yang valid
            </p>
            <p className="text-xs text-red-700 mt-1">
              Tim ini tidak memiliki ketua tim atau anggota yang valid. Silakan pilih tim lain atau hubungi administrator.
            </p>
          </div>
        )}
        
        {errors.pic && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{errors.pic}</p>
          </div>
        )} */}
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

      {/* Configuration Section */}
      <div className="space-y-3">
        <div className="border-l-4 border-accent pl-2">
          <h3 className="text-sm font-semibold text-foreground">Konfigurasi</h3>
        </div>
        
        <FormField
          label="Status"
          name="status"
          type="select"
          value={formData.status}
          onChange={(value) => handleInputChange('status', value)}
          options={statusOptions}
        />
      </div>
    </FormDialog>
  );
}
