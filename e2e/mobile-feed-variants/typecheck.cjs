// Typecheck the isolated copies in place of their source modules, without writing src/.
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const configFile = ts.readConfigFile(
  path.join(root, "tsconfig.json"),
  ts.sys.readFile,
);
if (configFile.error)
  throw new Error(
    ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"),
  );
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
const overrides = {
  [path.join(root, "src/ui/components/productos/ProductCard.tsx")]: path.join(
    __dirname,
    "ProductCard.tsx.txt",
  ),
  [path.join(root, "src/publicaciones/componentes/FeedRederer.tsx")]: path.join(
    __dirname,
    "FeedRenderer.tsx.txt",
  ),
};
const host = ts.createCompilerHost(config.options);
const read = host.readFile.bind(host);
host.readFile = (file) =>
  overrides[file] ? fs.readFileSync(overrides[file], "utf8") : read(file);
const program = ts.createProgram(
  config.fileNames,
  { ...config.options, noEmit: true, incremental: false },
  host,
);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  process.stderr.write(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (file) => file,
      getNewLine: () => "\n",
    }),
  );
  process.exitCode = 1;
} else
  console.log(
    "Isolated ProductCard and FeedRenderer: TypeScript passed (virtual source overrides).",
  );
