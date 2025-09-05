// tests/mocks/feedMocks.ts

import { FeedItem, FeedQueryParams } from "../feed.interfaces";


export const mockParams: FeedQueryParams = {
  ciudad: "Tunja",
  departamento: "Boyacá",
  preferencias: ["comida", "moda"],
  secciones: ["camisas", "pizzas"],
  page: 1,
  limit: 20,
  seenIds: [],
  followedBusinessIds: ["test-negocio-1"],
};

export const mockProductItem: FeedItem = {
  id: "prod-1",
  type: "product",
  score: 0,
  createdAt: new Date(),
  title: "Camisa Roja",
  descriptionShort: "Descripción corta",
  imageUrl: "img.jpg",
  businessSlug: "negocio-slug",
  isFollowed: false,
  data: {
    id: "prod-1",
    nombre: "Camisa Roja",
    precio: 50,
    descripcion: "Full desc",
    descripcionCorta: "Short desc",
    slug: "camisa-roja",
    prioridad: 1,
    status: "disponible",
    tags: ["moda", "ropa"],
    categoriaId: "cat-1",
    imagenes: ["img.jpg"],
    componentes: [],
    sections: ["camisas"],
    negocioId: "test-negocio-1",
    ciudad: "Tunja",
    departamento: "Boyacá",
    negocioFotoPerfil: ""
    // ... otros
  },
};

export const mockPublicationItem: FeedItem = {
  id: "pub-1",
  type: "publication",
  score: 0,
  createdAt: new Date(Date.now() - 86400000),
  title: "Testimonio",
  descriptionShort: "Short",
  imageUrl: "media.jpg",
  businessSlug: "negocio-slug",
  isFollowed: false,
  data: {
    id: "pub-1",
    usuario: { id: "user-1", nombre: "Test", apellido: "User", username: "testuser" },
    tipo: "TESTIMONIO",
    descripcion: "Desc",
    multimedia: [{ id: "m1", url: "media.jpg", tipo: "IMAGEN", orden: 1 }],
    visibilidad: "PUBLICA",
    createdAt: new Date().toISOString(),
    numLikes: 10,
    numComentarios: 5,
    negocio: { id: "test-negocio-2", nombre: "Negocio2", slug: "negocio2", ciudad: "Bogotá", departamento: "Cundinamarca" },
  },
};

// Nuevo: Low-hotness variant para true <5
export const mockLowPublicationItem: FeedItem = {
  ...mockPublicationItem,
  data: { ...mockPublicationItem.data, numLikes: 0, numComentarios: 0 },
};

// Nuevo: Mock para service (ajusta a tu interface)
export const mockServiceItem: FeedItem = {
  id: "serv-1",
  type: "service",
  score: 0,
  createdAt: new Date(),
  title: "Servicio Pizza",
  descriptionShort: "Desc corta",
  imageUrl: "serv.jpg",
  businessSlug: "negocio-slug",
  isFollowed: false,
  data: {
    id: "serv-1",
    titulo: "Servicio Pizza",
    descripcion: ["Detalles"],
    slug: "pizza-serv",
    precio: 20,
    currency: "COP",
    status: "disponible",
    tags: ["comida"], // Matches preferencias
    multimedia: [{ url: "serv.jpg", orden: 1, tipo: "IMAGEN" }],
    negocioId: "test-negocio-1", // Followed
    negocioSlug: "negocio-slug",
    nombreNegocio: "Negocio1",
    telefonoNegocio: "123",
    negocioFotoPerfil: "",
  },
};

// Nuevo: Mock para business
export const mockBusinessItem: FeedItem = {
  id: "bus-1",
  type: "business",
  score: 0,
  createdAt: new Date(),
  title: "Negocio Moda",
  descriptionShort: "Desc",
  imageUrl: "bus.jpg",
  businessSlug: "moda-slug",
  isFollowed: false,
  data: {
    id: "bus-1",
    nombre: "Negocio Moda",
    slug: "moda-slug",
    negocioId: "bus-1",
    descripcion: "Full desc",
    ciudad: "Tunja",
    departamento: "Boyacá",
    imagenPerfil: "bus.jpg",
    categorias: ["moda"], // Matches
    secciones: ["camisas"], // Matches
    estado: "activo",
    createdAt: new Date(),
  },
};

// Nuevo: Null variant para business (e.g., no categorias)
export const mockNullBusinessItem: FeedItem = {
  ...mockBusinessItem,
  data: { ...mockBusinessItem.data, categorias: [], secciones: [], ciudad: "" },
};