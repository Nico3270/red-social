# Validación aislada del candidato público

Ejecutar desde la raíz de **la candidata**, nunca desde el árbol de trabajo original.
Requiere Docker, pnpm y Chromium de Playwright. Usa el lockfile del proyecto, sin actualizar dependencias.

```bash
pnpm install --frozen-lockfile --ignore-scripts
node scripts/public-ui-pg/database.mjs create
node scripts/public-ui-pg/run.mjs prepare
node scripts/public-ui-pg/run.mjs verify
node scripts/public-ui-pg/run.mjs seed
node scripts/public-ui-pg/run.mjs build
node scripts/public-ui-pg/run.mjs start
```

En otra terminal de la candidata:

```bash
MYCKEO_CHROMIUM_PATH=/ruta/a/chromium pnpm exec playwright test --config=e2e/postgres-public-ui/playwright.config.ts
node scripts/public-ui-pg/run.mjs command pnpm typecheck
node scripts/public-ui-pg/run.mjs command pnpm lint
node scripts/public-ui-pg/run.mjs command pnpm exec jest --runInBand src/lib/contact/phone.test.ts src/feed/actions/getFeedData.test.ts src/feed/actions/getFeedDataByCategory.test.ts src/feed/actions/publicGeography.audit.test.ts src/feed/geography.test.ts src/lib/business/business-visibility-policy.test.ts src/lib/business/publicBusinessVisibility.test.ts
```

Detener el proceso `start` con Ctrl+C, y eliminar solo el contenedor etiquetado de esta tarea:

```bash
node scripts/public-ui-pg/database.mjs remove
```

El contenedor usa PostgreSQL 16, puerto **127.0.0.1:55439**, base `myckeo_public_audit` y almacenamiento tmpfs desechable. La ejecución registrada usó PostgreSQL 16.16 y Prisma/client 6.18.0. Los valores de autenticación locales del runner son sintéticos y públicos; no se leen ni copian `.env` originales. `env.mjs` crea un entorno de proceso mediante una lista permitida y fija todas las conexiones Prisma a esta base; rechaza otro host, puerto, usuario o nombre. `prepare` ejecuta `db push` solo después de esa validación. No usa migraciones ni seeds de negocio del proyecto.

`fixtures.ts` importa el **PrismaClient real de la aplicación**. Reutiliza únicamente la fábrica de datos `makeRows`, no `makePrisma`, `queryRows`, overrides ni el servidor adaptado de la auditoría anterior. Se persisten entidades de verdad. Cada escenario verifica el destino con SQL antes de cambiar los fixtures. `verify.ts` llama las acciones de implementación, no una copia de sus consultas. No se borra ningún dato fuera de la base desechable.

`seed` reemplaza los escenarios de consultas por datos sintéticos para el navegador. El navegador abre rutas reales del build (`/`, `/category/comida`, `/producto/...`), permite sus Server Actions de lectura y bloquea orígenes externos y otros POST. No intercepta respuestas del feed ni `/api/auth/session`, no introduce rutas/rewrite ni inyecta Prisma. El build usa exactamente `pnpm build`; las consultas de generación estática reciben la misma conexión aislada. Servicios externos no necesarios tienen valores inertes; la prueba no envía WhatsApp ni correos.

Las evidencias JSON y capturas están en `docs/audits/postgres-integration-evidence/`. Las pruebas unitarias conservan sus mocks: sus resultados se informan separadamente de las 26 comprobaciones PostgreSQL y los dos recorridos de navegador.

Límite deliberado: borrar la fila usada por el cursor de Prisma puede omitir la parte aún no leída de ese tramo. El escenario lo reproduce y demuestra que comenzar sin cursor ni IDs vistos recupera todos los elegibles. Esta tarea no añade una garantía de instantánea ni cambia el ranking por ventanas.
