const fs = require("node:fs");
const path = require("node:path");
require("../public-ui-audit/prepare.cjs");
const fixture = path.resolve(
  __dirname,
  "../../src/app/(catalogo)/feed-implementation-review/ReviewClient.tsx",
);
// The real feed reads the browser's city. Keep the previous static fixture's
// initialization for the first-batch regressions only.
fs.writeFileSync(
  fixture,
  fs
    .readFileSync(fixture, "utf8")
    .replace(
      'usePreferencesStore.getState().setUbicacion("Bogotá","Bogotá D.C.");',
      'if(query.get("view")!=="live") usePreferencesStore.getState().setUbicacion("Bogotá","Bogotá D.C.");',
    ),
);
