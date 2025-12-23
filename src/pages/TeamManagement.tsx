import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Plus, 
  Edit,
  Trash2,
  Users,
  RefreshCw,
  Eye
} from 'lucide-react';
import { useData } from './DataProvider';
import { apiService } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { TeamCreateForm } from '../components/forms/TeamCreateForm';
import { TeamEditForm } from '../components/forms/TeamEditForm';
import { Pagination } from '../components/Pagination';
import type { Team } from '../types/models';

// Interface untuk team data yang diperkaya
interface EnhancedTeam extends Team {
  users?: any[];
  ikus?: any[];
  nama_ketua?: string;
  id_ketua?: number;
}


export function TeamManagement() {
  const { teams, users, ikus, addTeam, addUser, updateTeam, updateUser, deleteTeam, deleteUser } = useData();
  const navigate = useNavigate();
  
  // Enhanced team loading state
  const [enhancedTeams, setEnhancedTeams] = useState<EnhancedTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [pagination, setPagination] = useState<any>(null);
  
  // Helper function to transform API response to consistent format
  const transformTeamsData = (response: any): EnhancedTeam[] => {
    let teamsData: any[] = [];
    
        if (Array.isArray(response)) {
          teamsData = response;
        } else if (response?.data && Array.isArray(response.data)) {
          teamsData = response.data;
        } else if (response?.teams && Array.isArray(response.teams)) {
          teamsData = response.teams;
        } else {

          teamsData = [];
        }
        
    return teamsData.map(team => ({
      ...team,
      // Ensure consistent field names
      id_tim: team.id_tim || team.id,
      nama_tim: team.nama_tim || team.name,
      nama_ketua: team.nama_ketua || team.leader_name,
      id_ketua: team.id_ketua || team.leader_id,
      status: team.status || 'aktif',
      users: team.users || [],
      ikus: team.ikus || []
    }));
  };

  // Load teams with relationships
  const loadTeams = useCallback(async () => {
    try {
      setTeamsLoading(true);
      setTeamsError(null);
      

      const response = await apiService.getTeams('users,ikus', perPage, currentPage);

      
      // Handle different response structures
      let teamsData: any[] = [];
      let metaData = null;
      
      if (Array.isArray(response)) {
        teamsData = response;
        metaData = null;
      } else if (response?.data && Array.isArray(response.data)) {
        teamsData = response.data;
        metaData = response.meta;
      } else {
        teamsData = response?.teams || [];
        metaData = response?.pagination || null;
      }
      
      const transformedTeams = transformTeamsData(teamsData);
      setEnhancedTeams(transformedTeams);
      setPagination(metaData);
      setLastRefresh(new Date());
      
      } catch (error: any) {
        setIsError(true);
        setTeamsError(error?.message || 'Gagal memuat data tim');
        setEnhancedTeams([]);
        setPagination(null);
      } finally {
        setTeamsLoading(false);
      }
  }, [perPage, currentPage]);
    
  useEffect(() => {
    loadTeams();
  }, [loadTeams, currentPage, perPage]);
  
  // State for add team dialog
  const [isAddTeamDialogOpen, setIsAddTeamDialogOpen] = useState(false);

  // State for edit team dialog
  const [isEditTeamDialogOpen, setIsEditTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<EnhancedTeam | null>(null);
  
  // State for operations loading
  const [isDeleting, setIsDeleting] = useState(false);


  // Handle delete team
  const handleDeleteTeam = async (teamId: number) => {
    // Check if team has active IKUs
    const team = enhancedTeams.find(t => t.id_tim === teamId);
    const teamIKUs = team?.ikus || [];
    
    if (teamIKUs.length > 0) {
      toast.error('Tidak dapat menghapus tim yang memiliki IKU aktif. Hapus atau pindahkan IKU terlebih dahulu.');
      return;
    }

    if (confirm('Apakah Anda yakin ingin menghapus tim ini?')) {
      try {
        setIsDeleting(true);

        
        // Delete team via API
        await apiService.delete(`/teams/${teamId}`);
        
        // Refresh teams data
        await loadTeams();
        
        toast.success('Tim berhasil dihapus');
      } catch (error: any) {
        setIsError(true);
        
        // Handle specific error messages from backend
        if (error.response?.data?.message) {
          toast.error(error.response.data.message);
        } else {
        toast.error(error.message || 'Gagal menghapus tim');
        }
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Open edit dialog
  const openEditDialog = (team: EnhancedTeam) => {
    setEditingTeam(team);
    setIsEditTeamDialogOpen(true);
  };

  // Handle edit team success
  const handleEditTeamSuccess = () => {
    // Refresh teams data after successful edit
    loadTeams();
  };

  // Navigate to team detail
  const handleViewTeamDetail = (teamId: number) => {
    navigate(`/admin/teams/${teamId}`);
  };

  return (
    <div className="space-y-4">
      

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-start gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-indigo-50 text-indigo-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg md:text-2xl font-bold leading-tight">Manajemen Tim</div>
              <div className="text-sm text-muted-foreground mt-1">Kelola struktur tim dan peran anggota.</div>
              <div className="mt-2 flex items-center gap-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">{enhancedTeams.length} Tim</span>
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
              onClick={loadTeams}
              disabled={teamsLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${teamsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          <Button 
            onClick={() => setIsAddTeamDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Tambah Tim
          </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {teamsLoading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : teamsError ? (
              <ErrorState
                message={teamsError}
                onRetry={() => {
                  setTeamsError(null);
                  setIsError(false);
                  loadTeams();
                }}
                type="generic"
              />
            ) : enhancedTeams.length === 0 ? (
              <EmptyState
                icon="users"
                title="Belum Ada Tim"
                message="Gunakan tombol 'Tambah Tim' untuk menambahkan tim baru ke sistem."
                actionLabel="Tambah Tim"
                onAction={() => setIsAddTeamDialogOpen(true)}
              />
            ) : (
              <div className="space-y-4">
                {enhancedTeams.map((team) => {

              
              // Find team leader from users relationship
              const teamLeader = team.users?.find((u: any) => u.role === 'ketua_tim') || 
                               team.users?.find((u: any) => u.role === 'ketua') ||
                               team.users?.[0]; // Fallback to first user
              
              // Count IKU from relationship
              const teamIKUCount = team.ikus?.length || 0;
              
              // Get team leader's name for display
              const leaderName = teamLeader?.nama_user || team.nama_ketua || 'Belum ditetapkan';
              
              
              return (
                <div key={team.id_tim} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 className="font-medium">{team.nama_tim || 'Nama tidak tersedia'}</h4>
                      <p className="text-sm text-muted-foreground">Ketua: {leaderName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          <Users className="h-4 w-4" />
                          Tim
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          {teamIKUCount} IKU
                        </span>
                        <Badge variant={team.id_ketua || teamLeader ? "default" : "secondary"}>
                          {team.id_ketua || teamLeader ? "Aktif" : "Perlu Ketua"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* <Button 
                      size="sm" 
                      variant="outline"
                      className="h-8 hover:bg-blue-50 hover:border-blue-200"
                      onClick={() => handleViewTeamDetail(team.id_tim)}
                      title="Lihat detail tim dan anggota"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Lihat Detail
                    </Button> */}
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-8 hover:bg-accent"
                      onClick={() => openEditDialog(team)}
                      title="Edit tim dan kredensial"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-8 text-destructive hover:text-destructive hover:bg-red-50"
                      onClick={() => handleDeleteTeam(team.id_tim)}
                      disabled={isDeleting}
                      title="Hapus tim"
                    >
                      {isDeleting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-1"></div>
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Hapus
                    </Button>
                  </div>
                </div>
              );
                })}
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {pagination && enhancedTeams.length > 0 && (
            <Pagination
              currentPage={pagination.current_page || currentPage}
              lastPage={pagination.last_page || 1}
              total={pagination.total || enhancedTeams.length}
              perPage={pagination.per_page || perPage}
              onPageChange={setCurrentPage}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setCurrentPage(1); // Reset to first page when changing per page
              }}
            />
          )}
          
          {/* Fallback pagination info when no pagination data */}
          {!pagination && enhancedTeams.length > 0 && (
            <div className="text-center text-sm text-gray-500 mt-4">
              Menampilkan {enhancedTeams.length} tim
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Edit Form */}
      <TeamEditForm
        open={isEditTeamDialogOpen}
        onOpenChange={setIsEditTeamDialogOpen}
        team={editingTeam}
        onSuccess={handleEditTeamSuccess}
      />


      {/* Team Create Form */}
      <TeamCreateForm
        open={isAddTeamDialogOpen}
        onOpenChange={setIsAddTeamDialogOpen}
        onSuccess={() => {
          // Refresh teams data after successful creation
          loadTeams();
        }}
      />
    </div>
  );
}
