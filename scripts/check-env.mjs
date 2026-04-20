#!/usr/bin/env node
import { loadLocalEnv } from "./load-local-env.mjs";

loadLocalEnv();

const mode = process.argv[2] || "app";

const CHECKS = {
  app: [
    {
      label: "DATABASE_URL",
      vars: ["DATABASE_URL"],
      required: true,
      description: "Conexion principal de Prisma para rutas publicas y datos de perfil.",
    },
    {
      label: "Auth secret",
      vars: ["AUTH_SECRET", "NEXTAUTH_SECRET"],
      required: true,
      description: "Secret estable para Auth.js y sesiones.",
    },
    {
      label: "Auth URL",
      vars: ["AUTH_URL", "NEXTAUTH_URL"],
      required: false,
      description: "URL canonica para callbacks y entornos reales.",
    },
    {
      label: "Google auth credentials",
      vars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      required: false,
      allRequired: true,
      description: "Solo necesario si el piloto usa login con Google.",
    },
    {
      label: "GA4 measurement ID",
      vars: ["NEXT_PUBLIC_GA4_MEASUREMENT_ID"],
      required: false,
      description:
        "Activa analytics real en cliente para pilotos; si falta, la app queda en fallback seguro.",
    },
  ],
  smoke: [
    {
      label: "DATABASE_URL",
      vars: ["DATABASE_URL"],
      required: true,
      description: "Base activa para generar fixtures y correr smoke reales.",
    },
    {
      label: "Smoke base URL o host/port",
      vars: ["SMOKE_BASE_URL", "SMOKE_HOST", "SMOKE_PORT"],
      required: false,
      description: "Permite reutilizar una app levantada o controlar el servidor local.",
    },
    {
      label: "Auth secret para smoke",
      vars: ["AUTH_SECRET", "NEXTAUTH_SECRET"],
      required: false,
      description: "Se puede resolver con valores dummy en CI si la app los necesita.",
    },
    {
      label: "SMOKE_BOOTSTRAP_FIXTURES",
      vars: ["SMOKE_BOOTSTRAP_FIXTURES"],
      required: false,
      description: "Recomendado para cobertura completa cuando falta negocio no-restaurante real.",
    },
  ],
  deploy: [
    {
      label: "DATABASE_URL",
      vars: ["DATABASE_URL"],
      required: true,
      description: "Necesario para Prisma y para generar sitemap dinamico.",
    },
    {
      label: "SITE_URL",
      vars: ["SITE_URL"],
      required: true,
      description: "Se usa para sitemap y enlaces canonicos del despliegue.",
    },
    {
      label: "Auth secret",
      vars: ["AUTH_SECRET", "NEXTAUTH_SECRET"],
      required: true,
      description: "Debe existir antes de exponer el entorno a pilotos.",
    },
    {
      label: "Auth URL",
      vars: ["AUTH_URL", "NEXTAUTH_URL"],
      required: true,
      description: "URL publica coherente del despliegue para callbacks y sesiones.",
    },
    {
      label: "GA4 measurement ID",
      vars: ["NEXT_PUBLIC_GA4_MEASUREMENT_ID"],
      required: false,
      description:
        "Recomendado si el despliegue se abre a pilotos y necesitas ver eventos reales en GA4.",
    },
  ],
  pilot: [
    {
      label: "DATABASE_URL",
      vars: ["DATABASE_URL"],
      required: true,
      description: "Datos reales del piloto.",
    },
    {
      label: "SITE_URL",
      vars: ["SITE_URL"],
      required: true,
      description: "Dominio canonico mostrado a negocios y usado por sitemap.",
    },
    {
      label: "Auth secret",
      vars: ["AUTH_SECRET", "NEXTAUTH_SECRET"],
      required: true,
      description: "Sesion estable para soporte y accesos reales.",
    },
    {
      label: "Auth URL",
      vars: ["AUTH_URL", "NEXTAUTH_URL"],
      required: true,
      description: "Callbacks consistentes en el entorno que vera el negocio.",
    },
    {
      label: "Google auth credentials",
      vars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      required: false,
      allRequired: true,
      description: "Solo si el piloto depende de login con Google.",
    },
    {
      label: "GA4 measurement ID",
      vars: ["NEXT_PUBLIC_GA4_MEASUREMENT_ID"],
      required: false,
      description:
        "Recomendado para medir uso real del catálogo, detalle, WhatsApp y carrito durante el piloto.",
    },
  ],
};

if (!CHECKS[mode]) {
  console.error(
    `Modo desconocido: ${mode}. Usa uno de: ${Object.keys(CHECKS).join(", ")}.`
  );
  process.exit(1);
}

function readValue(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function resolveCheckStatus(check) {
  const values = check.vars.map((name) => ({
    name,
    value: readValue(name),
  }));

  const populated = values.filter((entry) => entry.value.length > 0);
  const isPresent = check.allRequired
    ? populated.length === values.length
    : populated.length > 0;

  return {
    values,
    isPresent,
  };
}

let hasMissingRequired = false;

console.log(`\n[env-check] Revisando modo: ${mode}\n`);

for (const check of CHECKS[mode]) {
  const { values, isPresent } = resolveCheckStatus(check);
  const level = isPresent ? "OK" : check.required ? "MISSING" : "RECOMMENDED";
  const resolvedNames = values
    .filter((entry) => entry.value.length > 0)
    .map((entry) => entry.name);

  const detail = isPresent
    ? `presente via ${resolvedNames.join(", ")}`
    : `ausente (${check.vars.join(" | ")})`;

  console.log(`[${level}] ${check.label}: ${detail}`);
  console.log(`       ${check.description}`);

  if (!isPresent && check.required) {
    hasMissingRequired = true;
  }
}

console.log("");

if (hasMissingRequired) {
  console.error(`[env-check] Faltan variables requeridas para modo ${mode}.`);
  process.exit(1);
}

console.log(`[env-check] Modo ${mode} listo.`);