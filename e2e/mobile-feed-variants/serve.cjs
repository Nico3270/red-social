const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "../.."),
  preview = path.join(root, "docs/mobile-feed-variants/preview");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".webm": "video/webm",
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const review = pathname.startsWith("/review/");
  const baseline = pathname.startsWith("/baseline/");
  const base = review
    ? path.join(root, "docs/mobile-feed-variants")
    : baseline
      ? path.join(root, "docs/mobile-feed-visual-refinement/b2")
      : pathname.startsWith("/audit-art/")
        ? preview
        : pathname.startsWith("/audit-font/")
          ? path.join(root, "src/assets/fonts")
          : pathname.startsWith("/imgs/")
            ? path.join(root, "public")
            : preview;
  const relativePath = review
    ? pathname.slice("/review".length)
    : baseline
      ? pathname.slice("/baseline".length)
      : pathname;
  const name = pathname.startsWith("/audit-font/")
    ? pathname.slice("/audit-font/".length)
    : relativePath.endsWith("/")
      ? relativePath.slice(1) + "index.html"
      : relativePath.slice(1);
  const file = path.resolve(base, name);
  if (pathname === "/audit-art/synthetic.webm") {
    res.writeHead(200, { "Content-Type": "video/webm" });
    fs.createReadStream(
      path.join(__dirname, "../mobile-feed/assets/synthetic.webm"),
    ).pipe(res);
    return;
  }
  if (
    !file.startsWith(base + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    "Content-Type": mime[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(file).pipe(res);
});
server.listen(Number(process.env.AUDIT_PORT || 4402), "127.0.0.1", () =>
  console.log("Local feed: http://127.0.0.1:" + server.address().port + "/"),
);
module.exports = server;
