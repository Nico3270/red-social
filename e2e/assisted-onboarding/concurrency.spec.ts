import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { isolatedPrisma, seedFixtures } from "./isolated-fixtures";
const prisma = isolatedPrisma();
const headers = { "x-api-key": "synthetic-admin-key-isolated-only" };
const body = (usuarioId: string, nombre: string) => ({
  usuarioId,
  nombre,
  descripcion: "Datos totalmente ficticios de una prueba aislada.",
  ciudad: "Bogotá",
  departamento: "Cundinamarca",
  categoriaIds: ["1"],
  seccionIds: ["s4"],
  prepararOculto: true,
});
test.beforeAll(async ({ request }) => {
  await seedFixtures(prisma);
  expect(
    (await request.post("http://127.0.0.1:16447", { data: ["FLUSHDB"] })).ok(),
  ).toBe(true);
});
test.afterAll(async () => {
  await prisma.$disconnect();
});

test("concurrent HTTP provisioning and business creation keep one suspended identity", async ({
  request,
}) => {
  const provisioningRef = `concurrent-v1:${randomUUID()}`;
  const responses = await Promise.all(
    Array.from({ length: 6 }, () =>
      request.post("/api/internal/onboarding/provision", {
        headers,
        data: {
          provisioningRef,
          nombreNegocio: "Ensayo concurrente",
          ciudadCompleta: "Bogotá - Cundinamarca",
        },
      }),
    ),
  );
  // The existing provisioning endpoint fails closed on a simultaneous email/
  // username uniqueness collision. Repeating the SAME reference must converge,
  // never create another identity or retrieve a user by email.
  const users = await Promise.all(
    responses.map(async (r) => {
      expect([200, 201, 500]).toContain(r.status());
      if (r.ok()) return r.json();
      expect(await r.json()).toEqual({ ok: false, code: "INTERNAL_ERROR" });
      const retry = await request.post("/api/internal/onboarding/provision", {
        headers,
        data: {
          provisioningRef,
          nombreNegocio: "Ensayo concurrente",
          ciudadCompleta: "Bogotá - Cundinamarca",
        },
      });
      expect(retry.ok()).toBe(true);
      return retry.json();
    }),
  );
  const ids = [...new Set(users.map((u) => u.usuarioId))];
  expect(ids).toHaveLength(1);
  expect(users.filter((u) => u.created)).toHaveLength(1);
  const results = await Promise.all(
    Array.from({ length: 6 }, () =>
      request.post("/api/negocio", {
        headers,
        data: body(ids[0], "Ensayo de concurrencia ficticio"),
      }),
    ),
  );
  const businesses = await Promise.all(
    results.map(async (r) => {
      expect(r.ok()).toBe(true);
      return r.json();
    }),
  );
  expect(new Set(businesses.map((b) => b.negocioId)).size).toBe(1);
  expect(businesses.filter((b) => b.status === "CREATED")).toHaveLength(1);
  const business = await prisma.negocio.findUniqueOrThrow({
    where: { usuarioId: ids[0] },
    include: { usuario: true },
  });
  expect(business.estado).toBe("suspendido");
  expect(business.usuario.isPlaceholder).toBe(true);
  const unauth = await request.post("/api/negocio", {
    data: body(ids[0], "Cannot overwrite"),
  });
  expect(unauth.status()).toBe(401);
  const again = await request.post("/api/negocio", {
    headers,
    data: body(ids[0], "Cannot overwrite"),
  });
  expect(again.ok()).toBe(true);
  expect(
    (await prisma.negocio.findUniqueOrThrow({ where: { id: business.id } }))
      .nombre,
  ).toBe("Ensayo de concurrencia ficticio");
});

