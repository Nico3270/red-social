export type Role = "navegante" | "creador" | "negocio" | "admin" | "user";
export type EstadoUsuario = "activo" | "suspendido" | "eliminado";

export interface Usuario {
  id: string;
  nombre?: string;
  username: string;
  email?: string;
  contaseña?: string;
  fotoPerfil?: string;
  biografia?: string;

  role: Role;
  preferencias: string[];

  ciudad?: string;
  pais?: string;

  esVerificado?: boolean;
  nombreNegocio?: string;
  categoriaNegocio?: string;
  descripcionNegocio?: string;
  imagenesNegocio?: string[];
  sitioWeb?: string;
  telefonoContacto?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  googleMapsUrl?: string;

  createdAt: Date;
  updatedAt: Date;
  ultimaActividad: Date;
  estado: EstadoUsuario;
}


