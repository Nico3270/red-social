


const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const prisma = new PrismaClient();
const siteUrl = "https://magisurprise.com";

(async () => {
  try {
    console.log("🔍 Fetching dynamic product slugs...");
    const products = await prisma.product.findMany({ select: { slug: true } });

    const urls = products.map((product) => {
      const productUrl = `${siteUrl}${
        product.slug.startsWith("smp-") ? `/productSmp/${product.slug}` : `/producto/${product.slug}`
      }`;

      return `
        <url>
          <loc>${productUrl}</loc>
          <lastmod>${new Date().toISOString()}</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.8</priority>
        </url>
      `;
    });

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${urls.join("\n")}
      </urlset>`;

    fs.writeFileSync("public/sitemap-dynamic.xml", sitemapContent.trim());
    console.log("✅ Dynamic sitemap generated successfully!");

    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Error generating sitemap:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
