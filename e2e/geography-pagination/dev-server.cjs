// Real Server Actions + isolated in-memory Prisma adapter. No database writes.
const { makePrisma, browserDataset } = require("./data.cjs");
globalThis.prisma = makePrisma(browserDataset());
require("../mobile-feed-implementation/dev-server.cjs");
