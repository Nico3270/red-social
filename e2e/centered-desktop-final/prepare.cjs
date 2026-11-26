const fs = require('node:fs');
require('../centered-feed/prepare.cjs');
const file = 'src/app/(catalogo)/feed-implementation-review/ReviewClient.tsx';
const original = fs.readFileSync(file, 'utf8');
const prepared = original
  .replace('if(query.has("append")', 'if(["empty","loading"].includes(query.get("state")||"")) rows=[];\n if(query.has("append")')
  .replace('hasMore={false} isLoadingNext={false}', 'isFeedSettled={!["pending-types","error"].includes(query.get("state")||"")} hasMore={query.get("state")==="more"||query.get("state")==="loading"} isLoadingNext={query.get("state")?.startsWith("loading")||false}');
if (prepared === original) throw new Error('Expected development harness markers were not found');
fs.writeFileSync(file, prepared);
