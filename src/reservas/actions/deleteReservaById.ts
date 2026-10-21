"use server";

interface DeleteReservaResponse {
  ok: false;
  code: "RESERVATION_CANCELLATION_UNAVAILABLE";
  message: string;
}

export const deleteReservaById = async (
  _id: string,
  _nombre_cliente: string,
  _fecha_hora: string,
  _negocioId: string,
  _telefono_cliente: string
): Promise<DeleteReservaResponse> => {
  void _id;
  void _nombre_cliente;
  void _fecha_hora;
  void _negocioId;
  void _telefono_cliente;

  return {
    ok: false,
    code: "RESERVATION_CANCELLATION_UNAVAILABLE",
    message: "La cancelación desde este enlace ya no está disponible.",
  };
};
