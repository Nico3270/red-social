# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Myckeo" — a Next.js 15 App Router app (package name `myckeo`) combining a social feed with a business/product catalog for local businesses in Colombia (multi-tenant: each `Usuario` can own one `Negocio`). Features: business profiles/catalogs, products with variants and AI-generated images, social posts (`Publicacion`), reviews, reservations, orders/transactions, surveys (`Encuesta`), and an internal admin panel (`myckeoAdmin`).

## Commands

Package manager is **pnpm** (see `pnpm-workspace.yaml`).

```bash
pnpm dev                    # start dev server
pnpm build                  # prisma generate + next build
pnpm typecheck               # tsc --noEmit
pnpm lint                    # next lint
pnpm test                    # jest (unit tests, *.test.ts)
pnpm test:watch
pnpm smoke                   # playwright e2e smoke tests (see e2e/smoke)
pnpm smoke:fixtures          # regenerate e2e/smoke/.generated/fixtures.json from live DB before running smoke
pnpm smoke:ci                # env check + fixtures + CI=true playwright run (1 worker, retries)
pnpm env:check:app           # validate required env vars are present
pnpm prisma:generate         # regenerate Prisma client after schema.prisma changes
pnpm prisma:deploy           # prisma migrate deploy + generate
```

Run a single Jest test: `pnpm exec jest path/to/file.test.ts`.
Run a single Playwright spec: `pnpm exec playwright test e2e/smoke/product-detail.spec.ts --config=playwright.config.ts`.

Local Postgres for dev is provided via `docker-compose.yml` (`postgres-db-base`, mapped to host port 5435); `DATABASE_URL` and other env vars come from `.env` (validated by `scripts/check-env.mjs`, which `pnpm env:check*` runs).

## Architecture

**Data layer**: Prisma + PostgreSQL (Neon serverless in prod, via `@neondatabase/serverless`). Schema is one file: `prisma/schema.prisma` (~940 lines, ~35 models). Singleton client at `src/lib/prisma.ts` (`import prisma from "@/lib/prisma"`), cached on `globalThis` in dev to survive HMR. Key models: `Usuario` (1:1 with `Negocio`, has `role` enum controlling access: `admin`, `super_admin`, `user`, `navegante`, `creador`, `negocio`), `Negocio` (business — has products, services, publicaciones, orders, reservations, catalog groups/sections), `Product`/`ProductVariant`/`CatalogGroup`/`Section` (catalog), `Publicacion`/`Interaccion`/`Follow` (social feed), `Order`/`OrderItem`/`Transaction` (commerce/finance), `Reservation`/`BusinessAvailability` (booking), `Encuesta`/`Pregunta`/`Respuesta` (surveys), `Resena` (reviews).

**Auth**: NextAuth v5 (beta). **The real config is `src/auth.config.ts`** — it exports `signIn`, `signOut`, `auth`, `handlers`, and is what `src/app/api/auth/[...nextauth]/route.ts` and the rest of the app import from (`@/auth.config`). It wires Google OAuth + Credentials (bcrypt password check against `Usuario.contraseña`), and on every JWT refresh re-reads the user + their `Negocio` from the DB to build a session snapshot (business operational status, `perfilCompleto`, feature flags like `configReservation`/`configEncuestas`). `src/auth.ts` is a separate, effectively dead NextAuth setup (its Credentials `authorize` always returns `null`) — do not add real logic there; extend `auth.config.ts` instead.

**Routing** (`src/app`, App Router):
- `(catalogo)` route group — public-facing storefront/social pages: feed (`inicio`), category browsing, product pages, cart (`carro`), checkout, reservations, favorites, surveys, business creation (`crear_negocio`), user profile.
- `dashboard/` — authenticated business-owner area (products, services, orders, transactions, reservations, catalog organization, surveys, profile editing).
- `myckeoAdmin/` — internal admin panel (cross-business product/catalog management, AI product image/draft generation, business archiving) — driven by `src/actions/myckeoAdmin/*`.
- `admin/` — separate, smaller admin surface (events).
- `api/` — REST-style route handlers mirroring the domain (business/*, usuario/*, productos/*, orders/*, resenas/*, etc.), largely organized as `resource/[param]/route.ts`.
- `auth/` — login/register/password-reset pages.

**Server logic**: business logic lives predominantly in **Server Actions** under `src/actions/<domain>/` (auth, perfil, productos, catalogGroups, myckeoAdmin), not in the `api/` routes — prefer adding new mutations there unless a plain REST endpoint is genuinely needed (e.g. for the smoke-tested public surface or external callers). `src/interacciones`, `src/publicaciones`, `src/usuarios`, `src/restaurants`, `src/servicios`, `src/reservas`, `src/resenas`, `src/orders`, `src/transacciones`, `src/encuestas`, `src/busqueda`, `src/carro`, `src/favoritos`, `src/qr`, `src/address` hold domain-specific components/logic outside `src/app`.

**Other integrations** (under `src/lib`): Cloudinary for media upload/storage (`src/lib/cloudinary`), OpenAI for AI product image generation and the "asistente" feature (`src/lib/openai`), Brevo for contact/marketing email sync, Resend + custom templates for transactional email, Upstash Redis (`@upstash/ratelimit`) for rate limiting. `src/lib/business/businessSessionState.ts` and `publicBusinessVisibility.ts` centralize the "is this business operational/visible" logic used by both auth and public pages — reuse them rather than re-deriving `estado`/`archivedAt`/`isTestData` checks.

**Client state**: Zustand (`src/store`) for client-side state (cart, favorites, address, etc.), TanStack Query + SWR for server-state fetching/caching, MUI + Radix + Tailwind for UI, `src/providers/Provider.tsx` wraps the app.

**Testing**: Jest (`ts-jest`, `testMatch: **/*.test.ts`) for unit tests — currently sparse, colocated with source (e.g. `src/lib/openai/generateProductImage.test.ts`). Playwright smoke tests in `e2e/smoke/*.spec.ts` cover only the **public** surface (traditional profile, restaurant/CatalogGroups profile, product detail, business guide) — they do not cover auth, dashboard/admin, reservations, surveys, or checkout. Smoke fixtures are generated against a live DB by `e2e/smoke/generate-fixtures.ts` (`pnpm smoke:fixtures`) into `e2e/smoke/.generated/fixtures.json`; set `SMOKE_BOOTSTRAP_FIXTURES=1` to create a namespaced fixture business when no suitable real one exists in the target DB. CI (`.github/workflows/smoke-tests.yml`) runs `env:check:smoke` → fixtures → `pnpm smoke` against `SMOKE_DATABASE_URL`/`DATABASE_URL` on every PR and push to `main`.
