// Capture the pre-change B2 sources in the real Next runtime, restoring current work on exit.
const fs = require("node:fs"),
  path = require("node:path"),
  { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const mapping = {
  "src/ui/components/productos/ProductCard.tsx": "ProductCard.tsx.txt",
  "src/ui/components/productos/feedProductCard.module.css":
    "feedProductCard.module.css.txt",
  "src/publicaciones/componentes/FeedRederer.tsx": "FeedRederer.tsx.txt",
};
const backup = Object.entries(mapping).map(([file, source]) => ({
  file: path.join(root, file),
  source: path.join(root, "docs/mobile-feed-b3-c2/b2-sources", source),
  bytes: fs.readFileSync(path.join(root, file)),
}));
let restored = false;
const restore = () => {
  if (!restored) {
    restored = true;
    for (const entry of backup) fs.writeFileSync(entry.file, entry.bytes);
  }
};
for (const entry of backup)
  fs.writeFileSync(entry.file, fs.readFileSync(entry.source));
const child = spawn(
  "pnpm",
  [
    "exec",
    "playwright",
    "test",
    "--config=e2e/mobile-feed-implementation/playwright.config.ts",
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, FEED_IMPLEMENTATION_BASELINE: "1" },
  },
);
child.on("error", (error) => {
  restore();
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  restore();
  console.log("Current B3/C2 sources restored after baseline capture.");
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    restore();
    child.kill(signal);
    process.exit(1);
  });
process.on("exit", restore);
