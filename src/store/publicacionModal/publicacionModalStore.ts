import { create } from "zustand";

interface Comment {
  id: string;
  contenido: string;
  createdAt: string;
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    username: string;
    fotoPerfil?: string;
  };
}

interface PublicacionModalState {
  isModalOpen: boolean;
  publicacionId: string | null;
  updatedComments: Record<string, Comment[]>; // Almacena comentarios actualizados por publicacionId
  openModal: (publicacionId: string) => void;
  closeModal: () => void;
  addComment: (publicacionId: string, comment: Comment) => void;
  updateComment: (publicacionId: string, tempId: string, comment: Comment) => void;
}

export const usePublicacionModalStore = create<PublicacionModalState>((set) => ({
  isModalOpen: false,
  publicacionId: null,
  updatedComments: {}, // Mapa de publicacionId a lista de comentarios
  openModal: (publicacionId) =>
    set({ isModalOpen: true, publicacionId }),
  closeModal: () => set({ isModalOpen: false, publicacionId: null }),
  addComment: (publicacionId, comment) =>
    set((state) => ({
      updatedComments: {
        ...state.updatedComments,
        [publicacionId]: [
          comment,
          ...(state.updatedComments[publicacionId] || []),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      },
    })),
  updateComment: (publicacionId, tempId, comment) =>
    set((state) => ({
      updatedComments: {
        ...state.updatedComments,
        [publicacionId]: (state.updatedComments[publicacionId] || []).map((c) =>
          c.id === tempId ? comment : c
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      },
    })),
}));