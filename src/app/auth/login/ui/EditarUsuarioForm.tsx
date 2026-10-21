"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import colombia from "@/config/colombia.json";
import { CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Genero } from "@prisma/client";
import {
  UpdateUserInput,
  updateUserSchema,
} from "@/lib/validators/updateUserSchema";
import { updateUserProfile } from "@/helpers/usuario/updateUserProfile";
import { z } from "zod";

interface ColombiaDepartment {
  id: number;
  departamento: string;
  ciudades: string[];
}

interface UsuarioParaEditar {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  ciudad: string;
  departamento: string;
  genero: Genero;
  fechaNacimiento: Date | string | null;
  fotoPerfil: string | null;
  biografia: string | null;
  isPlaceholder: boolean;
  perfilCompleto: boolean;
}

interface Props {
  usuario: UsuarioParaEditar;
  esModoObligatorio?: boolean;
}

const inputBaseClass =
  "mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
const helperTextClass = "mt-1.5 text-xs leading-5 text-slate-500";
const errorTextClass = "mt-1.5 text-xs font-medium leading-5 text-rose-600";
const sectionClassName =
  "space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/55 p-4 sm:p-5";
const birthMonths = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
] as const;

const formatDateToYMD = (date?: Date) => {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDescribedBy = (...ids: Array<string | false | null | undefined>) => {
  const validIds = ids.filter(Boolean);
  return validIds.length > 0 ? validIds.join(" ") : undefined;
};

const getDaysInMonth = (year: number, month: number): number => {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return 0;
  }

  return new Date(year, month, 0).getDate();
};

const buildSafeLocalDate = (
  year?: number,
  month?: number,
  day?: number,
): Date | undefined => {
  if (year === undefined || month === undefined || day === undefined) {
    return undefined;
  }

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return undefined;
  }

  const daysInMonth = getDaysInMonth(year, month);
  if (daysInMonth === 0 || day < 1 || day > daysInMonth) {
    return undefined;
  }

  const builtDate = new Date(year, month - 1, day, 12);
  if (Number.isNaN(builtDate.getTime())) {
    return undefined;
  }

  if (
    builtDate.getFullYear() !== year ||
    builtDate.getMonth() !== month - 1 ||
    builtDate.getDate() !== day
  ) {
    return undefined;
  }

  return builtDate;
};

const parseDateOnlyParts = (
  date: Date | string | null,
): { day: string; month: string; year: string } => {
  if (!date) {
    return { day: "", month: "", year: "" };
  }

  const dateOnlySource =
    typeof date === "string"
      ? date.slice(0, 10)
      : date instanceof Date && !Number.isNaN(date.getTime())
        ? date.toISOString().slice(0, 10)
        : "";

  const match = dateOnlySource.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return { day: "", month: "", year: "" };
  }

  const [, rawYear, rawMonth, rawDay] = match;
  const builtDate = buildSafeLocalDate(
    Number(rawYear),
    Number(rawMonth),
    Number(rawDay),
  );
  if (!builtDate) {
    return { day: "", month: "", year: "" };
  }

  return {
    day: String(builtDate.getDate()),
    month: String(builtDate.getMonth() + 1),
    year: String(builtDate.getFullYear()),
  };
};

const getFieldClassName = (
  hasError: boolean,
  options?: { success?: boolean; disabled?: boolean; trailingSpace?: boolean },
) =>
  clsx(
    inputBaseClass,
    hasError
      ? "border-rose-300 bg-rose-50/40"
      : options?.success
        ? "border-emerald-300 bg-emerald-50/40"
        : "border-slate-200",
    options?.disabled && "border-slate-200",
    options?.trailingSpace && "pr-20",
  );

const SectionHeader = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="space-y-1">
    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
      {title}
    </h2>
    <p className="text-sm leading-6 text-slate-500">{description}</p>
  </div>
);

type UpdateUserFormValues = z.input<typeof updateUserSchema>;

