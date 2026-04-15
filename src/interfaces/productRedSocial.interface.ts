import { ProductStatus } from "@prisma/client";

export interface ProductAttributeRedSocial {
  id: string;
  nombre: string;
  valor: string;
  orden: number;
}

export interface ProductVariantOptionRedSocial {
  id: string;
  nombre: string;
  valor: string;
  orden: number;
}

export interface ProductVariantRedSocial {
  id: string;
  nombre?: string | null;
  sku?: string | null;
  precio?: number | null;
  stock?: number | null;
  stockIlimitado?: boolean;
  isActive: boolean;
  imagenUrl?: string | null;
  orden: number;
  options: ProductVariantOptionRedSocial[];
}

export interface ProductRedSocial {
  id: string;
  nombre: string;
  precio: number;
  descripcion: string;
  descripcionCorta: string;
  slug: string;
  prioridad: number;
  status: ProductStatus;
  tags: string[];
  categoriaId: string;
  imagenes: string[];
  componentes: string[];
  sections: string[];
  slugNegocio?: string;
  nombreNegocio?: string;
  negocioId: string;
  telefonoContacto?: string;
  negocioFotoPerfil: string;

  // Nuevos campos opcionales
  stock?: number | null;
  stockIlimitado?: boolean;
  usaVariantes?: boolean;

  atributos?: ProductAttributeRedSocial[];
  variantes?: ProductVariantRedSocial[];
}