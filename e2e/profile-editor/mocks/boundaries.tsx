import React, { useEffect } from "react";
import type { InformacionInicialNegocio } from "../../../src/lib/business/profileEditor";

type Control = {
  initial: InformacionInicialNegocio;
  saved?: InformacionInicialNegocio;
  submissions: InformacionInicialNegocio[];
  rejectSave?: boolean;
  throwSave?: boolean;
  slowSave?: boolean;
  expireSession?: boolean;
  failSessionUpdate?: boolean;
  mapsFail?: boolean;
  geocodeFail?: string;
  geocodeDelay?: boolean;
  geoCode?: number;
  geoUnavailable?: boolean;
  geoThrow?: boolean;
  geoInvalid?: boolean;
  geoCalls: number;
  geoSuccess?: PositionCallback;
  geoError?: PositionErrorCallback;
  geocodeCalls: string[];
  navigations: string[];
  pan?: unknown;
  mapZoom?: number;
  uploaderMultiple?: boolean;
  draftImages?: string | string[];
  rootUnmount?: () => void;
  releaseSave?: () => void;
};
declare global {
  interface Window {
    profileTest: Control;
  }
}
const state = () => window.profileTest;

export const EstadoNegocio = {
  activo: "activo",
  suspendido: "suspendido",
  eliminado: "eliminado",
};
export function useSession() {
  return {
    data: state().expireSession ? null : { user: { id: "fictitious-owner" } },
    update: async () => {
      if (state().failSessionUpdate) throw new Error("session update");
    },
  };
}
export function useRouter() {
  return {
    push: (url: string) => state().navigations.push(url),
    replace: (url: string) => state().navigations.push(url),
  };
}
export async function actualizarPerfilNegocio(
  _id: string,
  data: InformacionInicialNegocio,
) {
  state().submissions.push(data);
  if (state().slowSave)
    await new Promise<void>((resolve) => {
      state().releaseSave = resolve;
    });
  if (state().throwSave) throw new Error("Network failure");
  if (state().rejectSave)
    return { ok: false, message: "Servidor rechazó el guardado" };
  state().saved = data;
  sessionStorage.setItem("profile-editor-test", JSON.stringify(data));
  return {
    ok: true,
    message: "Perfil actualizado correctamente.",
    negocio: data,
  };
}
export const titleFont = { className: "" };
export default function Image({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}) {
  return (
    <img src={src} alt={alt} width={width || 100} height={height || 100} />
  );
}
export function useJsApiLoader() {
  return {
    isLoaded: !state().mapsFail,
    loadError: state().mapsFail ? new Error("Script network error") : undefined,
  };
}
const point = () => ({ lat: () => 6.25184, lng: () => -75.56359 });
export function GoogleMap({
  children,
  onLoad,
  onUnmount,
  onClick,
  center,
  zoom,
}: {
  children: React.ReactNode;
  onLoad: (map: unknown) => void;
  onUnmount: () => void;
  onClick?: (event: unknown) => void;
  center: unknown;
  zoom: number;
}) {
  useEffect(() => {
    onLoad({
      panTo: (position: unknown) => {
        state().pan = position;
      },
      setZoom: (value: number) => {
        state().mapZoom = value;
      },
      fitBounds: () => {},
    });
    return onUnmount;
    // Simula el ciclo de vida de la instancia GoogleMap, independiente de callbacks nuevos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      data-testid="map"
      data-center={JSON.stringify(center)}
      data-zoom={zoom}
      style={{ height: 360, background: "#e6eeec", padding: 20 }}
    >
      <button type="button" onClick={() => onClick?.({ latLng: point() })}>
        Simular clic en mapa
      </button>
      {children}
    </div>
  );
}
export function Marker({
  position,
  draggable,
  onDragEnd,
}: {
  position: unknown;
  draggable: boolean;
  onDragEnd: (event: unknown) => void;
}) {
  return (
    <button
      data-testid="marker"
      data-position={JSON.stringify(position)}
      type="button"
      disabled={!draggable}
      onClick={() => onDragEnd({ latLng: point() })}
    >
      Simular arrastre del marcador
    </button>
  );
}
