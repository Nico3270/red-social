export function auditEnvironment() {
  const database =
    process.env.MYCKEO_PG_AUDIT_URL ||
    "postgresql://myckeo_audit:local_audit_only@127.0.0.1:55439/myckeo_public_audit";
  const url = new URL(database);
  if (
    url.protocol !== "postgresql:" ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "55439" ||
    url.pathname !== "/myckeo_public_audit" ||
    url.username !== "myckeo_audit"
  ) {
    throw new Error(
      "Refusing a database outside the disposable local audit target",
    );
  }
  const inherited = Object.fromEntries(
    ["PATH", "HOME", "USER", "TMPDIR", "LANG", "PNPM_HOME"]
      .filter((key) => process.env[key])
      .map((key) => [key, process.env[key]]),
  );
  return {
    ...inherited,
    DATABASE_URL: database,
    DIRECT_URL: database,
    SHADOW_DATABASE_URL: database,
    MYCKEO_PG_AUDIT_URL: database,
    NODE_OPTIONS: "--max-old-space-size=6144",
    AUTH_SECRET: "local-audit-secret-never-for-production",
    NEXTAUTH_SECRET: "local-audit-secret-never-for-production",
    AUTH_URL: "http://127.0.0.1:3419",
    NEXTAUTH_URL: "http://127.0.0.1:3419",
    SITE_URL: "http://127.0.0.1:3419",
    AUTH_TRUST_HOST: "true",
    GOOGLE_CLIENT_ID: "audit-disabled",
    GOOGLE_CLIENT_SECRET: "audit-disabled",
    OPENAI_API_KEY: "audit-disabled",
    RESEND_API_KEY: "re_audit_disabled",
    BREVO_API_KEY: "audit-disabled",
    MYCKEO_ADMIN_KEY: "audit-local-only",
    MYCKEO_DISABLE_OUTBOUND_NOTIFICATIONS: "true",
    MYCKEO_NO_INDEX: "true",
    CLOUDINARY_CLOUD_NAME: "audit-local",
    CLOUDINARY_API_KEY: "1000",
    CLOUDINARY_API_SECRET: "audit-disabled",
  };
}
