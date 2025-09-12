import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  ciudad: string;
  departamento: string;
  preferencias: string[];
  secciones: string[];
  seenIds: string[];
  addSeenId: (id: string) => void;
  resetSeenIds: () => void;
  setUbicacion: (ciudad: string, departamento: string) => void;
  setPreferencias: (preferencias: string[]) => void;
  setSecciones: (secciones: string[]) => void;
}

const preferencesCreator: StateCreator<PreferencesState> = (set) => ({
  ciudad: '',
  departamento: '',
  preferencias: [],
  secciones: [],
  seenIds: [],
  setUbicacion: (ciudad, departamento) => set({ ciudad, departamento }),
  setPreferencias: (preferencias) => set({ preferencias }),
  setSecciones: (secciones) => set({ secciones }),
  addSeenId: (id) => {
    set((state) => {
      if (state.seenIds.includes(id)) return state;
      return { seenIds: [...state.seenIds, id] };
    });
  },
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
    }),
  })
);
