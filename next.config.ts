const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = withBundleAnalyzer({
  images: {
    qualities: [80],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.pixabay.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  compress: true,
  async headers() {
    const globalNoIndex = process.env.MYCKEO_NO_INDEX === "true";
    const globalRobotsTag = "noindex, nofollow, noarchive, nosnippet";
    const activationHeaders = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Pragma", value: "no-cache" },
      { key: "Referrer-Policy", value: "no-referrer" },
      {
        key: "X-Robots-Tag",
        value: globalNoIndex
          ? globalRobotsTag
          : "noindex, nofollow, noarchive",
      },
    ];

    return [
      ...(globalNoIndex
        ? [{
            source: "/:path*",
            headers: [{ key: "X-Robots-Tag", value: globalRobotsTag }],
          }]
        : []),
      { source: "/activar", headers: activationHeaders },
      { source: "/activar/:path*", headers: activationHeaders },
    ];
  },
});

module.exports = nextConfig;
