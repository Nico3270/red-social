// src/hooks/useUserLocation.ts
'use client';

import { useEffect, useState } from 'react';
import { usePreferencesStore } from '@/store/preferences/preferences-store';
import colombiaData from '@/config/colombia.json'; // ← IMPORTADO

// Normaliza strings: quita acentos, mayúsculas, espacios
const normalize = (str: string) =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// Busca ciudad en colombia.json y devuelve nombre exacto
const findExactCity = (rawCity: string, rawDept: string): { ciudad: string; departamento: string } | null => {
  const normalizedCity = normalize(rawCity);
  const normalizedDept = normalize(rawDept);

  for (const dept of colombiaData) {
    const deptMatch = normalize(dept.departamento) === normalizedDept;
    if (deptMatch) {
      const exactCity = dept.ciudades.find((c) => normalize(c) === normalizedCity);
      if (exactCity) {
        return { ciudad: exactCity, departamento: dept.departamento };
      }
    }
  }

  // Si no encuentra, busca solo por ciudad (fallback amplio)
  for (const dept of colombiaData) {
    const exactCity = dept.ciudades.find((c) => normalize(c) === normalizedCity);
    if (exactCity) {
      return { ciudad: exactCity, departamento: dept.departamento };
    }
  }

  return null;
};

export const useUserLocation = () => {
  const { ciudad, departamento, setUbicacion, setGeo } = usePreferencesStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (ciudad && departamento) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const detectLocation = async () => {
      try {
        // 1. GPS
        const gpsPosition = await new Promise<GeolocationPosition | null>((resolve) => {
          if (!navigator.geolocation) {
            resolve(null);
            return;
          }
          const timeoutId = setTimeout(() => resolve(null), 8000);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(timeoutId);
              resolve(pos);
            },
            () => {
              clearTimeout(timeoutId);
              resolve(null);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 600000 }
          );
        });

        if (gpsPosition && isMounted) {
          const { latitude, longitude } = gpsPosition.coords;
          const raw = await reverseGeocode(latitude, longitude);
          if (raw && isMounted) {
            const exact = findExactCity(raw.ciudad, raw.departamento) || raw;
            setUbicacion(exact.ciudad, exact.departamento);
            setGeo(latitude, longitude);
            setIsLoading(false);
            return;
          }
        }

        // 2. IP
        const ipLoc = await getLocationByIP();
        if (ipLoc && isMounted) {
          const exact = findExactCity(ipLoc.ciudad, ipLoc.departamento) || ipLoc;
          setUbicacion(exact.ciudad, exact.departamento);
          setGeo(ipLoc.lat, ipLoc.lon);
          setIsLoading(false);
          return;
        }

        // 3. Bogotá
        if (isMounted) {
          setUbicacion('Bogotá', 'Bogotá D.C.');
          setGeo(4.60971, -74.08175);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Error en useUserLocation:', err);
        if (isMounted) {
          setUbicacion('Bogotá', 'Bogotá D.C.');
          setGeo(4.60971, -74.08175);
          setIsLoading(false);
        }
      }
    };

    detectLocation();

    return () => {
      isMounted = false;
    };
  }, [ciudad, departamento, setUbicacion, setGeo]);

  return { isLoading };
};

// --- reverseGeocode y getLocationByIP (sin cambios, solo normalización arriba) ---
const reverseGeocode = async (lat: number, lon: number) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=es`,
      { headers: { 'User-Agent': 'MyckeoApp/1.0 (+https://myckeo.com)' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const address = data.address;
    if (!address) return null;
    return {
      ciudad: address.city || address.town || address.village || address.hamlet || address.suburb || '',
      departamento: address.state || '',
    };
  } catch {
    return null;
  }
};

const getLocationByIP = async () => {
  try {
    const res = await fetch('https://freegeoip.app/json/');
    if (!res.ok) return null;
    const data = await res.json();
    return {
      ciudad: data.city || 'Bogotá',
      departamento: data.region_name || 'Bogotá D.C.',
      lat: data.latitude || 4.60971,
      lon: data.longitude || -74.08175,
    };
  } catch {
    return null;
  }
};