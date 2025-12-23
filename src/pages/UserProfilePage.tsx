import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  User, 
  Mail, 
  Shield, 
  Building, 
  Calendar,
  Edit,
  Save,
  X,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Phone,
  MapPin,
  IdCard,
  Camera,
  Upload,
  UserCheck,
  Clock,
  Globe,
  ArrowLeft,
  Users,
  Settings
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useData } from './DataProvider';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { toast } from 'sonner';

// Constants
const genderOptions = [
  { value: 'Laki-laki', label: 'Laki-laki' },
  { value: 'Perempuan', label: 'Perempuan' }
];

const roleOptions = [
  { value: 'admin', label: 'Administrator', icon: Shield },
  { value: 'ketua_tim', label: 'Ketua Tim', icon: Users },
  { value: 'staff', label: 'Staff', icon: User }
];

const statusOptions = [
  { value: 'aktif', label: 'Aktif', color: 'text-green-600' },
  { value: 'nonaktif', label: 'Non Aktif', color: 'text-gray-600' }
];

// Custom Square Avatar Component dengan ukuran yang lebih besar
const SquareAvatar = ({ 
  src, 
  alt, 
  fallback, 
  size = '2xl', 
  className = "",
  onClick 
}: {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  onClick?: () => void;
}) => {
  const getSizeClass = (size: string) => {
    switch (size) {
      case 'sm': return 'h-16 w-16';
      case 'md': return 'h-24 w-24';
      case 'lg': return 'h-32 w-32';
      case 'xl': return 'h-40 w-40';
      case '2xl': return 'h-48 w-48';
      case '3xl': return 'h-56 w-56';
      default: return 'h-48 w-48';
    }
  };

  const getTextSize = (size: string) => {
    switch (size) {
      case 'sm': return 'text-lg';
      case 'md': return 'text-xl';
      case 'lg': return 'text-2xl';
      case 'xl': return 'text-3xl';
      case '2xl': return 'text-4xl';
      case '3xl': return 'text-5xl';
      default: return 'text-4xl';
    }
  };
  
  return (
    <div 
      className={`${getSizeClass(size)} ${className} relative overflow-hidden rounded-xl border-4 border-white shadow-2xl bg-gradient-to-br from-blue-500 to-purple-600 transition-transform duration-300`}
      onClick={onClick}
    >
      {src ? (
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className={`text-white font-bold ${getTextSize(size)}`}>
            {fallback?.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      
      {/* Overlay untuk hover effect */}
      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
        <div className="opacity-0 hover:opacity-100 transition-opacity duration-300">
          <Camera className="h-8 w-8 text-white" />
        </div>
      </div>
    </div>
  );
};

interface UserProfilePageProps {
  // No props needed - userId comes from URL params
}

export function UserProfilePage({}: UserProfilePageProps) {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { teams } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to get full avatar URL
  const getAvatarUrl = (avatarPath?: string) => {
    if (!avatarPath) return '';
    
    // If it's already a full URL (http/https), return as is
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    
    // If it's a data URL (base64), return as is
    if (avatarPath.startsWith('data:')) {
      return avatarPath;
    }
    
    // Otherwise, construct full URL from API base URL
    const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
    // Remove '/api' suffix if present for storage paths
    const storageBaseUrl = baseUrl.replace('/api', '');
    
    // If path starts with '/', use it as is, otherwise add '/storage/'
    if (avatarPath.startsWith('/')) {
      return `${storageBaseUrl}${avatarPath}`;
    } else {
      return `${storageBaseUrl}/storage/${avatarPath}`;
    }
  };
  
  // State for user data
  const [userData, setUserData] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  
  // Load user data from API
  useEffect(() => {
    const loadUserData = async () => {
      if (!userId || !currentUser) return;
      
      try {
        setUserLoading(true);
        setUserError(null);
        

        
        // Get user data from API
        const response = await apiService.getUsers('tim', 100, 1); // Get all users
        const users = response?.data || response || [];
        

        
        const foundUser = users.find((u: any) => u.id_user === parseInt(userId));
        
        if (foundUser) {
          setUserData(foundUser);



        } else {
          setUserError('User tidak ditemukan');

        }
        
      } catch (error: any) {

        setUserError('Gagal memuat data user');
      } finally {
        setUserLoading(false);
      }
    };
    
    loadUserData();
  }, [userId, currentUser]);
  
  const [formData, setFormData] = useState({
    // Basic Info
    nama_user: '',
    username: '',
    // nip: '', // Field NIP dikomentar - tidak digunakan dalam form ini
    
    // Personal Info - Field-field berikut dikomentar - tidak digunakan dalam form ini
    // tempat_lahir: '',
    // tanggal_lahir: '',
    // jenis_kelamin: '',
    
    // Contact Info - Field-field berikut dikomentar - tidak digunakan dalam form ini
    // alamat: '',
    // no_telepon: '',
    // email: '',
    
    // Account Info
    role: '',
    status: '',
    
    // Password
    password: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Update form data when userData changes
  useEffect(() => {
    if (userData) {
      setFormData({
        nama_user: userData.nama_user || '',
        username: userData.username || '',
        // nip: userData.nip || '', // Field NIP dikomentar - tidak digunakan dalam form ini
        // tempat_lahir: userData.tempat_lahir || '', // Field tempat lahir dikomentar - tidak digunakan dalam form ini
        // tanggal_lahir: userData.tanggal_lahir || '', // Field tanggal lahir dikomentar - tidak digunakan dalam form ini
        // jenis_kelamin: userData.jenis_kelamin || '', // Field jenis kelamin dikomentar - tidak digunakan dalam form ini
        // alamat: userData.alamat || '', // Field alamat dikomentar - tidak digunakan dalam form ini
        // no_telepon: userData.no_telepon || '', // Field no telepon dikomentar - tidak digunakan dalam form ini
        // email: userData.email || '', // Field email dikomentar - tidak digunakan dalam form ini
        role: userData.role || '',
        status: userData.status || '',
        password: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [userData]);

  // Show loading state if data is still loading
  if (isLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat data profil...</p>
        </div>
      </div>
    );
  }

  // Show error if user data is not available
  if (!userData || userError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-red-600 mb-4">{userError || 'Data pengguna tidak ditemukan'}</p>
          <Button onClick={() => navigate('/admin/users')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {

    const file = event.target.files?.[0];

    
    if (file) {
      
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
      

      
      // Store the file for upload
      setUploadedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {

        setProfileImage(e.target?.result as string);
        toast.success('Foto profil dipilih, klik Simpan untuk mengupload');
      };
      reader.readAsDataURL(file);
    } else {

    }
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    try {
      setIsUploading(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('user_id', userData.id_user.toString());
      
      // Upload file to server using uploadFile method
      const response = await apiService.uploadFile(API_ENDPOINTS.USER_UPLOAD_AVATAR, formData);
      
      if (response.success && response.data?.avatar_url) {
        return response.data.avatar_url;
      } else if (response.data?.foto_profil) {
        // Alternative response structure
        return response.data.foto_profil;
      } else {
        throw new Error(response.message || 'Upload gagal');
      }
    } catch (error: any) {

      throw new Error(error.message || 'Gagal mengupload foto profil');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setIsUploading(true);
      
      // Call API to remove avatar
      const response = await apiService.put(`/users/${userData.id_user}`, {
        foto_profil: null
      });
      
      if (response.success || response.data) {
        setProfileImage('');
        setUploadedFile(null);
        toast.success('Foto profil berhasil dihapus');
        
        // Reload user data
        const usersResponse = await apiService.getUsers('tim', 100, 1);
        const users = usersResponse?.data || usersResponse || [];
        const foundUser = users.find((u: any) => u.id_user === parseInt(userId || '0'));
        if (foundUser) {
          setUserData(foundUser);
        }
      } else {
        throw new Error(response.message || 'Gagal menghapus foto profil');
      }
    } catch (error: any) {

      toast.error(error.message || 'Gagal menghapus foto profil');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      let avatarUrl = userData?.foto_profil; // Keep existing avatar if no new upload
      
      // Upload avatar first if there's a new file
      if (uploadedFile) {
        try {
          avatarUrl = await uploadAvatar(uploadedFile);
          toast.success('Foto profil berhasil diupload');
        } catch (uploadError: any) {
          toast.error(uploadError.message || 'Gagal mengupload foto profil');
          return; // Stop if avatar upload fails
        }
      }

      // Prepare user data for API
      const userDataToUpdate = {
        nama_user: formData.nama_user,
        username: formData.username,
        // Field-field berikut dikomentar - tidak digunakan dalam form ini
        // nip: formData.nip,
        // tempat_lahir: formData.tempat_lahir,
        // tanggal_lahir: formData.tanggal_lahir,
        // jenis_kelamin: formData.jenis_kelamin,
        // alamat: formData.alamat,
        // no_telepon: formData.no_telepon,
        // email: formData.email,
        role: formData.role,
        status: formData.status,
        foto_profil: avatarUrl // Include the avatar URL
      };

      // Call API to update user
      await apiService.put(`/users/${userData.id_user}`, userDataToUpdate);
      
      setIsEditing(false);
      setUploadedFile(null); // Clear uploaded file
      toast.success('Profil berhasil diperbarui');
      
      // Reload user data
      const response = await apiService.getUsers('tim', 100, 1);
      const users = response?.data || response || [];
      const foundUser = users.find((u: any) => u.id_user === parseInt(userId || '0'));
      if (foundUser) {
        setUserData(foundUser);
        setProfileImage(''); // Clear preview image
      }
      
    } catch (error: any) {

      toast.error(error.message || 'Gagal memperbarui profil');
    }
  };

  const handleChangePassword = async () => {
    // Validate passwords
    if (!formData.password) {
      toast.error('Password saat ini wajib diisi');
      return;
    }
    
    if (!formData.newPassword) {
      toast.error('Password baru wajib diisi');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }
    
    if (formData.password === formData.newPassword) {
      toast.error('Password baru harus berbeda dengan password saat ini');
      return;
    }

    try {
      setIsLoading(true);
      

      
      const response = await apiService.put(`/users/${userData.id_user}`, {
        current_password: formData.password,
        password: formData.newPassword,
        password_confirmation: formData.confirmPassword
      });
      

      
      toast.success('Password berhasil diubah');
      setIsChangingPassword(false);
      setFormData(prev => ({
        ...prev,
        password: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error: any) {

      toast.error(error.message || 'Gagal mengubah password');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserTeam = () => {
    return teams?.find(team => team.id_tim === userData?.id_tim);
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrator', color: 'bg-red-100 text-red-800', icon: Shield };
      case 'ketua_tim':
        return { label: 'Ketua Tim', color: 'bg-blue-100 text-blue-800', icon: Users };
      case 'staff':
        return { label: 'Staff', color: 'bg-green-100 text-green-800', icon: User };
      default:
        return { label: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: User };
    }
  };

  const roleInfo = getRoleDisplay(userData?.role || '');
  const userTeam = getUserTeam();
  const RoleIcon = roleInfo.icon;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/admin/users')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
        
        {currentUser?.role === 'admin' && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      nama_user: userData.nama_user || '',
                      username: userData.username || '',
                      // Field-field berikut dikomentar - tidak digunakan dalam form ini
                      // email: userData.email || '',
                      // nip: userData.nip || '',
                      // no_telepon: userData.no_telepon || '',
                      // alamat: userData.alamat || '',
                      // jenis_kelamin: userData.jenis_kelamin || '',
                      // tempat_lahir: userData.tempat_lahir || '',
                      // tanggal_lahir: userData.tanggal_lahir || '',
                      role: userData.role || '',
                      status: userData.status || '',
                      password: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
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
        )}
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center md:items-start">
              <div className="relative">
                <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden relative">
                  {(profileImage || userData?.foto_profil) ? (
                    <img 
                      src={profileImage || getAvatarUrl(userData?.foto_profil)} 
                      alt={userData?.nama_user}
                      className="w-full h-full object-cover"
                      onLoad={() => {}}
                      onError={() => {}}
                    />
                  ) : (
                    userData?.nama_user?.charAt(0).toUpperCase()
                  )}
                  
                  {/* Upload overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="text-white text-sm">Uploading...</div>
                    </div>
                  )}
                </div>
                {currentUser?.role === 'admin' && (
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
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
            
            {/* User Info */}
            <div className="flex-1 space-y-1">
              <h2 className="text-2xl font-bold">{userData?.nama_user}</h2>
              <p className="text-muted-foreground">@{userData?.username}</p>
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="secondary" className="gap-1">
                  <RoleIcon className="h-3 w-3" />
                  {roleInfo.label}
                </Badge>
                {userTeam && (
                  <Badge variant="outline" className="gap-1">
                    <Building className="h-3 w-3" />
                    {userTeam.nama_tim}
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
                onChange={(e) => handleInputChange('nama_user', e.target.value)}
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
                onChange={(e) => handleInputChange('username', e.target.value)}
                disabled={!isEditing}
                className="h-9"
              />
            </div>

            {/* Field-field berikut dikomentar - tidak digunakan dalam form ini */}
            {/* Email */}
            {/* <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
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
                onChange={(e) => handleInputChange('nip', e.target.value)}
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
                onChange={(e) => handleInputChange('no_telepon', e.target.value)}
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
                onChange={(e) => handleInputChange('alamat', e.target.value)}
                disabled={!isEditing}
                className="h-9"
              />
            </div> */}

            {/* Jenis Kelamin */}
            {/* <div className="space-y-1.5">
              <Label htmlFor="jenis_kelamin" className="text-sm font-medium">Jenis Kelamin</Label>
              <Select
                value={formData.jenis_kelamin}
                onValueChange={(value) => handleInputChange('jenis_kelamin', value)}
                disabled={!isEditing}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Pilih jenis kelamin" />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
                onChange={(e) => handleInputChange('tanggal_lahir', e.target.value)}
                disabled={!isEditing}
                className="h-9"
              />
            </div> */}
          </div>

          {/* Password Change Section
          {currentUser?.role === 'admin' && (
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
                        setFormData(prev => ({
                          ...prev,
                          password: '',
                          newPassword: '',
                          confirmPassword: ''
                        }));
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
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="h-12 pr-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Masukkan password saat ini"
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-sm font-semibold text-gray-700">Password Baru</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => handleInputChange('newPassword', e.target.value)}
                        className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Minimal 6 karakter"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">Konfirmasi Password Baru</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Ulangi password baru"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )} */}
        </CardContent>
      </Card>
    </div>
  );
}
