import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { auditEnvironment } from "../../scripts/public-ui-pg/env.mjs";
const child = spawn("pnpm", ["build"], {
  env: { ...auditEnvironment(), NODE_OPTIONS: `--max-old-space-size=6144 --require ${resolve("scripts/business-entry-audit/block-outbound.cjs")}` },
  stdio: "inherit",
});
child.on("exit", code => process.exit(code ?? 1));
