/* Run only disposable local infrastructure. Never load the repository's .env. */
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const repo = path.resolve(__dirname, "../..");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "myckeo-assisted-v1-"));
const artifacts = path.join(temporary, "artifacts");
fs.mkdirSync(artifacts);
const database = "postgresql://postgres@127.0.0.1:15446/myckeo_onboarding_v1";
const origin = "http://127.0.0.1:5487";
const creationOnly = process.argv.includes("--creation-only");
const environment = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  NODE_ENV: "development",
  NEXT_TELEMETRY_DISABLED: "1",
  DATABASE_URL: database,
  ASSISTED_TEST_DATABASE_URL: database,
  ASSISTED_TEST_ARTIFACT_DIR: artifacts,
  SITE_URL: origin,
  AUTH_URL: origin,
  NEXTAUTH_URL: origin,
  AUTH_TRUST_HOST: "true",
  AUTH_SECRET: "synthetic-auth-secret-for-isolated-onboarding-only",
  MYCKEO_ADMIN_KEY: "synthetic-admin-key-isolated-only",
  ACCOUNT_PROVISIONING_HMAC_SECRET: "synthetic-provision-secret-isolated-only",
  ACCOUNT_ACTIVATION_SESSION_SECRET:
    "synthetic-activation-secret-isolated-only",
  BUSINESS_DEMO_SESSION_SECRET: "synthetic-demo-secret-isolated-only",
  UPSTASH_REDIS_REST_URL: "http://127.0.0.1:16447",
  UPSTASH_REDIS_REST_TOKEN: "synthetic-redis-token",
  GOOGLE_CLIENT_ID: "synthetic-google-id",
  GOOGLE_CLIENT_SECRET: "synthetic-google-secret",
  CLOUDINARY_CLOUD_NAME: "onboarding-synthetic",
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "onboarding-synthetic",
  CLOUDINARY_API_KEY: "synthetic-cloudinary-key",
  CLOUDINARY_API_SECRET: "synthetic-cloudinary-secret",
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: "G-SYNTHETICTEST",
};
if (creationOnly) {
  delete environment.ACCOUNT_PROVISIONING_HMAC_SECRET;
  environment.ASSISTED_TEST_START_WITHOUT_PROVISIONING_SECRET = "1";
}
const containers = [],
  processes = [];
const suffix = randomUUID().slice(0, 8);
function command(bin, args, cwd = repo) {
  const result = spawnSync(bin, args, {
    cwd,
    env: environment,
    encoding: "utf8",
  });
  if (result.status !== 0)
    throw new Error(
      `${bin} ${args[0]} failed: ${(result.stderr || result.stdout || result.error?.message || "").slice(0, 1200)}`,
    );
  return result.stdout.trim();
}
function launch(bin, args, cwd, logName) {
  const fd = fs.openSync(path.join(artifacts, logName), "a");
  const child = spawn(bin, args, {
    cwd,
    env: environment,
    stdio: ["ignore", fd, fd],
    detached: true,
  });
  processes.push(child);
  return child;
}
async function ready(check, label) {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      if (await check()) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Isolated ${label} did not become ready`);
}
async function main() {
  const pg = `myckeo-assisted-pg-${suffix}`,
    redis = `myckeo-assisted-redis-${suffix}`;
  command("docker", [
    "run",
    "--rm",
    "-d",
    "--name",
    pg,
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "-e",
    "POSTGRES_DB=myckeo_onboarding_v1",
    "-p",
    "127.0.0.1:15446:5432",
    "--tmpfs",
    "/var/lib/postgresql/data",
    "postgres:16-alpine",
  ]);
  containers.push(pg);
  command("docker", [
    "run",
    "--rm",
    "-d",
    "--name",
    redis,
    "-p",
    "127.0.0.1:16446:6379",
    "redis:7-alpine",
  ]);
  containers.push(redis);
  await ready(
    () =>
      spawnSync(
        "docker",
        [
          "exec",
          pg,
          "pg_isready",
          "-U",
          "postgres",
          "-d",
          "myckeo_onboarding_v1",
        ],
        { stdio: "ignore" },
      ).status === 0,
    "PostgreSQL",
  );
  const runtime = path.join(temporary, "runtime");
  fs.mkdirSync(runtime);
  environment.ASSISTED_TEST_RUNTIME = runtime;
  for (const dir of ["src", "prisma"])
    fs.cpSync(path.join(repo, dir), path.join(runtime, dir), {
      recursive: true,
    });
  for (const name of [
    "package.json",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "next.config.ts",
    "next-env.d.ts",
    "next-auth.d.ts",
    "tailwind.config.ts",
    "postcss.config.mjs",
  ]) {
    if (fs.existsSync(path.join(repo, name)))
      fs.copyFileSync(path.join(repo, name), path.join(runtime, name));
  }
  fs.symlinkSync(
    path.join(repo, "node_modules"),
    path.join(runtime, "node_modules"),
    "dir",
  );
  fs.symlinkSync(
    path.join(repo, "public"),
    path.join(runtime, "public"),
    "dir",
  );
  // Only this schema copy and this explicit loopback datasource are applied.
  command("pnpm", ["exec", "prisma", "generate"], runtime);
  command("pnpm", ["exec", "prisma", "db", "push", "--skip-generate"], runtime);
  launch(
    "node",
    [path.join(__dirname, "redis-rest.cjs")],
    repo,
    "redis-rest.log",
  );
  await ready(
    async () =>
      (
        await (
          await fetch("http://127.0.0.1:16447", {
            method: "POST",
            body: JSON.stringify(["PING"]),
          })
        ).json()
      ).result === "PONG",
    "Redis REST",
  );
  const server = launch(
    "pnpm",
    ["exec", "next", "dev", "--hostname", "127.0.0.1", "--port", "5487"],
    runtime,
    "next-dev.log",
  );
  await ready(async () => {
    if (server.exitCode !== null) throw new Error("Next exited");
    return (await fetch(`${origin}/api/auth/csrf`)).ok;
  }, "Next.js");
  const tests = spawn(
    "pnpm",
    [
      "exec",
      "playwright",
      "test",
      "--config=e2e/assisted-onboarding/playwright.config.ts",
      ...(creationOnly
        ? ["e2e/assisted-onboarding/placeholder-creation.spec.ts"]
        : []),
    ],
    { cwd: repo, env: environment, stdio: "inherit" },
  );
  const code = await new Promise((resolve) => tests.on("exit", resolve));
  if (code !== 0) throw new Error("Assisted onboarding validation failed");
  console.log(`Synthetic validation passed. Artifacts: ${artifacts}`);
}
function cleanup() {
  for (const child of processes.reverse()) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
  for (const name of containers.reverse())
    spawnSync("docker", ["rm", "-f", name], { stdio: "ignore" });
}
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(cleanup);
