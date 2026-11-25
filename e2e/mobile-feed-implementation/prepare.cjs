// Install a temporary development-only fixture route. No production modules are replaced.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const route = path.join(root, "src/app/(catalogo)/feed-implementation-review");
const art = path.join(root, "public/__feed-implementation-art");
if (process.argv.includes("--clean")) {
  for (const dir of [route, art]) {
    const marker = path.join(dir, ".myckeo-feed-review-fixture");
    if (fs.existsSync(marker)) fs.rmSync(dir, { recursive: true });
  }
  // Remove declarations for this temporary route and only this route.
  const generatedRoute = path.join(
    root,
    ".next/types/app/(catalogo)/feed-implementation-review",
  );
  if (fs.existsSync(generatedRoute))
    fs.rmSync(generatedRoute, { recursive: true });
  for (const relative of [
    "test-results/playwright/next-feed-review",
    "test-results/playwright/feed-review-config",
  ]) {
    const directory = path.join(root, relative);
    if (fs.existsSync(directory)) fs.rmSync(directory, { recursive: true });
  }
} else {
  for (const dir of [route, art]) {
    if (
      fs.existsSync(dir) &&
      !fs.existsSync(path.join(dir, ".myckeo-feed-review-fixture"))
    )
      throw new Error("Existing directory: " + dir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".myckeo-feed-review-fixture"),
      "temporary local fixture\n",
    );
  }
  for (const name of ["page.tsx", "ReviewClient.tsx", "fixtures.tsx"])
    fs.copyFileSync(
      path.join(__dirname, name + ".txt"),
      path.join(route, name),
    );
  for (const name of [
    "coffee.svg",
    "bag.svg",
    "plant.svg",
    "morning.svg",
    "portrait.svg",
    "avatar.svg",
  ])
    fs.copyFileSync(
      path.join(root, "docs/mobile-feed-variants/preview/audit-art", name),
      path.join(art, name),
    );
  fs.copyFileSync(
    path.join(root, "e2e/mobile-feed/assets/synthetic.webm"),
    path.join(art, "synthetic.webm"),
  );
}
