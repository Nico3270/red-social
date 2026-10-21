"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  format,
  addDays,
  subDays,
  parse,
  startOfDay,
  addMinutes,
  isBefore,
  isSameDay,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt
} from "react-icons/fa";

import AddReservationModal from "./AddReservationModal";
import type { BusinessAvailabilityData } from "../actions/getCongifUserReservation";

interface ReservasUserDashboardProps {
  config: BusinessAvailabilityData;
  publicSlug?: string;
}

export type OccupancySlot = {
  start: string;
  end?: string;
  count: number;
  blocked: boolean;
};

export type PublicReservationSlot = {
  label: string;
  start: Date;
  end: Date;
  available: boolean;
};

type AvailabilityRange = {
  start: Date;
  end: Date;
};

type LegacyReservationStatus =
  | "PENDIENTE"
  | "CONFIRMADA"
  | "CANCELADA"
  | "COMPLETADA"
  | "BLOQUEADA";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDateTimeString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !Number.isNaN(new Date(value).getTime())
  );
}

function isLegacyReservationStatus(
  value: unknown
): value is LegacyReservationStatus {
  return (
    value === "PENDIENTE" ||
    value === "CONFIRMADA" ||
    value === "CANCELADA" ||
    value === "COMPLETADA" ||
    value === "BLOQUEADA"
  );
}

function normalizeFutureOccupancy(value: unknown): OccupancySlot[] | null {
  if (!Array.isArray(value)) return null;

  const normalized: OccupancySlot[] = [];

  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !isDateTimeString(candidate.start) ||
      !Number.isSafeInteger(candidate.count) ||
      (candidate.count as number) < 0 ||
      typeof candidate.blocked !== "boolean"
    ) {
      return null;
    }

    let end: string | undefined;
    if (candidate.end !== undefined && candidate.end !== null) {
      if (!isDateTimeString(candidate.end)) return null;
      end = candidate.end;
    }

    normalized.push({
      start: candidate.start,
      ...(end ? { end } : {}),
      count: candidate.count as number,
      blocked: candidate.blocked,
    });
  }

  return normalized;
}

function normalizeLegacyReservations(value: unknown): OccupancySlot[] | null {
  if (!Array.isArray(value)) return null;

  const occupancyByRange = new Map<string, OccupancySlot>();

  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !isDateTimeString(candidate.fechaHoraInicio) ||
      !isLegacyReservationStatus(candidate.estado)
    ) {
      return null;
    }

    let end: string | undefined;
    if (candidate.fechaHoraFin !== undefined && candidate.fechaHoraFin !== null) {
      if (!isDateTimeString(candidate.fechaHoraFin)) return null;
      end = candidate.fechaHoraFin;
    }

    const start = candidate.fechaHoraInicio;
    const key = `${start}\u0000${end ?? ""}`;
    const current = occupancyByRange.get(key) ?? {
      start,
      ...(end ? { end } : {}),
      count: 0,
      blocked: false,
    };

    if (candidate.estado === "BLOQUEADA") {
      current.blocked = true;
    } else {
      // Compatibilidad temporal: conserva el conteo legacy para todos los
      // estados distintos de BLOQUEADA hasta que la API entregue el agregado.
      current.count += 1;
    }

    occupancyByRange.set(key, current);
  }

  return Array.from(occupancyByRange.values());
}

function normalizeOccupancyResponse(
  payload: unknown,
  expectedDate: string
): OccupancySlot[] | null {
  if (!isRecord(payload) || payload.ok !== true) return null;

  if ("occupancy" in payload) {
    if (payload.date !== expectedDate) return null;
    return normalizeFutureOccupancy(payload.occupancy);
  }

  if ("reservas" in payload) {
    return normalizeLegacyReservations(payload.reservas);
  }

  return null;
}

function parseConfiguredTime(value: string, baseDate: Date): Date | null {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;

  const parsed = parse(value, "HH:mm", baseDate);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function configuredRanges(
  config: BusinessAvailabilityData,
  baseDate: Date,
): AvailabilityRange[] | null {
  const rawRanges = [
    [config.franjaMananaInicio, config.franjaMananaFin],
    [config.franjaTardeInicio, config.franjaTardeFin],
  ] as const;
  const ranges: AvailabilityRange[] = [];

  for (const [rawStart, rawEnd] of rawRanges) {
    if (rawStart == null && rawEnd == null) continue;
    if (rawStart == null || rawEnd == null) return null;

    const start = parseConfiguredTime(rawStart, baseDate);
    const end = parseConfiguredTime(rawEnd, baseDate);
    if (!start || !end || start >= end) return null;

    ranges.push({ start, end });
  }

  return ranges.length > 0 ? ranges : null;
}

function occupancyRange(
  item: OccupancySlot,
  intervalMinutes: number,
): { start: Date; end: Date } | null {
  const start = new Date(item.start);
  const end = item.end
    ? new Date(item.end)
    : addMinutes(start, intervalMinutes);

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start
  ) {
    return null;
  }

  return { start, end };
}

