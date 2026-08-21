// src/auth.config.ts
import NextAuth, { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import prisma from "./lib/prisma";
import bcryptjs from "bcryptjs";
import { randomBytes } from "crypto";
import { Role } from "@prisma/client";

async function buildSessionSnapshotByEmail(email: string) {
  const usuarioConNegocio = await prisma.usuario.findUnique({
    where: { email },
    include: {
      negocio: {
        select: {
          id: true,
          slug: true,
          nombre: true,
          archivedAt: true,
          estado: true,
          isTestData: true,
        },
      },
    },
  });

  if (!usuarioConNegocio) {
    return null;
  }

  const managedBusiness = usuarioConNegocio.negocio;
  const hasManagedBusiness = Boolean(managedBusiness);
  const businessOperational = Boolean(
    managedBusiness &&
      managedBusiness.estado === "activo" &&
      !managedBusiness.isTestData &&
      !managedBusiness.archivedAt
  );

  let businessRestrictionReason: "archived" | "inactive" | "test_data" | null =
    null;

  if (managedBusiness?.archivedAt) {
    businessRestrictionReason = "archived";
  } else if (managedBusiness?.isTestData) {
    businessRestrictionReason = "test_data";
  } else if (managedBusiness && managedBusiness.estado !== "activo") {
    businessRestrictionReason = "inactive";
  }

  let configReservation = false;
  let configEncuestas = false;

  if (managedBusiness?.id && businessOperational) {
    const [availabilityCount, encuestaCount] = await Promise.all([
      prisma.businessAvailability.count({
        where: { negocioId: managedBusiness.id },
      }),
      prisma.encuesta.count({
        where: { negocioId: managedBusiness.id },
      }),
    ]);

    configReservation = availabilityCount > 0;
    configEncuestas = encuestaCount > 0;
  }

  return {
    id: usuarioConNegocio.id,
    nombre: usuarioConNegocio.nombre,
    apellido: usuarioConNegocio.apellido ?? "",
    username: usuarioConNegocio.username,
    email: usuarioConNegocio.email,
    role: usuarioConNegocio.role,
    emailVerified: usuarioConNegocio.emailVerified ?? null,
    ciudad: usuarioConNegocio.ciudad ?? null,
    departamento: usuarioConNegocio.departamento ?? null,
    fotoPerfil: usuarioConNegocio.fotoPerfil || "/imgs/usuario-sin-foto.png",
    perfilCompleto: usuarioConNegocio.perfilCompleto ?? false,
    isPlaceholder: usuarioConNegocio.isPlaceholder ?? false,
    hasManagedBusiness,
    businessOperational,
    businessArchivedAt: managedBusiness?.archivedAt?.toISOString() ?? null,
    businessEstado: managedBusiness?.estado ?? null,
    businessRestrictionReason,
    managedBusinessName: managedBusiness?.nombre ?? null,
    managedBusinessSlug: managedBusiness?.slug ?? null,
    negocioId: businessOperational ? managedBusiness?.id ?? null : null,
    negocioSlug: businessOperational ? managedBusiness?.slug ?? null : null,
    negocioNombre: businessOperational ? managedBusiness?.nombre ?? null : null,
    configReservation,
    configEncuestas,
  };
}

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
              nombre: profile?.given_name || "Usuario",  // Usa given_name para el nombre (first name)
              apellido: profile?.family_name || "Sin apellido",  // Usa family_name para el apellido (last name)
              email: user.email!,
              contraseña: hashedPassword,
              role: "user",
              username: (user.email?.split("@")[0] ?? "usuario") + Date.now(),
              ciudad: "Desconocida",
              departamento: "Desconocido",
              pais: "Colombia",
              fechaNacimiento: new Date("1990-01-01"),
              genero: "otro",
              perfilCompleto: false,
            },
          });
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      const email = user?.email || (typeof token.email === "string" ? token.email : null);
      const tokenWithProfile = token as typeof token & {
        nombre?: string;
        username?: string;
        departamento?: string | null;
      };

      if (email) {
        const snapshot = await buildSessionSnapshotByEmail(email);

        if (!snapshot) {
          throw new Error("Usuario no encontrado en DB después de signIn");
        }

        token.id = snapshot.id;
        token.name = snapshot.nombre;
        tokenWithProfile.nombre = snapshot.nombre;
        token.apellido = snapshot.apellido;
        tokenWithProfile.username = snapshot.username;
        token.email = snapshot.email;
        token.role = snapshot.role;
        token.emailVerified = snapshot.emailVerified;
        token.ciudad = snapshot.ciudad ?? undefined;
        tokenWithProfile.departamento = snapshot.departamento ?? undefined;
        token.fotoPerfil =
          (user?.image as string | undefined) || snapshot.fotoPerfil;
        token.negocioId = snapshot.negocioId;
        token.negocioSlug = snapshot.negocioSlug;
        token.negocioNombre = snapshot.negocioNombre;
        token.configReservation = snapshot.configReservation;
        token.configEncuestas = snapshot.configEncuestas;
        token.perfilCompleto = snapshot.perfilCompleto;
        token.isPlaceholder = snapshot.isPlaceholder;
        token.hasManagedBusiness = snapshot.hasManagedBusiness;
        token.businessOperational = snapshot.businessOperational;
        token.businessArchivedAt = snapshot.businessArchivedAt;
        token.businessEstado = snapshot.businessEstado;
        token.businessRestrictionReason = snapshot.businessRestrictionReason;
        token.managedBusinessName = snapshot.managedBusinessName;
        token.managedBusinessSlug = snapshot.managedBusinessSlug;
      }

      // Si se llama desde `update()`
      if (trigger === "update") {
        if (!email) {
          if (session?.name) {
            token.name = session.name;
          }
          if ("nombre" in session && session.nombre) {
            tokenWithProfile.nombre = session.nombre as string;
          } else if (session?.name) {
            tokenWithProfile.nombre = session.name;
          }
          if ("apellido" in session && session.apellido !== undefined) {
            token.apellido = session.apellido as string;
          }
          if ("username" in session && session.username !== undefined) {
            tokenWithProfile.username = session.username as string;
          }
          if ("ciudad" in session && session.ciudad !== undefined) {
            token.ciudad = session.ciudad as string;
          }
          if ("departamento" in session && session.departamento !== undefined) {
            tokenWithProfile.departamento = session.departamento as string;
          }
          if ("fotoPerfil" in session && session.fotoPerfil !== undefined) {
            token.fotoPerfil = session.fotoPerfil as string;
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      const tokenWithProfile = token as typeof token & {
        nombre?: string;
        username?: string;
        departamento?: string | null;
      };

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
        fotoPerfil: token.fotoPerfil as string,
        perfilCompleto: token.perfilCompleto as boolean,
        isPlaceholder: token.isPlaceholder as boolean,
        hasManagedBusiness: token.hasManagedBusiness as boolean | undefined,
        businessOperational: token.businessOperational as boolean | undefined,
        businessArchivedAt: token.businessArchivedAt as string | null | undefined,
        businessEstado: token.businessEstado as string | null | undefined,
        businessRestrictionReason:
          token.businessRestrictionReason as
            | "archived"
            | "inactive"
            | "test_data"
            | null
            | undefined,
        managedBusinessName: token.managedBusinessName as string | null | undefined,
        managedBusinessSlug: token.managedBusinessSlug as string | null | undefined,
      };

      const sessionUser = session.user as typeof session.user & {
        nombre?: string;
        username?: string;
        departamento?: string | null;
      };

      sessionUser.nombre = tokenWithProfile.nombre ?? (token.name as string);
      sessionUser.username = tokenWithProfile.username;
      sessionUser.departamento = tokenWithProfile.departamento ?? null;

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
