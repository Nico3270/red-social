const fs = require("node:fs"),
  assert = require("node:assert/strict");
const sharp = require(
  require.resolve("sharp", { paths: [require.resolve("next")] }),
);
const folder = "docs/audits/mobile-premium-v2-evidence",
  read = (n) => JSON.parse(fs.readFileSync(`${folder}/${n}.json`));
(async () => {
  const before = read("v1-metrics"),
    after = read("after-metrics");
  for (const record of after) {
    const old = before.find((x) => x.tag === record.tag);
    if (old)
      assert.deepEqual(record.keys.slice().sort(), old.keys.slice().sort());
    assert.equal(new Set(record.keys).size, record.keys.length);
    assert.equal(record.overflow, false);
    assert.deepEqual(record.errors, []);
  }
  const pixels = [];
  for (const width of [769, 1440])
    for (const position of ["top", "scroll"]) {
      const a = await sharp(`${folder}/published-${width}-${position}.png`)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true }),
        b = await sharp(`${folder}/after-${width}-${position}.png`)
          .ensureAlpha()
          .raw()
          .toBuffer();
      assert.equal(a.data.length, b.length);
      let changed = 0;
      for (let i = 0; i < b.length; i += 4)
        if (
          a.data[i] !== b[i] ||
          a.data[i + 1] !== b[i + 1] ||
          a.data[i + 2] !== b[i + 2]
        )
          changed++;
      pixels.push({
        width,
        position,
        changedPixels: changed,
        totalPixels: a.info.width * a.info.height,
      });
      assert.equal(changed, 0, "Desktop screenshot changed");
    }
  const phases = ["published", "v1", "v2"].map((phase) => ({
    phase,
    ...read(phase + "-key-metrics"),
  }));
  phases.forEach((p) => assert.deepEqual(p.errors, []));
  const cards = phases[0].records.map((original) => {
    const variants = phases.map((p) => ({
      phase: p.phase,
      ...p.records.find((r) => r.label === original.label),
    }));
    variants.forEach((v) => assert.equal(v.id, original.id));
    if (original.label === "review")
      variants.forEach((v) =>
        assert.equal(v.productHref, original.productHref),
      );
    return { label: original.label, variants };
  });
  const summary = {
    v2InventoryCases: after.length,
    matchedV1InventoryCases: after.filter((r) =>
      before.some((o) => o.tag === r.tag),
    ).length,
    uniqueIdentities: true,
    noOverflow: true,
    noFinalCapturePageErrors: true,
    desktopPixels: pixels,
    cards,
  };
  fs.writeFileSync(
    `${folder}/comparison-results.json`,
    JSON.stringify(summary, null, 2),
  );
  console.log(
    "Verified equivalent inventory, six cards/relations and desktop pixels:",
    pixels,
  );
})();