function intervalsOverlap(
  leftStart: Date,
  leftEnd: Date,
  rightStart: Date,
  rightEnd: Date,
): boolean {
  return leftStart < rightEnd && leftEnd > rightStart;
}

function isCandidateAvailable(
  start: Date,
  minimumIntervals: number,
  intervalMinutes: number,
  capacity: number,
  occupancy: OccupancySlot[],
): boolean {
  const normalizedOccupancy = occupancy.map((item) => ({
    item,
    range: occupancyRange(item, intervalMinutes),
  }));

  if (normalizedOccupancy.some(({ range }) => range === null)) return false;

  for (let index = 0; index < minimumIntervals; index += 1) {
    const intervalStart = addMinutes(start, index * intervalMinutes);
    const intervalEnd = addMinutes(intervalStart, intervalMinutes);
    let occupiedCount = 0;
    let blocked = false;

    for (const { item, range } of normalizedOccupancy) {
      if (
        range &&
        intervalsOverlap(range.start, range.end, intervalStart, intervalEnd)
      ) {
        occupiedCount += item.count;
        blocked = blocked || item.blocked;
      }
    }

    if (blocked || occupiedCount >= capacity) return false;
  }

  return true;
}

export function buildPublicReservationSlots(
  config: BusinessAvailabilityData,
  baseDate: Date,
  occupancy: OccupancySlot[],
): PublicReservationSlot[] {
  const minimumIntervals = config.duracionMinimaIntervalos ?? 1;
  if (
    !Number.isSafeInteger(config.intervaloMinutos) ||
    config.intervaloMinutos <= 0 ||
    !Number.isSafeInteger(config.capacidadPorIntervalo) ||
    config.capacidadPorIntervalo <= 0 ||
    !Number.isSafeInteger(minimumIntervals) ||
    minimumIntervals <= 0
  ) {
    return [];
  }

  const minimumDurationMinutes = config.intervaloMinutos * minimumIntervals;
  const minimumDurationMilliseconds = minimumDurationMinutes * 60_000;
  if (
    !Number.isSafeInteger(minimumDurationMinutes) ||
    minimumDurationMinutes <= 0 ||
    !Number.isSafeInteger(minimumDurationMilliseconds)
  ) {
    return [];
  }

  const ranges = configuredRanges(config, baseDate);
  if (!ranges) return [];

  const slots: PublicReservationSlot[] = [];
  for (const range of ranges) {
    for (
      let candidateStart = range.start;
      candidateStart < range.end;
      candidateStart = addMinutes(candidateStart, config.intervaloMinutos)
    ) {
      const requestedEnd = addMinutes(candidateStart, minimumDurationMinutes);
      if (requestedEnd > range.end) continue;

      slots.push({
        label: format(candidateStart, "HH:mm"),
        start: candidateStart,
        end: requestedEnd,
        available: isCandidateAvailable(
          candidateStart,
          minimumIntervals,
          config.intervaloMinutos,
          config.capacidadPorIntervalo,
          occupancy,
        ),
      });
    }
  }

  return slots;
}

