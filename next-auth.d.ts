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
  }

  interface CustomUser {
    id: string;
    email: string;
    name: string;
    role: string;
    ciudad?: string;
    emailVerified?: Date | null;
 
  }
}
