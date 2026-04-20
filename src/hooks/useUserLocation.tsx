// src/hooks/useUserLocation.ts
'use client';

import { useEffect, useState } from 'react';
import { usePreferencesStore } from '@/store/preferences/preferences-store';
import colombiaData from '@/config/colombia.json'; // ← IMPORTADO
import {
  reportOperationalError,
  reportOperationalWarning,
} from '@/lib/observability/operationalLogger';

const DEFAULT_LOCATION = {
  ciudad: 'Bogotá',
  departamento: 'Bogotá D.C.',
  lat: 4.60971,
  lon: -74.08175,
};

const LOCATION_LOOKUP_TIMEOUT_MS = 4000;
const LOCATION_WARNING_DEDUPE_WINDOW_MS = 5 * 60 * 1000;
const TRANSIENT_LOCATION_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'ENOTFOUND',
  'UND_ERR_CONNECT_TIMEOUT',
]);

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

const isAbortError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return 'name' in error && error.name === 'AbortError';
};

const getErrorMessage = (error: unknown): string | null => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return null;
};

const getNestedErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null;
  }

  if ('code' in error && typeof error.code === 'string') {
    return error.code;
  }

  if ('cause' in error && error.cause && typeof error.cause === 'object') {
    const cause = error.cause as { code?: unknown };
    if (typeof cause.code === 'string') {
      return cause.code;
    }
  }

  return null;
};

const isTransientLocationNetworkError = (error: unknown) => {
  if (isAbortError(error)) {
    return true;
  }

  const errorCode = getNestedErrorCode(error);
  if (errorCode && TRANSIENT_LOCATION_ERROR_CODES.has(errorCode)) {
    return true;
  }

  const message = getErrorMessage(error)?.toLowerCase() ?? '';
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('fetch failed') ||
    message.includes('load failed') ||
    message.includes('econnreset') ||
    message.includes('etimedout')
  );
};

const buildLocationWarningContext = (
  provider: 'nominatim' | 'freegeoip',
  extra: Record<string, unknown> = {},
  error?: unknown
) => ({
  provider,
  transient: Boolean(error ? isTransientLocationNetworkError(error) : false),
  errorCode: error ? getNestedErrorCode(error) : null,
  errorMessage: error ? getErrorMessage(error) : null,
  ...extra,
});

const fetchWithTimeout = async (input: string, init: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), LOCATION_LOOKUP_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
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

    const applyDefaultLocation = (reason: 'providers_unavailable' | 'unexpected_error') => {
      if (!isMounted) {
        return;
      }

      reportOperationalWarning({
        area: 'public-feed',
        event: 'location_fallback_applied',
        message: 'La detección de ubicación no resolvió un proveedor externo y se aplicó fallback seguro.',
        context: {
          reason,
          ciudad: DEFAULT_LOCATION.ciudad,
          departamento: DEFAULT_LOCATION.departamento,
        },
        dedupeKey: `location-fallback-applied:${reason}`,
        dedupeWindowMs: LOCATION_WARNING_DEDUPE_WINDOW_MS,
      });

      setUbicacion(DEFAULT_LOCATION.ciudad, DEFAULT_LOCATION.departamento);
      setGeo(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);
      setIsLoading(false);
    };

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

        applyDefaultLocation('providers_unavailable');
      } catch (err) {
        reportOperationalError({
          area: 'public-feed',
          event: 'location_detection_failed',
          message: 'La detección de ubicación falló de forma inesperada y se aplicó fallback seguro.',
          context: {
            ciudadActual: ciudad,
            departamentoActual: departamento,
          },
          error: err,
          dedupeKey: 'location-detection-failed',
        });

        applyDefaultLocation('unexpected_error');
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
    const res = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=es`,
      { headers: { 'User-Agent': 'MyckeoApp/1.0 (+https://myckeo.com)' } }
    );

    if (!res.ok) {
      reportOperationalWarning({
        area: 'public-feed',
        event: 'location_provider_unavailable',
        message: 'El proveedor externo de geocodificación respondió sin éxito.',
        context: buildLocationWarningContext('nominatim', {
          status: res.status,
        }),
        dedupeKey: `location-provider-unavailable:nominatim:${res.status}`,
        dedupeWindowMs: LOCATION_WARNING_DEDUPE_WINDOW_MS,
      });

      return null;
    }

    const data = await res.json();
    const address = data.address;
    if (!address) return null;
    return {
      ciudad: address.city || address.town || address.village || address.hamlet || address.suburb || '',
      departamento: address.state || '',
    };
  } catch (error) {
    const transientError = isTransientLocationNetworkError(error);

    reportOperationalWarning({
      area: 'public-feed',
      event: isAbortError(error)
        ? 'location_provider_timeout'
        : transientError
          ? 'location_provider_network_noise'
          : 'location_provider_failed',
      message: isAbortError(error)
        ? 'La geocodificación inversa excedió el tiempo esperado y se omitió.'
        : transientError
          ? 'La geocodificación inversa encontró un fallo transitorio de red y se continuará con un fallback seguro.'
          : 'La geocodificación inversa falló y se continuará con un fallback seguro.',
      context: buildLocationWarningContext(
        'nominatim',
        {
          lat: Number(lat.toFixed(3)),
          lon: Number(lon.toFixed(3)),
        },
        error
      ),
      error: transientError ? undefined : error,
      dedupeKey: `location-provider:${isAbortError(error) ? 'timeout' : transientError ? 'network-noise' : 'failed'}:nominatim`,
      dedupeWindowMs: LOCATION_WARNING_DEDUPE_WINDOW_MS,
    });

    return null;
  }
};

const getLocationByIP = async () => {
  try {
    const res = await fetchWithTimeout('https://freegeoip.app/json/');

    if (!res.ok) {
      reportOperationalWarning({
        area: 'public-feed',
        event: 'location_provider_unavailable',
        message: 'El proveedor externo de geolocalización por IP respondió sin éxito.',
        context: buildLocationWarningContext('freegeoip', {
          status: res.status,
        }),
        dedupeKey: `location-provider-unavailable:freegeoip:${res.status}`,
        dedupeWindowMs: LOCATION_WARNING_DEDUPE_WINDOW_MS,
      });

      return null;
    }

    const data = await res.json();
    return {
      ciudad: data.city || DEFAULT_LOCATION.ciudad,
      departamento: data.region_name || DEFAULT_LOCATION.departamento,
      lat: data.latitude || DEFAULT_LOCATION.lat,
      lon: data.longitude || DEFAULT_LOCATION.lon,
    };
  } catch (error) {
    const transientError = isTransientLocationNetworkError(error);

    reportOperationalWarning({
      area: 'public-feed',
      event: isAbortError(error)
        ? 'location_provider_timeout'
        : transientError
          ? 'location_provider_network_noise'
          : 'location_provider_failed',
      message: isAbortError(error)
        ? 'La geolocalización por IP excedió el tiempo esperado y se omitió.'
        : transientError
          ? 'La geolocalización por IP encontró un fallo transitorio de red y se continuará con un fallback seguro.'
          : 'La geolocalización por IP falló y se continuará con un fallback seguro.',
      context: buildLocationWarningContext('freegeoip', {}, error),
      error: transientError ? undefined : error,
      dedupeKey: `location-provider:${isAbortError(error) ? 'timeout' : transientError ? 'network-noise' : 'failed'}:freegeoip`,
      dedupeWindowMs: LOCATION_WARNING_DEDUPE_WINDOW_MS,
    });

    return null;
  }
};
