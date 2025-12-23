import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';
import { Plus, Trash2, Target, RefreshCw, Edit, Filter, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { apiService } from '../services/api';
import type { IndikatorKinerja, Team, User, IKU, Proksi } from '../types/models';
import { IndikatorKinerjaCreateForm } from '../components/forms/IndikatorKinerjaCreateForm';
import { IndikatorKinerjaEditForm } from '../components/forms/IndikatorKinerjaEditForm';
import { Pagination } from '../components/Pagination';

export function IKUEntry() {
  const { user } = useAuth();
  
  // Local state management
  const [indikatorKinerjas, setIndikatorKinerjas] = useState<IndikatorKinerja[]>([]);
  const [ikus, setIkus] = useState<IKU[]>([]);
  const [proksis, setProksis] = useState<Proksi[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingIndikator, setEditingIndikator] = useState<IndikatorKinerja | null>(null);
  const [filterJenis, setFilterJenis] = useState<'all' | 'iku' | 'proksi'>('all');
  const [filterTim, setFilterTim] = useState<string>('all');
  const [expandedParents, setExpandedParents] = useState<number[]>([]);
  const [draggedItem, setDraggedItem] = useState<any | null>(null);
  const [dragOverItem, setDragOverItem] = useState<any | null>(null);
  const [sortOrder, setSortOrder] = useState<any[]>([]);
  
  // Pagination state - must be declared before useEffect
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  
  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterJenis, filterTim]);
  
  // Load data from API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load Indikator Kinerja with relationships
      const indikatorResponse = await apiService.getIndikatorKinerjas('tim,iku,proksi', 100, 1);
      
      // Handle different response structures
      let indikatorData: IndikatorKinerja[] = [];
      if (Array.isArray(indikatorResponse)) {
        indikatorData = indikatorResponse;
      } else if (indikatorResponse?.data && Array.isArray(indikatorResponse.data)) {
        indikatorData = indikatorResponse.data;
      }
      
      setIndikatorKinerjas(indikatorData);
      
      // Load IKU and Proksi separately for detailed info
      const ikusResponse = await apiService.getIKUs('indikatorKinerja,targets,realisasis', 100, 1);
      const ikusData = Array.isArray(ikusResponse) ? ikusResponse : ikusResponse?.data || [];
      setIkus(ikusData);
      
      const proksisResponse = await apiService.getProksis('indikatorKinerja,targets,realisasis,iku', 100, 1);
      const proksisData = Array.isArray(proksisResponse) ? proksisResponse : proksisResponse?.data || [];
      setProksis(proksisData);
      
      // Load teams
      const teamsResponse = await apiService.getTeams('users', 100, 1);
      const teamsData = Array.isArray(teamsResponse) ? teamsResponse : teamsResponse?.data || [];
      setTeams(teamsData);
      
      // Load users - handle 403 error gracefully
      let usersData: User[] = [];
      try {
        const usersResponse = await apiService.getUsers('tim', 100, 1);
        usersData = Array.isArray(usersResponse) ? usersResponse : usersResponse?.data || [];
      } catch (error: any) {
        const errorMessage = error?.message || '';
        const errorString = String(errorMessage).toLowerCase();
        
        if (errorString.includes('403') || 
            errorString.includes('forbidden') || 
            errorString.includes('akses ditolak') ||
            errorString.includes('insufficient_permission') ||
            errorString.includes('tidak memiliki izin')) {
          // console.warn('Access denied to /api/users endpoint. Role:', user?.role, '- Trying to extract users from team relationships...');
          if (teamsData && Array.isArray(teamsData)) {
            const extractedUsers: User[] = [];
            teamsData.forEach((team: any) => {
              if (team.users && Array.isArray(team.users)) {
                team.users.forEach((user: any) => {
                  if (!extractedUsers.find(u => u.id_user === user.id_user)) {
                    extractedUsers.push(user);
                  }
                });
              }
            });
            usersData = extractedUsers;
            // console.log('Extracted', extractedUsers.length, 'users from team relationships');
          }
        } else {
          // console.warn('Error loading users (non-critical):', error?.message || error);
        }
      }
      setUsers(usersData);
      setSortOrder([]); // Reset sort order when loading data
      
    } catch (error) {
      // console.error('Error loading data:', error);
      toast.error('Gagal memuat data Indikator Kinerja');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state if data is still loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat data Indikator Kinerja...</p>
        </div>
      </div>
    );
  }

  const handleDelete = async (id: number, namaIndikator: string, force: boolean = false) => {
    try {
      setIsDeleting(id);
      
      // If force delete, backend will handle cascade deletion
      // If not force, we need to delete IKU/Proksi first manually
      if (!force) {
        // Find associated IKU and Proksi
        const associatedIKU = ikus.find(iku => iku.id_indikator_kinerja === id);
        const associatedProksi = proksis.find(proksi => proksi.id_indikator_kinerja === id);
        
        // Delete associated IKU first
        if (associatedIKU) {
          try {
            await apiService.deleteIKU(associatedIKU.id_iku, false);
            // console.log('IKU deleted successfully before deleting indikator kinerja');
          } catch (ikuError: any) {
            const ikuErrorMessage = ikuError?.message || ikuError?.toString() || '';
            const lowerIkuMessage = ikuErrorMessage.toLowerCase();
            
            if (lowerIkuMessage.includes('target')) {
              toast.error('Tidak dapat menghapus IKU yang masih memiliki target. Hapus target terlebih dahulu atau gunakan Hapus Paksa.', {
                duration: 6000,
              });
            } else if (lowerIkuMessage.includes('realisasi')) {
              toast.error('Tidak dapat menghapus IKU yang masih memiliki realisasi. Hapus realisasi terlebih dahulu atau gunakan Hapus Paksa.', {
                duration: 6000,
              });
            } else {
              toast.error(`Gagal menghapus IKU: ${ikuErrorMessage}`, {
                duration: 6000,
              });
            }
            return;
          }
        }
        
        // Delete associated Proksi first
        if (associatedProksi) {
          try {
            await apiService.deleteProksi(associatedProksi.id_proksi, false);
            // console.log('Proksi deleted successfully before deleting indikator kinerja');
          } catch (proksiError: any) {
            const proksiErrorMessage = proksiError?.message || proksiError?.toString() || '';
            const lowerProksiMessage = proksiErrorMessage.toLowerCase();
            
            if (lowerProksiMessage.includes('target')) {
              toast.error('Tidak dapat menghapus Proksi yang masih memiliki target. Hapus target terlebih dahulu atau gunakan Hapus Paksa.', {
                duration: 6000,
              });
            } else if (lowerProksiMessage.includes('realisasi')) {
              toast.error('Tidak dapat menghapus Proksi yang masih memiliki realisasi. Hapus realisasi terlebih dahulu atau gunakan Hapus Paksa.', {
                duration: 6000,
              });
            } else {
              toast.error(`Gagal menghapus Proksi: ${proksiErrorMessage}`, {
                duration: 6000,
              });
            }
            return;
          }
        }
      }
      
      // Now delete the indikator kinerja (backend will handle cascade if force=true)
      await apiService.deleteIndikatorKinerja(id, force);
      
      // Refresh data after deletion
      await loadData();
      
      toast.success(
        force 
          ? `Indikator Kinerja "${namaIndikator}" berhasil dihapus paksa beserta semua data terkait`
          : `Indikator Kinerja "${namaIndikator}" berhasil dihapus`
      );
    } catch (error: any) {
      // console.error('Error deleting indikator kinerja:', error);
      
      // Handle specific backend errors
      const errorMessage = error?.message || error?.toString() || '';
      const lowerMessage = errorMessage.toLowerCase();
      
      // Check for IKU-related errors (only if not force delete)
      if (!force && (lowerMessage.includes('masih memiliki iku') || lowerMessage.includes('memiliki iku'))) {
        toast.error('Tidak dapat menghapus indikator kinerja yang masih memiliki IKU. Hapus IKU terlebih dahulu atau gunakan Hapus Paksa.', {
          duration: 6000,
        });
      } 
      // Check for Proksi-related errors (only if not force delete)
      else if (!force && (lowerMessage.includes('masih memiliki proksi') || lowerMessage.includes('memiliki proksi'))) {
        toast.error('Tidak dapat menghapus indikator kinerja yang masih memiliki Proksi. Hapus Proksi terlebih dahulu atau gunakan Hapus Paksa.', {
          duration: 6000,
        });
      } 
      // Check for target-related errors
      else if (lowerMessage.includes('has_targets') || lowerMessage.includes('target')) {
        toast.error('Tidak dapat menghapus indikator kinerja yang masih memiliki target. Hapus target terlebih dahulu.', {
          duration: 6000,
        });
      } 
      // Check for realisasi-related errors
      else if (lowerMessage.includes('has_realisasis') || lowerMessage.includes('realisasi')) {
        toast.error('Tidak dapat menghapus indikator kinerja yang masih memiliki realisasi. Hapus realisasi terlebih dahulu.', {
          duration: 6000,
        });
      } 
      // Generic error
      else {
        toast.error(errorMessage || 'Gagal menghapus Indikator Kinerja', {
          duration: 6000,
        });
      }
    } finally {
      setIsDeleting(null);
    }
  };

  // Get available teams (filtered by user role)
  const getAvailableTeams = () => {
    if (user?.role === 'admin') {
      return teams;
    }
    return teams.filter(t => t.id_tim === user?.id_tim);
  };

  // Filter and group Indikator Kinerja - Proksi grouped under their parent IKU
  const getFilteredIndikatorKinerjas = () => {
    if (!indikatorKinerjas || !ikus || !proksis) return [];
    
    let filtered = indikatorKinerjas;
    
    // Filter by role
    if (user?.role === 'admin') {
      // Admin can see all
    } else if (user?.role === 'ketua_tim') {
      filtered = filtered.filter(ik => ik.id_tim === user.id_tim);
    } else {
      filtered = filtered.filter(ik => ik.id_tim === user?.id_tim);
    }
    
    // Filter by tim
    if (filterTim !== 'all') {
      filtered = filtered.filter(ik => ik.id_tim === parseInt(filterTim));
    }
    
    // Create a map of parent IKU id -> array of proksis
    const proksisByParentIKU = new Map<number, any[]>();
    proksis.forEach(proksi => {
      if (proksi.id_iku) {
        if (!proksisByParentIKU.has(proksi.id_iku)) {
          proksisByParentIKU.set(proksi.id_iku, []);
        }
        proksisByParentIKU.get(proksi.id_iku)!.push(proksi);
      }
    });
    
    // Build result with IKU as parent and their Proksi as children
    const result: any[] = [];
    const processedIndikators = new Set<number>();
    
    // First pass: Add all IKUs as parents
    ikus.forEach(iku => {
      if (!processedIndikators.has(iku.id_indikator_kinerja)) {
        const indikator = filtered.find(ik => ik.id_indikator_kinerja === iku.id_indikator_kinerja && ik.jenis === 'iku');
        
        if (indikator && (filterJenis === 'all' || filterJenis === 'iku')) {
          result.push({
            key: `indikator_${indikator.id_indikator_kinerja}_iku`,
            nama_indikator: indikator.nama_indikator,
            id_tim: indikator.id_tim || 0,
            tim: indikator.tim,
            jenis: 'iku',
            indikator: indikator,
            iku: iku, // Store IKU reference
            hasIku: true,
            hasProksi: false,
            children: [],
            isParent: true,
            noUrut: result.filter(r => r.isParent).length + 1, // Parent numbering
          });
        }
        
        processedIndikators.add(iku.id_indikator_kinerja);
      }
    });
    
    // Second pass: Add Proksis as children of their parent IKU or as standalone
    proksis.forEach(proksi => {
      if (filterJenis === 'all' || filterJenis === 'proksi') {
        // Try to find parent using id_iku
        let parentIdx = -1;
        
        if (proksi.id_iku) {
          // Match by id_iku
          parentIdx = result.findIndex(r => r.jenis === 'iku' && r.iku?.id_iku === proksi.id_iku);
        }
        
        // Fallback: match by id_indikator_kinerja if both IKU and Proksi have same indikator
        if (parentIdx < 0 && proksi.id_indikator_kinerja) {
          // Find parent with same id_indikator_kinerja
          parentIdx = result.findIndex(r => r.jenis === 'iku' && r.indikator.id_indikator_kinerja === proksi.id_indikator_kinerja);
        }
        
        const proksiIndikator = filtered.find(ik => ik.id_indikator_kinerja === proksi.id_indikator_kinerja && ik.jenis === 'proksi');
        
        if (proksiIndikator) {
          if (parentIdx >= 0) {
            // Add as child to parent IKU
            result[parentIdx].children.push({
              key: `indikator_${proksiIndikator.id_indikator_kinerja}_proksi`,
              nama_indikator: proksiIndikator.nama_indikator,
              id_tim: proksiIndikator.id_tim || 0,
              tim: proksiIndikator.tim,
              jenis: 'proksi',
              indikator: proksiIndikator,
              hasIku: false,
              hasProksi: true,
              isChild: true,
              parentNoUrut: result[parentIdx].noUrut, // Reference parent number
              parentId: result[parentIdx].indikator?.id_indikator_kinerja || null,
            });
          } else if (filterJenis === 'all' || filterJenis === 'proksi') {
            // Add as standalone if no parent found
            result.push({
              key: `indikator_${proksiIndikator.id_indikator_kinerja}_proksi`,
              nama_indikator: proksiIndikator.nama_indikator,
              id_tim: proksiIndikator.id_tim || 0,
              tim: proksiIndikator.tim,
              jenis: 'proksi',
              indikator: proksiIndikator,
              hasIku: false,
              hasProksi: true,
              isParent: true,
              noUrut: result.filter(r => r.isParent).length + 1,
            });
          }
        }
      }
    });
    
    // Flatten the result to include children in the display array
    const flattened: any[] = [];
    result.forEach(parent => {
      flattened.push(parent);
      if (parent.children && parent.children.length > 0) {
        flattened.push(...parent.children);
      }
    });
    
    return flattened;
  };

  const canDelete = (indikator: IndikatorKinerja) => {
    // Admin can delete any, ketua_tim can delete their team's, staff cannot delete
    if (user?.role === 'admin') return true;
    if (user?.role === 'ketua_tim' && indikator.id_tim === user.id_tim) return true;
    return false;
  };

  const getStats = (indikator: IndikatorKinerja) => {
    let totalTargets = 0;
    let totalRealisasis = 0;
    
    if (indikator.jenis === 'iku') {
      const iku = ikus.find(i => i.id_indikator_kinerja === indikator.id_indikator_kinerja);
      totalTargets += iku?.targets?.length || 0;
      totalRealisasis += iku?.realisasis?.length || 0;
    } else if (indikator.jenis === 'proksi') {
      const proksi = proksis.find(p => p.id_indikator_kinerja === indikator.id_indikator_kinerja);
      totalTargets += proksi?.targets?.length || 0;
      totalRealisasis += proksi?.realisasis?.length || 0;
    }
    
    return { totalTargets, totalRealisasis };
  };

  // Check if indikator kinerja can be deleted (no IKU or Proksi)
  const canDeleteIndikatorKinerja = (indikator: IndikatorKinerja) => {
    // Check if there's an IKU associated with this indikator
    const hasIKU = ikus.some(iku => iku.id_indikator_kinerja === indikator.id_indikator_kinerja);
    // Check if there's a Proksi associated with this indikator
    const hasProksi = proksis.some(proksi => proksi.id_indikator_kinerja === indikator.id_indikator_kinerja);
    
    return !hasIKU && !hasProksi;
  };

  // Helper function to get Ketua Tim name
  const getPICName = (idTim: number, team?: Team) => {
    let picName = 'Belum ditetapkan';
    const indikatorIdTim = Number(idTim || 0);
    
    // Priority 1: Cari dari users array berdasarkan id_tim dan role
    if (users && Array.isArray(users) && users.length > 0) {
      const teamLeader = users.find(u => {
        const uIdTim = Number(u.id_tim || 0);
        const uRole = String(u.role || '').trim().toLowerCase();
        const matchesTeam = uIdTim === indikatorIdTim && uIdTim !== 0;
        const matchesRole = uRole === 'ketua_tim' || uRole === 'ketua tim';
        
        return matchesTeam && matchesRole;
      });
      
      if (teamLeader && teamLeader.nama_user) {
        picName = teamLeader.nama_user;
      }
    }
    
    // Priority 2: Coba dari team.users relationship jika ada
    if (picName === 'Belum ditetapkan') {
      const currentTeam = team || teams.find(t => t.id_tim === idTim);
      if (currentTeam && (currentTeam as any).users) {
        const teamUsers = (currentTeam as any).users || [];
        if (Array.isArray(teamUsers) && teamUsers.length > 0) {
          const teamLeaderFromRelation = teamUsers.find((u: any) => {
            const uRole = String(u.role || '').trim().toLowerCase();
            return uRole === 'ketua_tim' || uRole === 'ketua tim';
          });
          if (teamLeaderFromRelation && teamLeaderFromRelation.nama_user) {
            picName = teamLeaderFromRelation.nama_user;
          }
        }
      }
    }
    
    if (picName === 'Belum ditetapkan' && users && Array.isArray(users) && users.length === 0) {
      picName = 'Memuat data...';
    }
    
    return picName;
  };

  const filteredIndikatorKinerjas = getFilteredIndikatorKinerjas();
  
  // Pagination for filtered indicators
  const totalItems = filteredIndikatorKinerjas.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedIndicators = filteredIndikatorKinerjas.slice(startIndex, endIndex);

  // Handle edit
  const handleEdit = (indikator: IndikatorKinerja) => {
    setEditingIndikator(indikator);
    setIsEditDialogOpen(true);
  };

  // Handle edit success
  const handleEditSuccess = () => {
    loadData();
  };

  // Get IKU details for display
  const getIKUDetails = (indikator: IndikatorKinerja) => {
    if (indikator.jenis !== 'iku') return null;
    const iku = ikus.find(i => i.id_indikator_kinerja === indikator.id_indikator_kinerja);
    if (!iku) return null;
    
    return {
      tipe: iku.tipe,
      target_poin: iku.target_poin,
      target_persentase: iku.target_persentase,
      target_per_tahun: iku.target_per_tahun,
    };
  };

  // Get Proksi details for display
  const getProksiDetails = (indikator: IndikatorKinerja) => {
    if (indikator.jenis !== 'proksi') return null;
    const proksi = proksis.find(p => p.id_indikator_kinerja === indikator.id_indikator_kinerja);
    if (!proksi) return null;
    
    return {
      target_per_tahun: proksi.target_per_tahun,
      target_persentase: (proksi as any).target_persentase,
    };
  };

  // Drag and drop handlers
  const handleDragStart = (item: any) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent, item: any) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(item);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetItem: any) => {
    e.preventDefault();
    setDragOverItem(null);

    if (!draggedItem || draggedItem.key === targetItem.key) {
      setDraggedItem(null);
      return;
    }

    // Reorder the filtered items
    const items = getFilteredIndikatorKinerjas();
    const draggedIdx = items.findIndex(i => i.key === draggedItem.key);
    const targetIdx = items.findIndex(i => i.key === targetItem.key);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const newOrder = [...items];
      const [movedItem] = newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, movedItem);

      // Save the new order
      setSortOrder(newOrder.map(item => item.key));
      toast.success('Urutan indikator berhasil diubah');
    }

    setDraggedItem(null);
  };

  // Apply custom sort order to items
  const getSortedIndikatorKinerjas = () => {
    const items = getFilteredIndikatorKinerjas();
    
    if (sortOrder.length > 0) {
      return items.sort((a, b) => {
        const aIdx = sortOrder.indexOf(a.key);
        const bIdx = sortOrder.indexOf(b.key);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    }
    
    return items;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-start gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-indigo-50 text-indigo-600">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg md:text-2xl font-bold leading-tight">Manajemen Indikator Kinerja</div>
              <div className="text-sm text-muted-foreground mt-1">Kelola indikator IKU &amp; Proksi — tambahkan, edit, dan pantau performa tim.</div>
              <div className="mt-2 flex items-center gap-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">{filteredIndikatorKinerjas.length} Indikator</span>
                <div className="h-1 w-32 rounded-full bg-gradient-to-r from-indigo-200 via-indigo-100 to-transparent" />
              </div>
            </div>
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {(user?.role === 'admin' || user?.role === 'ketua_tim') && (
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Tambah Indikator
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Memuat data Indikator Kinerja...</span>
            </div>
          ) : (
            <>
              {/* Filter Section */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="filter-jenis">Jenis Indikator</Label>
                    <Select value={filterJenis} onValueChange={(value) => setFilterJenis(value as 'all' | 'iku' | 'proksi')}>
                      <SelectTrigger id="filter-jenis">
                        <SelectValue placeholder="Semua Jenis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Jenis</SelectItem>
                        <SelectItem value="iku">IKU</SelectItem>
                        <SelectItem value="proksi">Proksi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {user?.role === 'admin' && (
                    <div className="space-y-2">
                      <Label htmlFor="filter-tim">Tim</Label>
                      <Select value={filterTim} onValueChange={setFilterTim}>
                        <SelectTrigger id="filter-tim">
                          <SelectValue placeholder="Semua Tim" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Tim</SelectItem>
                          {getAvailableTeams().map(team => (
                            <SelectItem key={team.id_tim} value={team.id_tim.toString()}>
                              {team.nama_tim}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                {/* Reset Filter Button */}
                {(filterJenis !== 'all' || filterTim !== 'all') && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilterJenis('all');
                        setFilterTim('all');
                      }}
                    >
                      Reset Filter
                    </Button>
                  </div>
                )}
              </div>
              
              {filteredIndikatorKinerjas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Tidak ada Indikator Kinerja yang sesuai dengan filter</p>
                  <p className="text-sm">Coba ubah filter atau tambahkan Indikator Kinerja baru</p>
                </div>
              ) : (
            <div className="overflow-x-auto border border-green-100 rounded-lg shadow-sm bg-white/60">
              <Table className="text-center min-w-[900px] [&>thead>tr>th]:px-4 [&>tbody>tr>td]:px-4">
                  <TableHeader className="[&_th]:text-center bg-green-50">
                  <TableRow>
                    <TableHead className="bg-green-50 text-center w-12"></TableHead>
                    <TableHead className="bg-green-50 text-center w-16">No</TableHead>
                    <TableHead className="text-left">Nama Indikator</TableHead>
                    <TableHead className="hidden">Jenis</TableHead>
                    <TableHead className="hidden">Tim</TableHead>
                    {user?.role !== 'ketua_tim' && <TableHead>Ketua Tim (PIC)</TableHead>}
                    <TableHead className="hidden">Tipe</TableHead>
                    <TableHead>Target <br /> Poin/Persentase</TableHead>
                    <TableHead>Target IKU/Proksi <br /> Per Tahun</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Realisasi</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const sortedItems = getSortedIndikatorKinerjas().filter(i => {
                      if (i.isChild) return expandedParents.includes(i.parentId);
                      return true;
                    });
                    
                    // Apply pagination
                    const paginatedItems = sortedItems.slice(startIndex, endIndex);

                    return paginatedItems.map((item, idx) => {
                          const indikator = item.indikator;
                        const stats = getStats(indikator);
                        // Determine if this parent has proksi in the dataset (even if not attached as children)
                        const indikatorCode = (indikator as any)?.kode || (indikator as any)?.kode_indikator || (indikator as any)?.nomor || (indikator as any)?.no_urut || null;
                      const currentTeam = item.tim || teams.find(t => t.id_tim === item.id_tim);
                      const picName = getPICName(item.id_tim, currentTeam);
                      const timName = currentTeam?.nama_tim || 'Tim tidak diketahui';

                      const ikuDetails = getIKUDetails(indikator);
                      const proksiDetails = getProksiDetails(indikator);

                      const isChildRow = item.isChild === true;

                      const parentIndicatorId = item.isParent ? item.indikator?.id_indikator_kinerja : item.parentId;

                      const isExpanded = parentIndicatorId ? expandedParents.includes(parentIndicatorId) : false;

                      const toggleExpand = (e: React.MouseEvent, parentId: number) => {
                        e.stopPropagation();
                        setExpandedParents(prev => prev.includes(parentId) ? prev.filter(p => p !== parentId) : [...prev, parentId]);
                      };

                      // Determine if this parent has proksi in the dataset (even if not attached as children)
                      const hasChildren = (() => {
                        if (!item.isParent) return false;
                        const pid = parentIndicatorId;
                        if (!pid) return false;

                        return proksis.some(p => {
                          if (p.id_iku) {
                            const parentIku = ikus.find(i => i.id_iku === p.id_iku);
                            return parentIku?.id_indikator_kinerja === pid;
                          }
                          return p.id_indikator_kinerja === pid;
                        });
                      })();

                      const rowNumber = startIndex + idx + 1;

                      return (
                        <React.Fragment key={item.key}>
                          <TableRow 
                            className={`cursor-pointer hover:bg-green-50 transition-colors ${
                              dragOverItem?.key === item.key ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                            } ${item.isParent ? 'bg-green-25' : isChildRow ? 'bg-gray-50' : ''}`}
                            onClick={() => handleEdit(indikator)}
                            draggable
                            onDragStart={() => handleDragStart(item)}
                            onDragOver={(e) => handleDragOver(e, item)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, item)}
                          >
                            <TableCell className={`text-center font-medium border-r border-border/20 cursor-grab active:cursor-grabbing ${item.isParent ? 'bg-green-50' : isChildRow ? 'bg-gray-100' : ''}`} onClick={(e) => e.stopPropagation()}>
                              <GripVertical className="h-4 w-4 text-gray-400 inline-block" />
                            </TableCell>
                            <TableCell className={`text-center font-semibold text-gray-700 ${item.isParent ? 'bg-green-50' : isChildRow ? 'bg-gray-100' : ''}`}>
                              {rowNumber}
                            </TableCell>
                            <TableCell className={`font-medium text-left ${isChildRow ? 'pl-8' : ''}`}>
                              <div className="flex items-center">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm mb-1 flex items-center gap-2">
                                    {item.isParent && item.children && item.children.length > 0 && (
                                      <button onClick={(e) => toggleExpand(e, item.indikator.id_indikator_kinerja)} className="p-1 rounded hover:bg-slate-100" title={isExpanded ? 'Sembunyikan anak' : 'Tampilkan anak'}>
                                        {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                                      </button>
                                    )}
                                    {isChildRow && (
                                      <span className="text-gray-500">└─</span>
                                    )}
                                    <span>{item.nama_indikator}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mb-2">
                                    {timName} • {new Date().getFullYear()}
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    {item.jenis === 'iku' ? (
                                      <Badge variant="default" className="text-xs">
                                        IKU
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">
                                        PROKSI
                                      </Badge>
                                    )}

                                    {item.jenis === 'iku' && ikuDetails ? (
                                      ikuDetails.tipe === 'poin' ? (
                                        <span className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 font-semibold text-xs">Point</span>
                                      ) : (
                                        <span className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold text-xs">Persentase (%)</span>
                                      )
                                    ) : item.jenis === 'proksi' ? (
                                      <span className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold text-xs">Persentase (%)</span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            {user?.role !== 'ketua_tim' && <TableCell>{picName}</TableCell>}
                            <TableCell className="hidden">
                              {item.jenis === 'iku' && ikuDetails ? (
                                ikuDetails.tipe === 'poin' ? (
                                  <span className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 font-semibold">Point</span>
                                ) : ikuDetails.tipe === 'persen' ? (
                                  <span className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold">Persentase (%)</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )
                              ) : item.jenis === 'proksi' ? (
                                <span className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold">Persentase (%)</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.jenis === 'iku' && ikuDetails ? (
                                ikuDetails.tipe === 'poin' && ikuDetails.target_poin ? (
                                  <span className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 font-semibold">{ikuDetails.target_poin}</span>
                                ) : ikuDetails.tipe === 'persen' && ikuDetails.target_persentase ? (
                                  <span className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold">{ikuDetails.target_persentase}%</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )
                              ) : item.jenis === 'proksi' && proksiDetails && proksiDetails.target_persentase ? (
                                <span className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold">{proksiDetails.target_persentase}%</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.jenis === 'iku' && ikuDetails && ikuDetails.target_per_tahun ? (
                                <span className="font-semibold text-purple-600">{ikuDetails.target_per_tahun}</span>
                              ) : item.jenis === 'proksi' && proksiDetails && proksiDetails.target_per_tahun ? (
                                <span className="font-semibold text-purple-600">{proksiDetails.target_per_tahun}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                {stats.totalTargets} Target
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-purple-100 text-purple-800">
                                {stats.totalRealisasis} Realisasi
                              </Badge>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2">
                                {indikator && canDelete(indikator) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => handleEdit(indikator)}
                                    title="Edit Indikator Kinerja"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {indikator && canDelete(indikator) && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-destructive hover:text-destructive hover:bg-red-50"
                                        disabled={isDeleting === indikator.id_indikator_kinerja}
                                        title="Hapus Indikator Kinerja"
                                      >
                                        {isDeleting === indikator.id_indikator_kinerja ? (
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Hapus Indikator Kinerja</AlertDialogTitle>
                                        <AlertDialogDescription className="space-y-2">
                                          <p>Apakah Anda yakin ingin menghapus Indikator Kinerja "{item.nama_indikator}" ({item.jenis.toUpperCase()})?</p>
                                          {(() => {
                                            const associatedIKU = ikus.find(iku => iku.id_indikator_kinerja === indikator.id_indikator_kinerja);
                                            const associatedProksi = proksis.find(proksi => proksi.id_indikator_kinerja === indikator.id_indikator_kinerja);
                                            const ikuTargets = associatedIKU?.targets?.length || 0;
                                            const ikuRealisasis = associatedIKU?.realisasis?.length || 0;
                                            const proksiTargets = associatedProksi?.targets?.length || 0;
                                            const proksiRealisasis = associatedProksi?.realisasis?.length || 0;
                                            
                                            if (ikuTargets > 0 || ikuRealisasis > 0 || proksiTargets > 0 || proksiRealisasis > 0) {
                                              return (
                                                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                                  <p className="text-sm font-semibold text-yellow-800 mb-1">Peringatan:</p>
                                                  {associatedIKU && (ikuTargets > 0 || ikuRealisasis > 0) && (
                                                    <p className="text-sm text-yellow-700 mb-2">
                                                      IKU masih memiliki {ikuTargets > 0 ? `${ikuTargets} target` : ''}{ikuTargets > 0 && ikuRealisasis > 0 ? ' dan ' : ''}{ikuRealisasis > 0 ? `${ikuRealisasis} realisasi` : ''}.
                                                    </p>
                                                  )}
                                                  {associatedProksi && (proksiTargets > 0 || proksiRealisasis > 0) && (
                                                    <p className="text-sm text-yellow-700 mb-2">
                                                      Proksi masih memiliki {proksiTargets > 0 ? `${proksiTargets} target` : ''}{proksiTargets > 0 && proksiRealisasis > 0 ? ' dan ' : ''}{proksiRealisasis > 0 ? `${proksiRealisasis} realisasi` : ''}.
                                                    </p>
                                                  )}
                                                  <p className="text-sm font-semibold text-orange-700 mt-2">
                                                    Menghapus akan menghapus semua data terkait (target dan realisasi) secara permanen.
                                                  </p>
                                                </div>
                                              );
                                            }
                                            return null;
                                          })()}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-orange-600 text-white hover:bg-orange-700"
                                          onClick={() => {
                                            if (indikator) {
                                              handleDelete(indikator.id_indikator_kinerja, item.nama_indikator, true);
                                            }
                                          }}
                                        >
                                          Hapus Paksa
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  lastPage={totalPages}
                  total={totalItems}
                  perPage={perPage}
                  onPageChange={setCurrentPage}
                  onPerPageChange={(newPerPage) => {
                    setPerPage(newPerPage);
                    setCurrentPage(1);
                  }}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Indikator Kinerja Create Form */}
      <IndikatorKinerjaCreateForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          toast.success('Indikator Kinerja berhasil ditambahkan');
          loadData();
        }}
      />

      {/* Indikator Kinerja Edit Form */}
      <IndikatorKinerjaEditForm
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        indikator={editingIndikator}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
