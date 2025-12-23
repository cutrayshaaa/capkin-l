import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { RefreshCw, Database, User, Users } from 'lucide-react';

interface DebugInfoProps {
  user: any;
  ikus: any[];
  targets: any[];
  realisasis: any[];
  teams: any[];
  users: any[];
  isLoading: boolean;
  onRefresh?: () => void;
}

export function DebugInfo({ user, ikus, targets, realisasis, teams, users, isLoading, onRefresh }: DebugInfoProps) {
  const availableIKUs = user?.role === 'admin' ? ikus : 
                       ikus.filter(iku => user && iku.id_tim === user.id_tim);

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-yellow-800 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Debug Information
          </CardTitle>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* User Info */}
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-yellow-600" />
          <div className="flex-1">
            <div className="text-sm font-medium text-yellow-800">
              User: {user?.nama_user || 'N/A'} ({user?.username || 'N/A'})
            </div>
            <div className="text-xs text-yellow-700">
              Role: <Badge variant="outline" className="text-xs">{user?.role || 'N/A'}</Badge>
              {user?.role !== 'admin' && (
                <span className="ml-2">ID Tim: <Badge variant="outline" className="text-xs">{user?.id_tim || 'N/A'}</Badge></span>
              )}
            </div>
          </div>
        </div>

        {/* Data Counts */}
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-yellow-600" />
            <div>
              <div className="text-sm font-medium text-yellow-800">IKU Data</div>
              <div className="text-xs text-yellow-700">
                Total: {ikus.length} | Available: {availableIKUs.length}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-yellow-600" />
            <div>
              <div className="text-sm font-medium text-yellow-800">Target Data</div>
              <div className="text-xs text-yellow-700">
                Total: {targets.length}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-yellow-600" />
            <div>
              <div className="text-sm font-medium text-yellow-800">Realisasi Data</div>
              <div className="text-xs text-yellow-700">
                Total: {realisasis.length}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-yellow-600" />
            <div>
              <div className="text-sm font-medium text-yellow-800">Teams & Users</div>
              <div className="text-xs text-yellow-700">
                Teams: {teams.length} | Users: {users.length}
              </div>
            </div>
          </div>
        </div>

        {/* IKU Details */}
        {ikus.length > 0 && (
          <div>
            <div className="text-sm font-medium text-yellow-800 mb-2">IKU Details:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {ikus.map(iku => (
                <div key={iku.id_iku} className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                  <div className="font-medium">ID: {iku.id_iku} - {iku.nama_iku}</div>
                  <div>Tim: {iku.id_tim} | PIC: {iku.id_pic}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Target Details */}
        {targets.length > 0 && (
          <div>
            <div className="text-sm font-medium text-yellow-800 mb-2">Target Details:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {targets.map(target => (
                <div key={target.id_target} className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                  <div className="font-medium">ID: {target.id_target} - IKU: {target.id_iku}</div>
                  <div>Target IKU: {target.target_iku} | Proxy: {target.target_proxy} | Jumlah: {target.jumlah_target}</div>
                  <div>Status: {target.status || 'N/A'} | Created by: {target.created_by}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Realisasi Details */}
        {realisasis.length > 0 && (
          <div>
            <div className="text-sm font-medium text-yellow-800 mb-2">Realisasi Details:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {realisasis.map(realisasi => (
                <div key={realisasi.id_realisasi} className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                  <div className="font-medium">ID: {realisasi.id_realisasi} - IKU: {realisasi.id_iku}</div>
                  <div>Realisasi: {realisasi.realisasi} | Proxy: {realisasi.realisasi_proxy || realisasi.proxy_realisasi} | Status: {realisasi.status || 'N/A'}</div>
                  <div>Target: {realisasi.id_target || 'N/A'} | Period: {realisasi.id_period || 'N/A'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Details */}
        {teams.length > 0 && (
          <div>
            <div className="text-sm font-medium text-yellow-800 mb-2">Team Details:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {teams.map(team => (
                <div key={team.id_tim} className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                  <div className="font-medium">ID: {team.id_tim} - {team.nama_tim}</div>
                  <div>Ketua: {team.nama_ketua || 'N/A'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Troubleshooting */}
        {availableIKUs.length === 0 && (
          <div className="bg-yellow-100 p-3 rounded border border-yellow-300">
            <div className="text-sm font-medium text-yellow-800 mb-2">Troubleshooting:</div>
            <div className="text-xs text-yellow-700 space-y-1">
              {user?.role === 'admin' ? (
                <div>
                  <p>• Admin dapat melihat semua IKU</p>
                  <p>• Pastikan ada data IKU di database</p>
                  <p>• Periksa koneksi API dan endpoint /data/all</p>
                </div>
              ) : (
                <div>
                  <p>• Non-admin hanya melihat IKU dari tim yang sama</p>
                  <p>• Pastikan user memiliki id_tim yang valid</p>
                  <p>• Pastikan ada IKU dengan id_tim yang sama dengan user</p>
                  <p>• User ID Tim: {user?.id_tim || 'NULL'}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
