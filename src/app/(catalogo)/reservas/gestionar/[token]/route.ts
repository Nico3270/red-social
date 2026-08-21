import { ReservationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  getReservationCapabilityTokenHash,
  isReservationCapabilityActive,
} from "@/reservas/lib/reservation-capability";
import {
  createReservationManagementSession,
  getReservationManagementCookieClearOptions,
  getReservationManagementCookieName,
  getReservationManagementCookieOptions,
} from "@/reservas/lib/reservation-management-session";

const CLEAN_MANAGEMENT_PATH = "/reservas/gestionar";
const REDIRECT_STATUS = 303;
const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;
const MANAGEABLE_RESERVATION_STATUSES = new Set<ReservationStatus>([
  ReservationStatus.PENDIENTE,
  ReservationStatus.CONFIRMADA,
]);

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function createCleanRedirect(request: Request): NextResponse {
  const response = NextResponse.redirect(
    new URL(CLEAN_MANAGEMENT_PATH, request.url),
    REDIRECT_STATUS,
  );

  for (const [name, value] of Object.entries(RESPONSE_HEADERS)) {
    response.headers.set(name, value);
  }

  return response;
}

function clearManagementCookie(response: NextResponse): void {
  response.cookies.set(
    getReservationManagementCookieName(),
    "",
    getReservationManagementCookieClearOptions(),
  );
}

export async function HEAD(request: Request): Promise<NextResponse> {
  return createCleanRedirect(request);
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const response = createCleanRedirect(request);

  try {
    const { token } = await context.params;
    const tokenHash = getReservationCapabilityTokenHash(token);

    if (tokenHash === null) {
      clearManagementCookie(response);
      return response;
    }

    const now = new Date();
    const capability = await prisma.reservationCapability.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        reservation: {
          select: {
            estado: true,
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
      !MANAGEABLE_RESERVATION_STATUSES.has(capability.reservation.estado)
    ) {
      clearManagementCookie(response);
      return response;
    }

    const managementSession = createReservationManagementSession(
      {
        capabilityId: capability.id,
        capabilityExpiresAt: capability.expiresAt,
      },
      now,
    );

    response.cookies.set(
      getReservationManagementCookieName(),
      managementSession.value,
      getReservationManagementCookieOptions(managementSession.expiresAt),
    );

    return response;
  } catch {
    clearManagementCookie(response);
    return response;
  }
}
