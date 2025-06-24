/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://magisurprise.com",
  generateRobotsTxt: false,
  sitemapSize: 5000,
  exclude: [
    "/admin*",  // Excluye /admin y todas sus subrutas
    "/dashboard*",  // Excluye /dashboard y todas sus subrutas,
    "/api*",
    "/empty",
    "/legal",
    "/contacto",
    "/servicios"
  ],
  generateIndexSitemap: false, // Asegura que genere un índice de sitemaps
  additionalSitemaps: [
    "https://magisurprise.com/sitemap-dynamic.xml" // Agregamos el sitemap de productos dinámicos
  ]
};
