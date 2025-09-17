import { ReaccionTipo } from "@prisma/client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware"; // Middleware para persistencia

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
  modalPublicacionId: string | null;
  updatedComments: Record<string, Comment[]>;
  updatedNumComentarios: Record<string, number | undefined>; // Añadido | undefined para overrides
  updatedLikes: Record<string, number | undefined>; // Añadido | undefined
  updatedUserReaction: Record<string, ReaccionTipo | null | undefined>; // Añadido | undefined
  updatedCompartidos: Record<string, number | undefined>; // Añadido | undefined para consistencia
  openModal: (publicacionId: string) => void;
  closeModal: () => void;
  addComment: (publicacionId: string, comment: Comment) => void;
  updateComment: (publicacionId: string, tempId: string, comment: Comment) => void;
  removeComment: (publicacionId: string, commentId: string) => void;
  incrementNumComentarios: (publicacionId: string) => void;
  decrementNumComentarios: (publicacionId: string) => void;
  updateLikes: (publicacionId: string, newLikes: number) => void;
  updateUserReaction: (publicacionId: string, reaction: ReaccionTipo | null) => void;
  updateCompartidos: (publicacionId: string, newCount: number) => void;
  resetLikes: (publicacionId: string) => void;
  resetUserReaction: (publicacionId: string) => void;
  resetNumComentarios: (publicacionId: string) => void;
  clearUpdatedComments: (publicacionId: string) => void;
}

export const usePublicacionModalStore = create<PublicacionModalState>()(
  persist(
    (set) => ({
      // ESTADOS PRIMERO (convención para claridad y mantenimiento)
      isModalOpen: false,
      modalPublicacionId: null,
      updatedComments: {},
      updatedNumComentarios: {},
      updatedLikes: {},
      updatedUserReaction: {},
      updatedCompartidos: {},

      // ACCIONES DESPUÉS (inmutables y tipadas)
      openModal: (publicacionId: string) =>
        set({ isModalOpen: true, modalPublicacionId: publicacionId }),

      closeModal: () => {
        set({ isModalOpen: false, modalPublicacionId: null });
        // Opcional: Limpia storage al cerrar modal (evita acumulación de drafts viejos)
        // localStorage.removeItem('publicacion-modal-storage');
      },

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
            [publicacionId]: (state.updatedComments[publicacionId] || [])
              .map((c) => (c.id === tempId ? comment : c))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
          },
        })),

      removeComment: (publicacionId, commentId) =>
        set((state) => ({
          updatedComments: {
            ...state.updatedComments,
            [publicacionId]: (state.updatedComments[publicacionId] || [])
              .filter((c) => c.id !== commentId)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
          },
        })),

      incrementNumComentarios: (publicacionId) =>
        set((state) => ({
          updatedNumComentarios: {
            ...state.updatedNumComentarios,
            [publicacionId]: (state.updatedNumComentarios[publicacionId] ?? 0) + 1,
          },
        })),

      decrementNumComentarios: (publicacionId) =>
        set((state) => {
          const currentCount = state.updatedNumComentarios[publicacionId] ?? 0;
          return {
            updatedNumComentarios: {
              ...state.updatedNumComentarios,
              [publicacionId]: Math.max(currentCount - 1, 0), // Evita contadores negativos
            },
          };
        }),

      updateLikes: (publicacionId, newLikes) =>
        set((state) => ({
          updatedLikes: {
            ...state.updatedLikes,
            [publicacionId]: newLikes,
          },
        })),

      updateUserReaction: (publicacionId, reaction) =>
        set((state) => ({
          updatedUserReaction: {
            ...state.updatedUserReaction,
            [publicacionId]: reaction,
          },
        })),

      updateCompartidos: (publicacionId, newCount) =>
        set((state) => ({
          updatedCompartidos: {
            ...state.updatedCompartidos,
            [publicacionId]: newCount,
          },
        })),

      // NUEVAS ACCIONES PARA RESET/SYNC (evita double-counting en reaperturas de modal)
      resetLikes: (publicacionId) =>
        set((state) => ({
          updatedLikes: { ...state.updatedLikes, [publicacionId]: undefined },
        })),

      resetUserReaction: (publicacionId) =>
        set((state) => ({
          updatedUserReaction: { ...state.updatedUserReaction, [publicacionId]: undefined },
        })),

      resetNumComentarios: (publicacionId) =>
        set((state) => ({
          updatedNumComentarios: { ...state.updatedNumComentarios, [publicacionId]: undefined },
        })),

      clearUpdatedComments: (publicacionId) =>
        set((state) => ({
          updatedComments: { ...state.updatedComments, [publicacionId]: [] },
        })),
    }),
    {
      name: "publicacion-modal-storage", // Namespace único en localStorage
      storage: createJSONStorage(() => localStorage), // Usa localStorage (o sessionStorage para efímero)
      partialize: (state) => ({
        // Solo persiste estados críticos (no modales efímeros como isModalOpen)
        updatedComments: state.updatedComments,
        updatedNumComentarios: state.updatedNumComentarios,
        updatedLikes: state.updatedLikes,
        updatedUserReaction: state.updatedUserReaction,
        updatedCompartidos: state.updatedCompartidos,
      }),
      // Opcional: onRehydrateStorage: () => (state, error) => { if (error) console.warn('Hydration failed'); }
      // Limpia storage en rehydrate si >1 día (para evitar datos obsoletos)
    }
  )
);