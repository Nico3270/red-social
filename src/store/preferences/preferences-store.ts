// src/store/preferencesStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  ciudad: string;
  departamento: string;
  preferencias: string[]; // slugs de categorías seleccionadas
  secciones: string[]; // ids de secciones seleccionadas (opcional, si necesitas)
  seenIds: string[]; // Array para serialización (convertir de Set)
  addSeenId: (id: string) => void;
  resetSeenIds: () => void;
  setUbicacion: (ciudad: string, departamento: string) => void;
  setPreferencias: (preferencias: string[]) => void;
  setSecciones: (secciones: string[]) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({ // 👈 aquí ya tienes acceso a get
      ciudad: '',
      departamento: '',
      preferencias: [],
      secciones: [],
      seenIds: [],
      setUbicacion: (ciudad, departamento) => set({ ciudad, departamento }),
      setPreferencias: (preferencias) => set({ preferencias }),
      setSecciones: (secciones) => set({ secciones }),
      addSeenId: (id: string) => {
        set((state) => {
          if (state.seenIds.includes(id)) {
            return state; // 👈 no hace nada si ya está
          }
          return { seenIds: [...state.seenIds, id] };
        });
      },
      resetSeenIds: () => set({ seenIds: [] }),
    }),
    {
      name: 'preferences-storage', // Persiste en localStorage
    }
  )
);
