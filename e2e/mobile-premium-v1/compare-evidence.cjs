const fs = require("node:fs"),
  assert = require("node:assert/strict");
const sharp = require(
  require.resolve("sharp", { paths: [require.resolve("next")] }),
);
const folder = "docs/audits/mobile-premium-v1-evidence";
(async () => {
  const results = [];
  for (const width of [769, 1440])
    for (const position of ["top", "scroll"]) {
      const a = await sharp(`${folder}/before-${width}-${position}.png`)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true }),
        b = await sharp(`${folder}/after-${width}-${position}.png`)
          .ensureAlpha()
          .raw()
          .toBuffer();
      assert.equal(a.data.length, b.length);
      let changed = 0,
        minX = width,
        minY = 900,
        maxX = 0,
        maxY = 0;
      for (let i = 0; i < a.data.length; i += 4)
        if (
          a.data[i] !== b[i] ||
          a.data[i + 1] !== b[i + 1] ||
          a.data[i + 2] !== b[i + 2]
        ) {
          changed++;
          const x = (i / 4) % width,
            y = Math.floor(i / 4 / width);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      results.push({
        width,
        position,
        changedPixels: changed,
        totalPixels: a.info.width * a.info.height,
        bounds: changed ? [minX, minY, maxX, maxY] : null,
      });
    }
  fs.writeFileSync(
    `${folder}/desktop-pixel-comparison.json`,
    JSON.stringify(results, null, 2),
  );
  const before = JSON.parse(fs.readFileSync(`${folder}/before-metrics.json`)),
    after = JSON.parse(fs.readFileSync(`${folder}/after-metrics.json`));
  for (const record of after) {
    const old = before.find((r) => r.tag === record.tag);
    assert.deepEqual(record.keys.slice().sort(), old.keys.slice().sort());
    assert.equal(new Set(record.keys).size, record.keys.length);
    assert.equal(record.overflow, false);
    assert.deepEqual(record.errors, []);
  }
  const publicEntry = JSON.parse(
    fs.readFileSync(`${folder}/public-baseline.json`),
  );
  assert.deepEqual(
    publicEntry.keys.slice().sort(),
    after
      .find((r) => r.tag === "390")
      .keys.slice()
      .sort(),
  );
  fs.writeFileSync(
    `${folder}/inventory-equivalence.json`,
    JSON.stringify(
      {
        cases: after.length,
        allPairsEqual: true,
        uniqueIdentities: true,
        noOverflow: true,
        noFinalCapturePageErrors: true,
        publicInitialInventoryMatches: true,
        desktopPixels: results,
      },
      null,
      2,
    ),
  );
  console.log(
    "Verified same inventory in " +
      after.length +
      " pairs, current public entry and desktop pixel differences:",
    results,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