export const EditarUsuarioForm = ({
  usuario,
  esModoObligatorio = false,
}: Props) => {
  const initialBirthParts = parseDateOnlyParts(usuario.fechaNacimiento);
  const initialBirthDate = buildSafeLocalDate(
    initialBirthParts.year ? Number(initialBirthParts.year) : undefined,
    initialBirthParts.month ? Number(initialBirthParts.month) : undefined,
    initialBirthParts.day ? Number(initialBirthParts.day) : undefined,
  );
  const [isPending, setIsPending] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDepartamento, setSelectedDepartamento] = useState(
    usuario.departamento || "",
  );
  const [selectedCity, setSelectedCity] = useState(usuario.ciudad || "");
  const [cities, setCities] = useState<string[]>([]);
  const [birthDay, setBirthDay] = useState(initialBirthParts.day);
  const [birthMonth, setBirthMonth] = useState(initialBirthParts.month);
  const [birthYear, setBirthYear] = useState(initialBirthParts.year);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { update } = useSession();
  const router = useRouter();
  const today = new Date();
  const maxAllowedBirthDate = new Date(
    today.getFullYear() - 13,
    today.getMonth(),
    today.getDate(),
    12,
  );
  const maxBirthYear = maxAllowedBirthDate.getFullYear();
  const maxBirthMonth = maxAllowedBirthDate.getMonth() + 1;
  const maxBirthDay = maxAllowedBirthDate.getDate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateUserFormValues, undefined, UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      nombre: usuario.nombre || "",
      apellido: usuario.apellido || "",
      email: usuario.email || "",
      username: usuario.username || "",
      ciudadCompleta:
        usuario.ciudad && usuario.departamento
          ? `${usuario.ciudad} - ${usuario.departamento}`
          : "",
      genero: usuario.genero || "otro",
      fechaNacimiento: initialBirthDate,
      nuevaContraseña: "",
      confirmarContraseña: "",
    },
  });

  const nuevaContraseña = watch("nuevaContraseña");
  const confirmarContraseña = watch("confirmarContraseña");
  const isFormLocked = isPending || isRedirecting;
  const passwordsCoinciden = Boolean(
    nuevaContraseña &&
      confirmarContraseña &&
      nuevaContraseña === confirmarContraseña,
  );
  const confirmPasswordMismatch = Boolean(
    confirmarContraseña && nuevaContraseña !== confirmarContraseña,
  );
  const hasConfirmPasswordError = Boolean(
    errors.confirmarContraseña || confirmPasswordMismatch,
  );
  const birthYearNumber = birthYear ? Number(birthYear) : undefined;
  const birthMonthNumber = birthMonth ? Number(birthMonth) : undefined;
  const hasSelectedBirthMonth =
    birthYearNumber !== undefined &&
    birthMonthNumber !== undefined &&
    Number.isInteger(birthYearNumber) &&
    Number.isInteger(birthMonthNumber);
  const maxVisibleDay = hasSelectedBirthMonth
    ? Math.min(
        getDaysInMonth(birthYearNumber, birthMonthNumber),
        birthYearNumber === maxBirthYear && birthMonthNumber === maxBirthMonth
          ? maxBirthDay
          : 31,
      )
    : 31;
  const availableYears = Array.from(
    { length: maxBirthYear - 1900 + 1 },
    (_, index) => String(maxBirthYear - index),
  );
  const availableMonths =
    birthYearNumber === maxBirthYear
      ? birthMonths.filter((month) => Number(month.value) <= maxBirthMonth)
      : birthMonths;
  const availableDays = Array.from({ length: maxVisibleDay }, (_, index) =>
    String(index + 1),
  );

  const departments = (colombia as ColombiaDepartment[]).map(
    (dept) => dept.departamento,
  );

  useEffect(() => {
    if (selectedDepartamento) {
      const dept = (colombia as ColombiaDepartment[]).find(
        (department) => department.departamento === selectedDepartamento,
      );
      setCities(dept?.ciudades || []);
      if (selectedCity && dept && !dept.ciudades.includes(selectedCity)) {
        setSelectedCity("");
      }
    } else {
      setCities([]);
      setSelectedCity("");
    }
  }, [selectedDepartamento, selectedCity]);

  useEffect(() => {
    const value =
      selectedCity && selectedDepartamento
        ? `${selectedCity} - ${selectedDepartamento}`
        : "";
    setValue("ciudadCompleta", value, { shouldValidate: true });
  }, [selectedCity, selectedDepartamento, setValue]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const syncBirthDate = (
    nextDay: string,
    nextMonth: string,
    nextYear: string,
  ) => {
    let normalizedDay = nextDay;
    let normalizedMonth = nextMonth;

    const parsedYear = nextYear ? Number(nextYear) : undefined;
    const parsedMonth = normalizedMonth ? Number(normalizedMonth) : undefined;
    const hasParsedYearAndMonth =
      parsedYear !== undefined &&
      parsedMonth !== undefined &&
      Number.isInteger(parsedYear) &&
      Number.isInteger(parsedMonth);

    if (
      hasParsedYearAndMonth &&
      parsedYear === maxBirthYear &&
      parsedMonth > maxBirthMonth
    ) {
      normalizedMonth = "";
      normalizedDay = "";
    }

    const normalizedYearNumber = nextYear ? Number(nextYear) : undefined;
    const normalizedMonthNumber = normalizedMonth
      ? Number(normalizedMonth)
      : undefined;
    const hasNormalizedYearAndMonth =
      normalizedYearNumber !== undefined &&
      normalizedMonthNumber !== undefined &&
      Number.isInteger(normalizedYearNumber) &&
      Number.isInteger(normalizedMonthNumber);

    if (normalizedDay) {
      const parsedDay = Number(normalizedDay);
      const maxAllowedDay = hasNormalizedYearAndMonth
        ? Math.min(
            getDaysInMonth(normalizedYearNumber, normalizedMonthNumber),
            normalizedYearNumber === maxBirthYear &&
              normalizedMonthNumber === maxBirthMonth
              ? maxBirthDay
              : 31,
          )
        : 31;

      if (
        !Number.isInteger(parsedDay) ||
        parsedDay < 1 ||
        parsedDay > maxAllowedDay
      ) {
        normalizedDay = "";
      }
    }

    setBirthDay(normalizedDay);
    setBirthMonth(normalizedMonth);
    setBirthYear(nextYear);

    const builtDate = buildSafeLocalDate(
      normalizedYearNumber,
      normalizedMonthNumber,
      normalizedDay ? Number(normalizedDay) : undefined,
    );

    if (builtDate && builtDate <= maxAllowedBirthDate) {
      setValue("fechaNacimiento", builtDate, {
        shouldValidate: true,
        shouldDirty: true,
      });
      return;
    }

    setValue("fechaNacimiento", undefined, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit: SubmitHandler<UpdateUserInput> = async (data) => {
    if (isFormLocked) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsPending(true);

    const dataToSend = {
      ...data,
      fechaNacimiento: formatDateToYMD(data.fechaNacimiento),
    };

    const result = await updateUserProfile(usuario.id, dataToSend);

    if (!result.ok) {
      setErrorMessage(result.message || "Error al actualizar perfil");
      setIsPending(false);
      return;
    }

    await update();

    setSuccessMessage(
      esModoObligatorio
        ? "Datos del administrador actualizados. Preparando tu dashboard..."
        : "Perfil actualizado con éxito. Redirigiendo...",
    );
    setIsRedirecting(true);

    redirectTimeoutRef.current = setTimeout(() => {
      router.replace("/dashboard");
    }, 2000);
  };

  const confirmPasswordMessageId = errors.confirmarContraseña
    ? "confirmarContraseña-error"
    : confirmarContraseña
      ? "confirmarContraseña-status"
      : undefined;

  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)]">
      <div className="relative border-b border-slate-100 px-5 py-5 sm:px-6 sm:py-6">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-rose-50 via-white to-orange-50" />
        <div className="relative">
          <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
            {esModoObligatorio ? "Activación de cuenta" : "Perfil Myckeo"}
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            {esModoObligatorio
              ? "Completa tus datos de administrador"
              : "Edita tus datos de administrador"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {esModoObligatorio
              ? "Estos datos identifican al dueño o administrador de la cuenta. No cambian el nombre público del negocio."
              : "Actualiza la información personal asociada a tu acceso en Myckeo."}
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {esModoObligatorio && (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3.5 text-sm leading-6 text-rose-900">
            Ya completaste la información del negocio. Ahora necesitamos los
            datos reales del administrador o dueño para activar correctamente la
            cuenta.
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          aria-busy={isFormLocked}
        >
          <fieldset
            disabled={isFormLocked}
            className="m-0 min-w-0 space-y-5 border-0 p-0"
          >
            <section className={sectionClassName}>
              <SectionHeader
                title="Datos personales"
                description="Estos datos pertenecen al administrador de la cuenta, no al perfil público del negocio."
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="nombre"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Nombre
                  </label>
                  <input
                    id="nombre"
                    autoComplete="given-name"
                    aria-invalid={Boolean(errors.nombre)}
                    aria-describedby={getDescribedBy(
                      errors.nombre && "nombre-error",
                    )}
                    {...register("nombre")}
                    type="text"
                    className={getFieldClassName(Boolean(errors.nombre))}
                    placeholder="Tu nombre"
                  />
                  {errors.nombre && (
                    <p id="nombre-error" className={errorTextClass}>
                      {errors.nombre.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="apellido"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Apellido
                  </label>
                  <input
                    id="apellido"
                    autoComplete="family-name"
                    aria-invalid={Boolean(errors.apellido)}
                    aria-describedby={getDescribedBy(
                      errors.apellido && "apellido-error",
                    )}
                    {...register("apellido")}
                    type="text"
                    className={getFieldClassName(Boolean(errors.apellido))}
                    placeholder="Tu apellido"
                  />
                  {errors.apellido && (
                    <p id="apellido-error" className={errorTextClass}>
                      {errors.apellido.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Nombre de usuario
                  </label>
                  <input
                    id="username"
                    autoComplete="username"
                    aria-invalid={Boolean(errors.username)}
                    aria-describedby={getDescribedBy(
                      "username-help",
                      errors.username && "username-error",
                    )}
                    {...register("username")}
                    type="text"
                    className={getFieldClassName(Boolean(errors.username))}
                    placeholder="mi_negocio"
                  />
                  <p id="username-help" className={helperTextClass}>
                    Solo letras, números y guion bajo. Ej: mi_negocio
                  </p>
                  {errors.username && (
                    <p id="username-error" className={errorTextClass}>
                      {errors.username.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="genero"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Género
                  </label>
                  <select
                    id="genero"
                    aria-invalid={Boolean(errors.genero)}
                    aria-describedby={getDescribedBy(
                      errors.genero && "genero-error",
                    )}
                    {...register("genero")}
                    className={getFieldClassName(Boolean(errors.genero))}
                  >
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro / Prefiero no decir</option>
                  </select>
                  {errors.genero && (
                    <p id="genero-error" className={errorTextClass}>
                      {errors.genero.message}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="birthDay"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Fecha de nacimiento
                  </label>
                  <div className="mt-1.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor="birthDay"
                        className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-500"
                      >
                        Día
                      </label>
                      <select
                        id="birthDay"
                        value={birthDay}
                        aria-invalid={Boolean(errors.fechaNacimiento)}
                        aria-describedby={getDescribedBy(
                          errors.fechaNacimiento && "fechaNacimiento-error",
                        )}
                        onChange={(e) =>
                          syncBirthDate(e.target.value, birthMonth, birthYear)
                        }
                        className={getFieldClassName(
                          Boolean(errors.fechaNacimiento),
                        )}
                      >
                        <option value="">Selecciona día</option>
                        {availableDays.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="birthMonth"
                        className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-500"
                      >
                        Mes
                      </label>
                      <select
                        id="birthMonth"
                        value={birthMonth}
                        aria-invalid={Boolean(errors.fechaNacimiento)}
                        aria-describedby={getDescribedBy(
                          errors.fechaNacimiento && "fechaNacimiento-error",
                        )}
                        onChange={(e) =>
                          syncBirthDate(birthDay, e.target.value, birthYear)
                        }
                        className={getFieldClassName(
                          Boolean(errors.fechaNacimiento),
                        )}
                      >
                        <option value="">Selecciona mes</option>
                        {availableMonths.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="birthYear"
                        className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-500"
                      >
                        Año
                      </label>
                      <select
                        id="birthYear"
                        value={birthYear}
                        aria-invalid={Boolean(errors.fechaNacimiento)}
                        aria-describedby={getDescribedBy(
                          errors.fechaNacimiento && "fechaNacimiento-error",
                        )}
                        onChange={(e) =>
                          syncBirthDate(birthDay, birthMonth, e.target.value)
                        }
                        className={getFieldClassName(
                          Boolean(errors.fechaNacimiento),
                        )}
                      >
                        <option value="">Selecciona año</option>
                        {availableYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {errors.fechaNacimiento && (
                    <p id="fechaNacimiento-error" className={errorTextClass}>
                      {errors.fechaNacimiento.message}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className={sectionClassName}>
              <SectionHeader
                title="Ubicación"
                description="Selecciona tu departamento y ciudad para dejar tu perfil completo y consistente."
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="departamento"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Departamento
                  </label>
                  <select
                    id="departamento"
                    aria-invalid={Boolean(errors.ciudadCompleta)}
                    aria-describedby={getDescribedBy(
                      "ubicacion-help",
                      errors.ciudadCompleta && "ciudadCompleta-error",
                    )}
                    value={selectedDepartamento}
                    onChange={(e) => setSelectedDepartamento(e.target.value)}
                    className={getFieldClassName(
                      Boolean(errors.ciudadCompleta),
                    )}
                  >
                    <option value="">Selecciona departamento</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ciudad"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Ciudad
                  </label>
                  <select
                    id="ciudad"
                    aria-invalid={Boolean(errors.ciudadCompleta)}
                    aria-describedby={getDescribedBy(
                      "ubicacion-help",
                      errors.ciudadCompleta && "ciudadCompleta-error",
                    )}
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={!selectedDepartamento}
                    className={getFieldClassName(
                      Boolean(errors.ciudadCompleta),
                      {
                        disabled: !selectedDepartamento,
                      },
                    )}
                  >
                    <option value="">Selecciona ciudad</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p id="ubicacion-help" className={helperTextClass}>
                Elige primero el departamento para ver las ciudades disponibles.
              </p>
              {errors.ciudadCompleta && (
                <p id="ciudadCompleta-error" className={errorTextClass}>
                  {errors.ciudadCompleta.message}
                </p>
              )}
            </section>

            <section className={sectionClassName}>
              <SectionHeader
                title="Acceso y seguridad"
                description="Administra tu correo de acceso y cambia tu contraseña solo si necesitas reemplazar la actual."
              />

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={getDescribedBy(
                    esModoObligatorio && "email-help",
                    errors.email && "email-error",
                  )}
                  {...register("email")}
                  type="email"
                  disabled={esModoObligatorio}
                  className={getFieldClassName(Boolean(errors.email), {
                    disabled: esModoObligatorio,
                  })}
                />
                {errors.email && (
                  <p id="email-error" className={errorTextClass}>
                    {errors.email.message}
                  </p>
                )}
                {esModoObligatorio && (
                  <p id="email-help" className={helperTextClass}>
                    Este correo no se puede cambiar en este paso porque está
                    vinculado a tu acceso actual.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="nuevaContraseña"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="nuevaContraseña"
                      autoComplete="new-password"
                      aria-invalid={Boolean(errors.nuevaContraseña)}
                      aria-describedby={getDescribedBy(
                        "nuevaContraseña-help",
                        errors.nuevaContraseña && "nuevaContraseña-error",
                      )}
                      {...register("nuevaContraseña")}
                      type={showPassword ? "text" : "password"}
                      className={getFieldClassName(
                        Boolean(errors.nuevaContraseña),
                        {
                          trailingSpace: true,
                        },
                      )}
                      placeholder="Opcional"
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p id="nuevaContraseña-help" className={helperTextClass}>
                    Mínimo 8 caracteres, una mayúscula, una minúscula y un
                    número.
                  </p>
                  {errors.nuevaContraseña && (
                    <p id="nuevaContraseña-error" className={errorTextClass}>
                      {errors.nuevaContraseña.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmarContraseña"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Confirmar nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="confirmarContraseña"
                      autoComplete="new-password"
                      aria-invalid={hasConfirmPasswordError}
                      aria-describedby={getDescribedBy(
                        confirmPasswordMessageId,
                      )}
                      {...register("confirmarContraseña")}
                      type={showConfirmPassword ? "text" : "password"}
                      className={getFieldClassName(hasConfirmPasswordError, {
                        success: passwordsCoinciden,
                        trailingSpace: true,
                      })}
                      placeholder="Repite la contraseña"
                    />
                    {confirmarContraseña && (
                      <div className="pointer-events-none absolute inset-y-0 right-11 flex items-center">
                        {passwordsCoinciden ? (
                          <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-[18px] w-[18px] text-rose-500" />
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label={
                        showConfirmPassword
                          ? "Ocultar confirmación de contraseña"
                          : "Mostrar confirmación de contraseña"
                      }
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-slate-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                  {errors.confirmarContraseña ? (
                    <p
                      id="confirmarContraseña-error"
                      className={errorTextClass}
                    >
                      {errors.confirmarContraseña.message}
                    </p>
                  ) : confirmarContraseña ? (
                    <p
                      id="confirmarContraseña-status"
                      className={clsx(
                        "mt-1.5 flex items-center gap-1.5 text-xs font-medium leading-5",
                        passwordsCoinciden
                          ? "text-emerald-600"
                          : "text-rose-600",
                      )}
                    >
                      {passwordsCoinciden ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Las contraseñas coinciden.
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4" />
                          Las contraseñas no coinciden.
                        </>
                      )}
                    </p>
                  ) : null}
                </div>
              </div>

              {nuevaContraseña && (
                <PasswordRequirements password={nuevaContraseña} />
              )}
            </section>
          </fieldset>

          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span className="text-sm leading-6">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-emerald-700"
            >
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-10 w-10" />
                <p className="text-base font-semibold">{successMessage}</p>
                <p className="text-sm text-emerald-600">
                  Preparando tu experiencia...
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isFormLocked}
            className={clsx(
              "flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition focus:outline-none focus:ring-4 focus:ring-rose-500/20",
              isFormLocked
                ? "cursor-not-allowed bg-slate-400 shadow-none"
                : "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700",
            )}
          >
            {isFormLocked && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            <span>
              {isRedirecting
                ? "Redirigiendo..."
                : isPending
                  ? "Guardando cambios..."
                  : esModoObligatorio
                    ? "Completar perfil"
                    : "Guardar cambios"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};

const PasswordRequirements = ({ password }: { password: string }) => {
  const requirements = [
    { label: "8 caracteres mínimo", test: (pw: string) => pw.length >= 8 },
    { label: "Una mayúscula", test: (pw: string) => /[A-Z]/.test(pw) },
    { label: "Una minúscula", test: (pw: string) => /[a-z]/.test(pw) },
    { label: "Un número", test: (pw: string) => /\d/.test(pw) },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3.5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        Tu nueva contraseña debe incluir
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {requirements.map((req, i) => {
          const passed = req.test(password);

          return (
            <li
              key={i}
              className={clsx(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium",
                passed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-500",
              )}
            >
              <span className="flex h-4 w-4 items-center justify-center">
                {passed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                )}
              </span>
              <span>{req.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
