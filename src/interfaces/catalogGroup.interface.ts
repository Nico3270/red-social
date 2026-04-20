/**
 * Interfaces para la nueva capa de Grupos de Catálogo (Fase 1)
 * 
 * Permite que cada negocio organice su catálogo con jerarquía propia.
 * Opcional: sin usar CatalogGroup, todo sigue funcionando como actualmente.
 * 
 * Cambio no destructivo:
 * - No reemplaza ProductSection ni Category/Section
 * - Se agrega como nueva capa de presentación
 * - Los productos siguen teniendo categoryId y ProductSection
 */

/**
 * Grupo de Catálogo - Presentación editorial del negocio
 * Ejemplo: restaurante restaurante con "Cocina > Platos Fuertes > Carnes"
 */
export interface CatalogGroup {
  id: string;
  negocioId: string;
  nombre: string;
  slug: string;
  parentId?: string | null;
  order: number;
  isActive: boolean;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Grupo de Catálogo extendido con relaciones
 * Usado cuando necesitamos la jerarquía completa
 */
export interface CatalogGroupWithRelations extends CatalogGroup {
  children?: CatalogGroup[];
  productCount?: number;
}

/**
 * Relación entre Grupo de Catálogo y Producto
 * Permite asignar múltiples productos a un grupo con orden y destacado
 */
export interface CatalogGroupProduct {
  id: string;
  catalogGroupId: string;
  productId: string;
  order: number;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input para crear un nuevo grupo de catálogo
 * Usado en formularios y acciones del servidor
 */
export interface CreateCatalogGroupInput {
  nombre: string;
  slug: string;
  parentId?: string;
  order?: number;
  description?: string;
}

/**
 * Input para actualizar un grupo de catálogo
 */
export interface UpdateCatalogGroupInput extends Partial<CreateCatalogGroupInput> {
  isActive?: boolean;
}

/**
 * Response de creación/actualización de grupo
 */
export interface CatalogGroupResponse {
  ok: boolean;
  message: string;
  catalogGroup?: CatalogGroup;
  error?: string;
}

/**
 * Respuesta para obtener grupos del negocio
 * Incluye jerarquía completa de padres/hijos
 */
export interface GetCatalogGroupsResponse {
  ok: boolean;
  message: string;
  groups?: CatalogGroupWithRelations[];
  rootGroups?: CatalogGroupWithRelations[]; // Solo grupos sin padre
  error?: string;
}

/**
 * Estructura para asignar productos a un grupo
 */
export interface AssignProductToCatalogGroupInput {
  catalogGroupId: string;
  productId: string;
  order?: number;
  isFeatured?: boolean;
}

/**
 * Respuesta de asignación de producto
 */
export interface AssignProductResponse {
  ok: boolean;
  message: string;
  catalogGroupProduct?: CatalogGroupProduct;
  error?: string;
}
