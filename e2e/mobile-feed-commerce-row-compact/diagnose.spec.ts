import { test } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { setup, openRoot, settled, measure, prices } from "./browser";
test.skip(process.env.COMMERCE_REPORT !== "diagnosis");
test("measure the real 390px C2 before changing CSS", async ({ page }) => {
  const data = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const records = [];
  for (const value of prices) {
    data.setFirstPrice(value);
    await openRoot(page);
    await settled(page);
    const c = (await measure(page)).cards.find((c) => c.id === "p1")!;
    records.push({ value, ...c });
  }
  writeFileSync(
    "docs/mobile-feed-commerce-row-compact/diagnosis.json",
    JSON.stringify(records, null, 2),
  );
  console.log(
    JSON.stringify(
      records.map((c) => ({
        value: c.value,
        cardWidth: c.root.width,
        contentPadding: c.contentPadding,
        rowWidth: c.row.width,
        glyphWidth: c.glyphWidth,
        priceBlock: c.priceBlock.width,
        actionsWidth: c.actions.width,
        priceCapacity: c.priceCapacity,
        footerHeight: c.row.height,
        wrapped: c.wrapped,
        priceSize: c.priceSize,
      })),
      null,
      2,
    ),
  );
});
