

export interface InteractionsProps {
  publicacionId: string;
  numLikes: number;
  numComentarios: number;
  numCompartidos: number;
  userReaction: { id: string; tipo: 'LIKE' | 'LOVE' | 'WOW' | 'SAD' | 'ANGRY' } | null;
  comments: Array<{
    id: string;
    contenido: string;
    createdAt: string;
    usuario: {
      id: string;
      nombre: string;
      apellido: string;
      fotoPerfil?: string;
      username: string;
    };
  }>;
  isAuthenticated?: boolean;
  onInteraction?: (type: 'COMENTARIO' | 'REACCION' | 'COMPARTIDO', data: { reaction?: 'LIKE' | 'LOVE' | 'WOW' | 'SAD' | 'ANGRY'; comment?: string }) => void;
}