import { ProductStatus } from "@prisma/client";



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
  telefonoContacto?: string;
}