const ReservasUserDashboard = ({ config, publicSlug }: ReservasUserDashboardProps) => {
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [occupancy, setOccupancy] = useState<OccupancySlot[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<PublicReservationSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

  const slots = useMemo(
    () => buildPublicReservationSlots(config, currentDate, occupancy),
    [config, currentDate, occupancy],
  );

  const fetchOccupancy = useCallback(async () => {
    setLoading(true);
    const dateStr = format(currentDate, "yyyy-MM-dd");

    try {
      const response = await fetch(
        `/api/reservasConfigUser?date=${dateStr}&negocioId=${config.negocioId}`
      );
      const payload: unknown = await response.json();
      const normalized = response.ok
        ? normalizeOccupancyResponse(payload, dateStr)
        : null;

      if (!normalized) {
        setOccupancy([]);
        setErrorMessage("No pudimos cargar la disponibilidad.");
        return;
      }

      setOccupancy(normalized);
      setErrorMessage(null);
    } catch {
      setOccupancy([]);
      setErrorMessage("No pudimos cargar la disponibilidad.");
    } finally {
      setLoading(false);
    }
  }, [currentDate, config.negocioId]);

  useEffect(() => {
    if (isBefore(currentDate, today)) {
      setOccupancy([]);
      setLoading(false);
      setErrorMessage("No hay reservas disponibles para períodos pasados.");
      return;
    }

    setErrorMessage(null);

    const dayName = format(currentDate, "EEEE", { locale: es });
    const capitalizedDay =
      dayName.charAt(0).toUpperCase() + dayName.slice(1);

    const isAttendingDay = config.diasAtencion.includes(capitalizedDay);

    if (isAttendingDay) fetchOccupancy();
    else {
      setOccupancy([]);
      setLoading(false);
    }
  }, [currentDate, config, fetchOccupancy, today]);

  const prevDay = () => {
    const newDate = subDays(currentDate, 1);
    if (!isBefore(newDate, today)) setCurrentDate(newDate);
  };

  const nextDay = () => setCurrentDate(addDays(currentDate, 1));

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = startOfDay(
      parse(e.target.value, "yyyy-MM-dd", new Date())
    );
    if (!isNaN(newDate.getTime())) {
      if (isBefore(newDate, today)) {
        setErrorMessage("No se pueden seleccionar fechas pasadas.");
        return;
      }
      setCurrentDate(newDate);
    }
  };

  const openAddModal = (slot: PublicReservationSlot) => {
    if (!slot.available) return;

    setSelectedSlot(slot);
    setShowModal(true);
  };

  const dayName = format(currentDate, "EEEE", { locale: es });
  const capitalizedDay =
    dayName.charAt(0).toUpperCase() + dayName.slice(1);

  const isAttendingDay = config.diasAtencion.includes(capitalizedDay);

  const filteredSlots = useMemo(() => {
    if (!isSameDay(currentDate, new Date())) return slots;
    const now = new Date();
    return slots.filter((slot) => slot.start > now);
  }, [slots, currentDate]);

  return (
    <div className="p-6 max-w-6xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200">
      
      {/* NAV DE FECHAS */}
      <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
        
        {!isBefore(currentDate, today) &&
          !isBefore(subDays(currentDate, 1), today) && (
            <button className="p-2 text-blue-600 hover:text-blue-800 transition flex items-center gap-2"
              onClick={prevDay}>
              <FaArrowLeft /> Día anterior
            </button>
          )}

        <div className="flex-grow text-center">
          <input
            type="date"
            value={format(currentDate, "yyyy-MM-dd")}
            onChange={handleDateChange}
            min={format(today, "yyyy-MM-dd")}
            className="p-3 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 bg-gray-50"
          />
          <p className="text-sm text-gray-500 mt-2">
            {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>

        <button
          className="p-2 text-blue-600 hover:text-blue-800 transition flex items-center gap-2"
          onClick={nextDay}
        >
          Día siguiente <FaArrowRight />
        </button>
      </div>

      {/* MENSAJES */}
      {errorMessage ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl shadow-inner border border-gray-100">
          <FaCalendarAlt className="text-5xl text-gray-400 mb-4 mx-auto" />
          <h2 className="text-2xl font-semibold text-gray-800">Lo sentimos</h2>
          <p className="text-gray-600 mt-2">{errorMessage}</p>
        </div>
      ) : !isAttendingDay ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl shadow-inner border">
          <FaCalendarAlt className="text-5xl text-gray-400 mb-4 mx-auto" />
          <h2 className="text-2xl font-semibold text-gray-800">Lo sentimos</h2>
          <p className="text-gray-600 mt-2">En este día no se presta atención.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-10 text-gray-500">Cargando...</div>
      ) : (
        <>
          <p className="text-center text-lg font-medium text-gray-700 mb-6 bg-gray-100 p-4 rounded-xl shadow-sm">
            Selecciona un horario disponible.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredSlots.map((slot) => {
              const isAvailable = slot.available;

              const classesAvailable = `
                bg-white border border-gray-200 rounded-xl 
                shadow-[0px_3px_8px_rgba(0,0,0,0.15)]
                transition-all duration-300 
                hover:shadow-xl hover:-translate-y-1 
                cursor-pointer select-none
              `;

              const classesDisabled = `
                bg-gray-200/80 backdrop-blur-sm 
                border border-gray-300 
                rounded-xl shadow-inner 
                cursor-not-allowed opacity-70
              `;

              return (
                <div
                  key={`${slot.start.toISOString()}-${slot.end.toISOString()}`}
                  onClick={() => isAvailable && openAddModal(slot)}
                  className={`p-5 text-center ${
                    isAvailable ? classesAvailable : classesDisabled
                  }`}
                >
                  <h3 className="text-xl font-semibold text-gray-800">{slot.label}</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    {isAvailable ? "Disponible" : "No disponible"}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showModal && selectedSlot && (
        <AddReservationModal
          negocioId={config.negocioId}
          publicSlug={publicSlug}
          horaInicio={selectedSlot.start.toISOString()}
          horaFin={selectedSlot.end.toISOString()}
          onClose={() => setShowModal(false)}
          onSuccess={fetchOccupancy}
        />
      )}
    </div>
  );
};

export default ReservasUserDashboard;
