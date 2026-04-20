import type { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import type { PublicCatalogGroupProduct } from "./getGroupProductsPublic";

export function mapPublicCatalogGroupProductToProductRedSocial(
  row: PublicCatalogGroupProduct,
  negocioSlugFallback: string
): ProductRedSocial {
  return {
    id: row.product.id,
    nombre: row.product.nombre,
    precio: row.product.precio,
    descripcion: row.product.descripcion ?? "",
    descripcionCorta: row.product.descripcionCorta ?? "",
    slug: row.product.slug,
    prioridad: row.product.prioridad ?? 0,
    status: row.product.status,
    etiquetaEspecial: row.product.etiquetaEspecial,
    tags: row.product.tags ?? [],
    categoriaId: row.product.categoryId,
    imagenes: row.product.imagenes.map((img) => img.url),
    componentes: row.product.componentes ?? [],
    sections: row.product.secciones.map((section) => section.sectionId),
    slugNegocio: row.product.negocio?.slug ?? negocioSlugFallback,
    nombreNegocio: row.product.negocio?.nombre ?? "",
    negocioId: row.product.negocioId,
    telefonoContacto: row.product.negocio?.telefonoContacto ?? "",
    negocioFotoPerfil: row.product.negocio?.fotoPerfil ?? "",
    stock: row.product.stock,
    stockIlimitado: row.product.stockIlimitado ?? true,
    usaVariantes: row.product.usaVariantes,
    variantes: row.product.variantes.map((variant) => ({
      id: variant.id,
      nombre: variant.nombre,
      sku: variant.sku,
      precio: variant.precio,
      stock: variant.stock,
      stockIlimitado: variant.stockIlimitado ?? true,
      isActive: variant.isActive,
      imagenUrl: variant.imagenUrl,
      orden: variant.orden,
      options: variant.options.map((option) => ({
        id: option.id,
        nombre: option.nombre,
        valor: option.valor,
        orden: option.orden,
      })),
    })),
    isFeatured: row.isFeatured,
  };
}