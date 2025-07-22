import { getProductBySlug } from "@/actions/productos/getProductBySlug";
import { SeccionesFont } from "@/config/fonts";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import { getResenasProductoTestimonio } from "@/publicaciones/actions/getPublicacionesProductoTestimonio";
import { ResenasProducto } from "@/publicaciones/componentes/ResenasProductoTestimonio";
import Divider from "@/ui/components/divider/Divider";
import { DetallesProducto } from "@/ui/components/productos/DetallesProducto";
import { ProductGridProduct } from "@/ui/components/productos/ProductGridProduct";
import { ResponsiveSlideShow } from "@/ui/components/slideShow/ResponsiveSlideShow";

interface Props {
  params: Promise<{
    categoria: string;
    seccion: string;
    slug: string;
  }>;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const result = await getProductBySlug(slug);

  if (!result.ok) {
    return (
      <div className="sm:mt-40">
        <h1>Se ha producido el siguiente Error: {result.message}</h1>
        <p>Por favor, verifica el slug del producto.</p>
        <p>Si el problema persiste, contacta al soporte.</p>
        <p>Negocio: {result.nombreNegocio}</p>
        <p>Teléfono: {result.telefonoNegocio}</p>
      </div>
    );
  }

  const { product, productosSimilares, telefonoNegocio, nombreNegocio } = result;

  if (!product) {
    return <h1>No hay producto</h1>;
  }

  const resenasResult = await getResenasProductoTestimonio(product.id);
  const resenas = resenasResult.ok && resenasResult.resenas ? resenasResult.resenas : [];

  const productosConvertidos: ProductRedSocial[] = (productosSimilares ?? []).map((producto) => ({
    id: producto.id,
    nombre: producto.nombre,
    precio: producto.precio,
    imagenes: producto.imagenes,
    descripcion: producto.descripcion,
    seccionIds: producto.sections,
    descripcionCorta: producto.descripcionCorta,
    slug: producto.slug,
    tags: producto.tags,
    componentes: producto.componentes,
    prioridad: producto.prioridad,
    status: producto.status,
    categoriaId: producto.categoriaId,
    sections: producto.sections,
    telefonoContacto: producto.telefonoContacto || "",
    slugNegocio: producto.slugNegocio || "",
    nombreNegocio: producto.nombreNegocio || "",
  }));

  return (
    <div className="sm:mt-40 p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Carrusel de imágenes */}
        <div className="flex justify-center">
          <div className="w-full h-[400px] md:h-[500px]">
            <ResponsiveSlideShow images={product.imagenes} title={product.nombre || ""} />
          </div>
        </div>

        {/* Detalles del producto */}
        <div className="flex flex-col space-y-6 md:space-y-4 md:flex-grow">
          <DetallesProducto product={product} telefonoNegocio={telefonoNegocio} />
        </div>
      </div>
      <Divider />
      {resenas.length > 0 && <ResenasProducto resenas={resenas} />} {/* Renderizar solo si hay reseñas */}
      <Divider />
      {/* Productos similares */}
      <div className="mt-2 mb-15">
        {productosConvertidos.length > 0 ? (
          <h2 className={`text-2xl font-bold mb-2 ${SeccionesFont.className} text-gray-800`}>Productos Similares</h2>
        ) : null}
        <ProductGridProduct products={productosConvertidos} />
      </div>
    </div>
  );
}