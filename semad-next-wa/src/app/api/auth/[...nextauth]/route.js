// src/app/(auth)/[...nextauth]/route.js
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";        // 👈 fuerza Node.js (no edge)
export const dynamic = "force-dynamic"; // evita cachés agresivas

const prisma = new PrismaClient();

const authOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          if (!credentials?.username || !credentials?.password) return null;

          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
          });

          if (!user || !user.passwordHash) return null;

          const ok = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!ok) return null;

          return {
            id: String(user.id),
            name: user.name,
            username: user.username,
            role: user.role,
          };
        } catch (e) {
          // Si algo falla, devuelve null para "Credenciales inválidas"
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.username = token.username;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
