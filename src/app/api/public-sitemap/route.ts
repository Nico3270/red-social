import { publicSitemapEntries } from "@/lib/business/publicSitemap";
export const dynamic = "force-dynamic";
const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export async function GET() {
  const origin = new URL(process.env.SITE_URL || "https://myckeo.com").origin;
  const entries = await publicSitemapEntries();
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((e) => `<url><loc>${escapeXml(origin + e.path)}</loc><lastmod>${e.updatedAt.toISOString()}</lastmod></url>`).join("")}</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
