import { spawn } from "node:child_process";
import { auditEnvironment } from "./env.mjs";

const env = auditEnvironment();
const mode = process.argv[2];
const commands = {
  prepare: [
    ["pnpm", ["exec", "prisma", "db", "push", "--skip-generate"]],
    ["pnpm", ["prisma:generate"]],
  ],
  verify: [["pnpm", ["exec", "tsx", "scripts/public-ui-pg/verify.ts"]]],
  seed: [["pnpm", ["exec", "tsx", "scripts/public-ui-pg/seed-browser.ts"]]],
  dev: [
    [
      "pnpm",
      ["exec", "next", "dev", "--hostname", "127.0.0.1", "--port", "3419"],
    ],
  ],
  build: [["pnpm", ["build"]]],
  start: [
    [
      "pnpm",
      ["exec", "next", "start", "--hostname", "127.0.0.1", "--port", "3419"],
    ],
  ],
};
const selected =
  mode === "command"
    ? [[process.argv[3], process.argv.slice(4)]]
    : commands[mode];
if (!selected)
  throw new Error("Use prepare, verify, seed, dev, build, start or command");
for (const [command, args] of selected) {
  const code = await new Promise((resolve) => {
    const child = spawn(command, args, { env, stdio: "inherit" });
    for (const signal of ["SIGINT", "SIGTERM"])
      process.once(signal, () => child.kill(signal));
    child.on("exit", (code, signal) => resolve(code ?? (signal ? 130 : 1)));
    child.on("error", () => resolve(1));
  });
  if (code) process.exit(code);
}
