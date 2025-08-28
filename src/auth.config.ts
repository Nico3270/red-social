// src/auth.config.ts
import NextAuth, { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import prisma from "./lib/prisma";
import bcryptjs from "bcryptjs";
import { randomBytes } from "crypto";
import { Role } from "@prisma/client";



export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/auth/login",
    newUser: "/auth/new-account",
  },

  trustHost: true,

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.usuario.findUnique({
          where: { email: user.email as string },
        });

        if (!existingUser) {
          const randomPassword = randomBytes(16).toString("hex");
          const hashedPassword = bcryptjs.hashSync(randomPassword, 10);

          await prisma.usuario.create({
            data: {
              nombre: user.name || profile?.name || "Usuario sin nombre",
              apellido: "Google",
              username: (user.email?.split("@")[0] ?? "usuario") + Date.now(),
              email: user.email!,
              contraseña: hashedPassword,
              role: "user",
              ciudad: "Desconocida",
              departamento: "Desconocido",
              pais: "Colombia",
              genero: "otro",
              fechaNacimiento: new Date("1990-01-01"),
            },
          });
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // Al iniciar sesión
      if (user && "id" in user) {

        const usuarioConNegocio = await prisma.usuario.findUnique({
          where: { id: user.id },
          include: {
            negocio: {
              select: { id: true, slug: true, nombre: true },
            },
          },
        });

        // Verificar si el negocio tiene módulo de reservas activo
        let configReservation = false;
        if (usuarioConNegocio?.negocio?.id) {
          const availabilityCount = await prisma.businessAvailability.count({
            where: { negocioId: usuarioConNegocio.negocio.id },
          });
          configReservation = availabilityCount > 0;
        }

        let configEncuestas = false;
        if (usuarioConNegocio?.negocio?.id) {
          const availabilityCount = await prisma.encuesta.count({
            where: { negocioId: usuarioConNegocio.negocio.id },
          });
          configEncuestas = availabilityCount > 0;
        }


        token.id = user.id;
        token.name = user.name;
        token.apellido = user.apellido ?? "";
        token.email = user.email!;
        token.role = (user as { role: Role }).role;
        token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified ?? null;
        token.ciudad = (user as { ciudad?: string }).ciudad ?? null;
        
        // Nuevos campos
        token.negocioId = usuarioConNegocio?.negocio?.id ?? null;
        token.negocioSlug = usuarioConNegocio?.negocio?.slug ?? null;
        token.negocioNombre = usuarioConNegocio?.negocio?.nombre ?? null;
        token.configReservation = configReservation; // Nuevo campo agregado
        token.configEncuestas = configEncuestas; // Nuevo campo agregado

      }

      // Si se llama desde `update()`
      if (trigger === "update") {
        if (session?.role) token.role = session.role;
        if (session?.negocioId) token.negocioId = session.negocioId;
        if (session?.negocioSlug) token.negocioSlug = session.negocioSlug;
        if (session?.negocioNombre) token.negocioNombre = session.negocioNombre;
        if (session?.configReservation !== undefined) token.configReservation = session.configReservation; // Permitir actualización
        if (session?.configEncuestas !== undefined) token.configEncuestas = session.configEncuestas; // Permitir actualización
      }

      return token;
    },

    async session({ session, token }) {
      session.user = {
        id: token.id as string,
        name: token.name as string,
        apellido: token.apellido as string,
        email: token.email as string,
        role: token.role as Role,
        emailVerified: token.emailVerified instanceof Date ? token.emailVerified : null,
        ciudad: token.ciudad as string,
        negocioId: token.negocioId as string | null,
        negocioSlug: token.negocioSlug as string | null,
        negocioNombre: token.negocioNombre as string | null,
        configReservation: token.configReservation as boolean, // Nuevo campo agregado
        configEncuestas: token.configEncuestas as boolean, // Nuevo campo agregado
      };
      return session;
    },
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),

    CredentialsProvider({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);

        if (!parsedCredentials.success) return null;

        const { email, password } = parsedCredentials.data;

        const user = await prisma.usuario.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user) return null;

        const isValidPassword = bcryptjs.compareSync(password, user.contraseña);
        if (!isValidPassword) return null;

        return {
          id: user.id,
          name: user.nombre,
          apellido: user.apellido,
          email: user.email!,
          role: user.role,
          ciudad: user.ciudad ?? "",
        };
      },
    }),
  ],
};

export const { signIn, signOut, auth, handlers } = NextAuth(authConfig);