test("a partial setup failure recovers with the same provisional user", async ({
  request,
}) => {
  const provisioningRef = `recover-v1:${randomUUID()}`;
  const provision = async () => {
    const r = await request.post("/api/internal/onboarding/provision", {
      headers,
      data: {
        provisioningRef,
        nombreNegocio: "Ensayo de recuperación",
        ciudadCompleta: "Bogotá - Cundinamarca",
      },
    });
    expect(r.ok()).toBe(true);
    return r.json();
  };
  const user = await provision();
  const failed = await request.post("/api/negocio", {
    headers,
    data: {
      ...body(user.usuarioId, "Ensayo recuperación ficticio"),
      seccionIds: ["nonexistent"],
    },
  });
  expect(failed.status()).toBe(400);
  expect(
    await prisma.negocio.findUnique({ where: { usuarioId: user.usuarioId } }),
  ).toBeNull();
  const retry = await provision();
  expect(retry.usuarioId).toBe(user.usuarioId);
  expect(retry.created).toBe(false);
  const success = await request.post("/api/negocio", {
    headers,
    data: body(user.usuarioId, "Ensayo recuperación ficticio"),
  });
  expect(success.ok()).toBe(true);
  expect(
    (
      await prisma.negocio.findUniqueOrThrow({
        where: { usuarioId: user.usuarioId },
      })
    ).estado,
  ).toBe("suspendido");
});

test("conventional registration remains active and cannot use provisional mode", async ({
  request,
}) => {
  const user = await prisma.usuario.findUniqueOrThrow({
    where: { email: "other-owner@onboarding.invalid" },
  });
  const provisional = await request.post("/api/negocio", {
    headers,
    data: body(user.id, "Ensayo convencional ficticio"),
  });
  expect(provisional.status()).toBe(409);
  const { prepararOculto, ...conventional } = body(
    user.id,
    "Ensayo convencional ficticio",
  );
  const success = await request.post("/api/negocio", {
    headers,
    data: conventional,
  });
  expect(success.ok()).toBe(true);
  expect(
    (await prisma.negocio.findUniqueOrThrow({ where: { usuarioId: user.id } }))
      .estado,
  ).toBe("activo");
});

