'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import type { Role, Pagination } from '@drikon/shared-types';

const ROLES: Role[] = ['USER', 'ADMIN', 'SUPER_ADMIN'];
const ROLE_LABEL: Record<Role, string> = {
  USER: 'Customer',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  twoFactorEnabled: boolean;
  _count: { orders: number };
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function AdminUsersPage() {
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: '20' });
    if (search.trim()) qs.set('search', search.trim());
    try {
      const data = await apiGet<{ items: AdminUser[]; pagination: Pagination }>(
        `/api/v1/admin/users?${qs.toString()}`,
      );
      setUsers(data.items);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    // Debounce so typing in search doesn't fire a request per keystroke.
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  const changeRole = async (id: string, next: Role) => {
    setSavingId(id);
    const prev = users;
    setUsers((us) => us.map((u) => (u.id === id ? { ...u, role: next } : u)));
    try {
      await apiPatch(`/api/v1/admin/users/${id}/role`, { role: next });
      toast.success(`Role updated to ${ROLE_LABEL[next]}`);
    } catch (err) {
      setUsers(prev);
      toast.error(err instanceof ApiError ? err.message : 'Could not update role');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-6xl">
      <h1 className="display text-3xl mb-1">Users</h1>
      <p className="text-[color:var(--fg-muted)] mb-8">Manage customer accounts and admin access.</p>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--fg-muted)]" />
        <input
          className="input pl-9"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center">
            <Loader2 className="w-5 h-5 animate-spin text-[color:var(--accent)]" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm text-[color:var(--fg-muted)]">No users match.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[color:var(--fg-muted)] border-b border-[color:var(--border)]">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-3 py-3 font-medium">Orders</th>
                  <th className="px-3 py-3 font-medium">Joined</th>
                  <th className="px-3 py-3 font-medium">2FA</th>
                  <th className="px-5 py-3 font-medium text-right">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u.id === me?.id;
                  return (
                    <tr key={u.id} className="border-b border-[color:var(--border)] last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[color:var(--bg)] border border-[color:var(--border)] grid place-items-center text-xs font-semibold">
                            {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-1.5">
                              {u.name}
                              {isMe && <span className="text-[10px] text-[color:var(--accent)]">you</span>}
                            </div>
                            <div className="text-xs text-[color:var(--fg-muted)]">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[color:var(--fg-muted)]">{u._count.orders}</td>
                      <td className="px-3 py-3 text-[color:var(--fg-muted)]">{dateFmt.format(new Date(u.createdAt))}</td>
                      <td className="px-3 py-3">
                        {u.twoFactorEnabled ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <span className="text-xs text-[color:var(--fg-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <select
                          className="input w-auto inline-block !py-1.5 text-xs disabled:opacity-50"
                          value={u.role}
                          disabled={isMe || savingId === u.id}
                          title={isMe ? "You can't change your own role" : undefined}
                          onChange={(e) => changeRole(u.id, e.target.value as Role)}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button className="btn-ghost !py-1.5 !px-3 disabled:opacity-40" disabled={!pagination.hasPrev} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </button>
          <span className="text-[color:var(--fg-muted)]">Page {pagination.page} of {pagination.totalPages}</span>
          <button className="btn-ghost !py-1.5 !px-3 disabled:opacity-40" disabled={!pagination.hasNext} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
