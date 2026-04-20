const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const siteUrl = process.env.SITE_URL || "https://myckeo.com";

async function fetchDynamicEntities() {
  const [negocios, productos, categorias, encuestas] = await Promise.all([
    prisma.negocio.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.product.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.encuesta.findMany({
      select: { id: true, updatedAt: true, negocio: { select: { slug: true } } },
    }),
  ]);

  return { negocios, productos, categorias, encuestas };
}

async function main() {
  try {
    console.log("🔍 Fetching dynamic routes for sitemap...");

    const { negocios, productos, categorias, encuestas } = await fetchDynamicEntities();

    // URLs estáticas (de tu sitemap actual)
    const staticUrls = [
      { loc: `${siteUrl}/`, lastmod: new Date().toISOString(), changefreq: "daily", priority: 0.7 },
      { loc: `${siteUrl}/inicio`, lastmod: new Date().toISOString(), changefreq: "daily", priority: 0.7 },
      { loc: `${siteUrl}/carrusel`, lastmod: new Date().toISOString(), changefreq: "daily", priority: 0.7 },
    ];

    // URLs dinámicas para perfiles/negocios
    const perfilUrls = negocios
      .filter((negocio) => negocio.slug) // Solo si tiene slug válido
      .map((negocio) => ({
        loc: `${siteUrl}/perfil/${negocio.slug}`,
        lastmod: negocio.updatedAt.toISOString(),
        changefreq: "daily",
        priority: 0.8,
      }));

    // URLs dinámicas para productos
    const productoUrls = productos
      .filter((producto) => producto.slug)
      .map((producto) => ({
        loc: `${siteUrl}/producto/${producto.slug}`,
        lastmod: producto.updatedAt.toISOString(),
        changefreq: "weekly",
        priority: 0.7,
      }));

    // URLs dinámicas para categorías
    const categoriaUrls = categorias
      .filter((categoria) => categoria.slug)
      .map((categoria) => ({
        loc: `${siteUrl}/category/${categoria.slug}`,
        lastmod: categoria.updatedAt.toISOString(),
        changefreq: "weekly",
        priority: 0.6,
      }));

    // URLs dinámicas para encuestas/reseñas (usando el slug del negocio asociado)
    const encuestaUrls = encuestas
      .filter((encuesta) => encuesta.negocio?.slug) // Solo si el negocio tiene slug
      .map((encuesta) => ({
        loc: `${siteUrl}/encuestas/${encuesta.negocio.slug}`,
        lastmod: encuesta.updatedAt.toISOString(),
        changefreq: "weekly",
        priority: 0.6,
      }));

    // Combina todas las URLs
    const allUrls = [...staticUrls, ...perfilUrls, ...productoUrls, ...categoriaUrls, ...encuestaUrls];

    // Genera XML
    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${allUrls
          .map(
            (url) => `
              <url>
                <loc>${url.loc}</loc>
                <lastmod>${url.lastmod}</lastmod>
                <changefreq>${url.changefreq}</changefreq>
                <priority>${url.priority}</priority>
              </url>
            `
          )
          .join("\n")}
      </urlset>`;

    // Escribe el archivo en public/
    const targetPath = path.join(process.cwd(), "public", "sitemap.xml");
    fs.writeFileSync(targetPath, sitemapContent.trim());
    console.log(`✅ Sitemap generated successfully at ${targetPath} with updated routes!`);
  } catch (error) {
    console.error("❌ Error generating sitemap:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();