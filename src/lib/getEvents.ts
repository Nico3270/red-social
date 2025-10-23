import Brevo, { GetEmailEventReportEventsInner } from "@getbrevo/brevo";

export interface BrevoEvent {
  id: string;
  email: string;
  event: string;
  date: string;
  subject?: string | null;
  tag?: string | null;
  reason?: string | null;
}

/**
 * Obtiene los eventos de email desde Brevo en un rango de fechas.
 * @param startDate Fecha inicial en formato ISO (obligatoria)
 * @param endDate Fecha final en formato ISO (opcional, por defecto: ahora)
 */
export async function getBrevoEvents(
  startDate: string,
  endDate?: string
): Promise<{ ok: boolean; events?: BrevoEvent[]; error?: string }> {
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(
    Brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY as string
  );

  const end = endDate || new Date().toISOString();

  try {
    const response = await apiInstance.getEmailEventReport(
      100,          // limit
      0,            // offset
      startDate,    // startDate
      end,          // endDate
      undefined,    // days
      undefined,    // email
      undefined,    // event
      undefined,    // tags
      undefined,    // messageId
      undefined,    // templateId
      "desc"        // sort
    );

    const events = response.body.events ?? [];

    const formatted: BrevoEvent[] = events.map((e: GetEmailEventReportEventsInner) => ({
      id: e.messageId ?? "unknown",
      email: e.email ?? "unknown",
      event: e.event?.toString() ?? "unknown", // 👈 convierte enum a string
      date: e.date ?? "",
      subject: e.subject ?? null,
      tag: e.tag ?? null, // 👈 propiedad correcta (no 'tags')
      reason: e.reason ?? null,
    }));

    return { ok: true, events: formatted };
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error al obtener eventos de Brevo:", error.message);
      return { ok: false, error: error.message };
    }
    console.error("Error desconocido al obtener eventos de Brevo:", error);
    return { ok: false, error: "Error desconocido" };
  }
}
