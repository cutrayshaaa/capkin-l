import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { apiService } from '../services/api';

export interface IKU {
  id_iku: number;
  nama_iku: string;
  deskripsi?: string;
  id_tim: number;
  pic?: number | null; // Field name is 'pic' not 'id_pic'
  status?: string;
  created_at?: string;
  updated_at?: string;
  pic_name?: string;
  tim_name?: string;
}

export interface Target {
  id_target: number;
  id_iku: number;
  periode?: string;
  tahun: number;
  target_iku: number;
  target_proxy?: number; // Deprecated - use satuan instead
  keterangan?: string;
  status?: string;
  created_by: number;
  created_at?: string;
  updated_at?: string;
}

export interface Period {
  id_period: number;
  tahun: number;
  triwulan?: number;
  bulan?: number;
  periode_type: string;      // 'triwulan', 'bulanan', 'tahunan', etc.
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  status?: string;
  nama_periode?: string;     // Accessor field
}

export interface Realisasi {
  id_realisasi: number;
  id_iku: number;
  id_target?: number;
  target: number;
  realisasi: number;
  realisasi_proxy?: number;
  status?: 'on_track' | 'at_risk' | 'behind' | 'completed';
  kendala?: string;
  solusi?: string;
  keterangan?: string;
  batas_waktu?: string;
  link_bdk?: string;
  attachment?: string;
  created_by: number;
  verified_by?: number;
  verified_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface DataContextType {
  // Loading state
  isLoading: boolean;
  
  // IKU
  ikus: IKU[];
  addIKU: (iku: Omit<IKU, 'id_iku'>) => Promise<void>;
  updateIKU: (id: number, iku: Partial<IKU>) => Promise<void>;
  deleteIKU: (id: number) => Promise<void>;
  
  // Target
  targets: Target[];
  addTarget: (target: Omit<Target, 'id_target'>) => Promise<void>;
  updateTarget: (id: number, target: Partial<Target>) => Promise<void>;
  deleteTarget: (id: number) => Promise<void>;
  
  // Realisasi
  realisasis: Realisasi[];
  addRealisasi: (realisasi: Omit<Realisasi, 'id_realisasi'>) => Promise<void>;
  updateRealisasi: (id: number, realisasi: Partial<Realisasi>) => Promise<void>;
  deleteRealisasi: (id: number) => Promise<void>;
  
  // Teams & Users
  teams: any[];
  users: any[];
  addTeam: (team: any) => void;
  addUser: (user: any) => void;
  updateTeam: (id: number, team: any) => void;
  updateUser: (id: number, user: any) => void;
  deleteTeam: (id: number) => void;
  deleteUser: (id: number) => void;
  
  // Filtering
  getFilteredData: (periode?: string, tahun?: number, triwulan?: string) => {
    ikus: IKU[];
    targets: Target[];
    realisasis: Realisasi[];
  };
  
  // Version tracking
  teamsVersion: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const authContext = useAuth();
  
  const [ikus, setIKUs] = useState<IKU[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [realisasis, setRealisasis] = useState<Realisasi[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teamsVersion, setTeamsVersion] = useState(0);

  // Load data from API when user changes
  useEffect(() => {
    const loadData = async () => {


      
      if (!authContext.user) {

        // Clear data when no user
        setIKUs([]);
        setTargets([]);
        setRealisasis([]);
        setTeams([]);
        setUsers([]);
        setIsLoading(false);
        return;
      }
      
      
      // Check if API service has token
      const token = apiService.getToken();


      
      // Check localStorage for token
      const storedToken = localStorage.getItem('iku_token');


      
      // Check API config
      
      try {
        setIsLoading(true);
        
        // Try combined endpoint first, fallback to individual calls
        try {

          const allData = await apiService.getAllData();
          
          // Debug logging
          // Extract data from combined response
          const users = allData.data?.users || [];
          const teams = allData.data?.teams || [];
          const ikus = allData.data?.ikus || [];
          const targets = allData.data?.targets || [];
          const realisasis = allData.data?.realisasis || [];
          
          
          setUsers(users);
          setTeams(teams);
          setIKUs(ikus);
          setTargets(targets);
          setRealisasis(realisasis);
          

          
        } catch (combinedError) {

          
          // Fallback to individual API calls

          
          const [usersData, teamsData, ikusData, targetsData, realisasisData] = await Promise.all([
            apiService.getUsers().catch(err => { return []; }),
            apiService.getTeams().catch(err => { return []; }),
            apiService.getIKUs().catch(err => { return []; }),
            apiService.getTargets().catch(err => { return []; }),
            apiService.getRealisasis().catch(err => { return []; })
          ]);
          
          
          
          // Extract data from individual responses
          const users = (usersData as any)?.data || usersData || [];
          const teams = (teamsData as any)?.data || teamsData || [];
          const ikus = (ikusData as any)?.data || ikusData || [];
          const targets = (targetsData as any)?.data || targetsData || [];
          const realisasis = (realisasisData as any)?.data || realisasisData || [];
          

          // Debug IKU data specifically
          // if (ikus.length > 0) {
          // } else {
          // }
          
          setUsers(users);
          setTeams(teams);
          setIKUs(ikus);
          setTargets(targets);
          setRealisasis(realisasis);
          

        }
        
      } catch (error) {

        if (error instanceof Error && error.message === 'Unauthenticated') {
          // Redirect to login if authentication failed

          window.location.href = '/login';
          return;
        }
        // Set empty arrays on error
        setIKUs([]);
        setTargets([]);
        setRealisasis([]);
        setTeams([]);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [authContext.user]);

  // Note: Teams are now loaded from API, no need to sync with AuthProvider

  // IKU functions
  const addIKU = async (iku: Omit<IKU, 'id_iku'>) => {
    try {
      const newIKU = await apiService.createIKU(iku);
      setIKUs(prev => [...prev, newIKU]);
    } catch (error) {

      throw error; // Re-throw to let component handle the error
    }
  };

  const updateIKU = async (id: number, updatedIKU: Partial<IKU>) => {
    try {
      const updated = await apiService.updateIKU(id, updatedIKU);
      setIKUs(prev => prev.map(iku => iku.id_iku === id ? updated : iku));
    } catch (error) {

      throw error; // Re-throw to let component handle the error
    }
  };

  const deleteIKU = async (id: number) => {
    try {
      await apiService.deleteIKU(id);
      setIKUs(prev => prev.filter(iku => iku.id_iku !== id));
      setTargets(prev => prev.filter(target => target.id_iku !== id));
      setRealisasis(prev => prev.filter(realisasi => realisasi.id_iku !== id));
    } catch (error) {

      throw error; // Re-throw to let component handle the error
    }
  };

  // Target functions
  const addTarget = async (target: Omit<Target, 'id_target'>) => {
    try {
      const newTarget = await apiService.createTarget(target);
      setTargets(prev => [...prev, newTarget]);
    } catch (error) {

      throw error; // Re-throw to let component handle the error
    }
  };

  const updateTarget = async (id: number, updatedTarget: Partial<Target>) => {
    try {
      const updated = await apiService.updateTarget(id, updatedTarget);
      setTargets(prev => prev.map(target => target.id_target === id ? updated : target));
    } catch (error) {

      throw error; // Re-throw to let component handle the error
    }
  };

  const deleteTarget = async (id: number) => {
    try {
      await apiService.deleteTarget(id);
      setTargets(prev => prev.filter(target => target.id_target !== id));
    } catch (error) {

      throw error; // Re-throw to let component handle the error
    }
  };

  // Realisasi functions
  const addRealisasi = async (realisasi: Omit<Realisasi, 'id_realisasi'>) => {
    try {
      const newRealisasi = await apiService.createRealisasi(realisasi);
      setRealisasis(prev => [...prev, newRealisasi]);
    } catch (error) {

      throw error; // Re-throw to let component handle the error
    }
  };

  const updateRealisasi = async (id: number, updatedRealisasi: Partial<Realisasi>) => {
    try {
      const updated = await apiService.updateRealisasi(id, updatedRealisasi);
      setRealisasis(prev => prev.map(realisasi => realisasi.id_realisasi === id ? updated : realisasi));
    } catch (error) {

      throw error; // Re-throw to let component handle the error
    }
  };

  const deleteRealisasi = async (id: number) => {
    try {
      await apiService.deleteRealisasi(id);
      setRealisasis(prev => prev.filter(realisasi => realisasi.id_realisasi !== id));
    } catch (error) {

      throw error; // Re-throw to let component handle the error
    }
  };

  // Team & User functions
  const addTeam = (team: any) => {
    // Use provided ID if exists, otherwise generate new one
    const newId = team.id_tim || Math.max(...teams.map(t => t.id_tim), 0) + 1;
    const newTeam = { ...team, id_tim: newId };
    setTeams(prevTeams => [...prevTeams, newTeam]);
    setTeamsVersion(prev => prev + 1); // Increment version to trigger re-renders
    return newTeam; // Return the new team for reference
  };

  const addUser = (user: any) => {
    // Use provided ID if exists, otherwise generate new one
    const newId = user.id_user || Math.max(...users.map(u => u.id_user), 0) + 1;
    const newUser = { ...user, id_user: newId };
    
    // Update local state immediately to trigger re-render
    setUsers(prevUsers => [...prevUsers, newUser]);
    
    // If the new user is a ketua, update the corresponding team's leader info
    if (newUser.role === 'ketua' && newUser.id_tim) {

      setTeams(prevTeams => 
        prevTeams.map(team => 
          team.id_tim === newUser.id_tim ? { 
            ...team, 
            id_ketua: newId, 
            nama_ketua: newUser.nama_user 
          } : team
        )
      );
      setTeamsVersion(prev => prev + 1); // Increment version to trigger re-renders
      
      // Update existing IKUs for this team to use the new ketua as PIC
      setIKUs(prevIKUs => prevIKUs.map(iku => 
        iku.id_tim === newUser.id_tim ? {
          ...iku,
          pic: newId,
          pic_name: newUser.nama_user
        } : iku
      ));
      

    }
    
    return newUser; // Return the new user for reference
  };

  const updateTeam = (id: number, updatedTeam: any) => {
    setTeams(prevTeams => prevTeams.map(team => 
      team.id_tim === id ? { ...team, ...updatedTeam } : team
    ));
    setTeamsVersion(prev => prev + 1); // Increment version to trigger re-renders
  };

  const updateUser = (id: number, updatedUser: any) => {
    // Get current user data to check role changes
    const currentUser = users.find(u => u.id_user === id);
    
    // Update local state immediately to trigger re-render
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id_user === id ? { ...user, ...updatedUser, id_user: id } : user
      )
    );
    
    // Handle role change to ketua - update team leader info
    if (updatedUser.role === 'ketua' && updatedUser.id_tim) {
      setTeams(prevTeams => 
        prevTeams.map(team => 
          team.id_tim === updatedUser.id_tim ? { 
            ...team, 
            id_ketua: id, 
            nama_ketua: updatedUser.nama_user 
          } : team
        )
      );
      setTeamsVersion(prev => prev + 1);
      
      // Update existing IKUs for this team to use the new ketua as PIC
      setIKUs(prevIKUs => prevIKUs.map(iku => 
        iku.id_tim === updatedUser.id_tim ? {
          ...iku,
          pic: id,
          pic_name: updatedUser.nama_user
        } : iku
      ));
    }
    
    // Handle role change from ketua - remove leader assignment
    if (currentUser?.role === 'ketua' && updatedUser.role !== 'ketua') {
      setTeams(prevTeams => 
        prevTeams.map(team => 
          team.id_ketua === id ? { 
            ...team, 
            id_ketua: null, 
            nama_ketua: 'Belum ditentukan' 
          } : team
        )
      );
      setTeamsVersion(prev => prev + 1);
      
      // Update IKUs to mark as unassigned
      setIKUs(prevIKUs => prevIKUs.map(iku => 
        iku.pic === id ? {
          ...iku,
          pic: 0,
          pic_name: 'Belum ditentukan'
        } : iku
      ));
    }
    
    // Update team leader name if this user is already a team leader (just name change)
    if (currentUser?.role === 'ketua' && updatedUser.role === 'ketua' && updatedUser.nama_user) {
      setTeams(prevTeams => 
        prevTeams.map(team => 
          team.id_ketua === id ? { ...team, nama_ketua: updatedUser.nama_user } : team
        )
      );
      setTeamsVersion(prev => prev + 1);
      
      // Update IKU pic names for this team leader
      setIKUs(prevIKUs => prevIKUs.map(iku => 
        iku.pic === id ? {
          ...iku,
          pic_name: updatedUser.nama_user
        } : iku
      ));
    }
  };

  const deleteTeam = (id: number) => {
    // First check if team has any IKUs assigned
    const teamIKUs = ikus.filter(iku => iku.id_tim === id);
    if (teamIKUs.length > 0) {
      throw new Error('Cannot delete team with active IKUs. Please reassign or delete IKUs first.');
    }
    
    // Update users in the team to have no team
    setUsers(prevUsers => prevUsers.map(user => 
      user.id_tim === id ? { ...user, id_tim: 0 } : user
    ));
    
    // Delete the team
    setTeams(prevTeams => prevTeams.filter(team => team.id_tim !== id));
    setTeamsVersion(prev => prev + 1); // Increment version to trigger re-renders
  };

  const deleteUser = (id: number) => {

    
    // Check if user is assigned as PIC to any IKU
    const userIKUs = ikus.filter(iku => iku.pic === id);

    
    if (userIKUs.length > 0) {
      // For admin deletion, we'll auto-reassign the IKUs to other team members or mark as unassigned

      
      userIKUs.forEach(iku => {
        // Find the team for this IKU
        const ikuTeam = teams.find(team => team.id_tim === iku.id_tim);
        
        if (ikuTeam && ikuTeam.id_ketua && ikuTeam.id_ketua !== id) {
          // Transfer to current team leader if different from deleted user
          setIKUs(prevIKUs => prevIKUs.map(prevIku => 
            prevIku.id_iku === iku.id_iku ? {
              ...prevIku,
              pic: ikuTeam.id_ketua,
              pic_name: ikuTeam.nama_ketua
            } : prevIku
          ));

        } else {
          // Mark as unassigned if no suitable replacement
          setIKUs(prevIKUs => prevIKUs.map(prevIku => 
            prevIku.id_iku === iku.id_iku ? {
              ...prevIku,
              pic: 0,
              pic_name: 'Belum ditentukan'
            } : prevIku
          ));

        }
      });
    }
    
    // Check if user is a team leader
    const leaderTeam = teams.find(team => team.id_ketua === id);

    
    if (leaderTeam) {
      // Remove team leader assignment
      setTeams(prevTeams => prevTeams.map(team => 
        team.id_ketua === id ? { ...team, id_ketua: null, nama_ketua: 'Belum ditentukan' } : team
      ));
      setTeamsVersion(prev => prev + 1);

    }
    
    // Update local state immediately to trigger re-render
    setUsers(prevUsers => prevUsers.filter(user => user.id_user !== id));

  };

  const getFilteredData = (periode?: string, tahun?: number, triwulan?: string) => {
    let filteredIKUs = [...ikus];
    let filteredTargets = [...targets];
    let filteredRealisasis = [...realisasis];

    // Filter targets and realisasi based on filtered IKUs
    const ikuIds = filteredIKUs.map(iku => iku.id_iku);
    filteredTargets = filteredTargets.filter(target => ikuIds.includes(target.id_iku));
    filteredRealisasis = filteredRealisasis.filter(realisasi => ikuIds.includes(realisasi.id_iku));

    // Filter by year if specified
    if (tahun) {
      filteredTargets = filteredTargets.filter(target => target.tahun === tahun);
      filteredRealisasis = filteredRealisasis.filter(realisasi => realisasi.tahun === tahun);
    }

    // Filter by quarter if specified
    if (triwulan && triwulan !== 'all') {
      filteredTargets = filteredTargets.filter(target => target.triwulan === triwulan);
      filteredRealisasis = filteredRealisasis.filter(realisasi => realisasi.triwulan === triwulan);
    }

    return {
      ikus: filteredIKUs,
      targets: filteredTargets,
      realisasis: filteredRealisasis
    };
  };

  return (
    <DataContext.Provider value={{
      isLoading,
      ikus,
      targets,
      realisasis,
      teams,
      users,
      addIKU,
      updateIKU,
      deleteIKU,
      addTarget,
      updateTarget,
      deleteTarget,
      addRealisasi,
      updateRealisasi,
      deleteRealisasi,
      addTeam,
      addUser,
      updateTeam,
      updateUser,
      deleteTeam,
      deleteUser,
      getFilteredData,
      teamsVersion,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

// No exports needed - all mock data removed
