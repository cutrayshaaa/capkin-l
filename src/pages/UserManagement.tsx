import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Plus, Edit, Trash2, Users, Eye, RefreshCw } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useData } from './DataProvider';
import { apiService } from '../services/api';
import { Pagination } from '../components/Pagination';
import { TableSkeleton } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { toast } from 'sonner';
import { UserCreateForm } from '../components/forms/UserCreateForm';
import { UserEditForm } from '../components/forms/UserEditForm';

interface User {
  id_user: number;
  username: string;
  password: string;
  nama_user: string;
  email?: string;
  nip?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenis_kelamin?: 'L' | 'P';
  alamat?: string;
  no_telepon?: string;
  foto_profil?: string;
  role: 'admin' | 'ketua_tim' | 'staff';
  id_tim?: number;
  status: 'aktif' | 'nonaktif';
  last_login_at?: string;
  created_at?: string;
  updated_at?: string;
  tim?: {
    id_tim: number;
    nama_tim: string;
    deskripsi?: string;
    ketua_tim?: number;
    status: string;
  };
}


export function UserManagement() {
  const { user } = useAuth();
  const { teams, users, addUser, updateUser, deleteUser, addTeam } = useData();
  const navigate = useNavigate();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [pagination, setPagination] = useState<any>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [localUsers, setLocalUsers] = useState<User[]>([]);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Load users with pagination
  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError(null);
      
      
      // Check if token is available
      const token = apiService.getToken();
      if (token) {
      }
      
      // Check localStorage
      const storedToken = localStorage.getItem('iku_token');
      const storedUser = localStorage.getItem('iku_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // User data available from localStorage
        } catch (e) {
          // Invalid stored user data
        }
      }
      
      // Try API call first
      try {
        const response = await apiService.getUsers('tim', perPage, currentPage);
        
        // Handle different response structures
        let usersData: any[] = [];
        let metaData = null;
        
        if (Array.isArray(response)) {
          // Response is direct array (from API service fallback)
          usersData = response;
          metaData = null;
        } else if (response?.data && Array.isArray(response.data)) {
          // Response has {data: [...], meta: {...}} structure
          usersData = response.data;
          metaData = response.meta;
        } else {
          // Fallback
          usersData = response?.users || [];
          metaData = response?.pagination || null;
        }
        
        if (usersData && usersData.length > 0) {
          setLocalUsers(usersData);
          setPagination(metaData);
        } else {
          setLocalUsers([]);
          setPagination(null);
        }
      } catch (apiError: any) {
        // If no data from DataProvider either, use fallback data for testing
        if (!users || users.length === 0) {
          const fallbackUsers: User[] = [
            {
              id_user: 1,
              username: 'admin',
              password: 'hashed_password',
              nama_user: 'Administrator',
              email: 'admin@example.com',
              role: 'admin',
              status: 'aktif',
              foto_profil: undefined,
              id_tim: 0,
              tim: undefined
            },
            {
              id_user: 2,
              username: 'ketua1',
              password: 'hashed_password',
              nama_user: 'Ketua Tim 1',
              email: 'ketua1@example.com',
              role: 'ketua_tim',
              status: 'aktif',
              foto_profil: undefined,
              id_tim: 1,
              tim: {
                id_tim: 1,
                nama_tim: 'Tim Pengembangan',
                deskripsi: 'Tim untuk pengembangan sistem',
                ketua_tim: 2,
                status: 'aktif'
              }
            }
          ];
          setLocalUsers(fallbackUsers);
          setPagination(null);
        } else {
          setLocalUsers([]);
          setPagination(null);
        }
      }
      
      setLastRefresh(new Date());
    } catch (error: any) {
      setIsError(true);
      setUsersError(error?.message || 'Gagal memuat data user');
      setLocalUsers([]);
      setPagination(null);
    } finally {
      setUsersLoading(false);
    }
  };

  // Load users on mount and when pagination changes
  useEffect(() => {
    // Only load if user is authenticated
    if (user) {
      loadUsers();
    } else {
      setUsersLoading(false);
    }
  }, [currentPage, perPage, user]);

  const handleEditUser = (userData: User) => {
    setEditingUser(userData);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setIsLoading(true);
    try {
      // Call API to delete user
      await apiService.delete(`/users/${deletingUser.id_user}`);

      // Refresh users list
      const usersResponse = await apiService.getUsers('tim', perPage, currentPage);
      setLocalUsers(usersResponse.data || []);
      setPagination(usersResponse.meta || null);

      setIsDeleteDialogOpen(false);
      setDeletingUser(null);
      toast.success(`User "${deletingUser.nama_user}" berhasil dihapus`);
    } catch (error: any) {
      setIsError(true);
      toast.error(error.message || 'Gagal menghapus user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProfile = (userId: number) => {
    navigate(`/admin/users/${userId}`);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'ketua_tim': return 'bg-blue-100 text-blue-800';
      case 'staff': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'admin': return 'Administrator';
      case 'ketua_tim': return 'Ketua Tim';
      case 'staff': return 'Staff';
      default: return level;
    }
  };

  return (
    <div className="space-y-6">

      {/* Users List */}
      <Card className="card-gradient">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-start gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-indigo-50 text-indigo-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg md:text-xl font-bold leading-tight">User Management</div>
              <div className="text-sm text-muted-foreground mt-1">Kelola semua pengguna dalam sistem</div>
              <div className="mt-2 flex items-center gap-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">{(localUsers.length > 0 ? localUsers.length : users.length)} User</span>
                {lastRefresh && (
                  <span className="text-xs text-muted-foreground">Terakhir: {lastRefresh.toLocaleTimeString()}</span>
                )}
                <div className="h-1 w-32 rounded-full bg-gradient-to-r from-indigo-200 via-indigo-100 to-transparent" />
              </div>
            </div>
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={loadUsers}
              disabled={usersLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${usersLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Tambah User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : usersError && users.length === 0 ? (
            <ErrorState
              message={usersError}
              onRetry={() => {
                setCurrentPage(1);
                setUsersError(null);
              }}
            />
          ) : (localUsers.length === 0 && users.length === 0) ? (
            <EmptyState
              icon="users"
              title="Belum Ada User"
              message="Gunakan tombol 'Tambah User' untuk menambahkan pengguna baru ke sistem."
              actionLabel="Tambah User"
              onAction={() => setIsAddDialogOpen(true)}
            />
          ) : (
            <div className="space-y-4">
              
              {/* Display users - prioritize localUsers, fallback to users from DataProvider */}
              {(localUsers.length > 0 ? localUsers : users).map(userData => {
                const userTeam = teams.find(t => t.id_tim === userData.id_tim);
                const getAvatarUrl = (path?: string) => {
                  if (!path) return '';
                  if (path.startsWith('data:')) return path;
                  if (path.startsWith('http://') || path.startsWith('https://')) return path;
                  const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
                  const storageBaseUrl = baseUrl.replace('/api', '');
                  if (path.startsWith('/')) {
                    return `${storageBaseUrl}${path}`;
                  } else {
                    return `${storageBaseUrl}/storage/${path}`;
                  }
                };
                
                return (
                  <div key={userData.id_user} className="flex items-center justify-between p-4 rounded-lg border bg-card hover-team-effect">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-collaboration flex items-center justify-center text-white font-medium overflow-hidden">
                        {userData.foto_profil ? (
                          <img 
                            src={getAvatarUrl(userData.foto_profil)} 
                            alt={userData.nama_user}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to initial if image fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = userData.nama_user?.charAt(0).toUpperCase() || 'U';
                            }}
                          />
                        ) : (
                          userData.nama_user?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{userData.nama_user || 'Nama tidak tersedia'}</h4>
                        <p className="text-sm text-muted-foreground">@{userData.username || 'username'}</p>
                        {user?.role === 'admin' && userData.password && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Password: <span className="font-mono bg-gray-100 px-1 rounded">{userData.password}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getLevelColor(userData.role)}`}>
                            {getLevelLabel(userData.role)}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            userData.status === 'aktif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {userData.status === 'aktif' ? 'Aktif' : 'Non Aktif'}
                          </span>
                          {userTeam && userData.role === 'ketua_tim' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {userTeam.nama_tim}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewProfile(userData.id_user)}
                        className="hover:bg-blue-50 hover:border-blue-200"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Lihat Profil
                      </Button> */}
                      {user?.role === 'admin' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditUser(userData)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingUser(userData);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Hapus
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Pagination */}
          {pagination && (localUsers.length > 0 || users.length > 0) && (
            <Pagination
              currentPage={pagination.current_page || 1}
              lastPage={pagination.last_page || 1}
              total={pagination.total || users.length}
              perPage={pagination.per_page || perPage}
              onPageChange={setCurrentPage}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setCurrentPage(1); // Reset to first page when changing per page
              }}
            />
          )}
          
          {/* Fallback pagination info when no pagination data */}
          {!pagination && users.length > 0 && (
            <div className="text-center text-sm text-gray-500 mt-4">
              Menampilkan {users.length} user dari DataProvider
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Components */}
      <UserCreateForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          // Refresh users list
          setCurrentPage(1);
          toast.success('User berhasil ditambahkan');
        }}
      />

      <UserEditForm
        open={isEditDialogOpen}
        onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditingUser(null);
          }
        }}
        user={editingUser as any}
        onSuccess={() => {
          // Refresh users list
          setCurrentPage(1);
          toast.success('User berhasil diperbarui');
        }}
      />

      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Hapus User</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus user "<strong>{deletingUser?.nama_user}</strong>"? 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingUser(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? 'Menghapus...' : 'Hapus User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