test("public APIs and administrative product API cannot publish a suspended business", async ({
  request,
}) => {
  const phone = `+573${String(Date.now()).slice(-9)}`;
  const user = await prisma.usuario.create({
    data: {
      nombre: "Sintético",
      apellido: "Ficticio",
      username: `pending_${randomUUID()}`,
      email: `pending_${randomUUID()}@onboarding.invalid`,
      contraseña: "not-a-password-hash",
      ciudad: "Bogotá",
      departamento: "Cundinamarca",
      genero: "otro",
      fechaNacimiento: new Date("1990-01-01"),
      isPlaceholder: true,
    },
  });
  const created = await request.post("/api/negocio", {
    headers,
    data: {
      ...body(user.id, "Ensayo bypass ficticio"),
      telefonoContacto: phone,
    },
  });
  expect(created.ok()).toBe(true);
  const identity = await created.json();
  const payload = {
    negocioPhone: phone,
    nombre: "Producto ficticio",
    descripcion: "Descripción totalmente sintética de prueba.",
    precio: 28000,
    status: "disponible",
    categoryId: "1",
    imagenes: [
      "https://res.cloudinary.com/onboarding-synthetic/image/upload/synthetic.png",
    ],
    seccionIds: ["s4"],
  };
  const publish = await request.post("/api/products/create", {
    headers,
    data: payload,
  });
  expect(publish.ok()).toBe(false);
  expect(
    await prisma.product.count({ where: { negocioId: identity.negocioId } }),
  ).toBe(0);
  const hidden = await request.post("/api/products/create", {
    headers,
    data: { ...payload, status: "oculto" },
  });
  expect(hidden.ok()).toBe(true);
  const product = (await hidden.json()).product;
  const patch = await request.patch(`/api/products/update/${product.id}`, {
    headers,
    data: { status: "disponible" },
  });
  expect(patch.ok()).toBe(false);
  expect(
    (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
      .status,
  ).toBe("oculto");
  const original = await prisma.image.findMany({
    where: { productId: product.id },
  });
  const textOnly = await request.patch(`/api/products/update/${product.id}`, {
    headers,
    data: {
      descripcion: "Descripción ficticia corregida sin tocar las fotografías.",
    },
  });
  expect(textOnly.ok()).toBe(true);
  expect(
    await prisma.image.findMany({ where: { productId: product.id } }),
  ).toEqual(original);
  const stale = await request.patch(`/api/products/update/${product.id}`, {
    headers,
    data: { imagenes: [], expectedImageUrls: [] },
  });
  expect(stale.ok()).toBe(false);
  expect(
    await prisma.image.findMany({ where: { productId: product.id } }),
  ).toEqual(original);
  const anonymous = await request.patch(`/api/products/update/${product.id}`, {
    data: { status: "disponible" },
  });
  expect(anonymous.status()).toBe(401);
});

test("a suspension that commits while publication waits wins the publication guard", async ({
  request,
}) => {
  const id = randomUUID();
  const user = await prisma.usuario.create({
    data: {
      nombre: "Ensayo",
      apellido: "Ficticio",
      username: `verified_${id}`,
      email: `verified_${id}@onboarding.invalid`,
      contraseña: "not-a-password-hash",
      ciudad: "Bogotá",
      departamento: "Cundinamarca",
      genero: "otro",
      fechaNacimiento: new Date("1990-01-01"),
      perfilCompleto: true,
    },
  });
  const business = await prisma.negocio.create({
    data: {
      usuarioId: user.id,
      nombre: "Ensayo bloqueo ficticio",
      slug: `ensayo-lock-${id}`,
      ciudad: "Bogotá",
      departamento: "Cundinamarca",
      imagenes: [],
      estado: "activo",
    },
  });
  const product = await prisma.product.create({
    data: {
      negocioId: business.id,
      nombre: "Ensayo de bloqueo",
      slug: `lock-product-${id}`,
      descripcion: "Datos sintéticos",
      precio: 28000,
      status: "oculto",
      categoryId: "1",
      imagenes: {
        create: {
          url: "https://res.cloudinary.com/onboarding-synthetic/image/upload/synthetic.png",
        },
      },
    },
  });
  let acquired!: () => void, release!: () => void;
  const ready = new Promise<void>((r) => {
      acquired = r;
    }),
    gate = new Promise<void>((r) => {
      release = r;
    });
  const holder = prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Negocio" WHERE "id"=${business.id} FOR UPDATE`;
      acquired();
      await gate;
      await tx.negocio.update({
        where: { id: business.id },
        data: { estado: "suspendido" },
      });
    },
    { timeout: 60000 },
  );
  await ready;
  const publish = request.patch(`/api/products/update/${product.id}`, {
    headers,
    data: { status: "disponible" },
  });
  try {
    await expect
      .poll(async () => {
        const rows = await prisma.$queryRaw<
          { count: number }[]
        >`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type='Lock' AND query LIKE '%Negocio%FOR UPDATE%'`;
        return rows[0].count;
      })
      .toBeGreaterThan(0);
  } finally {
    release();
    await holder;
  }
  expect((await publish).ok()).toBe(false);
  expect(
    (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
      .status,
  ).toBe("oculto");
  expect(
    (await prisma.negocio.findUniqueOrThrow({ where: { id: business.id } }))
      .estado,
  ).toBe("suspendido");
});

