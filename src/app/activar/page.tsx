import { auth } from "@/auth.config";
import {
  getAccountActivationCookieName,
  readAccountActivationSession,
} from "@/lib/auth/account-activation-session";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Activa tu cuenta | Myckeo",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

type ActivationPageState =
  | "UNAVAILABLE"
  | "AUTH_SESSION_PRESENT"
  | "TEMPORARY_ERROR"
  | "READY";

type ActivationPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  actionHref: "/auth/login" | "/dashboard";
  actionLabel: string;
  icon: string;
  iconClassName: string;
};

const STATE_CONTENT = {
  UNAVAILABLE: {
    eyebrow: "Activación de cuenta",
    title: "Activación no disponible",
    description: "Este enlace de activación no está disponible o expiró.",
    actionHref: "/auth/login",
    actionLabel: "Ir a iniciar sesión",
    icon: "!",
    iconClassName: "bg-slate-100 text-slate-600",
  },
  AUTH_SESSION_PRESENT: {
    eyebrow: "Antes de continuar",
    title: "Cierra tu sesión actual",
    description:
      "Ya tienes una sesión iniciada. Cierra sesión antes de activar esta cuenta.",
    actionHref: "/dashboard",
    actionLabel: "Volver al panel",
    icon: "i",
    iconClassName: "bg-amber-50 text-amber-700",
  },
  TEMPORARY_ERROR: {
    eyebrow: "Activación de cuenta",
    title: "Activación temporalmente no disponible",
    description: "No pudimos preparar la activación en este momento.",
    actionHref: "/auth/login",
    actionLabel: "Ir a iniciar sesión",
    icon: "!",
    iconClassName: "bg-slate-100 text-slate-600",
  },
  READY: {
    eyebrow: "Activación de cuenta",
    title: "Tu cuenta está lista para ser activada.",
    description:
      "En el siguiente paso podrás completar tus datos y establecer tus credenciales de acceso.",
    actionHref: "/auth/login",
    actionLabel: "Ya tengo una cuenta",
    icon: "✓",
    iconClassName: "bg-emerald-50 text-emerald-700",
  },
} as const satisfies Record<ActivationPageState, ActivationPageContent>;

async function getActivationPageState(): Promise<ActivationPageState> {
  let cookieValue: string | undefined;

  try {
    const cookieStore = await cookies();
    cookieValue = cookieStore.get(getAccountActivationCookieName())?.value;
  } catch {
    return "TEMPORARY_ERROR";
  }

  if (!cookieValue) {
    return "UNAVAILABLE";
  }

  let activationSession: ReturnType<typeof readAccountActivationSession>;

  try {
    activationSession = readAccountActivationSession(cookieValue);
  } catch {
    return "TEMPORARY_ERROR";
  }

  if (!activationSession?.valid) {
    return "UNAVAILABLE";
  }

  try {
    const existingSession = await auth();
    return existingSession ? "AUTH_SESSION_PRESENT" : "READY";
  } catch {
    return "TEMPORARY_ERROR";
  }
}

export default async function AccountActivationPage(): Promise<React.ReactElement> {
  const state = await getActivationPageState();
  const content = STATE_CONTENT[state];

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-12 sm:px-6"
      data-activation-state={state}
    >
      <div
        aria-hidden="true"
        className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-blue-200/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl"
      />

      <section
        aria-labelledby="activation-title"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-7 text-center shadow-xl shadow-slate-200/60 backdrop-blur sm:p-10"
      >
        <div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold tracking-wide text-blue-700">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-blue-600"
          />
          Myckeo
        </div>

        <div
          aria-hidden="true"
          className={`mx-auto mt-7 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold ${content.iconClassName}`}
        >
          {content.icon}
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          {content.eyebrow}
        </p>
        <h1
          id="activation-title"
          className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          {content.title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
          {content.description}
        </p>

        {state === "READY" ? (
          <p className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-800">
            El formulario seguro de activación estará disponible aquí en el
            siguiente paso.
          </p>
        ) : null}

        <Link
          href={content.actionHref}
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          {content.actionLabel}
        </Link>
      </section>
    </main>
  );
}
