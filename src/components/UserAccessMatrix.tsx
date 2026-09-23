import { useEffect, useMemo, useState } from 'react';
import { RotateCw, Search, ShieldCheck, Users, Server, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/axios';

type UamUser = {
  id: string;
  name?: string;
  username?: string;
  display_name?: string;
  team?: string;
};

type UamAsset = {
  id: string;
  name?: string;
  display_name?: string;
  address?: string;
  node?: string;
};

type UamPermission = {
  user_id: string;
  asset_id: string;
  permission?: string;
};

type UamPayload = {
  users?: UamUser[];
  assets?: UamAsset[];
  permissions?: UamPermission[];
  updated_at?: string;
  last_updated?: string;
  summary?: {
    users?: number;
    assets?: number;
    permissions?: number;
  };
};


function displayUser(user: UamUser) {
  return user.display_name || user.name || user.username || user.id;
}

function displayAsset(asset: UamAsset) {
  return asset.display_name || asset.name || asset.address || asset.id;
}

function normalizePermission(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().toUpperCase();
  if (normalized === 'READ' || normalized === 'READ_ONLY') return 'R';
  if (normalized === 'WRITE' || normalized === 'WRITE_ACCESS') return 'W';
  return normalized === 'R' || normalized === 'W' ? normalized : '';
}

function formatUpdatedAt(value?: string) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function UserAccessMatrix() {
  const [users, setUsers] = useState<UamUser[]>([]);
  const [assets, setAssets] = useState<UamAsset[]>([]);
  const [permissions, setPermissions] = useState<UamPermission[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get('/portal-api/uam');
      const body = response.data;

      if (!body?.success) {
        throw new Error(body?.message || 'Failed to load User Access Matrix');
      }

      const payload: UamPayload = body.data || body;
      setUsers(Array.isArray(payload.users) ? payload.users : []);
      setAssets(Array.isArray(payload.assets) ? payload.assets : []);
      setPermissions(Array.isArray(payload.permissions) ? payload.permissions : []);
      setUpdatedAt(payload.updated_at || payload.last_updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load User Access Matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const permissionMap = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of permissions) {
      const permission = normalizePermission(item.permission);
      if (!permission) continue;

      const key = `${item.user_id}:${item.asset_id}`;
      const current = map.get(key);

      // If multiple rules apply, write access takes precedence over read access.
      if (current !== 'W' || permission === 'W') {
        map.set(key, permission);
      }
    }

    return map;
  }, [permissions]);

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((user) =>
      [user.id, user.name, user.username, user.display_name, user.team]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [users, searchTerm]);

  const permissionCount = permissions.length;
  const updatedLabel = formatUpdatedAt(updatedAt);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
        <div className="p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#009688]/10 text-[#009688] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">User Access Matrix</h2>
              <p className="text-xs text-slate-500">R = Read Only · W = Write Access</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-xs text-slate-500">
              Last updated: <span className="font-medium text-slate-700">{updatedLabel}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              className="h-9"
            >
              <RotateCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="border-t border-slate-100 px-4 py-3 flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Users</span>
            <span className="text-sm font-semibold text-slate-800">{users.length}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <Server className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Assets</span>
            <span className="text-sm font-semibold text-slate-800">{assets.length}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <KeyRound className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Permissions</span>
            <span className="text-sm font-semibold text-slate-800">{permissionCount}</span>
          </div>

          <div className="relative ml-auto w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search user"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
              }}
              className="pl-9 h-9 bg-slate-50"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shrink-0">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-auto">
          <table className="border-collapse text-xs" style={{ minWidth: Math.max(760, 260 + assets.length * 42) }}>
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 z-30 bg-slate-50 border-r border-slate-200 min-w-[260px] w-[260px] px-4 py-3 text-left font-semibold text-slate-600">
                  User
                </th>
                {assets.map((asset) => (
                  <th
                    key={asset.id}
                    title={`${displayAsset(asset)}${asset.address ? ` (${asset.address})` : ''}`}
                    className="border-r border-slate-200 align-bottom p-0 font-medium text-slate-600"
                    style={{ width: 42, minWidth: 42, height: 190 }}
                  >
                    <div className="h-full flex items-end justify-center pb-2">
                      <span
                        className="whitespace-nowrap"
                        style={{
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)',
                        }}
                      >
                        {displayAsset(asset)}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={assets.length + 1} className="px-4 py-16 text-center text-slate-500">
                    Loading User Access Matrix...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={assets.length + 1} className="px-4 py-16 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <td
                      className="sticky left-0 z-10 bg-white border-r border-slate-200 px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap"
                      title={displayUser(user)}
                    >
                      <div className="flex flex-col">
                        <span>{displayUser(user)}</span>
                        {user.team && <span className="text-[10px] font-normal text-slate-400">{user.team}</span>}
                      </div>
                    </td>
                    {assets.map((asset) => {
                      const permission = permissionMap.get(`${user.id}:${asset.id}`) || '';

                      return (
                        <td
                          key={asset.id}
                          className="border-r border-slate-100 text-center h-9"
                        >
                          {permission && (
                            <span
                              className={`inline-flex min-w-5 h-5 items-center justify-center rounded text-[10px] font-bold ${
                                permission === 'W'
                                  ? 'bg-[#009688]/15 text-[#00796B]'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {permission}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <span className="text-sm text-slate-600">
            {filteredUsers.length === 0
              ? 'Total 0'
              : `Showing 1-${filteredUsers.length} of ${filteredUsers.length}`}
          </span>
        </div>
      </div>
    </div>
  );
}
