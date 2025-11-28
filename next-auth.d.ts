// src/types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

// Extender el módulo NextAuth
declare module "next-auth" {


  // Extender el tipo User
  interface User extends DefaultUser {
    id: string;
    name: string;               // Mapeado desde 'nombre'
    apellido?: string;
    email: string;
    role: string;
    ciudad?: string;            // <-- Nuevo campo agregado
    emailVerified?: Date | null;
    negocioId?: string | null;  // Nuevo campo
    negocioSlug?: string | null; // Nuevo campo
    negocioNombre?: string | null; // Nuevo campo
    configReservation?: boolean; // Nuevo campo para indicar si hay módulo de reservas activo
    configEncuestas?: boolean; // Nuevo campo para indicar si hay módulo de reservas activo
    fotoPerfil?: string | "/default-profile.png"; // Nuevo campo para la foto de perfil  
    perfilCompleto?: boolean; // Nuevo campo para indicar si el perfil está completo
    isPlaceholder?: boolean; // Nuevo campo para indicar si el usuario es placeholder
  }

  interface Session extends DefaultSession {
    user: User; // Utiliza el tipo extendido de User
  }

  interface JWT {
    id: string;
    name: string;
    apellido?: string;
    email: string;
    role: string;
    ciudad?: string;
    emailVerified?: Date | null;
    negocioId?: string | null;   // Nuevo campo
    negocioSlug?: string | null; // Nuevo campo
    negocioNombre?: string | null; // Nuevo campo
    configReservation?: boolean; // Nuevo campo para indicar si hay módulo de reservas activo
    configEncuestas?: boolean; // Nuevo campo para indicar si hay módulo de reservas activo
    fotoPerfil?: string | "/default-profile.png"; // Nuevo campo para la foto de perfil 
    perfilCompleto?: boolean; // Nuevo campo para indicar si el perfil está completo
    isPlaceholder?: boolean; // Nuevo campo para indicar si el usuario es placeholder
  }

  interface CustomUser {
    id: string;
    email: string;
    name: string;
    role: string;
    ciudad?: string;
    emailVerified?: Date | null;
    negocioId?: string | null;   // Nuevo campo
    negocioSlug?: string | null; // Nuevo campo
    negocioNombre?: string | null; // Nuevo campo
    configReservation?: boolean; // Nuevo campo para indicar si hay módulo de reservas activo
    configEncuestas?: boolean; // Nuevo campo para indicar si hay módulo de reservas activo
    fotoPerfil?: string | "/default-profile.png"; // Nuevo campo para la foto de perfil 
    perfilCompleto?: boolean; // Nuevo campo para indicar si el perfil está completo
    isPlaceholder?: boolean; // Nuevo campo para indicar si el usuario es placeholder
  }
}
