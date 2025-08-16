import { getconfigReservation } from "@/reservas/actions/getConfigReservation";
import { BusinessAvailabilityData } from "@/reservas/componentes/CrearReservasForm";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PersistOptions } from "zustand/middleware";


interface ReservationsConfigStore {
  initialconfig?: BusinessAvailabilityData;
  fetchConfig: () => Promise<void>; // Fetch async si vacío
  updateConfig: (newConfig: BusinessAvailabilityData) => void; // Actualiza con nuevo objeto
  clearConfig: () => void; // Limpia/reset a defaults
}

export const useReservationsConfigStore = create<ReservationsConfigStore>()(
  persist(
    (set, get) => ({
      initialconfig: undefined, // Inicialmente undefined (no defaults hardcoded para flexibilidad)

      fetchConfig: async () => {
        const current = get().initialconfig;
        if (!current) {
          const { ok, config, message } = await getconfigReservation();
          if (ok && config) {
            set({ initialconfig: config });
          } else {
            console.error(message); // Maneja error en UI si necesitas
          }
        }
      },

      updateConfig: (newConfig: BusinessAvailabilityData) => {
        set({ initialconfig: newConfig });
      },

      clearConfig: () => {
        set({ initialconfig: undefined });
      },
    }),
    {
      name: "reservas-config",
      getStorage: () => localStorage,
    } as PersistOptions<ReservationsConfigStore>
  )
);