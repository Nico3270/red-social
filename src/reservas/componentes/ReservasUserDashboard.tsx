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

import { ReservationsResponse, ReservationDayData } from "@/app/api/reservasConfig/route";
import AddReservationModal from "./AddReservationModal";
import { BusinessAvailabilityData } from "../actions/getCongifUserReservation";

interface ReservasUserDashboardProps {
  config: BusinessAvailabilityData;
}

const ReservasUserDashboard = ({ config }: ReservasUserDashboardProps) => {
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [reservas, setReservas] = useState<ReservationDayData[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => {
    const generateSlots = () => {
      const newSlots: string[] = [];
      const intervalo = config.intervaloMinutos;

      const addSlotsInRange = (inicio?: string | null, fin?: string | null) => {
        if (!inicio || !fin) return;
        let current = parse(inicio, "HH:mm", new Date());
        const end = parse(fin, "HH:mm", new Date());

        while (current < end) {
          newSlots.push(format(current, "HH:mm"));
          current = addMinutes(current, intervalo);
        }
      };

      addSlotsInRange(config.franjaMananaInicio, config.franjaMananaFin);
      addSlotsInRange(config.franjaTardeInicio, config.franjaTardeFin);
      setSlots(newSlots);
    };
    generateSlots();
  }, [config]);

  const fetchReservas = useCallback(async () => {
    setLoading(true);
    const dateStr = format(currentDate, "yyyy-MM-dd");

    const res = await fetch(
      `/api/reservasConfigUser?date=${dateStr}&negocioId=${config.negocioId}`
    );
    const data: ReservationsResponse = await res.json();
    setLoading(false);

    if (data.ok) setReservas(data.reservas);
    else setReservas([]);
  }, [currentDate, config.negocioId]);

  useEffect(() => {
    if (isBefore(currentDate, today)) {
      setReservas([]);
      setLoading(false);
      setErrorMessage("No hay reservas disponibles para períodos pasados.");
      return;
    }

    setErrorMessage(null);

    const dayName = format(currentDate, "EEEE", { locale: es });
    const capitalizedDay =
      dayName.charAt(0).toUpperCase() + dayName.slice(1);

    const isAttendingDay = config.diasAtencion.includes(capitalizedDay);

    if (isAttendingDay) fetchReservas();
    else {
      setReservas([]);
      setLoading(false);
    }
  }, [currentDate, config, fetchReservas, today]);

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

  const getReservasForSlot = (slotTime: string) => {
    const slotStart = parse(slotTime, "HH:mm", currentDate);
    const slotEnd = addMinutes(slotStart, config.intervaloMinutos);

    return reservas.filter((res) => {
      const resStart = new Date(res.fechaHoraInicio);
      return resStart >= slotStart && resStart < slotEnd;
    });
  };

  const openAddModal = (slot: string) => {
    const slotReservas = getReservasForSlot(slot);
    const maxCapacidad = config.capacidadPorIntervalo;
    const isBlocked = slotReservas.some((res) => res.estado === "BLOQUEADA");
    const nonBlocked = slotReservas.filter((r) => r.estado !== "BLOQUEADA");
    const isFull = nonBlocked.length >= maxCapacidad;

    if (isBlocked || isFull) return;

    setSelectedSlot(slot);
    setShowModal(true);
  };

  const getSlotTimes = (slot: string) => {
    const startDate = parse(slot, "HH:mm", currentDate);
    const endDate = addMinutes(startDate, config.intervaloMinutos);

    return {
      horaInicio: startDate.toISOString(),
      horaFin: endDate.toISOString(),
    };
  };

  const dayName = format(currentDate, "EEEE", { locale: es });
  const capitalizedDay =
    dayName.charAt(0).toUpperCase() + dayName.slice(1);

  const isAttendingDay = config.diasAtencion.includes(capitalizedDay);

  const filteredSlots = useMemo(() => {
    if (!isSameDay(currentDate, new Date())) return slots;
    const now = new Date();
    return slots.filter((slot) => {
      const slotDate = parse(slot, "HH:mm", currentDate);
      return slotDate > now;
    });
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
              const slotReservas = getReservasForSlot(slot);
              const isBlocked = slotReservas.some((r) => r.estado === "BLOQUEADA");
              const nonBlocked = slotReservas.filter((r) => r.estado !== "BLOQUEADA");
              const isFull = nonBlocked.length >= config.capacidadPorIntervalo;

              const isAvailable = !isBlocked && !isFull;

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
                  key={slot}
                  onClick={() => isAvailable && openAddModal(slot)}
                  className={`p-5 text-center ${
                    isAvailable ? classesAvailable : classesDisabled
                  }`}
                >
                  <h3 className="text-xl font-semibold text-gray-800">{slot}</h3>
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
          horaInicio={getSlotTimes(selectedSlot).horaInicio}
          horaFin={getSlotTimes(selectedSlot).horaFin}
          onClose={() => setShowModal(false)}
          onSuccess={fetchReservas}
        />
      )}
    </div>
  );
};

export default ReservasUserDashboard;
