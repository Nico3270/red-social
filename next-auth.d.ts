// src/types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

// Extender el módulo NextAuth
declare module "next-auth" {
  // Extender el tipo User
  interface User extends DefaultUser {
    id: string;
    role: string;
    emailVerified: Date | null; // No puede ser undefined
  }

  interface Session extends DefaultSession {
    user: User; // Utiliza el tipo extendido de User
  }

  interface JWT {
    id: string;
    email: string;
    name: string;
    role: string;
    emailVerified: Date | null;
  }

  interface CustomUser {
    id: string;
    email: string;
    name: string;
    role: string;
    emailVerified?: Date | null;
  }
}
