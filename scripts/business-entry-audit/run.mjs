import { spawn, execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { auditEnvironment } from "../public-ui-pg/env.mjs";
const container = "myckeo-owner-pg-20261125",
  label = "business-entry-20261125";
const connection =
  "postgresql://owner_audit:local_audit_only@127.0.0.1:55441/myckeo_owner_audit";
const docker = (args) =>
  execFileSync("docker", args, { encoding: "utf8" }).trim();
const mode = process.argv[2];
if (mode === "create") {
  console.log(
    docker([
      "run",
      "--detach",
      "--name",
      container,
      "--label",
      `myckeo.audit=${label}`,
      "--publish",
      "127.0.0.1:55441:5432",
      "--env",
      "POSTGRES_USER=owner_audit",
      "--env",
      "POSTGRES_PASSWORD=local_audit_only",
      "--env",
      "POSTGRES_DB=myckeo_owner_audit",
      "--tmpfs",
      "/var/lib/postgresql/data:rw",
      "postgres:16",
    ]),
  );
  for (let n = 0; n < 40; n++) {
    try {
      docker([
        "exec",
        container,
        "pg_isready",
        "-U",
        "owner_audit",
        "-d",
        "myckeo_owner_audit",
      ]);
      process.exit(0);
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Local PostgreSQL not ready");
}
if (mode === "remove") {
  if (
    docker([
      "inspect",
      "--format",
      '{{index .Config.Labels "myckeo.audit"}}',
      container,
    ]) !== label
  )
    throw new Error("Wrong container label");
  console.log(docker(["stop", container]));
  console.log(docker(["rm", container]));
  process.exit(0);
}
const env = {
  ...auditEnvironment(),
  DATABASE_URL: connection,
  DIRECT_URL: connection,
  SHADOW_DATABASE_URL: connection,
  MYCKEO_OWNER_AUDIT: "1",
  AUTH_URL: "http://127.0.0.1:3421",
  NEXTAUTH_URL: "http://127.0.0.1:3421",
  SITE_URL: "http://127.0.0.1:3421",
  NODE_OPTIONS: `--max-old-space-size=6144 --require ${resolve("scripts/business-entry-audit/block-outbound.cjs")}`,
};
const modes = {
  prepare: [
    ["pnpm", ["exec", "prisma", "db", "push", "--skip-generate"]],
    ["pnpm", ["prisma:generate"]],
  ],
  seed: [["pnpm", ["exec", "tsx", "scripts/business-entry-audit/seed.ts"]]],
  build: [["pnpm", ["build"]]],
  start: [
    [
      "pnpm",
      ["exec", "next", "start", "--hostname", "127.0.0.1", "--port", "3421"],
    ],
  ],
  dev: [
    [
      "pnpm",
      ["exec", "next", "dev", "--hostname", "127.0.0.1", "--port", "3421"],
    ],
  ],
};
const commands =
  mode === "command" ? [[process.argv[3], process.argv.slice(4)]] : modes[mode];
if (!commands)
  throw new Error(
    "Use create, prepare, seed, build, start, dev, command or remove",
  );
for (const [cmd, args] of commands) {
  const code = await new Promise((resolve) => {
    const child = spawn(cmd, args, { env, stdio: "inherit" });
    child.once("error", () => resolve(1));
    child.once("exit", (code) => resolve(code ?? 1));
    for (const signal of ["SIGINT", "SIGTERM"])
      process.once(signal, () => child.kill(signal));
  });
  if (code) process.exit(code);
}
