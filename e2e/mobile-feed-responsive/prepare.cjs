const fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
execFileSync(
  process.execPath,
  [
    path.join(root, "e2e/mobile-feed-implementation/prepare.cjs"),
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);
if (!process.argv.includes("--clean"))
  fs.copyFileSync(
    path.join(__dirname, "ReviewClient.tsx.txt"),
    path.join(
      root,
      "src/app/(catalogo)/feed-implementation-review/ReviewClient.tsx",
    ),
  );
