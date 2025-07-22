
interface User {
  id: string;
  nombre: string;
  apellido: string;
  fotoPerfil?: string;
  username: string;
}

interface Media {
  id: string;
  url: string;
  tipo: "IMAGEN" | "VIDEO";
  formato?: string;
  orden: number;
}

export interface EnhancedPublicacion {
  id: string;
  usuario: User;
  negocio?: { id: string; nombre: string; fotoPerfil?: string; slug?: string };
  tipo: "CARRUSEL_IMAGENES" | "VIDEO_HORIZONTAL" | "VIDEO_VERTICAL" | "PRODUCTO_DESTACADO" | "MINI_GRID" | "TESTIMONIO";
  titulo?: string;
  descripcion?: string;
  multimedia: Media[];
  visibilidad: "PUBLICA" | "PRIVADA" | "AMIGOS";
  createdAt: string;
  numLikes: number;
  numComentarios: number;
  numCompartidos: number;
  userReaction: { id: string; tipo: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY" } | null;
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
  onInteraction?: (
    type: "COMENTARIO" | "REACCION" | "COMPARTIDO",
    data: { reaction?: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY"; comment?: string }
  ) => void;
}