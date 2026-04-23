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

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const businessOperational = Boolean(
    dbUser.negocio &&
      dbUser.negocio.estado === "activo" &&
      !dbUser.negocio.isTestData &&
      !dbUser.negocio.archivedAt
  );

  const businessRestrictionReason = dbUser.negocio?.archivedAt
    ? "archived"
    : dbUser.negocio && dbUser.negocio.estado !== "activo"
      ? "inactive"
      : dbUser.negocio?.isTestData
        ? "test_data"
        : null;

  return NextResponse.json({
    user: {
      ...dbUser,
      hasManagedBusiness: Boolean(dbUser.negocio),
      businessOperational,
      businessArchivedAt: dbUser.negocio?.archivedAt?.toISOString() ?? null,
      businessEstado: dbUser.negocio?.estado ?? null,
      businessRestrictionReason,
      managedBusinessName: dbUser.negocio?.nombre ?? null,
      managedBusinessSlug: dbUser.negocio?.slug ?? null,
      negocioId: businessOperational ? dbUser.negocio?.id ?? null : null,
      negocioSlug: businessOperational ? dbUser.negocio?.slug ?? null : null,
      negocioNombre: businessOperational ? dbUser.negocio?.nombre ?? null : null,
    },
  });
}
