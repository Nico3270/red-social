const { chromium } = require("@playwright/test"),
  fs = require("node:fs"),
  path = require("node:path"),
  { pathToFileURL } = require("node:url"),
  assert = require("node:assert/strict");
(async () => {
  const root = path.resolve(process.argv[2] || "."),
    folder = path.join(root, "docs/audits/mobile-premium-v1-evidence"),
    manifest = JSON.parse(
      fs.readFileSync(path.join(folder, "comparison-manifest.json")),
    );
  const browser = await chromium.launch({
    executablePath:
      process.env.AUDIT_CHROMIUM_PATH ||
      "/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome",
  });
  const p = await browser.newPage();
  const errors = [],
    network = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.route("http://**/*", (r) => {
    network.push(r.request().url());
    return r.abort();
  });
  await p.route("https://**/*", (r) => {
    network.push(r.request().url());
    return r.abort();
  });
  try {
    await p.goto(pathToFileURL(path.join(folder, "index.html")).href);
    assert.equal(await p.locator("#case option").count(), 42);
    for (let i = 0; i < manifest.length; i++) {
      await p.selectOption("#case", String(i));
      await p.waitForFunction(() =>
        ["before", "after"].every((id) => {
          const e = document.getElementById(id);
          return e.complete && e.naturalWidth > 0;
        }),
      );
      for (const k of ["before", "after"])
        assert.equal(
          await p.locator("#" + k + "Link").getAttribute("href"),
          manifest[i][k],
        );
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    const result = {
      pairs: manifest.length,
      imagesLoaded: manifest.length * 2,
      offline: true,
      networkRequests: network,
      pageErrors: errors,
    };
    fs.writeFileSync(
      path.join(folder, "portable-check.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(result);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
