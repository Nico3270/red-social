import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getSectionsFromDB } from "@/seccion/actions/getSectionsFromDB";

// 📌 Interfaz para la sección
export interface Section {
  id: string;
  name: string;
  iconName: string;
  href: string;
  order: number;
}

// 📌 Estado del store
interface SectionState {
  sections: Section[];
  setSections: (sections: Section[]) => void;
  fetchSections: () => Promise<void>;
  forceUpdateSections: () => Promise<void>; // ✅ Nueva función para forzar actualización
  clearSections: () => void;
}

// 📌 Creamos el store con persistencia en localStorage
export const useSectionStoreMagiSurprise = create<SectionState>()(
  persist(
    (set, get) => ({
      sections: [],

      // ✅ Función para actualizar las secciones manualmente
      setSections: (sections) => set({ sections }),

      // ✅ Cargar secciones desde la base de datos (solo si han pasado 24 horas)
      fetchSections: async () => {
        const lastUpdated = localStorage.getItem("sectionsLastUpdated");
        const today = new Date().toDateString(); // 📅 "Thu Feb 08 2025"

        // ⚠️ Verificar si ya se actualizaron hoy
        if (lastUpdated === today && get().sections.length > 0) {
          
          return;
        }

   
        try {
          const fetchedSections = await getSectionsFromDB();
          set({ sections: fetchedSections });

          // 📝 Guarda la fecha de la última actualización en localStorage
          localStorage.setItem("sectionsLastUpdated", today);
        } catch (error) {
          console.error("❌ Error al obtener secciones:", error);
        }
      },

      // ✅ Función para limpiar el store y eliminar el timestamp
      clearSections: () => {
        set({ sections: [] });
        localStorage.removeItem("sectionsLastUpdated");
      },

      // ✅ Forzar actualización (para administrador)
      forceUpdateSections: async () => {
       
        try {
          const fetchedSections = await getSectionsFromDB();
          set({ sections: fetchedSections });

          // 📝 Guarda la nueva fecha en localStorage
          localStorage.setItem("sectionsLastUpdated", new Date().toDateString());
        } catch (error) {
          console.error("❌ Error al forzar actualización de secciones:", error);
        }
      },
    }),
    { name: "sections-store" } // ✅ Guarda en localStorage con este nombre
  )
);
