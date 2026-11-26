const fs = require("node:fs"),
  path = require("node:path");
require("../mobile-premium-v1/prepare.cjs");
if (process.argv.includes("--clean")) {
  for (const relative of [
    "test-results/playwright/next-mobile-premium-v2-review",
    "test-results/mobile-premium-v2",
  ])
    fs.rmSync(path.resolve(__dirname, "../..", relative), {
      recursive: true,
      force: true,
    });
} else {
  const file = "test-results/centered-feed/server.cjs";
  fs.writeFileSync(
    file,
    fs
      .readFileSync(file, "utf8")
      .replaceAll(
        "next-mobile-premium-review",
        "next-mobile-premium-v2-review",
      ),
  );
}
