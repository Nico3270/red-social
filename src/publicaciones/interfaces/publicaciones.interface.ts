import { PublicacionTipo, Media } from "@prisma/client";

export interface Comment {
  id: string;
  contenido: string;
  usuarioId: string; // Solo usuarios registrados
  usuarioNombre: string;
  createdAt: Date;
  usuarioFotoPerfil?: string;
}

export interface Publicaciones {
  id: string;
  usuarioId: string; // Solo usuarios registrados
  negocioId?: string | null;
  tipo: PublicacionTipo;
  titulo?: string | null;
  descripcion?: string | null;
  multimedia?: Media[];
  createdAt: Date;
  updatedAt: Date;
  productos?: {
    id: string;
    nombre: string;
    precio: number;
    imagen: string | null;
    slug: string;
  }[];
  numLikes?: number;
  numComentarios?: number;
  numCompartidos?: number;
  negocio?: {
    id: string | null;
    nombre: string | null;
    slug: string | null;
    imagenPerfil: string | null;
  };
  comentarios?: Comment[];
  isLiked?: boolean;
}


