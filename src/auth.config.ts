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
        token.id = user.id;
        token.name = user.name;
        token.apellido = user.apellido ?? "";
        token.email = user.email!;
        token.role = (user as any).role;
        token.emailVerified = (user as any).emailVerified ?? null;
        token.ciudad = (user as any).ciudad ?? null;
      }

      // Si se llama desde `update()`
      if (trigger === "update" && session?.role) {
        token.role = session.role;
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
