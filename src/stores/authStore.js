import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,     // Supabase Auth user object
  perfil: null,   // Row from perfiles table (includes roles join)
  loading: true,  // True while checking session on startup
  setUser: (user) => set({ user }),
  setPerfil: (perfil) => set({ perfil }),
  setLoading: (loading) => set({ loading }),
  clearAuth: () => set({ user: null, perfil: null, loading: false }),
}))
