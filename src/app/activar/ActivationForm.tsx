"use client";

import {
  activateAccount,
  type ActivateAccountResult,
} from "@/actions/auth/activateAccount";
import colombia from "@/config/colombia.json";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  IoCheckmarkOutline,
  IoChevronDownOutline,
  IoEyeOffOutline,
  IoEyeOutline,
} from "react-icons/io5";

type ActivationFormProps = {
  csrfNonce: string;
};

type ColombiaDepartment = {
  id: number;
  departamento: string;
  ciudades: string[];
};

const departments: ColombiaDepartment[] = colombia;

const passwordRequirements = [
  { label: "Mínimo 8 caracteres", test: (value: string) => value.length >= 8 },
  { label: "Al menos una letra mayúscula", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Al menos una letra minúscula", test: (value: string) => /[a-z]/.test(value) },
  { label: "Al menos un número", test: (value: string) => /[0-9]/.test(value) },
];

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
const passwordToggleClassName =
  "absolute bottom-0.5 right-0.5 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const MAX_THROTTLE_SECONDS = 3600;

function normalizeRetryAfterSeconds(value: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 1;
  return Math.min(MAX_THROTTLE_SECONDS, Math.max(1, Math.ceil(value)));
}

function formatWait(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) return `${seconds} s`;
  return remainingSeconds === 0
    ? `${minutes} min`
    : `${minutes} min ${remainingSeconds} s`;
}

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
  const [throttleSecondsRemaining, setThrottleSecondsRemaining] = useState(0);
  const throttleSecondsRef = useRef(0);
  const [selectedDepartamento, setSelectedDepartamento] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const cities = departments.find(
    (department) => department.departamento === selectedDepartamento,
  )?.ciudades ?? [];
  const ciudadCompleta = selectedDepartamento && selectedCity && cities.includes(selectedCity)
    ? `${selectedCity} - ${selectedDepartamento}`
    : "";
  const passwordsMatch = password === confirmPassword;

  useEffect(() => {
    if (throttleSecondsRemaining === 0) return;

    const timeout = setTimeout(() => {
      setThrottleSecondsRemaining((seconds) => {
        const next = Math.max(0, seconds - 1);
        throttleSecondsRef.current = next;
        return next;
      });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [throttleSecondsRemaining]);

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
    if (
      submittingRef.current ||
      terminal ||
      throttleSecondsRemaining > 0 ||
      throttleSecondsRef.current > 0 ||
      !ciudadCompleta
    ) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    submittingRef.current = true;
    setIsPending(true);
    setResult(null);

    try {
      // El éxito navega desde el Server Action y no devuelve un resultado.
      const actionResult = await activateAccount(formData);
      if (actionResult.code === "ACTIVATION_THROTTLED") {
        const seconds = normalizeRetryAfterSeconds(actionResult.retryAfterSeconds);
        throttleSecondsRef.current = seconds;
        setThrottleSecondsRemaining(seconds);
      }
      setResult(actionResult);
    } catch {
      setResult({ ok: false, code: "INTERNAL_ERROR" });
    } finally {
      if (passwordRef.current) passwordRef.current.value = "";
      if (confirmPasswordRef.current) confirmPasswordRef.current.value = "";
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
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
  const waiting = throttleSecondsRemaining > 0;
  const waitText = waiting ? formatWait(throttleSecondsRemaining) : null;

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
          <div className="min-w-0 sm:col-span-2">
            <input type="hidden" name="ciudadCompleta" value={ciudadCompleta} />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="activation-departamento" className="block text-sm font-medium text-slate-700">
                  Departamento
                </label>
                <div className="relative">
                  <select
                    id="activation-departamento"
                    autoComplete="address-level1"
                    value={selectedDepartamento}
                    onChange={(event) => {
                      setSelectedDepartamento(event.target.value);
                      setSelectedCity("");
                    }}
                    required
                    aria-invalid={!!fieldError("ciudadCompleta")}
                    aria-describedby={errorDescription("ciudadCompleta")}
                    className={`${inputClassName} appearance-none pr-10`}
                  >
                    <option value="" disabled>Selecciona un departamento</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.departamento}>
                        {department.departamento}
                      </option>
                    ))}
                  </select>
                  <IoChevronDownOutline aria-hidden="true" className="pointer-events-none absolute bottom-3.5 right-3.5 h-4 w-4 text-slate-500" />
                </div>
              </div>
              <div className="min-w-0">
                <label htmlFor="activation-ciudadCompleta" className="block text-sm font-medium text-slate-700">
                  Ciudad
                </label>
                <div className="relative">
                  <select
                    id="activation-ciudadCompleta"
                    autoComplete="address-level2"
                    value={selectedCity}
                    onChange={(event) => setSelectedCity(event.target.value)}
                    disabled={!selectedDepartamento}
                    required
                    aria-invalid={!!fieldError("ciudadCompleta")}
                    aria-describedby={errorDescription("ciudadCompleta")}
                    className={`${inputClassName} appearance-none pr-10`}
                  >
                    <option value="" disabled>
                      {selectedDepartamento ? "Selecciona una ciudad" : "Selecciona primero un departamento"}
                    </option>
                    {cities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <IoChevronDownOutline aria-hidden="true" className="pointer-events-none absolute bottom-3.5 right-3.5 h-4 w-4 text-slate-500" />
                </div>
              </div>
            </div>
            {fieldError("ciudadCompleta") ? (
              <p id="activation-ciudadCompleta-error" role="alert" className="mt-1.5 text-sm text-rose-700">
                {fieldError("ciudadCompleta")}
              </p>
            ) : null}
          </div>
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
          <Field name="password" label="Nueva contraseña" error={fieldError("password")}>
            <div className="relative">
              <input ref={passwordRef} id="activation-password" name="password"
                type={showPassword ? "text" : "password"}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password" minLength={8} required
                aria-invalid={!!fieldError("password")}
                aria-describedby={errorDescription("password", true)} className={`${inputClassName} pr-12`} />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-controls="activation-password"
                className={passwordToggleClassName}
              >
                {showPassword ? <IoEyeOffOutline aria-hidden="true" size={20} /> : <IoEyeOutline aria-hidden="true" size={20} />}
              </button>
            </div>
            <div id="activation-password-help" className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <ul aria-label="Requisitos de la contraseña" className="space-y-1.5 text-xs leading-5">
                {passwordRequirements.map(({ label, test }) => {
                  const met = test(password);
                  return (
                    <li key={label} className={`flex items-start gap-2 ${met ? "text-emerald-700" : "text-slate-500"}`}>
                      <span aria-hidden="true" className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${met ? "border-emerald-200 bg-emerald-100" : "border-slate-300 bg-white"}`}>
                        {met ? <IoCheckmarkOutline size={12} /> : null}
                      </span>
                      <span><span className="sr-only">{met ? "Cumplido: " : "Pendiente: "}</span>{label}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 border-t border-slate-200 pt-2 text-xs leading-5 text-slate-500">
                Usa letras A–Z, a–z, números o @$!%*?&amp;. Máximo 72 caracteres; los símbolos son opcionales.
              </p>
            </div>
          </Field>
          <Field name="confirmPassword" label="Confirma tu contraseña" error={fieldError("confirmPassword")}>
            <div className="relative">
              <input ref={confirmPasswordRef} id="activation-confirmPassword" name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password" minLength={8} required
                aria-invalid={!!fieldError("confirmPassword") || (!!confirmPassword && !passwordsMatch)}
                aria-describedby={[
                  errorDescription("confirmPassword"),
                  confirmPassword ? "activation-confirmPassword-match" : null,
                ].filter(Boolean).join(" ") || undefined}
                className={`${inputClassName} pr-12`} />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                aria-label={showConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"}
                aria-controls="activation-confirmPassword"
                className={passwordToggleClassName}
              >
                {showConfirmPassword ? <IoEyeOffOutline aria-hidden="true" size={20} /> : <IoEyeOutline aria-hidden="true" size={20} />}
              </button>
            </div>
            {confirmPassword ? (
              <p id="activation-confirmPassword-match" role="status" aria-live="polite"
                className={`mt-2 text-xs leading-5 ${passwordsMatch ? "text-emerald-700" : "text-rose-700"}`}>
                {passwordsMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
              </p>
            ) : null}
          </Field>
        </div>
      </fieldset>

      {alertMessage ? (
        <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
          {alertMessage}
        </p>
      ) : null}

      {waiting ? (
        <p role="status" aria-live="polite" className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
          Espera un momento antes de volver a intentarlo. Podrás continuar en {waitText}.
        </p>
      ) : null}

      <button type="submit" disabled={isPending || terminal || waiting || !ciudadCompleta}
        className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "Activando..." : waiting ? `Intenta de nuevo en ${waitText}` : "Activar mi cuenta"}
      </button>
    </form>
  );
}
