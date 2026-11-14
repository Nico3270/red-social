import React from "react";
import { createRoot } from "react-dom/client";
import { CompletePerfil } from "../../src/ui/components/dashboard/perfil/CompletePerfil";
import AutoUploadMedia from "../../src/ui/components/autoUpload/AutoUploadMedia";
import { MapPicker } from "../../src/ui/components/map-picker/MapPicker";
import { initialData } from "../../src/seed/seed";

const state = window.profileTest;
const category = initialData.categorias[0];
const section = initialData.secciones.find(
  (value) => value.categorySlug === category.slug,
)!;
state.initial = {
  nombreNegocio: "Negocio de prueba",
  slugNegocio: "negocio-de-prueba",
  descripcionNegocio: "Descripción original",
  telefonoNegocio: "+573001234567",
  ciudadNegocio: "Medellín",
  departamentoNegocio: "Antioquia",
  direccionNegocio: "Calle 10 # 20-30",
  latitudNegocio: 6.24,
  longitudNegocio: -75.58,
  categoriaIds: [category.id],
  seccionesIds: [section.id],
  estadoNegocio: "activo",
  imagenPerfil: "https://example.test/profile.png",
  imagenPortada: "https://example.test/cover.png",
  sitioWeb: "https://example.test",
  instagram: "https://instagram.com/negocio",
  ...(state.initial as Partial<typeof state.initial>),
  ...JSON.parse(sessionStorage.getItem("profile-editor-test") || "null"),
};
state.submissions = [];
state.navigations = [];
state.geocodeCalls = [];
state.geoCalls = 0;
Object.defineProperty(navigator, "geolocation", {
  configurable: true,
  value: state.geoUnavailable
    ? undefined
    : {
        getCurrentPosition: (
          success: PositionCallback,
          error: PositionErrorCallback,
        ) => {
          state.geoCalls += 1;
          if (state.geoThrow) throw new Error("Unexpected platform error");
          state.geoSuccess = success;
          state.geoError = error;
          if (state.geoCode !== undefined)
            setTimeout(
              () => error({ code: state.geoCode } as GeolocationPositionError),
              10,
            );
          if (state.geoInvalid)
            setTimeout(
              () =>
                success({
                  coords: { latitude: NaN, longitude: -74 },
                } as GeolocationPosition),
              10,
            );
        },
      },
});
Object.assign(window, {
  google: {
    maps: {
      Geocoder: class {
        async geocode({ address }: { address: string }) {
          state.geocodeCalls.push(address);
          if (state.geocodeDelay)
            await new Promise((resolve) => setTimeout(resolve, 400));
          if (state.geocodeFail) throw { code: state.geocodeFail };
          const street = /calle|carrera/i.test(address);
          return {
            results: [
              {
                formatted_address: street
                  ? "Calle 72, Bogotá, Colombia"
                  : "Bogotá, Colombia",
                types: [street ? "street_address" : "locality"],
                geometry: { location: { lat: () => 4.65, lng: () => -74.05 } },
              },
            ],
          };
        }
      },
    },
  },
});

function StandaloneMap() {
  const [location, setLocation] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  return (
    <>
      <MapPicker
        initialLocation={location}
        onLocationSelect={(lat, lng) => setLocation({ lat, lng })}
      />
      <output data-testid="selection">{JSON.stringify(location)}</output>
    </>
  );
}
function StandaloneUploader() {
  const onChange = React.useCallback((value: string | string[] | undefined) => {
    window.profileTest.draftImages = value;
  }, []);
  return (
    <AutoUploadMedia
      initialData={window.profileTest.initial.imagenPerfil}
      multiple={window.profileTest.uploaderMultiple || false}
      mediaType="image"
      onChange={onChange}
      onError={(message) => {
        document.getElementById("upload-error")!.textContent = message;
      }}
    />
  );
}
const root = createRoot(document.getElementById("root")!);
state.rootUnmount = () => root.unmount();
root.render(
  <React.StrictMode>
    <div id="upload-error" role="alert" />
    {new URLSearchParams(location.search).has("uploaderOnly") ? (
      <StandaloneUploader />
    ) : new URLSearchParams(location.search).has("mapOnly") ? (
      <StandaloneMap />
    ) : (
      <CompletePerfil informacionNegocio={state.initial} />
    )}
  </React.StrictMode>,
);
