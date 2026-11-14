export type ProfileLocation = { lat: number; lng: number };

// Solo es una vista inicial de Colombia. Nunca se persiste como ubicación elegida.
export const COLOMBIA_MAP_CENTER: ProfileLocation = { lat: 4.5, lng: -73.5 };

export function validProfileLocation(
  lat: unknown,
  lng: unknown,
): ProfileLocation | null {
  return typeof lat === "number" &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
    ? { lat, lng }
    : null;
}

export const LOCATION_MESSAGES = {
  denied:
    "Activa el permiso de ubicación en tu navegador para utilizar esta función",
  unavailable:
    "No pudimos determinar tu ubicación. Puedes buscar tu dirección o seleccionarla en el mapa",
  timeout: "La ubicación está tardando demasiado. Inténtalo nuevamente",
  unsupported: "Tu navegador no admite la ubicación automática",
  insecure:
    "La ubicación automática requiere una conexión segura (HTTPS o localhost). Puedes seleccionar el punto en el mapa",
  policy:
    "Esta página no tiene permitido usar tu ubicación. Ábrela directamente en el navegador o selecciona el punto en el mapa",
  unexpected:
    "Ocurrió un error al obtener tu ubicación. Inténtalo nuevamente o selecciona el punto en el mapa",
} as const;

export function geolocationErrorMessage(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
  // Los códigos son estables; no dependen de constantes presentes en la instancia del error.
  switch (code) {
    case 1:
      return LOCATION_MESSAGES.denied;
    case 2:
      return LOCATION_MESSAGES.unavailable;
    case 3:
      return LOCATION_MESSAGES.timeout;
    default:
      return LOCATION_MESSAGES.unexpected;
  }
}

export function requestProfileLocation(environment: {
  geolocation?: Pick<Geolocation, "getCurrentPosition">;
  secureContext: boolean;
  allowedByPolicy?: boolean;
}): Promise<ProfileLocation> {
  return new Promise((resolve, reject) => {
    const fail = (message: string) => reject(new Error(message));
    if (!environment.secureContext) return fail(LOCATION_MESSAGES.insecure);
    if (environment.allowedByPolicy === false)
      return fail(LOCATION_MESSAGES.policy);
    if (!environment.geolocation) return fail(LOCATION_MESSAGES.unsupported);
    try {
      environment.geolocation.getCurrentPosition(
        ({ coords }) => {
          const location = validProfileLocation(
            coords?.latitude,
            coords?.longitude,
          );
          if (location) resolve(location);
          else fail(LOCATION_MESSAGES.unavailable);
        },
        (error) => {
          // No registrar coordenadas, claves ni datos del formulario.
          console.warn("[MapPicker] Geolocalización rechazada", {
            code: error.code,
          });
          fail(geolocationErrorMessage(error));
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
      );
    } catch (error) {
      fail(geolocationErrorMessage(error));
    }
  });
}

export function geocodingErrorMessage(error: unknown): string {
  const code =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "code" in error
        ? error.code
        : undefined;
  if (code === "ZERO_RESULTS")
    return "No encontramos ese lugar en Colombia. Prueba con la ciudad y una dirección más completa";
  if (code === "REQUEST_DENIED")
    return "La búsqueda de direcciones no está habilitada. Puedes seleccionar el punto en el mapa";
  if (code === "OVER_QUERY_LIMIT" || code === "OVER_DAILY_LIMIT")
    return "La búsqueda alcanzó su límite temporal. Inténtalo más tarde o usa el mapa";
  return "No pudimos buscar esa ubicación. Inténtalo nuevamente o selecciona el punto en el mapa";
}
