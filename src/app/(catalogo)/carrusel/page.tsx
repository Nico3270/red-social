import { getPublicacionesCarrusel } from "@/publicaciones/actions/getPublicacionesCarrusel";
import { SocialMediaCarousel } from "@/publicaciones/componentes/SocialMediaPublicacion";


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


interface EnhancedPublicacion {
  id: string;
  usuario: User;
  negocio?: { id: string; nombre: string; fotoPerfil?: string };
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
}

interface DataSalida {
  ok: boolean;
  message: string;
  publicaciones: EnhancedPublicacion[];
}

export default async function CarruselPage() {
  const { ok, message, publicaciones }: DataSalida = await getPublicacionesCarrusel();

  if (!ok) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-semibold text-red-600">Error</h2>
        <p>{message}</p>
      </div>
    );
  }

  if (publicaciones.length === 0) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-semibold text-gray-600">No se encontraron publicaciones</h2>
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl sm:mt-40 mx-auto">
      {publicaciones.map((publicacion) => (
        <SocialMediaCarousel key={publicacion.id} publicacion={publicacion} />
      ))}
    </div>
  );
}