// src/app/api/auth/refresh-session/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const dbUser = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      username: true,
      email: true,
      role: true,
      ciudad: true,
      departamento: true,
      pais: true,
      genero: true,
      fechaNacimiento: true,
    },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: dbUser });
}
