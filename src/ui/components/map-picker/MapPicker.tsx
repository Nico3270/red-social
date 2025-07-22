"use client";

import React, { useState, useCallback, useRef } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Box, Button, Alert } from "@mui/material";
import { MdMyLocation } from "react-icons/md";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const centerDefault = {
  lat: 4.710989, // Bogotá por defecto
  lng: -74.072090,
};

interface Props {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLocation?: { lat: number, lng: number };
}

export const MapPicker = ({ onLocationSelect, initialLocation }: Props) => {
  const [position, setPosition] = useState(initialLocation || centerDefault);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const onMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setPosition({ lat, lng });
        onLocationSelect(lat, lng);
        console.log("Coordenadas al hacer clic:", { lat, lng }); // Log para depuración
      }
    },
    [onLocationSelect]
  );

  const handleGetCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      setError(null); // Resetear error
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setPosition({ lat, lng });
          onLocationSelect(lat, lng);
          if (map) {
            map.panTo({ lat, lng });
            map.setZoom(15);
          }
          console.log("Coordenadas de ubicación actual:", { lat, lng }); // Log para depuración
        },
        (error) => {
          let errorMessage = "No se pudo obtener la ubicación.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Permiso de geolocalización denegado.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "La información de ubicación no está disponible.";
              break;
            case error.TIMEOUT:
              errorMessage = "La solicitud de ubicación ha caducado.";
              break;
            default:
              errorMessage = "Error desconocido al obtener la ubicación.";
              break;
          }
          setError(errorMessage);
          console.error("Error de geolocalización:", errorMessage);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setError("La geolocalización no es compatible con este navegador.");
      console.error("Geolocalización no soportada por el navegador.");
    }
  }, [map, onLocationSelect]);

  if (!isLoaded) return <p>Cargando mapa...</p>;

  return (
    <Box sx={{ mb: 2, position: "relative" }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Button
        variant="contained"
        color="primary"
        startIcon={<MdMyLocation />}
        onClick={handleGetCurrentLocation}
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          textTransform: "none",
        }}
      >
        Usar mi ubicación actual
      </Button>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={position}
        zoom={15}
        onClick={onMapClick}
        onLoad={(mapInstance) => setMap(mapInstance)}
      >
        <Marker
          position={position}
          draggable={true}
          onDragEnd={(e) => {
            const lat = e.latLng?.lat() || position.lat;
            const lng = e.latLng?.lng() || position.lng;
            setPosition({ lat, lng });
            onLocationSelect(lat, lng);
            console.log("Coordenadas al arrastrar marcador:", { lat, lng }); // Log para depuración
          }}
        />
      </GoogleMap>
    </Box>
  );
};