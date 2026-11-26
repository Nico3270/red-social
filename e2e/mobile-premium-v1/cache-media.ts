import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  getCloudinaryImageUrl,
  buildCloudinaryDeliveryUrl,
} from "../../src/lib/cloudinary/buildCloudinaryDeliveryUrl";
import {
  getCloudinaryVideoPosterUrl,
  buildCloudinaryVideoPosterUrl,
} from "../../src/lib/cloudinary/buildCloudinaryVideoPosterUrl";
import {
  isPublicationItem,
  isProductItem,
  type FeedItem,
} from "../../src/feed/feed.interfaces";
import snapshot from "../../docs/audits/centered-feed-evidence/comparison-sample.json";

async function main() {
  const root = "e2e/mobile-premium-v1/media";
  mkdirSync(root, { recursive: true });
  const urls = new Set<string>();
  for (const item of [
    ...snapshot.items,
    ...snapshot.reviews,
  ] as unknown as FeedItem[]) {
    if (isProductItem(item)) {
      const url = item.data.imagenes?.[0];
      if (url)
        urls.add(
          buildCloudinaryDeliveryUrl(url, {
            preset: "product-card",
            crop: "limit",
            gravity: undefined,
          }),
        );
    }
    if (!isPublicationItem(item)) continue;
    const first = item.data.multimedia?.[0];
    if (first) {
      if (first.tipo === "VIDEO") {
        const poster = buildCloudinaryVideoPosterUrl(first.url, {
          preset: "publication-detail",
          startOffset: 2,
        });
        if (poster) urls.add(poster);
      } else
        urls.add(
          buildCloudinaryDeliveryUrl(first.url, {
            preset: "publication-preview",
            crop: "limit",
            gravity: undefined,
          }),
        );
    }
    if (
      !snapshot.reviews.some((review) => review.id === item.id) &&
      !["cmf1vtl2l000043hsthjz3ep6", "cmd8abuph000443wfzt9txx2e"].includes(
        item.id,
      )
    )
      continue;
    for (const media of item.data.multimedia ?? []) {
      if (media.tipo === "VIDEO") {
        urls.add(media.url);
        const poster = getCloudinaryVideoPosterUrl(
          media.url,
          "publication-detail",
        );
        if (poster) urls.add(poster);
      } else urls.add(getCloudinaryImageUrl(media.url, "publication-detail"));
    }
  }
  const manifest: Record<
    string,
    { file: string; mime: string; sha256: string; bytes: number }
  > = {};
  const manifestFile = "e2e/mobile-premium-v1/media-manifest.json";
  const previous: typeof manifest = existsSync(manifestFile)
    ? JSON.parse(readFileSync(manifestFile, "utf8"))
    : {};
  for (const url of urls) {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "res.cloudinary.com"
    )
      throw Error("Unexpected public media origin");
    const cached = previous[url];
    if (
      cached &&
      existsSync(root + "/" + cached.file) &&
      createHash("sha256")
        .update(readFileSync(root + "/" + cached.file))
        .digest("hex") === cached.sha256
    ) {
      manifest[url] = cached;
      continue;
    }
    const response = await fetch(url);
    if (!response.ok) throw Error("Media HTTP " + response.status + " " + url);
    const bytes = Buffer.from(await response.arrayBuffer()),
      mime = response.headers.get("content-type") || "";
    if (bytes.length > 8_000_000 || !/^image\/|^video\//.test(mime))
      throw Error("Unsupported media fixture");
    const file =
      createHash("sha256").update(url).digest("hex").slice(0, 20) + ".media";
    writeFileSync(root + "/" + file, bytes);
    manifest[url] = {
      file,
      mime,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
    };
  }
  writeFileSync(
    "e2e/mobile-premium-v1/media-manifest.json",
    JSON.stringify(manifest, null, 2),
  );
  console.log(
    "Cached",
    Object.keys(manifest).length,
    "public detail assets, including original video bytes.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
