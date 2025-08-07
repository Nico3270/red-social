
interface User {
  id: string;
  nombre: string;
  apellido: string;
  fotoPerfil?: string;
  username: string;
}

export interface Media {
  id: string;
  url: string;
  tipo: "IMAGEN" | "VIDEO";
  formato?: string;
  orden: number;
}



export interface PublicacionSencilla {
  id: string;
  usuario: User;
  negocio?: { id: string; nombre: string; fotoPerfil?: string; slug?: string };
  tipo: "CARRUSEL_IMAGENES" | "VIDEO_HORIZONTAL" | "VIDEO_VERTICAL" | "PRODUCTO_DESTACADO" | "MINI_GRID" | "TESTIMONIO";
  titulo?: string;
  descripcion?: string;
  multimedia: Media[];
  visibilidad: "PUBLICA" | "PRIVADA" | "AMIGOS";
  createdAt: string;
  isAuthenticated?: boolean;
  onInteraction?: (
    type: "COMENTARIO" | "REACCION" | "COMPARTIDO",
    data: { reaction?: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY"; comment?: string }
  ) => void;
}