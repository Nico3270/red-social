"use server";

type DisabledLegacyReservationActionResult = {
  ok: false;
  code: "RESERVATION_LEGACY_ACTION_DISABLED";
  message: "Esta operación de reservas ya no está disponible.";
};

export async function createEditarReserva(
  _data: unknown,
): Promise<DisabledLegacyReservationActionResult> {
  void _data;

  return {
    ok: false,
    code: "RESERVATION_LEGACY_ACTION_DISABLED",
    message: "Esta operación de reservas ya no está disponible.",
  };
}
