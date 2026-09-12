"use client";

import {
  activateAccount,
  type ActivateAccountResult,
} from "@/actions/auth/activateAccount";
import { useRef, useState, type FormEvent, type ReactNode } from "react";

type ActivationFormProps = {
  csrfNonce: string;
};

type FieldName =
  | "nombre"
  | "apellido"
  | "email"
  | "username"
  | "ciudadCompleta"
  | "genero"
  | "fechaNacimiento"
  | "password"
  | "confirmPassword";

const inputClassName =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

function Field({
  name,
  label,
  error,
  children,
  hint,
}: {
  name: FieldName;
  label: string;
  error: string | null;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={`activation-${name}`}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`activation-${name}-help`} className="mt-1.5 text-xs leading-5 text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`activation-${name}-error`}
          role="alert"
          className="mt-1.5 text-sm text-rose-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function ActivationForm({ csrfNonce }: ActivationFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<ActivateAccountResult | null>(null);
  const submittingRef = useRef(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const terminal =
    result?.code === "ACTIVATION_UNAVAILABLE" ||
    result?.code === "INVALID_CSRF" ||
    result?.code === "INVALID_ORIGIN";

  function fieldError(name: FieldName): string | null {
    if (result?.code === "VALIDATION_ERROR") {
      return result.fieldErrors[name]?.[0] ?? null;
    }
    if (name === "email" && result?.code === "EMAIL_UNAVAILABLE") {
      return "Este correo no está disponible. Usa otro.";
    }
    if (name === "username" && result?.code === "USERNAME_UNAVAILABLE") {
      return "Este nombre de usuario no está disponible.";
    }
    return null;
  }

  function errorDescription(name: FieldName, hasHint = false): string | undefined {
    const ids = [
      hasHint ? `activation-${name}-help` : null,
      fieldError(name) ? `activation-${name}-error` : null,
    ].filter(Boolean);
    return ids.length ? ids.join(" ") : undefined;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || terminal) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    submittingRef.current = true;
    setIsPending(true);
    setResult(null);

    try {
      // El éxito navega desde el Server Action y no devuelve un resultado.
      setResult(await activateAccount(formData));
    } catch {
      setResult({ ok: false, code: "INTERNAL_ERROR" });
    } finally {
      if (passwordRef.current) passwordRef.current.value = "";
      if (confirmPasswordRef.current) confirmPasswordRef.current.value = "";
      submittingRef.current = false;
      setIsPending(false);
    }
  }

  const alertMessage =
    result?.code === "ACTIVATION_UNAVAILABLE"
      ? "El enlace de activación ya no está disponible. Vuelve a abrir el enlace que recibiste o solicita uno nuevo."
      : result?.code === "INVALID_CSRF" || result?.code === "INVALID_ORIGIN"
        ? "No pudimos validar esta solicitud. Vuelve a abrir tu enlace de activación."
        : result?.code === "AUTH_SESSION_PRESENT"
          ? "Ya tienes una sesión iniciada. Cierra esa sesión antes de continuar."
          : result?.code === "INVALID_REQUEST"
            ? "El formulario contiene datos no válidos. Revisa la información e inténtalo nuevamente."
            : result?.code === "INTERNAL_ERROR"
              ? "No pudimos completar la activación en este momento. Inténtalo nuevamente."
              : null;

  return (
    <form onSubmit={handleSubmit} aria-busy={isPending} className="mt-8 text-left">
      <fieldset disabled={isPending || terminal} className="space-y-5">
        <input type="hidden" name="csrfNonce" value={csrfNonce} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="nombre" label="Nombre" error={fieldError("nombre")}>
            <input id="activation-nombre" name="nombre" type="text" autoComplete="given-name"
              minLength={2} maxLength={50} required aria-invalid={!!fieldError("nombre")}
              aria-describedby={errorDescription("nombre")} className={inputClassName} />
          </Field>
          <Field name="apellido" label="Apellido" error={fieldError("apellido")}>
            <input id="activation-apellido" name="apellido" type="text" autoComplete="family-name"
              minLength={2} maxLength={50} required aria-invalid={!!fieldError("apellido")}
              aria-describedby={errorDescription("apellido")} className={inputClassName} />
          </Field>
          <Field name="email" label="Correo electrónico" error={fieldError("email")}>
            <input id="activation-email" name="email" type="email" autoComplete="email"
              maxLength={254} required aria-invalid={!!fieldError("email")}
              aria-describedby={errorDescription("email")} className={inputClassName} />
          </Field>
          <Field name="username" label="Nombre de usuario" error={fieldError("username")}>
            <input id="activation-username" name="username" type="text" autoComplete="username"
              minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" required
              aria-invalid={!!fieldError("username")}
              aria-describedby={errorDescription("username")} className={inputClassName} />
          </Field>
          <Field name="ciudadCompleta" label="Ciudad y departamento" error={fieldError("ciudadCompleta")}>
            <input id="activation-ciudadCompleta" name="ciudadCompleta" type="text"
              placeholder="Tunja - Boyacá" maxLength={200} required
              aria-invalid={!!fieldError("ciudadCompleta")}
              aria-describedby={errorDescription("ciudadCompleta")} className={inputClassName} />
          </Field>
          <Field name="genero" label="Género" error={fieldError("genero")}>
            <select id="activation-genero" name="genero" defaultValue="" required
              aria-invalid={!!fieldError("genero")}
              aria-describedby={errorDescription("genero")} className={inputClassName}>
              <option value="" disabled>Selecciona una opción</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </Field>
          <Field name="fechaNacimiento" label="Fecha de nacimiento" error={fieldError("fechaNacimiento")}>
            <input id="activation-fechaNacimiento" name="fechaNacimiento" type="date" required
              aria-invalid={!!fieldError("fechaNacimiento")}
              aria-describedby={errorDescription("fechaNacimiento")} className={inputClassName} />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="password" label="Nueva contraseña" error={fieldError("password")}
            hint="Mínimo 8 caracteres, una mayúscula, una minúscula y un número.">
            <input ref={passwordRef} id="activation-password" name="password" type="password"
              autoComplete="new-password" minLength={8} required
              aria-invalid={!!fieldError("password")}
              aria-describedby={errorDescription("password", true)} className={inputClassName} />
          </Field>
          <Field name="confirmPassword" label="Confirma tu contraseña" error={fieldError("confirmPassword")}>
            <input ref={confirmPasswordRef} id="activation-confirmPassword" name="confirmPassword"
              type="password" autoComplete="new-password" minLength={8} required
              aria-invalid={!!fieldError("confirmPassword")}
              aria-describedby={errorDescription("confirmPassword")} className={inputClassName} />
          </Field>
        </div>
      </fieldset>

      {alertMessage ? (
        <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
          {alertMessage}
        </p>
      ) : null}

      <button type="submit" disabled={isPending || terminal}
        className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "Activando..." : "Activar mi cuenta"}
      </button>
    </form>
  );
}
