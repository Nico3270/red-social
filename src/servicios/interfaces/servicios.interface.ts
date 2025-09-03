import { Currency, ServicioStatus } from "@prisma/client";

export interface MediaItem {
  url: string;
  orden: number;
  tipo?: 'IMAGEN' | 'VIDEO';
}

export interface ServicioData {
  id?: string;
  titulo: string;
  descripcion: string[];
  slug?: string;
  precio?: number;
  currency?: Currency;
  status?: ServicioStatus;
  tags?: string[];
  multimedia?: MediaItem[];
  negocioId: string;
  negocioSlug: string;
  nombreNegocio: string;
  telefonoNegocio:string
  negocioFotoPerfil: string;
}