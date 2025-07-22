import { FavoriteProduct } from "@/interfaces/product.interface";
import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";


interface SidebarStore {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isSidebarOpen: true, // Por defecto abierta en pantallas grandes
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
    }),
    {
      name: "sidebar", // Nombre para el almacenamiento en localStorage
    } as PersistOptions<SidebarStore>
  )
);