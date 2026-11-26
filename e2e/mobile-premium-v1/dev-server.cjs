const {
  makePrisma,
  browserDataset,
} = require("../geography-pagination/data.cjs");
globalThis.prisma = makePrisma(browserDataset());
globalThis.prisma.follow.findUnique = async () => null;
process.env.AUTH_SECRET = "local-mobile-premium-review";
process.env.NEXTAUTH_SECRET = "local-mobile-premium-review";
process.env.AUTH_TRUST_HOST = "true";
require("../../test-results/centered-feed/server.cjs");
