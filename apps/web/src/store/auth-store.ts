import { create } from 'zustand';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import type { PublicUser } from '@drikon/shared-types';

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  initialized: boolean;
  fetchMe: () => Promise<void>;
  login: (input: { email: string; password: string; twoFactorCode?: string }) => Promise<{ requiresTwoFactor: boolean }>;
  register: (input: { name: string; email: string; password: string }) => Promise<{ message: string }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  async fetchMe() {
    set({ loading: true });
    try {
      const data = await apiGet<{ user: PublicUser }>('/api/v1/auth/me');
      set({ user: data.user, loading: false, initialized: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        set({ user: null, loading: false, initialized: true });
      } else {
        set({ loading: false, initialized: true });
      }
    }
  },

  async login(input) {
    const result = await apiPost<{ user: PublicUser; requiresTwoFactor: boolean }>(
      '/api/v1/auth/login',
      input,
    );
    if (!result.requiresTwoFactor) {
      set({ user: result.user });
    }
    return { requiresTwoFactor: result.requiresTwoFactor };
  },

  async register(input) {
    return apiPost<{ message: string }>('/api/v1/auth/register', input);
  },

  async logout() {
    try {
      await apiPost('/api/v1/auth/logout');
    } finally {
      set({ user: null });
    }
  },
}));
// ─── Helpers ───
export const useIsAdmin = (): boolean => {
  const user = useAuthStore((s) => s.user);
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
};
