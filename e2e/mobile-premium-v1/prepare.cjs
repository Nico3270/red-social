const fs = require("node:fs"),
  path = require("node:path");
if (process.argv.includes("--clean")) {
  require("../mobile-feed-implementation/prepare.cjs");
  for (const relative of [
    "test-results/playwright/next-mobile-premium-review",
    "test-results/centered-feed",
    "test-results/mobile-premium-v1",
  ])
    fs.rmSync(path.resolve(__dirname, "../..", relative), {
      recursive: true,
      force: true,
    });
} else {
  require("../centered-desktop-final/prepare.cjs");
  const file = "src/app/(catalogo)/feed-implementation-review/ReviewClient.tsx";
  let source = fs.readFileSync(file, "utf8");
  source = source.replace('["empty","loading"]', '["empty","loading","error"]');
  source = source.replace(
    "return rows;},[query,appended]);",
    'if(scenario==="media") rows=all.filter(i=>i.type==="publication"&&i.data.multimedia.length);return rows;},[query,appended]);',
  );
  fs.writeFileSync(file, source);
  const serverFile = "test-results/centered-feed/server.cjs";
  fs.writeFileSync(
    serverFile,
    fs
      .readFileSync(serverFile, "utf8")
      .replaceAll("next-feed-review", "next-mobile-premium-review")
      .replace(
        "distDir: cache,",
        "distDir: cache,\n        devIndicators: false,",
      ),
  );
}
