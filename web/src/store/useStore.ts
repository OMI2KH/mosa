import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Store {
  user: any;
  tribe: any;
  level: string;
  setUser: (user: any) => void;
  setTribe: (tribe: any) => void;
  setLevel: (level: string) => void;
  clearStore: () => void;
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      user: null,
      tribe: null,
      level: 'Ember',
      setUser: (user) => set({ user }),
      setTribe: (tribe) => set({ tribe }),
      setLevel: (level) => set({ level }),
      clearStore: () => set({ user: null, tribe: null, level: 'Ember' })
    }),
    { name: 'mosa-forge-storage', storage: {
      getItem: (name) => localStorage.getItem(name),
      setItem: (name, value) => localStorage.setItem(name, value),
      removeItem: (name) => localStorage.removeItem(name)
    }}
  )
);