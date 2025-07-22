

import { auth } from "@/auth.config";
import { getProductosNegocio } from "@/publicaciones/actions/getProductosNegocio";
import { CrearPublicacionesNegocio } from "@/publicaciones/componentes/CrearPublicaciones";
import { ContextoPublicacion, TestimonioCrearEditar } from "@/publicaciones/componentes/TestimonioCrearEditar";
import { PublicacionTipo } from "@prisma/client";



interface InformacionPublicacion {
  usuarioId?: string;
  negocioId?: string;
  publicacionId?: string;
  productoId?: string;
  tipo: PublicacionTipo;
  contexto: ContextoPublicacion;
  descripcion?: string;
  multimedia?: string[];
  productos?: { id: string; nombre: string }[];
}


export default async function CrearPublicacionNegocio() {
  const session = await auth();

  if (!session || !session.user) {
    return <div>No estás autenticado. Por favor, inicia sesión.</div>;
  }

  const { productos, negocioId } = await getProductosNegocio();

  const initialData: InformacionPublicacion = {
    usuarioId: session.user.id,
    negocioId: negocioId || undefined, // Aquí puedes obtener el negocioId si es necesario
    publicacionId: undefined,
    productoId: undefined,
    tipo: PublicacionTipo.TESTIMONIO, // O el tipo que necesites
    contexto: "negocio", // O el contexto que necesites
    descripcion: "",
    multimedia: [],
    productos: productos || [], // Asegúrate de que este campo sea opcional si no siempre se necesita
  }

  return (
    <div className="w-full bg-white">
      <CrearPublicacionesNegocio infoInicialProducto={initialData} />

      {/* <TestimonioCrearEditar infoPublicacion={initialData} productos={productos} /> */}
    </div>
  );
}