import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Phone,
  MapPin,
  Edit,
  Save,
  X,
  Camera,
  Briefcase,
  Calendar,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { toast } from 'sonner';

export function ProfilePage() {
  const { user: currentUser, updateUser, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.foto_profil || ''); // Field foto profil dikomentar - tidak digunakan dalam form ini
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  
  // Form data interface for type safety
interface ProfileFormData {
    nama_user: string;
    username: string;
    // email: string; // Field email dikomentar - tidak digunakan dalam form ini
    // nip: string; // Field NIP dikomentar - tidak digunakan dalam form ini
    // no_telepon: string; // Field no telepon dikomentar - tidak digunakan dalam form ini
    // alamat: string; // Field alamat dikomentar - tidak digunakan dalam form ini
    // jenis_kelamin: 'L' | 'P' | ''; // Field jenis kelamin dikomentar - tidak digunakan dalam form ini
    // tempat_lahir: string; // Field tempat lahir dikomentar - tidak digunakan dalam form ini
    // tanggal_lahir: string; // Field tanggal lahir dikomentar - tidak digunakan dalam form ini
  }

  const [formData, setFormData] = useState<ProfileFormData>({
    nama_user: currentUser?.nama_user || '',
    username: currentUser?.username || '',
    // email: currentUser?.email || '', // Field email dikomentar - tidak digunakan dalam form ini
    // nip: currentUser?.nip || '', // Field NIP dikomentar - tidak digunakan dalam form ini
    // no_telepon: currentUser?.no_telepon || '', // Field no telepon dikomentar - tidak digunakan dalam form ini
    // alamat: currentUser?.alamat || '', // Field alamat dikomentar - tidak digunakan dalam form ini
    // jenis_kelamin: (currentUser?.jenis_kelamin as 'L' | 'P') || '', // Field jenis kelamin dikomentar - tidak digunakan dalam form ini
    // tempat_lahir: currentUser?.tempat_lahir || '', // Field tempat lahir dikomentar - tidak digunakan dalam form ini
    // tanggal_lahir: currentUser?.tanggal_lahir || '' // Field tanggal lahir dikomentar - tidak digunakan dalam form ini
  });


  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Helper function to transform user data to form data
  const transformUserToFormData = (user: any): ProfileFormData => {
    return {
      nama_user: user.nama_user || '',
      username: user.username || '',
      // Field-field berikut dikomentar - tidak digunakan dalam form ini
      // email: user.email || '',
      // nip: user.nip || '',
      // no_telepon: user.no_telepon || '',
      // alamat: user.alamat || '',
      // jenis_kelamin: (user.jenis_kelamin as 'L' | 'P') || '',
      // tempat_lahir: user.tempat_lahir || '',
      // tanggal_lahir: user.tanggal_lahir ? user.tanggal_lahir.split('T')[0] : ''
    };
  };

  // Helper function to get gender display label
  const getGenderLabel = (gender: string) => {
    if (gender === 'L') return 'Laki-laki';
    if (gender === 'P') return 'Perempuan';
    return gender;
  };

  React.useEffect(() => {
    if (currentUser) {
      setFormData(transformUserToFormData(currentUser));
      setAvatarUrl(currentUser.foto_profil || '');
      
    } else {
      // Fallback data for testing if no user is loaded
      const fallbackUser = {
        id_user: 7,
        nama_user: 'Ketua Tim Statistik Produksi',
        username: 'statistik_produksi',
        email: 'ketua.produksi@sikudamai.local',
        nip: '12345678901234567891',
        no_telepon: '19028912',
        alamat: 'alksjdkasjdaskdja',
        jenis_kelamin: 'L',
        tempat_lahir: 'Jakarta', // Test data - should show this value
        tanggal_lahir: '1985-06-15',
        foto_profil: undefined,
        role: 'ketua_tim' as const,
        id_tim: 1
      };
      
      setFormData(transformUserToFormData(fallbackUser));
      setAvatarUrl(fallbackUser.foto_profil || '');
      

    }
  }, [currentUser]);

  const getAvatarUrl = (path?: string) => {
    if (!path) return '';
    // Base64 data URL - return as is
    if (path.startsWith('data:')) return path;
    // Full URL - return as is
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    
    // For relative paths (if backend changes to file storage later)
    const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
    const storageBaseUrl = baseUrl.replace('/api', '');
    
    if (path.startsWith('/')) {
      return `${storageBaseUrl}${path}`;
    } else {
      return `${storageBaseUrl}/storage/${path}`;
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar');
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 2MB');
        return;
      }
      
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload immediately
    uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    try {
      setIsUploading(true);
      
      // Convert file to base64 string (backend expects string, not file)
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64String = e.target?.result as string;
          


          
          // Update user with base64 avatar string
          const response = await apiService.put(`/users/${currentUser?.id_user}`, {
            ...formData,
            foto_profil: base64String
          });
          

          
          const newAvatarUrl = response.data?.foto_profil || response.foto_profil || base64String;
          
          setAvatarUrl(newAvatarUrl);
          setAvatarPreview('');
          
          // Update user in AuthProvider and localStorage
          updateUser({ foto_profil: newAvatarUrl } as any);
          
          // Also refresh user from API to ensure sync
          await refreshUser();
          
          toast.success('Foto profil berhasil diupload dan tersimpan di database');
          
          // Don't reload - just update the state


        } catch (uploadError: any) {

          toast.error(uploadError.message || 'Gagal mengupload foto profil');
          setAvatarPreview('');
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        toast.error('Gagal membaca file');
        setAvatarPreview('');
        setIsUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error: any) {

      toast.error(error.message || 'Gagal mengupload foto profil');
      setAvatarPreview('');
      setIsUploading(false);
    }
  };

  const validateFormData = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Required fields validation
    if (!formData.nama_user.trim()) {
      errors.push('Nama lengkap wajib diisi');
    }
    
    if (!formData.username.trim()) {
      errors.push('Username wajib diisi');
    } else if (formData.username.length < 3) {
      errors.push('Username minimal 3 karakter');
    }
    
    // Validasi field-field berikut dikomentar - tidak digunakan dalam form ini
    // Email validation (optional but must be valid if provided)
    // if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    //   errors.push('Format email tidak valid');
    // }
    
    // Phone number validation (optional but must be valid if provided)
    // if (formData.no_telepon && !/^[0-9+\-\s()]+$/.test(formData.no_telepon)) {
    //   errors.push('Format nomor telepon tidak valid');
    // }
    
    return { isValid: errors.length === 0, errors };
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Validate form data
      const validation = validateFormData();
      if (!validation.isValid) {
        validation.errors.forEach(error => toast.error(error));
        return;
      }
      

      
      // Prepare data for API - clean and format according to backend expectations
      const submitData = {
        nama_user: formData.nama_user.trim(),
        username: formData.username.trim(),
        // Field-field berikut dikomentar - tidak digunakan dalam form ini
        // email: formData.email.trim() || null,
        // nip: formData.nip.trim() || null,
        // no_telepon: formData.no_telepon.trim() || null,
        // alamat: formData.alamat.trim() || null,
        // jenis_kelamin: formData.jenis_kelamin || null, // 'L' or 'P' format
        // tempat_lahir: formData.tempat_lahir.trim() || null,
        // tanggal_lahir: formData.tanggal_lahir || null, // Already in YYYY-MM-DD format
        foto_profil: avatarUrl || currentUser?.foto_profil  // Keep existing avatar
      };
      

      
      const response = await apiService.put(`/users/${currentUser?.id_user}`, submitData);
      

      
      // Update AuthProvider with new data
      updateUser(submitData as any);
      
      // Refresh from API to ensure sync
      await refreshUser();
      
      toast.success('Profil berhasil diperbarui');
      setIsEditing(false);
      

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
        toast.error(error.message || 'Gagal memperbarui profil');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validate passwords
    if (!passwordData.currentPassword) {
      toast.error('Password saat ini wajib diisi');
      return;
    }
    
    if (!passwordData.newPassword) {
      toast.error('Password baru wajib diisi');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }
    
    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error('Password baru harus berbeda dengan password saat ini');
      return;
    }

    try {
      setIsLoading(true);
      

      
      const response = await apiService.put(`/users/${currentUser?.id_user}`, {
        current_password: passwordData.currentPassword,
        password: passwordData.newPassword,
        password_confirmation: passwordData.confirmPassword
      });
      

      
      toast.success('Password berhasil diubah');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {

      toast.error(error.message || 'Gagal mengubah password');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrator', color: 'bg-red-500', icon: Shield };
      case 'ketua_tim':
        return { label: 'Ketua Tim', color: 'bg-blue-500', icon: Briefcase };
      case 'staff':
        return { label: 'Staff', color: 'bg-green-500', icon: UserIcon };
      default:
        return { label: role, color: 'bg-gray-500', icon: UserIcon };
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  const roleInfo = getRoleInfo(currentUser.role);
  const RoleIcon = roleInfo.icon;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Profil Saya</h1>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setIsEditing(false);
                  setFormData(transformUserToFormData(currentUser));
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Batal
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          </div>
        </div>

      {/* Profile Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center md:items-start">
              <div className="relative">
                <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden relative">
                  {(avatarPreview || avatarUrl) ? (
                    <img 
                      src={avatarPreview || getAvatarUrl(avatarUrl)} 
                      alt={currentUser.nama_user}
                      className="w-full h-full object-cover"
                      onLoad={() => {}}
                      onError={() => {}}
                    />
                  ) : (
                    currentUser.nama_user?.charAt(0).toUpperCase()
                  )}
                  
                  {/* Upload overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="text-white text-sm">Uploading...</div>
                    </div>
                  )}
                </div>
                <button
                      onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-full hover:bg-primary/90 transition-colors shadow-md disabled:bg-gray-400"
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Camera className="h-3 w-3" />
                  )}
                </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                  onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                </div>
            
            {/* User Info */}
            <div className="flex-1 space-y-1">
              <h2 className="text-2xl font-bold">{currentUser.nama_user}</h2>
              <p className="text-muted-foreground">@{currentUser.username}</p>
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="secondary" className="gap-1">
                  <RoleIcon className="h-3 w-3" />
                    {roleInfo.label}
                </Badge>
                {currentUser.tim && (
                  <Badge variant="outline" className="gap-1">
                    <Briefcase className="h-3 w-3" />
                    {currentUser.tim.nama_tim}
                  </Badge>
                )}
                    </div>
                  </div>
                </div>

          <div className="border-t my-6"></div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <Label htmlFor="nama_user" className="text-sm font-medium">Nama Lengkap</Label>
                      <Input
                        id="nama_user"
                        value={formData.nama_user}
                onChange={(e) => setFormData({ ...formData, nama_user: e.target.value })}
                        disabled={!isEditing}
                className="h-9"
                      />
                    </div>
                    
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                      <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        disabled={!isEditing}
                className="h-9"
                      />
                    </div>
                    
            {/* Email */}
            {/* Field-field berikut dikomentar - tidak digunakan dalam form ini */}
            {/* Email */}
            {/* <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                      <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={!isEditing}
                className="h-9"
                      />
                    </div> */}

            {/* NIP */}
            {/* <div className="space-y-1.5">
              <Label htmlFor="nip" className="text-sm font-medium">NIP</Label>
                      <Input
                id="nip"
                value={formData.nip}
                onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                        disabled={!isEditing}
                className="h-9"
                      />
                    </div> */}

            {/* No Telepon */}
            {/* <div className="space-y-1.5">
              <Label htmlFor="no_telepon" className="text-sm font-medium">No. Telepon</Label>
                        <Input
                          id="no_telepon"
                          value={formData.no_telepon}
                onChange={(e) => setFormData({ ...formData, no_telepon: e.target.value })}
                          disabled={!isEditing}
                className="h-9"
                        />
                      </div> */}
                      
            {/* Alamat */}
            {/* <div className="space-y-1.5">
              <Label htmlFor="alamat" className="text-sm font-medium">Alamat</Label>
                        <Input
                id="alamat"
                value={formData.alamat}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                          disabled={!isEditing}
                className="h-9"
                        />
                </div> */}

            {/* Tempat Lahir */}
            {/* <div className="space-y-1.5">
              <Label htmlFor="tempat_lahir" className="text-sm font-medium">Tempat Lahir</Label>
              <Input
                id="tempat_lahir"
                value={formData.tempat_lahir}
                onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                disabled={!isEditing}
                className="h-9"
                placeholder="Masukkan tempat lahir"
              />
            </div> */}
            

            {/* Jenis Kelamin */}
            {/* <div className="space-y-1.5">
              <Label htmlFor="jenis_kelamin" className="text-sm font-medium">Jenis Kelamin</Label>
              <Select
                value={formData.jenis_kelamin}
                onValueChange={(value) => setFormData({ ...formData, jenis_kelamin: value as 'L' | 'P' | '' })}
                disabled={!isEditing}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Pilih jenis kelamin">
                    {formData.jenis_kelamin ? getGenderLabel(formData.jenis_kelamin) : 'Pilih jenis kelamin'}
                  </SelectValue>
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="L">Laki-laki</SelectItem>
                <SelectItem value="P">Perempuan</SelectItem>
              </SelectContent>
              </Select>
            </div> */}
                    
            {/* Tanggal Lahir */}
            {/* <div className="space-y-1.5">
              <Label htmlFor="tanggal_lahir" className="text-sm font-medium">Tanggal Lahir</Label>
                      <Input
                id="tanggal_lahir"
                type="date"
                value={formData.tanggal_lahir}
                onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                disabled={!isEditing}
                className="h-9"
              />
                  </div> */}
                </div>
              </CardContent>
            </Card>

      {/* Change Password Card */}
      <Card>
        <CardContent className="p-6">
          <div className="border-t pt-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Ubah Password</h3>
              </div>
              {!isChangingPassword ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsChangingPassword(true)}
                  className="hover:bg-red-50 hover:border-red-200"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Ubah Password
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                    }}
                    className="hover:bg-gray-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Batal
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleChangePassword}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Mengubah...' : 'Simpan'}
                  </Button>
                </div>
              )}
            </div>

            {isChangingPassword && (
              <div className="space-y-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm font-semibold text-gray-700">Password Saat Ini</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="h-12 pr-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Masukkan password saat ini"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-semibold text-gray-700">Password Baru</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Minimal 6 karakter"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">Konfirmasi Password Baru</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Ulangi password baru"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
