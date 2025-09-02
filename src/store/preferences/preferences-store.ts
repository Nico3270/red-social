// src/store/preferencesStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  ciudad: string;
  departamento: string;
  preferencias: string[]; // slugs de categorías seleccionadas
  secciones: string[]; // ids de secciones seleccionadas (opcional, si necesitas)
  setUbicacion: (ciudad: string, departamento: string) => void;
  setPreferencias: (preferencias: string[]) => void;
  setSecciones: (secciones: string[]) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ciudad: '',
      departamento: '',
      preferencias: [],
      secciones: [],
      setUbicacion: (ciudad, departamento) => set({ ciudad, departamento }),
      setPreferencias: (preferencias) => set({ preferencias }),
      setSecciones: (secciones) => set({ secciones }),
    }),
    {
      name: 'preferences-storage', // Persiste en localStorage
    }
  )
);

