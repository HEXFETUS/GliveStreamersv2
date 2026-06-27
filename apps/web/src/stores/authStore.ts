import { create } from 'zustand';
import { storeToken, clearToken, getStoredToken } from '@glive/sdk';
import type { User } from '@glive/sdk';
import { api } from '../lib/axios';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredToken(),
  user: null,
  isLoading: false,
  isInitialized: false,

  setAuth: (token, user) => {
    storeToken(token);
    set({ token, user, isInitialized: true });
  },

  clearAuth: () => {
    clearToken();
    set({ token: null, user: null, isInitialized: true });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.login({ email, password });
      storeToken(res.token);
      set({
        token: res.token,
        user: res.user,
        isLoading: false,
        isInitialized: true,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const res = await api.register({ email, password, name });
      storeToken(res.token);
      set({
        token: res.token,
        user: res.user,
        isLoading: false,
        isInitialized: true,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  restoreSession: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    set({ isLoading: true });
    try {
      const { user } = await api.getProfile();
      set({ token, user, isLoading: false, isInitialized: true });
    } catch {
      clearToken();
      set({ token: null, user: null, isLoading: false, isInitialized: true });
    }
  },
}));
