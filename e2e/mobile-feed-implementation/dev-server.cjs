// Actual application sources + Next development runtime, with an isolated test build cache.
// This avoids sharing .next with the user's existing development server.
process.env.NODE_ENV = "development";
process.env.MYCKEO_FEED_REVIEW = "1";
process.env.DATABASE_URL =
  "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic";
process.env.AUTH_URL = "http://127.0.0.1:3400";
process.env.NEXTAUTH_URL = "http://127.0.0.1:3400";
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const root = path.resolve(__dirname, "../..");
const cache = "test-results/playwright/next-feed-review";
const configDir = path.join(root, "test-results/playwright/feed-review-config");
fs.mkdirSync(configDir, { recursive: true });
const ts = require("typescript");
const config = ts.readConfigFile(
  path.join(root, "tsconfig.json"),
  ts.sys.readFile,
).config;
config.compilerOptions.baseUrl = root;
config.compilerOptions.tsBuildInfoFile = path.join(
  configDir,
  "tsconfig.tsbuildinfo",
);
config.include = config.include.map((p) => path.join(root, p));
config.exclude = config.exclude.map((p) => path.join(root, p));
const configFile = path.join(configDir, "tsconfig.json");
fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
const nextEnvFile = path.join(root, "next-env.d.ts");
const nextEnvBefore = fs.existsSync(nextEnvFile)
  ? fs.readFileSync(nextEnvFile, "utf8")
  : null;
const restoreGeneratedEnv = () => {
  if (
    nextEnvBefore !== null &&
    fs.readFileSync(nextEnvFile, "utf8").includes(cache + "/types/routes.d.ts")
  )
    fs.writeFileSync(nextEnvFile, nextEnvBefore);
};
(async () => {
  const modulePath = require.resolve("next/dist/server/config");
  const configModule = require(modulePath);
  const load = configModule.default;
  const original = await load(
    require("next/constants").PHASE_DEVELOPMENT_SERVER,
    root,
  );
  // Next 15's custom-server router reloads config instead of honoring the conf argument.
  // Change that loader only in this test process; the repository config is untouched.
  require.cache[modulePath].exports = {
    ...configModule,
    __esModule: true,
    default: async (...args) => {
      const loaded = await load(...args);
      return {
        ...loaded,
        distDir: cache,
        // Route fixtures at the real feed URL so pathname-dependent navigation is accurate.
        rewrites: async () => ({
          beforeFiles: [
            { source: "/", destination: "/feed-implementation-review" },
          ],
          afterFiles: [],
          fallback: [],
        }),
        typescript: {
          ...loaded.typescript,
          tsconfigPath: path.relative(root, configFile),
        },
      };
    },
  };
  const app = require("next")({
    dev: true,
    dir: root,
    hostname: "127.0.0.1",
    port: 3400,
    conf: original,
  });
  await app.prepare();
  restoreGeneratedEnv();
  const handler = app.getRequestHandler();
  const server = http.createServer((req, res) => handler(req, res));
  server.on("upgrade", app.getUpgradeHandler());
  server.listen(3400, "127.0.0.1", () =>
    console.log(
      "Actual Next development feed: http://127.0.0.1:3400/feed-implementation-review",
    ),
  );
  let closing = false;
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, async () => {
      if (closing) return;
      closing = true;
      restoreGeneratedEnv();
      server.close();
      // Next's custom-server cleanup can wait on dev connections. Never leave a
      // compiler watching the shared test cache after the owning suite finishes.
      const forceExit = setTimeout(() => process.exit(0), 2000);
      await app.close();
      clearTimeout(forceExit);
      process.exit(0);
    });
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
