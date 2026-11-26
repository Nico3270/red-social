const fs = require("node:fs"),
  path = require("node:path");
const {
  setup: original,
  settled,
} = require("../centered-feed/browser-support.cjs");
function mediaResponse(route, file, mime) {
  const bytes = fs.readFileSync(file),
    range = route
      .request()
      .headers()
      .range?.match(/^bytes=(\d+)-(\d*)$/);
  const headers = {
    "access-control-allow-origin": "*",
    "accept-ranges": "bytes",
  };
  if (range) {
    const start = Number(range[1]),
      end = range[2]
        ? Math.min(Number(range[2]), bytes.length - 1)
        : bytes.length - 1;
    return route.fulfill({
      status: 206,
      headers: {
        ...headers,
        "content-range": `bytes ${start}-${end}/${bytes.length}`,
      },
      body: bytes.subarray(start, end + 1),
      contentType: mime.split(";")[0],
    });
  }
  return route.fulfill({
    body: bytes,
    contentType: mime.split(";")[0],
    headers,
  });
}
const sessions = {
  personal: {
    user: {
      id: "review-user",
      nombre: "Laura",
      apellido: "Revisión",
      name: "Laura Revisión",
      role: "user",
      perfilCompleto: true,
      isPlaceholder: false,
    },
    expires: "2030-01-01T00:00:00.000Z",
  },
  owner: {
    user: {
      id: "review-owner",
      nombre: "Ana",
      apellido: "Revisión",
      name: "Ana Revisión",
      role: "negocio",
      perfilCompleto: true,
      isPlaceholder: false,
      negocioId: "review-business",
      negocioNombre: "Negocio de revisión",
      negocioSlug: "negocio-de-revision",
      hasManagedBusiness: true,
    },
    expires: "2030-01-01T00:00:00.000Z",
  },
  incomplete: {
    user: {
      id: "review-incomplete",
      nombre: "Perfil",
      apellido: "Incompleto",
      name: "Perfil Incompleto",
      role: "user",
      perfilCompleto: false,
      isPlaceholder: false,
    },
    expires: "2030-01-01T00:00:00.000Z",
  },
  placeholder: {
    user: {
      id: "review-placeholder",
      nombre: "Perfil",
      apellido: "Pendiente",
      name: "Perfil Pendiente",
      role: "negocio",
      perfilCompleto: false,
      isPlaceholder: true,
    },
    expires: "2030-01-01T00:00:00.000Z",
  },
};
async function setup(page, session = "anonymous") {
  const errors = await original(page);
  page.on("pageerror", (error) =>
    console.error("Browser page error:", error.stack || error.message),
  );
  await page.context().route("https://wa.me/**", (route) =>
    route.fulfill({
      body: "Local contact-link verification; no message sent.",
      contentType: "text/plain",
    }),
  );
  await page.route("**/api/auth/session", (r) =>
    r.fulfill({ json: sessions[session] || null }),
  );
  await page.route("**/api/search?**", (r) =>
    r.fulfill({
      json: [
        {
          id: "review-search",
          name: "Salchipapas premium",
          type: "producto",
          slug: "salchipapas-premium",
          thumbnail: "/imgs/Logo Final (1).png",
        },
      ],
    }),
  );
  await page.route("**/api/user/follows*", (r) => r.fulfill({ json: [] }));
  await page.route("http://127.0.0.1:3400/**", (route) => {
    const q = route.request();
    let args;
    try {
      args = JSON.parse(q.postData() || "null");
    } catch {}
    if (
      q.method() === "POST" &&
      q.headers()["next-action"] &&
      args?.[0]?.followerId &&
      args[0].followedId
    )
      return route.continue();
    return route.fallback();
  });
  await page.route(
    "https://res.cloudinary.com/dkfsejtx9/video/upload/v1752810829/red-social/olqwhu1wztj6fqll5wna.mp4",
    (r) =>
      mediaResponse(
        r,
        path.join(__dirname, "media/public-video.mp4"),
        "video/mp4",
      ),
  );
  const manifestFile = path.join(__dirname, "media-manifest.json");
  if (fs.existsSync(manifestFile)) {
    const manifest = JSON.parse(fs.readFileSync(manifestFile));
    await page.route("https://res.cloudinary.com/**", (r) => {
      const asset = manifest[r.request().url()];
      return asset
        ? mediaResponse(
            r,
            path.join(__dirname, "media", asset.file),
            asset.mime,
          )
        : r.fallback();
    });
  }
  return errors;
}
async function ready(page, url = "/?scenario=balanced") {
  await page.goto("http://127.0.0.1:3400" + url, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  try {
    await page
      .locator("[data-feed-item-key]")
      .first()
      .waitFor({ timeout: 60000 });
  } catch (error) {
    if (await page.locator("[data-feed-item-key]").count()) throw error;
    console.log(
      "Cold development harness: reload identical fixture once after hydration timeout.",
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .locator("[data-feed-item-key]")
      .first()
      .waitFor({ timeout: 60000 });
  }
  await settled(page);
}
module.exports = { setup, ready, settled, sessions };
