import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";



export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> } // Ajuste en el tipo de params
) {
  // Espera la resolución de params
  const params = await context.params;
  const { slug } = params;


  try {
    if (!slug) {
      return NextResponse.json(
        { ok: false, message: "El slug del negocio es obligatorio." },
        { status: 400 }
      );
    }

    const infoNegocio = await prisma.negocio.findUnique({
        where:{slug},
        select:{
            nombre:true,
            id: true, descripcion:true
        }
    })

    
    if (!infoNegocio) {
      return NextResponse.json(
        { ok: true, products: [], message: "No hay más productos." },
        { status: 200 }
      );
    }

    const negocioInfo = {
        nombre_negocio: infoNegocio.nombre,
        negocioId: infoNegocio.id,
        descripcion: infoNegocio.descripcion
    }

    return NextResponse.json(
      { ok: true, negocio: negocioInfo, message: "Información del negocio obtenida exitosamente" },
    );
  } catch (error) {
    console.error("Error en la obtención de información:", error);
    return NextResponse.json(
      { ok: false, message: "Error al obtener la información del negocio." },
      { status: 500 }
    );
  }
}