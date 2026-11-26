const {makePrisma,browserDataset}=require('../geography-pagination/data.cjs');
globalThis.prisma=makePrisma(browserDataset());
process.env.AUTH_SECRET='local-centered-review-only';process.env.NEXTAUTH_SECRET='local-centered-review-only';process.env.AUTH_TRUST_HOST='true';
require('../../test-results/centered-feed/server.cjs');
