import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  ArrowLeft,
  Users,
  User,
  Crown,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Building,
  Target,
  TrendingUp,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useData } from './DataProvider';
import { apiService } from '../services/api';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { ErrorRetry } from '../components/ErrorRetry';
import { toast } from 'sonner';
import type { Team, User as UserType } from '../types/models';

// Interface untuk team data yang diperkaya
interface EnhancedTeam extends Team {
  users?: UserType[];
  ikus?: any[];
  nama_ketua?: string;
  id_ketua?: number;
}

// Interface untuk user data yang diperkaya
interface EnhancedUser extends UserType {
  team_name?: string;
  iku_count?: number;
  target_count?: number;
  realization_count?: number;
}

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { users, ikus, targets, realizations } = useData();
  
  // State management
  const [team, setTeam] = useState<EnhancedTeam | null>(null);
  const [teamUsers, setTeamUsers] = useState<EnhancedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Load team detail data
  const loadTeamDetail = useCallback(async () => {
    if (!teamId) return;

    try {
      setIsLoading(true);
      setError(null);
      

      
      // Load team with relationships
      const response = await apiService.getTeams('users,ikus', 20, 1);

      
      // Handle different response structures
      let teamsData: any[] = [];
      if (Array.isArray(response)) {
        teamsData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        teamsData = response.data;
      } else if (response?.teams && Array.isArray(response.teams)) {
        teamsData = response.teams;
      }
      
      // Find the specific team
      const foundTeam = teamsData.find(t => t.id_tim?.toString() === teamId);
      
      if (!foundTeam) {
        setError('Tim tidak ditemukan');
        return;
      }
      
      // Transform team data
      const enhancedTeam: EnhancedTeam = {
        ...foundTeam,
        id_tim: foundTeam.id_tim || foundTeam.id,
        nama_tim: foundTeam.nama_tim || foundTeam.name,
        nama_ketua: foundTeam.nama_ketua || foundTeam.leader_name,
        id_ketua: foundTeam.id_ketua || foundTeam.leader_id,
        status: foundTeam.status || 'aktif',
        users: foundTeam.users || [],
        ikus: foundTeam.ikus || []
      };
      
      setTeam(enhancedTeam);
      
      // Get team users with enhanced data
      const teamUsersData = users.filter(u => u.id_tim?.toString() === teamId);
      const enhancedUsers: EnhancedUser[] = teamUsersData.map(user => {
        const userIKUs = ikus.filter(iku => iku.id_user === user.id_user);
        const userTargets = targets.filter(target => target.id_user === user.id_user);
        const userRealisations = realizations.filter(real => real.id_user === user.id_user);
        
        return {
          ...user,
          team_name: enhancedTeam.nama_tim,
          iku_count: userIKUs.length,
          target_count: userTargets.length,
          realization_count: userRealisations.length
        };
      });
      
      setTeamUsers(enhancedUsers);
      setLastRefresh(new Date());
      
      
    } catch (error) {

      setError('Gagal memuat detail tim');
    } finally {
      setIsLoading(false);
    }
  }, [teamId, users, ikus, targets, realizations]);

  useEffect(() => {
    loadTeamDetail();
  }, [loadTeamDetail]);

  // Get team leader
  const teamLeader = teamUsers.find(u => u.role === 'ketua_tim');
  
  // Get team members (excluding leader)
  const teamMembers = teamUsers.filter(u => u.role !== 'ketua_tim');

  // Get team statistics
  const teamStats = {
    totalUsers: teamUsers.length,
    totalIKUs: team?.ikus?.length || 0,
    totalTargets: teamUsers.reduce((sum, user) => sum + (user.target_count || 0), 0),
    totalRealisations: teamUsers.reduce((sum, user) => sum + (user.realization_count || 0), 0)
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/teams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <h1 className="text-2xl font-bold">Detail Tim</h1>
        </div>
        <ErrorRetry 
          message={error}
          onRetry={loadTeamDetail}
        />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/teams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <h1 className="text-2xl font-bold">Detail Tim</h1>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tim tidak ditemukan atau telah dihapus.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/admin/teams')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              {team.nama_tim}
            </h1>
            <p className="text-muted-foreground">
              Detail tim dan anggota
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              Terakhir diupdate: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadTeamDetail}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Team Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Informasi Tim
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Total Anggota</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{teamStats.totalUsers}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Total IKU</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{teamStats.totalIKUs}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Total Target</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{teamStats.totalTargets}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Total Realisasi</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">{teamStats.totalRealisations}</p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Informasi Dasar</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nama Tim:</span>
                    <span className="font-medium">{team.nama_tim}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={team.status === 'aktif' ? 'default' : 'secondary'}>
                      {team.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID Tim:</span>
                    <span className="font-medium">{team.id_tim}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Deskripsi</h3>
                <p className="text-sm text-muted-foreground">
                  {team.deskripsi || 'Tidak ada deskripsi'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Leader */}
      {teamLeader && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Ketua Tim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={teamLeader.foto_profil} />
                <AvatarFallback className="text-lg">
                  {teamLeader.nama_user.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{teamLeader.nama_user}</h3>
                <p className="text-muted-foreground">@{teamLeader.username}</p>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    <Crown className="h-3 w-3 mr-1" />
                    Ketua Tim
                  </Badge>
                  <Badge variant={teamLeader.status === 'aktif' ? 'default' : 'secondary'}>
                    {teamLeader.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{teamLeader.iku_count || 0}</p>
                    <p className="text-xs text-muted-foreground">IKU</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{teamLeader.target_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Target</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{teamLeader.realization_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Realisasi</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Anggota Tim ({teamMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length > 0 ? (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id_user} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.foto_profil} />
                    <AvatarFallback>
                      {member.nama_user.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-medium">{member.nama_user}</h4>
                    <p className="text-sm text-muted-foreground">@{member.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        {member.role === 'staff' ? 'Staff' : member.role}
                      </Badge>
                      <Badge variant={member.status === 'aktif' ? 'default' : 'secondary'}>
                        {member.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-blue-600">{member.iku_count || 0}</p>
                        <p className="text-xs text-muted-foreground">IKU</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-600">{member.target_count || 0}</p>
                        <p className="text-xs text-muted-foreground">Target</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-purple-600">{member.realization_count || 0}</p>
                        <p className="text-xs text-muted-foreground">Realisasi</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada anggota tim</p>
              <p className="text-sm text-muted-foreground">
                Anggota tim dapat ditambahkan melalui menu User Management
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team IKUs */}
      {team.ikus && team.ikus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              IKU Tim ({team.ikus.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {team.ikus.map((iku: any) => (
                <div key={iku.id_iku} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{iku.nama_iku}</h4>
                      <p className="text-sm text-muted-foreground">{iku.deskripsi}</p>
                    </div>
                    <Badge variant="outline">
                      {iku.status || 'Aktif'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
