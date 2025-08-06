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
  modalPublicacionId: string | null; // Usar solo este para evitar duplicados
  updatedComments: Record<string, Comment[]>; // Comentarios actualizados por publicacionId
  updatedNumComentarios: Record<string, number>; // Contador de comentarios por publicacionId
  openModal: (publicacionId: string) => void;
  closeModal: () => void;
  addComment: (publicacionId: string, comment: Comment) => void;
  updateComment: (publicacionId: string, tempId: string, comment: Comment) => void;
  incrementNumComentarios: (publicacionId: string) => void; // Nueva acción para incrementar contador
}

export const usePublicacionModalStore = create<PublicacionModalState>((set) => ({
  isModalOpen: false,
  modalPublicacionId: null,
  updatedComments: {},
  updatedNumComentarios: {}, // Mapa de publicacionId a contador
  openModal: (publicacionId) =>
    set({ isModalOpen: true, modalPublicacionId: publicacionId }),
  closeModal: () => set({ isModalOpen: false, modalPublicacionId: null }),
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
  incrementNumComentarios: (publicacionId) =>
    set((state) => ({
      updatedNumComentarios: {
        ...state.updatedNumComentarios,
        [publicacionId]: (state.updatedNumComentarios[publicacionId] || 0) + 1,
      },
    })),
}));