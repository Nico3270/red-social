// app/api/placeholder-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { separarCiudadDepartamento, generarUsernameUnico } from "@/helpers/usuario/funcionesUsuario";
import { Genero } from "@prisma/client";
export const dynamic = "force-dynamic";


// CORRECTO: así se lee una variable privada del servidor
const MYCKEO_ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY;

if (!MYCKEO_ADMIN_KEY) {
  throw new Error("Falta MYCKEO_ADMIN_KEY en .env.local");
}

interface PlaceholderRequest {
  nombreNegocio: string;
  ciudadCompleta: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar API Key
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== MYCKEO_ADMIN_KEY) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: PlaceholderRequest = await request.json();
    const { nombreNegocio, ciudadCompleta } = body;

    if (!nombreNegocio || !ciudadCompleta) {
      return NextResponse.json(
        { ok: false, message: "nombreNegocio y ciudadCompleta son obligatorios" },
        { status: 400 }
      );
    }

    const { ciudad, departamento } = separarCiudadDepartamento(ciudadCompleta);
    if (!ciudad || !departamento) {
      return NextResponse.json(
        { ok: false, message: "Formato inválido: usa 'Ciudad - Departamento'" },
        { status: 400 }
      );
    }

    const slug = nombreNegocio
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 30);

    if (slug.length < 3) {
      return NextResponse.json(
        { ok: false, message: "Nombre del negocio demasiado corto" },
        { status: 400 }
      );
    }

    const email = `${slug}@myckeo.com`;
    const contraseñaTemporal = `${slug}2025*`;

    // Reutilizar si ya existe
    const existe = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true }
    });

    if (existe) {
      return NextResponse.json({
        ok: true,
        message: "Usuario placeholder ya existe",
        usuarioId: existe.id,
        credenciales: {
          email,
          contraseña: contraseñaTemporal
        }
      });
    }

    const username = await generarUsernameUnico(slug);

    const usuario = await prisma.usuario.create({
      data: {
        nombre: "Dueño",
        apellido: "Pendiente",
        email,
        contraseña: bcryptjs.hashSync(contraseñaTemporal),
        username,
        genero: "otro" as Genero,
        fechaNacimiento: new Date("1990-01-01"),
        ciudad,
        departamento,
        isPlaceholder: true,
        perfilCompleto: false,
      },
      select: {
        id: true,
        email: true,
        username: true,
      }
    });

    return NextResponse.json({
      ok: true,
      usuarioId: usuario.id,
      credenciales: {
        email,
        contraseña: contraseñaTemporal
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Error en /api/placeholder-user:", error);
    return NextResponse.json(
      { ok: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}