import { execFileSync } from "node:child_process";
const name = "myckeo-public-pg-20261125";
const label = "public-candidate-20261125";
const docker = (args) =>
  execFileSync("docker", args, { encoding: "utf8" }).trim();
if (process.argv[2] === "create") {
  // Docker fails rather than reusing an existing name or port.
  console.log(
    docker([
      "run",
      "--detach",
      "--name",
      name,
      "--label",
      `myckeo.audit=${label}`,
      "--publish",
      "127.0.0.1:55439:5432",
      "--env",
      "POSTGRES_USER=myckeo_audit",
      "--env",
      "POSTGRES_PASSWORD=local_audit_only",
      "--env",
      "POSTGRES_DB=myckeo_public_audit",
      "--tmpfs",
      "/var/lib/postgresql/data:rw",
      "postgres:16",
    ]),
  );
  for (let tries = 0; tries < 30; tries++) {
    try {
      docker([
        "exec",
        name,
        "pg_isready",
        "-U",
        "myckeo_audit",
        "-d",
        "myckeo_public_audit",
      ]);
      process.exit(0);
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    "Disposable PostgreSQL did not become ready; remove it with database.mjs remove",
  );
} else if (process.argv[2] === "remove") {
  const actual = docker([
    "inspect",
    "--format",
    '{{index .Config.Labels "myckeo.audit"}}',
    name,
  ]);
  if (actual !== label)
    throw new Error(
      "Refusing to remove a container with a different ownership label",
    );
  console.log(docker(["stop", name]));
  console.log(docker(["rm", name]));
} else throw new Error("Use create or remove");
