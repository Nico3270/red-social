import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";

export interface State {
  isModalOpen: boolean;
  publicacionId?: string;
  openModal: (publicacionId: string) => void;
  closeModal: () => void;
}

export const usePublicacionModalStore = create<State>()(
  persist(
    (set, get) => ({
      isModalOpen: false,
      publicacionId: undefined,
      openModal: (publicacionId: string) =>
        set({ isModalOpen: true, publicacionId }),
      closeModal: () =>
        set({ isModalOpen: false, publicacionId: undefined }),
    }),
    {
      name: "publicacion-modal",
    } as PersistOptions<State>
  )
);