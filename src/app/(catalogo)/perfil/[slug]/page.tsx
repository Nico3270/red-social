import { getInfoPerfilBySlugNegocio } from "@/actions/perfil/getInfoPerfilSlugNegocio";
import { getNegocioProductsBySlug } from "@/actions/productos/getNegocioProductsBySlug";
import { auth } from "@/auth.config";
import { getPublicacionesNegocio } from "@/publicaciones/actions/getPublicaciones";
import PerfilUsuarioHeader from "@/ui/components/perfil-usuario-header/PerfilUsuarioHeader";

interface Props {
  params: {
    slug: string;
  };
}


export default async function NegocioPage({ params }: Props) {
  const session = await auth();
  if (!session || !session.user.id) {
    return { ok: false, message: "No estás autenticado. Por favor, inicia sesión." };
  }
  const { slug } = await params;
  const result = await getNegocioProductsBySlug(slug);
  console.log({result});
  const { negocio } = await getInfoPerfilBySlugNegocio(slug);
  console.log({negocio});
  const publicacionesIniciales=  await getPublicacionesNegocio({slug})

  console.log({result, negocio});

  return (
    <div className="sm:mt-40">
      <PerfilUsuarioHeader activeTabComponent="Productos" productos={result.products} informacionNegocio={negocio} publicaciones={publicacionesIniciales.publicaciones} />
    </div>
  );
}