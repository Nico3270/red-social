// Fixed, isolated rows. Used by Jest and the local Next runtime; never persisted.
const locations = {
  local: { ciudad: "Tunja", departamento: "Boyacá" },
  dept: { ciudad: "Duitama", departamento: "Boyacá" },
  national: { ciudad: "Bogotá", departamento: "Bogotá D.C." },
};
function makeBusiness(id, location = "local", category = "comida") {
  return {
    id,
    nombre: id,
    slug: id,
    descripcion: "Oferta del negocio",
    ...locations[location],
    estado: "activo",
    isTestData: false,
    archivedAt: null,
    usuario: { estado: "activo", isPlaceholder: false, perfilCompleto: true },
    orden: location === "local" ? 0 : 100,
    createdAt: new Date("2026-01-01T12:00:00Z"),
    fotoPerfil: "/__feed-implementation-art/avatar.svg",
    fotoPortada: "/__feed-implementation-art/morning.svg",
    telefonoContacto: "+573182293083",
    urlGoogleMaps: null,
    latitud: null,
    longitud: null,
    categorias: [{ category: { slug: category } }],
    secciones: [],
    _count: { followsIn: 0, publicaciones: 0, Product: 0, Servicio: 0 },
  };
}
function makeRow(type, id, location = "local", category = "comida") {
  const negocio = makeBusiness("b-" + id, location, category);
  const common = {
    id,
    orden: negocio.orden,
    createdAt: negocio.createdAt,
    negocio,
  };
  if (type === "businesses") return { ...negocio, id, slug: id, nombre: id };
  if (type === "products")
    return {
      ...common,
      nombre: id,
      slug: id,
      precio: 23000,
      descripcion: "Oferta de " + negocio.ciudad,
      descripcionCorta: "Disponible para explorar",
      prioridad: 0,
      status: "disponible",
      etiquetaEspecial: null,
      ratingPromedio: 0,
      numResenas: 0,
      tags: [],
      componentes: [],
      categoryId: category === "comida" ? "2" : "1",
      category: { slug: category, nombre: category },
      imagenes: [{ url: "/__feed-implementation-art/coffee.svg" }],
      secciones: [],
      variantes: [],
      stock: 10,
      stockIlimitado: false,
      usaVariantes: false,
    };
  if (type === "services")
    return {
      ...common,
      titulo: id,
      slug: id,
      descripcion: ["Servicio en " + negocio.ciudad],
      status: "disponible",
      precio: 23000,
      currency: "COP",
      tags: [],
      multimedia: [],
    };
  return {
    ...common,
    titulo: id,
    descripcion: "Noticias de " + negocio.ciudad,
    tipo: "CARRUSEL_IMAGENES",
    visibilidad: "PUBLICA",
    multimedia: [],
    usuario: { id: "u-" + id, nombre: "Cliente", apellido: "", username: id },
    numLikes: 0,
    numComentarios: 0,
    numCompartidos: 0,
    calificacion: null,
    productosEnPublicacion: [],
    interacciones: [],
  };
}
function makeRows(
  type,
  counts = { local: 27, dept: 3, national: 6 },
  includeExcluded = true,
) {
  const result = [];
  for (const [place, count] of Object.entries(counts))
    for (let i = 0; i < count; i++)
      result.push(
        makeRow(type, `${type}-${place}-${String(i).padStart(2, "0")}`, place),
      );
  if (includeExcluded)
    for (const place of Object.keys(locations)) {
      result.push(
        makeRow(type, `${type}-${place}-wrong-category`, place, "moda"),
      );
      const hidden = makeRow(type, `${type}-${place}-hidden`, place);
      (type === "businesses" ? hidden : hidden.negocio).isTestData = true;
      result.push(hidden);
      if (type !== "businesses") {
        const unavailable = makeRow(
          type,
          `${type}-${place}-unavailable`,
          place,
        );
        if (type === "publications") unavailable.visibilidad = "PRIVADA";
        else
          unavailable.status = type === "products" ? "oculto" : "no_disponible";
        result.push(unavailable);
        if (type === "publications") {
          const wrongType = makeRow(
            type,
            `${type}-${place}-unavailable-type`,
            place,
          );
          wrongType.tipo = "VIDEO_VERTICAL";
          result.push(wrongType);
        }
      }
    }
  return result;
}
function matches(value, where) {
  if (where === undefined) return true;
  if (where === null || typeof where !== "object") return value === where;
  if ("is" in where) return matches(value, where.is);
  if ("some" in where)
    return (
      Array.isArray(value) && value.some((item) => matches(item, where.some))
    );
  if ("in" in where && !where.in.includes(value)) return false;
  if ("notIn" in where && where.notIn.includes(value)) return false;
  if ("not" in where && matches(value, where.not)) return false;
  if ("AND" in where && ![].concat(where.AND).every((w) => matches(value, w)))
    return false;
  if ("OR" in where && ![].concat(where.OR).some((w) => matches(value, w)))
    return false;
  if ("NOT" in where && [].concat(where.NOT).some((w) => matches(value, w)))
    return false;
  return Object.entries(where).every(
    ([key, filter]) =>
      ["AND", "OR", "NOT", "in", "notIn", "not"].includes(key) ||
      matches(value?.[key], filter),
  );
}
function queryRows(rows, args) {
  let result = rows.filter((row) => matches(row, args.where));
  const ordering = [].concat(args.orderBy || []);
  result.sort((a, b) => {
    for (const spec of ordering)
      for (const [key, direction] of Object.entries(spec)) {
        const av = a[key] instanceof Date ? a[key].getTime() : a[key],
          bv = b[key] instanceof Date ? b[key].getTime() : b[key];
        const comparison = av === bv ? 0 : av < bv ? -1 : 1;
        if (comparison) return direction === "desc" ? -comparison : comparison;
      }
    return 0;
  });
  if (args.cursor) {
    const index = result.findIndex((row) => row.id === args.cursor.id);
    result = index < 0 ? [] : result.slice(index + (args.skip || 0));
  } else if (args.skip) result = result.slice(args.skip);
  return result.slice(0, args.take ?? result.length);
}
function makePrisma(dataset) {
  const models = {
    products: "product",
    publications: "publicacion",
    services: "servicio",
    businesses: "negocio",
  };
  const prisma = {
    interaccion: { findMany: async () => [] },
    follow: { findMany: async () => [] },
  };
  for (const [type, model] of Object.entries(models))
    prisma[model] = {
      findMany: async (args) => queryRows(dataset[type] || [], args),
    };
  return prisma;
}
function browserDataset() {
  return {
    products: makeRows("products", { local: 25, dept: 3, national: 5 }),
    publications: makeRows("publications", { local: 12, dept: 1, national: 2 }),
    services: makeRows("services", { local: 1, dept: 1, national: 2 }),
    businesses: makeRows("businesses", { local: 2, dept: 1, national: 2 }),
  };
}
module.exports = {
  locations,
  makeBusiness,
  makeRow,
  makeRows,
  matches,
  queryRows,
  makePrisma,
  browserDataset,
};
