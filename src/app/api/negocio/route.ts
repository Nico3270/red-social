// app/api/negocio/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNegocio } from "@/actions/auth/createHegocio";
export const dynamic = "force-dynamic";


const API_KEY = process.env.MYCKEO_ADMIN_KEY;

if (!API_KEY) {
  throw new Error("Falta MYCKEO_ADMIN_KEY en .env.local");
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== API_KEY) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      nombre,
      descripcion = "Negocio creado automáticamente por Myckeo. Completa tu perfil para personalizarlo.",
      ciudad,
      departamento,
      direccion = "",
      telefonoContacto,
      usuarioId,
      categoriaIds,
      seccionIds,
      // Redes sociales
      facebook,
      instagram,
      tiktok,
      youtube,
      twitter,
      // Campos nuevos
      sitioWeb,
      latitud,
      longitud,
      palabrasClave = [], // array de strings para SEO
    } = body;

    // Validaciones
    if (!nombre || !ciudad || !departamento || !usuarioId) {
      return NextResponse.json({ ok: false, message: "Faltan campos obligatorios" }, { status: 400 });
    }

    if (!Array.isArray(categoriaIds) || categoriaIds.length === 0) {
      return NextResponse.json({ ok: false, message: "Debe seleccionar al menos una categoría" }, { status: 400 });
    }

    if (!Array.isArray(seccionIds) || seccionIds.length === 0) {
      return NextResponse.json({ ok: false, message: "Debe seleccionar al menos una sección" }, { status: 400 });
    }

    if (palabrasClave && !Array.isArray(palabrasClave)) {
      return NextResponse.json({ ok: false, message: "palabrasClave debe ser un array" }, { status: 400 });
    }

    // Construir URL de Google Maps
    let urlGoogleMaps = null;
    if (latitud && longitud) {
      urlGoogleMaps = `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`;
    }

    // Crear FormData para la server action
    const formData = new FormData();
    formData.append("nombre", nombre);
    formData.append("descripcion", descripcion);
    formData.append("ciudad", ciudad);
    formData.append("departamento", departamento);
    formData.append("direccion", direccion);
    if (telefonoContacto) formData.append("telefonoContacto", telefonoContacto);
    formData.append("usuarioId", usuarioId);
    categoriaIds.forEach(id => formData.append("categoriaIds", id));
    seccionIds.forEach(id => formData.append("seccionIds", id));

    // Ejecutar creación del negocio
    const result = await createNegocio(formData);

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    // Actualizar negocio con campos nuevos
    await prisma.negocio.update({
      where: { id: result.negocioId },
      data: {
        sitioWeb: sitioWeb || null,
        latitud: latitud ? parseFloat(latitud) : null,
        longitud: longitud ? parseFloat(longitud) : null,
        urlGoogleMaps,
        palabrasClave: palabrasClave || [], // ← Guardamos el array
      },
    });

    // Actualizar usuario (rol + redes sociales)
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        role: "negocio",
        facebook: facebook || null,
        instagram: instagram || null,
        tiktok: tiktok || null,
        youtube: youtube || null,
        twitter: twitter || null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Negocio creado exitosamente con todos los detalles",
      negocioId: result.negocioId,
      slug: result.slugNegocio,
      url: `https://myckeo.com/${result.slugNegocio}`,
      googleMapsUrl: urlGoogleMaps,
      credencialesParaEnviar: {
        email: `${nombre.toLowerCase().replace(/[^a-z0-9]/g, "")}@myckeo.com`,
        contraseña_temporal: `${nombre.toLowerCase().replace(/[^a-z0-9]/g, "")}2025*`,
        mensaje: "Tu negocio ya está creado. Ingresa con estas credenciales y completa tu perfil real."
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Error en API /api/negocio:", error);
    return NextResponse.json({ ok: false, message: "Error interno del servidor" }, { status: 500 });
  }
}