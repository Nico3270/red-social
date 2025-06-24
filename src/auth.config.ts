import NextAuth, { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import prisma from "./lib/prisma";
import bcryptjs from "bcryptjs";
import { randomBytes } from "crypto";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/auth/login",
    newUser: "/auth/new-account",
  },

  // Añadir trustHost aquí
  trustHost: true, // Confía en localhost y otros hosts durante desarrollo

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email as string },
        });

        if (!existingUser) {
          const randomPassword = randomBytes(16).toString("hex");
          const hashedPassword = bcryptjs.hashSync(randomPassword, 10);

          await prisma.user.create({
            data: {
              name: user.name || profile?.name || "Usuario sin nombre",
              email: user.email as string,
              password: hashedPassword,
              role: "user",
            },
          });
        }
      }

      return true;
    },

    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email!;
        token.name = user.name!;
        token.role = user.role;
        token.emailVerified = user.emailVerified || null; // Garantiza que sea Date | null
      }
      return token;
    },

    session({ session, token }) {
      session.user = {
        id: token.id as string,
        email: token.email as string,
        name: token.name as string,
        role: token.role as string,
        emailVerified: token.emailVerified instanceof Date ? token.emailVerified : null,
      };
      return session;
    },
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),

    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (!parsedCredentials.success) return null;

        const { email, password } = parsedCredentials.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!user) return null;

        if (!bcryptjs.compareSync(password, user.password)) return null;

        // Retorna el usuario sin incluir la contraseña

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = user;


        return {
          ...userWithoutPassword,
          emailVerified: user.emailVerified || null,
        };
      },
    }),
  ],
};

// Export NextAuth setup
export const { signIn, signOut, auth, handlers } = NextAuth(authConfig);
