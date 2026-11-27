// Creates an original, silent local video fixture; no external media or services.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const cache = path.join(require("node:os").homedir(), ".cache/ms-playwright");
const executablePath =
  process.env.PRODUCT_TEST_BROWSER ||
  fs
    .readdirSync(cache)
    .filter((name) => /^chromium-\d+$/.test(name))
    .flatMap((name) =>
      ["chrome-linux64/chrome", "chrome-linux/chrome"].map((file) =>
        path.join(cache, name, file),
      ),
    )
    .find((file) => fs.existsSync(file));
(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    const encoded = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 600;
      const ctx = canvas.getContext("2d");
      const stream = canvas.captureStream(12);
      const chunks = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8",
      });
      recorder.ondataavailable = (event) => chunks.push(event.data);
      const done = new Promise((resolve) => (recorder.onstop = resolve));
      recorder.start();
      for (let frame = 0; frame < 18; frame++) {
        ctx.fillStyle = "#ddcbb7";
        ctx.fillRect(0, 0, 480, 600);
        ctx.fillStyle = "#485e47";
        ctx.fillRect(110 + frame * 2, 160, 220, 260);
        ctx.fillStyle = "white";
        ctx.font = "24px sans-serif";
        ctx.fillText("Video sintético", 150, 290);
        await new Promise((resolve) => setTimeout(resolve, 84));
      }
      recorder.stop();
      await done;
      const bytes = new Uint8Array(
        await new Blob(chunks, { type: "video/webm" }).arrayBuffer(),
      );
      stream.getTracks().forEach((track) => track.stop());
      return btoa(String.fromCharCode(...bytes));
    });
    fs.mkdirSync(path.join(__dirname, "assets"), { recursive: true });
    fs.writeFileSync(
      path.join(__dirname, "assets/synthetic.webm"),
      Buffer.from(encoded, "base64"),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
