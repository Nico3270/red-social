// src/store/preferences/preferences-store.ts
import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  ciudad: string;
  departamento: string;
  preferencias: string[];
  secciones: string[];
  seenIds: string[];
  userLat: number | null;     // ← Acepta null
  userLong: number | null;    // ← Acepta null
  addSeenId: (id: string) => void;
  resetSeenIds: () => void;
  setUbicacion: (ciudad: string, departamento: string) => void;
  setPreferencias: (preferencias: string[]) => void;
  setSecciones: (secciones: string[]) => void;
  setGeo: (lat: number | null, lon: number | null) => void;  // ← Acepta null
}

const preferencesCreator: StateCreator<PreferencesState> = (set) => ({
  ciudad: '',
  departamento: '',
  preferencias: [],
  secciones: [],
  seenIds: [],
  userLat: null,
  userLong: null,

  setUbicacion: (ciudad, departamento) => set({ ciudad, departamento }),
  setPreferencias: (preferencias) => set({ preferencias }),
  setSecciones: (secciones) => set({ secciones }),

  setGeo: (lat, lon) => set({ userLat: lat, userLong: lon }),

  addSeenId: (id) =>
    set((state) => {
      if (state.seenIds.includes(id)) return state;
      return { seenIds: [...state.seenIds, id] };
    }),

  resetSeenIds: () => set({ seenIds: [] }),
});

export const usePreferencesStore = create<PreferencesState>()(
  persist(preferencesCreator, {
    name: 'preferences-storage',
    partialize: (state) => ({
      ciudad: state.ciudad,
      departamento: state.departamento,
      preferencias: state.preferencias,
      secciones: state.secciones,
      seenIds: state.seenIds,
      userLat: state.userLat,
      userLong: state.userLong,
    }),
  })
);