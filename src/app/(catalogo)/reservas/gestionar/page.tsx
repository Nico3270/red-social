import { ReservationStatus } from "@prisma/client";
import type { Metadata } from "next";
import { cookies } from "next/headers";

import prisma from "@/lib/prisma";
import ManagedReservationCancelForm from "@/reservas/componentes/ManagedReservationCancelForm";
import { isReservationCapabilityActive } from "@/reservas/lib/reservation-capability";
import {
  getReservationManagementCookieName,
  verifyReservationManagementSession,
} from "@/reservas/lib/reservation-management-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Gestionar reserva | Myckeo",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

type ManagedReservationSummary = {
  businessName: string;
  startsAt: Date;
  endsAt: Date | null;
  status: ReservationStatus;
};

async function getManagedReservationSummary(): Promise<ManagedReservationSummary | null> {
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(
      getReservationManagementCookieName(),
    )?.value;

    if (!cookieValue) {
      return null;
    }

    const now = new Date();
    const managementSession = verifyReservationManagementSession(
      cookieValue,
      now,
    );

    if (!managementSession) {
      return null;
    }

    const capability = await prisma.reservationCapability.findUnique({
      where: {
        id: managementSession.capabilityId,
      },
      select: {
        id: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        reservation: {
          select: {
            estado: true,
            fechaHoraInicio: true,
            fechaHoraFin: true,
            negocio: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
    });

    if (
      !capability ||
      !isReservationCapabilityActive(
        {
          expiresAt: capability.expiresAt,
          usedAt: capability.usedAt,
          revokedAt: capability.revokedAt,
        },
        now,
      ) ||
      (capability.reservation.estado !== ReservationStatus.PENDIENTE &&
        capability.reservation.estado !== ReservationStatus.CONFIRMADA)
    ) {
      return null;
    }

    return {
      businessName: capability.reservation.negocio.nombre,
      startsAt: capability.reservation.fechaHoraInicio,
      endsAt: capability.reservation.fechaHoraFin,
      status: capability.reservation.estado,
    };
  } catch {
    return null;
  }
}

function UnavailableManagement(): React.ReactElement {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-16 sm:px-6">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div
          aria-hidden="true"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600"
        >
          !
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          Gestión de reserva no disponible
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          No se puede acceder a la gestión de esta reserva.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Puedes volver a abrir el enlace recibido o contactar al negocio.
        </p>
      </section>
    </main>
  );
}

export default async function ReservationManagementPage(): Promise<React.ReactElement> {
  const reservation = await getManagedReservationSummary();

  if (!reservation) {
    return <UnavailableManagement />;
  }

  const statusLabel =
    reservation.status === ReservationStatus.PENDIENTE
      ? "Pendiente"
      : "Confirmada";

  return (
    <main className="min-h-[70vh] bg-slate-50 px-4 py-12 sm:px-6 sm:py-16">
      <section className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
            Gestión de reserva
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {reservation.businessName}
          </h1>
        </header>

        <dl className="grid gap-5 px-6 py-6 sm:grid-cols-2 sm:px-8">
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-slate-500">Fecha</dt>
            <dd className="mt-1 capitalize text-slate-900">
              {dateFormatter.format(reservation.startsAt)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Hora</dt>
            <dd className="mt-1 text-slate-900">
              {timeFormatter.format(reservation.startsAt)}
            </dd>
          </div>
          {reservation.endsAt ? (
            <div>
              <dt className="text-sm font-medium text-slate-500">Finaliza</dt>
              <dd className="mt-1 text-slate-900">
                {timeFormatter.format(reservation.endsAt)}
              </dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-slate-500">Estado</dt>
            <dd className="mt-2">
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                {statusLabel}
              </span>
            </dd>
          </div>
        </dl>

        <footer className="border-t border-slate-100 bg-slate-50 px-6 py-5 sm:px-8">
          <p className="text-sm leading-6 text-slate-600">
            Puedes cancelar esta reserva desde aquí.
          </p>
          <div className="mt-4">
            <ManagedReservationCancelForm />
          </div>
        </footer>
      </section>
    </main>
  );
}
