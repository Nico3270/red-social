"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
  createFilterOptions,
} from "@mui/material";
import { MdMyLocation, MdSearch } from "react-icons/md";
import colombia from "@/config/colombia.json";
import {
  COLOMBIA_MAP_CENTER,
  geocodingErrorMessage,
  requestProfileLocation,
  validProfileLocation,
  type ProfileLocation,
} from "@/lib/business/profileLocation";

const cities = colombia.flatMap((department) =>
  department.ciudades.map(
    (city) => `${city}, ${department.departamento}, Colombia`,
  ),
);
const filterCities = createFilterOptions<string>({ limit: 6 });
const containerStyle = { width: "100%", height: "360px" };
const mapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

type SearchResult = {
  label: string;
  location: ProfileLocation;
  viewport?: google.maps.LatLngBounds;
};
interface Props {
  onLocationSelect: (lat: number, lng: number) => void;
  // El formulario es dueño de la selección. Centro y borrador solo sirven para navegar.
  initialLocation?: ProfileLocation | null;
  initialCity?: string;
  disabled?: boolean;
}

type PolicyDocument = Document & {
  permissionsPolicy?: { allowsFeature: (name: string) => boolean };
  featurePolicy?: { allowsFeature: (name: string) => boolean };
};

export const MapPicker = ({
  onLocationSelect,
  initialLocation,
  initialCity = "",
  disabled = false,
}: Props) => {
  const selected = validProfileLocation(
    initialLocation?.lat,
    initialLocation?.lng,
  );
  const [center, setCenter] = useState(selected || COLOMBIA_MAP_CENTER);
  const [zoom, setZoom] = useState(selected ? 16 : 5);
  const [candidate, setCandidate] = useState<SearchResult | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const mounted = useRef(false);
  const locationPending = useRef(false);
  const searchPending = useRef<string | null>(null);
  const referencedCity = useRef<string | null>(null);
  const revision = useRef(0);
  const previousCity = useRef(initialCity);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: key,
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (disabled) revision.current += 1;
  }, [disabled]);

  useEffect(() => {
    if (candidate?.viewport) mapRef.current?.fitBounds(candidate.viewport);
  }, [candidate]);

  const selectedLat = selected?.lat;
  const selectedLng = selected?.lng;
  const previousSelection = useRef({ lat: selectedLat, lng: selectedLng });
  useEffect(() => {
    const location = validProfileLocation(selectedLat, selectedLng);
    setCenter(location || COLOMBIA_MAP_CENTER);
    setZoom(location ? 16 : 5);
    setCandidate(null);
    if (
      previousSelection.current.lat !== selectedLat ||
      previousSelection.current.lng !== selectedLng
    )
      revision.current += 1;
    previousSelection.current = { lat: selectedLat, lng: selectedLng };
  }, [selectedLat, selectedLng]);

  const navigate = useCallback((result: SearchResult) => {
    revision.current += 1;
    setCandidate(result);
    setCenter(result.location);
    setZoom(15);

    setError(null);
  }, []);

  const select = (location: ProfileLocation) => {
    if (disabled) return;
    revision.current += 1;
    setCandidate(null);
    setCenter(location);
    setZoom(17);
    setError(null);
    onLocationSelect(location.lat, location.lng);
  };

  const search = useCallback(
    async (address: string, navigateFirst = false) => {
      if (
        !address.trim() ||
        !isLoaded ||
        disabled ||
        searchPending.current === address
      )
        return;
      searchPending.current = address;
      const requestRevision = ++revision.current;
      setSearching(true);
      setError(null);
      setResults([]);
      try {
        const response = await new google.maps.Geocoder().geocode({
          address: address.trim(),
          region: "co",
          componentRestrictions: { country: "CO" },
        });
        if (!mounted.current || requestRevision !== revision.current) return;
        const matches = response.results.flatMap((result) => {
          const location = validProfileLocation(
            result.geometry.location.lat(),
            result.geometry.location.lng(),
          );
          return location
            ? [
                {
                  label: result.formatted_address,
                  location,
                  viewport: result.geometry.viewport,
                },
              ]
            : [];
        });
        if (!matches.length) {
          setError(geocodingErrorMessage("ZERO_RESULTS"));
          return;
        }
        if (navigateFirst) navigate(matches[0]);
        else setResults(matches);
      } catch (reason) {
        if (mounted.current && requestRevision === revision.current)
          setError(geocodingErrorMessage(reason));
      } finally {
        if (searchPending.current === address) {
          searchPending.current = null;
          if (mounted.current) setSearching(false);
        }
      }
    },
    [isLoaded, disabled, navigate],
  );

  // Una ciudad sirve como referencia visual; nunca se comunica al formulario como coordenada.
  useEffect(() => {
    if (
      !initialCity ||
      !isLoaded ||
      disabled ||
      referencedCity.current === initialCity
    )
      return;
    const changedCity = previousCity.current !== initialCity;
    previousCity.current = initialCity;
    referencedCity.current = initialCity;
    if (changedCity || selectedLat === undefined)
      void search(initialCity, true);
  }, [initialCity, isLoaded, search, selectedLat, disabled]);

  const getCurrentLocation = async () => {
    if (disabled || locationPending.current) return;
    locationPending.current = true;
    const requestRevision = ++revision.current;
    setLocating(true);
    setError(null);
    try {
      const policyDocument = document as PolicyDocument;
      const policy =
        policyDocument.permissionsPolicy || policyDocument.featurePolicy;
      const location = await requestProfileLocation({
        geolocation: navigator.geolocation,
        secureContext: window.isSecureContext,
        allowedByPolicy: policy?.allowsFeature("geolocation"),
      });
      if (!mounted.current || requestRevision !== revision.current) return;
      select(location);
      mapRef.current?.panTo(location);
      mapRef.current?.setZoom(17);
    } catch (reason) {
      if (mounted.current && requestRevision === revision.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : "No pudimos obtener tu ubicación. Puedes seleccionarla en el mapa",
        );
      }
    } finally {
      locationPending.current = false;
      if (mounted.current) setLocating(false);
    }
  };

  const selectMapPoint = (event: google.maps.MapMouseEvent) => {
    const location = validProfileLocation(
      event.latLng?.lat(),
      event.latLng?.lng(),
    );
    if (location) select(location);
  };
  const marker = candidate?.location || selected;
  const mapsUnavailable = !key || Boolean(loadError);

  return (
    <Box
      component="section"
      aria-label="Ubicación del negocio"
      sx={{
        mb: 2,
        p: { xs: 1.5, sm: 2.5 },
        border: "1px solid",
        borderColor: "grey.200",
        borderRadius: 3,
      }}
    >
      <Typography component="h2" variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Ubicación del negocio
      </Typography>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Autocomplete
          freeSolo
          fullWidth
          options={cities}
          filterOptions={filterCities}
          inputValue={query}
          disabled={disabled || !isLoaded || mapsUnavailable || searching}
          onInputChange={(_, value) => {
            setQuery(value);
            setResults([]);
          }}
          onChange={(_, value) => {
            if (value) {
              setQuery(value);
              void search(value, true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (
                !document.getElementById(
                  event.currentTarget
                    .querySelector("input")
                    ?.getAttribute("aria-activedescendant") || "",
                )
              )
                void search(query);
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Buscar ciudad o dirección"
              placeholder="Ej. Medellín o Calle 72, Bogotá"
            />
          )}
        />
        <Button
          type="button"
          variant="outlined"
          onClick={() => void search(query)}
          disabled={
            disabled ||
            !isLoaded ||
            mapsUnavailable ||
            searching ||
            !query.trim()
          }
          startIcon={
            searching ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <MdSearch />
            )
          }
          sx={{ textTransform: "none", minWidth: 110 }}
        >
          {searching ? "Buscando…" : "Buscar"}
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Busca una ciudad, barrio, dirección o lugar en Colombia y elige un
        resultado. Confirma el punto o arrastra el marcador hasta la entrada de
        tu negocio.
      </Typography>
      {results.length > 0 && (
        <List
          aria-label="Resultados de ubicación"
          dense
          sx={{ mb: 1, maxHeight: 200, overflow: "auto" }}
        >
          {results.map((result, index) => (
            <ListItemButton
              key={`${result.label}-${index}`}
              disabled={disabled}
              onClick={() => {
                navigate(result);
                setResults([]);
              }}
            >
              <ListItemText primary={result.label} />
            </ListItemButton>
          ))}
        </List>
      )}
      {error && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}
      {mapsUnavailable ? (
        <Alert severity="warning">
          No pudimos cargar el mapa. Tus coordenadas actuales se conservarán.
          Intenta recargar la página.
        </Alert>
      ) : !isLoaded ? (
        <Typography role="status">Cargando mapa…</Typography>
      ) : (
        <Box sx={{ borderRadius: 2, overflow: "hidden" }}>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={zoom}
            options={mapOptions}
            onClick={disabled ? undefined : selectMapPoint}
            onLoad={(map) => {
              mapRef.current = map;
            }}
            onUnmount={() => {
              mapRef.current = null;
            }}
          >
            {marker && (
              <Marker
                position={marker}
                draggable={!disabled}
                onDragEnd={selectMapPoint}
                title={
                  candidate
                    ? "Punto de referencia por confirmar"
                    : "Ubicación seleccionada del negocio"
                }
              />
            )}
          </GoogleMap>
        </Box>
      )}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mt: 1.5, alignItems: { sm: "center" }, flexWrap: "wrap" }}
      >
        <Button
          type="button"
          variant="outlined"
          disabled={disabled || locating}
          onClick={() => void getCurrentLocation()}
          startIcon={
            locating ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <MdMyLocation />
            )
          }
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          {locating ? "Obteniendo ubicación…" : "Usar mi ubicación"}
        </Button>
        {candidate && (
          <Button
            type="button"
            variant="outlined"
            disabled={disabled}
            onClick={() => select(candidate.location)}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Confirmar este punto
          </Button>
        )}
      </Stack>
      <Typography
        role="status"
        variant="body2"
        sx={{ mt: 1.5 }}
        color={
          candidate
            ? "text.secondary"
            : selected
              ? "success.dark"
              : "text.secondary"
        }
      >
        {candidate
          ? "Punto de referencia sin confirmar. La búsqueda aún no ha cambiado la ubicación del negocio."
          : selected
            ? "Ubicación seleccionada. Se conservará al guardar los cambios."
            : "Aún no has seleccionado una ubicación. Haz clic en el mapa para marcar tu negocio."}
      </Typography>
    </Box>
  );
};
