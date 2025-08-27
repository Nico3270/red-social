
export interface Section {
  id: string; // Identificador único de la sección
  name: string;
  icon: React.ComponentType<{ className?: string }> // Componente del ícono
  href: string; // Slug de la URL
  order: number; // Orden o prioridad
  isActive: boolean; // Estado activo/inactivo
}

export interface Product {
  id: string;
  nombre: string;
  precio: number;
  imagenes: string[];
  descripcion: string;
  seccionIds: string[]; // IDs de las secciones asociadas
  descripcionCorta?: string;
  slug: string;
  tags: string[];
  componentes?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  prioridad?: number;
  status?: "available" | "out_of_stock" | "discontinued";
};


export interface FavoriteProduct {
  id: string; // Identificador único del producto
  slug: string; // Slug para redirigir al detalle del producto
  nombre: string; // Renombrado de 'title' para consistencia
  precio: number; // Renombrado de 'price' para consistencia
  descripcion: string; // Renombrado de 'description' para consistencia (puede ser la descripción completa)
  descripcionCorta: string; // Nueva: Descripción corta para el carrito
  images: string[]; // Lista de URLs de imágenes del producto
  sections: string[]; // Nueva: IDs de secciones para seccionIds en el carrito
  slugNegocio: string; // Nueva: Slug del negocio para el store
  // Opcional: Añade telefonoContacto si lo necesitas para WhatsApp u otros features
  // telefonoContacto?: string;
}

export interface CartProduct {
  cartItemId: string; // Identificador único del producto en el carrito
  id: string; // Identificador del producto (relacionado con la base de datos)
  slug: string; // Slug del producto para generar rutas dinámicas
  nombre: string; // Nombre del producto
  precio: number; // Precio del producto
  cantidad: number; // Cantidad seleccionada por el usuario
  imagen: string; // Imagen principal del producto
  seccionIds: string[]; // IDs de las secciones asociadas
  descripcionCorta?: string; // Descripción corta del producto (opcional)
  comentario?: string; // Comentarios adicionales ingresados por el usuario
}

// src/interfaces/service.interface.ts

export interface Service {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string;
  slug: string;
  isActive: boolean;
  createdAt: string;  // Aseguramos que siempre sea string
  updatedAt: string;
}
