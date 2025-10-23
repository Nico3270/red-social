import { updateContactsFromEvents } from "@/admin/actions/updateContactsFromEvents";
import { NextResponse } from "next/server";


export async function POST(req: Request) {
  try {
    const { startDate, endDate } = await req.json();

    if (!startDate) {
      return NextResponse.json({
        ok: false,
        error: "Falta la fecha inicial",
      });
    }

    const { total, updated } = await updateContactsFromEvents(startDate, endDate);

    return NextResponse.json({
      ok: true,
      totalEvents: total,
      updatedContacts: updated,
    });
  } catch (error) {
    console.error("Error en /api/brevo/sync:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}