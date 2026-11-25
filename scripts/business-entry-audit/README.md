# Recorrido de negocio aislado

Desde el worktree de esta rama, con dependencias del lockfile y Docker:

```bash
pnpm install --frozen-lockfile --ignore-scripts
node scripts/business-entry-audit/run.mjs create
node scripts/business-entry-audit/run.mjs prepare
node scripts/business-entry-audit/run.mjs seed
node scripts/business-entry-audit/run.mjs build
node scripts/business-entry-audit/run.mjs start
```

En otra terminal de ese mismo worktree:

```bash
MYCKEO_CHROMIUM_PATH=/ruta/a/chromium pnpm exec playwright test --config=e2e/business-entry/playwright.config.ts
node scripts/business-entry-audit/run.mjs command pnpm exec tsx scripts/business-entry-audit/verify.ts
node scripts/business-entry-audit/run.mjs command pnpm typecheck
node scripts/business-entry-audit/run.mjs command pnpm lint
node scripts/business-entry-audit/run.mjs command pnpm exec jest src/lib/business/businessEntry.test.ts src/auth.config.test.ts src/actions/auth/createHegocio.test.ts src/lib/business/create-negocio-core.test.ts --runInBand --coverage=false
```

Detener el servidor y ejecutar `node scripts/business-entry-audit/run.mjs remove`. Para repetir solo los recorridos, `run.mjs command pnpm exec tsx scripts/business-entry-audit/reset-users.ts` retira únicamente el nuevo usuario sintético y reinicia el indicador del usuario incompleto, tras verificar la conexión local.

El runner usa exclusivamente PostgreSQL en **127.0.0.1:55441**, base `myckeo_owner_audit`, contenedor `myckeo-owner-pg-20261125`, etiqueta `myckeo.audit=business-entry-20261125`, almacenamiento tmpfs y valores locales sintéticos. No lee `.env` originales. Las variables de Prisma se sobrescriben solo en los procesos hijos. Se usa el esquema y Prisma reales, sin adaptador en memoria ni rutas de auditoría.

`block-outbound.cjs` se precarga solo en estos procesos: bloquea `fetch` y peticiones HTTP/HTTPS a destinos externos. Requiere Node con `process.getBuiltinModule` (la ejecución registrada usa Node 20.20.0). Playwright también bloquea todo origen distinto de 127.0.0.1:3421. No se suben imágenes ni se envían comunicaciones. Esta precarga no se importa desde `src` ni se configura en Vercel.

Los datos de referencia toman las categorías de la configuración existente y solo la sección `s8`, necesaria para este recorrido; no se ejecutan los seeds generales. El feed recibe un producto sintético persistido mediante la fábrica de fixtures anterior, sin utilizar su adaptador Prisma. Se crean dos cuentas locales de partida y una tercera mediante el formulario real. La prueba atraviesa las rutas, Server Actions, NextAuth, bcrypt y Prisma de implementación.

`verify.ts` lee PostgreSQL y comprueba que existe un solo negocio del nuevo propietario, que su rol es `negocio`, que las relaciones categoría/sección y teléfono son correctas y que el perfil incompleto se completó. No registra tokens, contraseñas ni cookies. Las capturas y resultados se guardan en `docs/audits/business-entry-evidence`.

El build local usa exclusivamente esta base y nunca debe subirse como prebuilt. La publicación debe reconstruir el commit desde Git con la configuración ya existente en Vercel. No ejecutar estos scripts contra producción.