test("concurrent image replacements use snapshots and preserve unchanged image identities", async ({
  request,
}) => {
  const id = randomUUID(),
    url =
      "https://res.cloudinary.com/onboarding-synthetic/image/upload/retained.png";
  const user = await prisma.usuario.create({
    data: {
      nombre: "Ensayo",
      apellido: "Galería",
      username: `gallery_${id}`,
      email: `gallery_${id}@onboarding.invalid`,
      contraseña: "not-a-password-hash",
      ciudad: "Bogotá",
      departamento: "Cundinamarca",
      genero: "otro",
      fechaNacimiento: new Date("1990-01-01"),
      isPlaceholder: true,
    },
  });
  const business = await prisma.negocio.create({
    data: {
      usuarioId: user.id,
      nombre: "Ensayo galería ficticio",
      slug: `gallery-${id}`,
      ciudad: "Bogotá",
      departamento: "Cundinamarca",
      imagenes: [],
      estado: "suspendido",
    },
  });
  const product = await prisma.product.create({
    data: {
      negocioId: business.id,
      nombre: "Ensayo galería",
      slug: `gallery-product-${id}`,
      descripcion: "Original",
      precio: 28000,
      status: "oculto",
      categoryId: "1",
      imagenes: { create: { url } },
    },
    include: { imagenes: true },
  });
  const responses = await Promise.all(
    ["a", "b"].map((s) =>
      request.patch(`/api/products/update/${product.id}`, {
        headers,
        data: {
          imagenes: [
            url,
            `https://res.cloudinary.com/onboarding-synthetic/image/upload/${s}.png`,
          ],
          expectedImageUrls: [url],
        },
      }),
    ),
  );
  expect(responses.filter((r) => r.ok())).toHaveLength(1);
  const images = await prisma.image.findMany({
    where: { productId: product.id },
  });
  expect(images).toHaveLength(2);
  expect(
    images.some((img) => img.id === product.imagenes[0].id && img.url === url),
  ).toBe(true);
  const stale = await request.patch(`/api/products/update/${product.id}`, {
    headers,
    data: {
      descripcion: "This must rollback",
      imagenes: [],
      expectedImageUrls: [url],
    },
  });
  expect(stale.ok()).toBe(false);
  expect(
    (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
      .descripcion,
  ).toBe("Original");
  expect(
    await prisma.image.findMany({ where: { productId: product.id } }),
  ).toHaveLength(2);
});

test("the limited demo migration executes and rolls back in an isolated schema", async () => {
  const namespace = `assisted_migration_${randomUUID().replaceAll("-", "")}`;
  const migration = readFileSync(
    "prisma/migrations/20261118090000_business_demo_links/migration.sql",
    "utf8",
  );
  const rollback = new Error("ROLLBACK_SYNTHETIC_MIGRATION");
  await expect(
    prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${namespace}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${namespace}"`);
      await tx.$executeRawUnsafe(
        'CREATE TABLE "Negocio" ("id" TEXT PRIMARY KEY)',
      );
      for (const statement of migration
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await tx.$executeRawUnsafe(statement);
      const columns = await tx.$queryRaw<
        { column_name: string; data_type: string }[]
      >`SELECT column_name::text AS column_name, data_type::text AS data_type FROM information_schema.columns WHERE table_schema=${namespace} AND table_name='BusinessDemoLink'`;
      expect(columns).toHaveLength(10);
      expect(columns.find((c) => c.column_name === "snapshot")?.data_type).toBe(
        "jsonb",
      );
      expect(
        columns.find((c) => c.column_name === "productIds")?.data_type,
      ).toBe("ARRAY");
      const constraints = await tx.$queryRaw<
        { constraint_type: string }[]
      >`SELECT constraint_type::text AS constraint_type FROM information_schema.table_constraints WHERE table_schema=${namespace} AND table_name='BusinessDemoLink'`;
      expect(constraints.some((c) => c.constraint_type === "FOREIGN KEY")).toBe(
        true,
      );
      const indexes = await tx.$queryRaw<
        { indexdef: string }[]
      >`SELECT indexdef FROM pg_indexes WHERE schemaname=${namespace} AND tablename='BusinessDemoLink'`;
      expect(
        indexes.some((index) =>
          /CREATE UNIQUE INDEX.*tokenHash/.test(index.indexdef),
        ),
      ).toBe(true);
      throw rollback;
    }),
  ).rejects.toBe(rollback);
  const schemas = await prisma.$queryRaw<
    { nspname: string }[]
  >`SELECT nspname::text AS nspname FROM pg_namespace WHERE nspname=${namespace}`;
  expect(schemas).toHaveLength(0);
});
