import { openDB, deleteDB } from "idb";

const DB_NAME = "magicSurprise";
const STORE_NAME = "products";
const STORE_CARDS = "cards"; // Nueva store para tarjetas
const STORE_UPDATES = "ultimaActualizacion";
const DB_VERSION = 7; // Incrementamos la versión para manejar la migración de sectionPriorities

export interface Tarjeta {
    id: string;
    titulo: string;
    descripcion: string;
    imagen: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Product {
    id: string;
    nombre: string;
    precio: number;
    imagenes: string[];
    descripcion: string;
    seccionIds: string[];
    sectionPriorities?: { [key: string]: number | null }; // Nuevo campo para prioridades por sección
    descripcionCorta?: string;
    slug: string;
    tags: string[];
    createdAt?: Date;
    updatedAt?: Date;
    prioridad?: number; // ✅ Hacerlo opcional para evitar errores
    status: "available" | "out_of_stock" | "discontinued";
    componentes?: string[];
    enlace?: string;
}

export async function initDB() {
    try {
        console.log(`🔄 Inicializando IndexedDB: Versión ${DB_VERSION}...`);

        // ✅ Verificar si la base de datos existe y tiene una versión antigua
        const existingDB = await indexedDB.databases();
        const dbExists = existingDB.some(db => db.name === DB_NAME);

        if (dbExists) {
            console.log("🔎 IndexedDB ya existe. Verificando estructura...");

            try {
                const oldDB = await openDB(DB_NAME);
                
                if (
                    !oldDB.objectStoreNames.contains(STORE_NAME) || 
                    !oldDB.objectStoreNames.contains(STORE_CARDS) ||
                    !oldDB.objectStoreNames.contains(STORE_UPDATES)
                ) {
                    console.warn("⚠️ IndexedDB tiene una estructura incompatible. Eliminando y recreando...");
                    await deleteDB(DB_NAME);
                    console.log("✅ IndexedDB eliminada. Se creará nuevamente con la estructura correcta.");
                }

                oldDB.close();
            } catch (error) {
                console.warn("⚠️ No se pudo abrir IndexedDB para verificar su estructura:", error);
            }
        }
        
        // ✅ Crear o actualizar IndexedDB
        const db = await openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                console.log(`🔄 Migrando IndexedDB de versión ${oldVersion} a ${DB_VERSION}`);

                if (oldVersion < 1) {
                    console.log("🛠 Creando store de productos...");
                    db.createObjectStore(STORE_NAME, { keyPath: "id" });
                }
                if (oldVersion < 2) {
                    console.log("🛠 Creando store de actualizaciones...");
                    db.createObjectStore(STORE_UPDATES, { keyPath: "entidad" });
                }
                if (oldVersion < 3) {
                    console.log("🛠 Creando store de tarjetas...");
                    db.createObjectStore(STORE_CARDS, { keyPath: "id" });
                }
                if (oldVersion < 7) {
                    console.log("🆕 Nueva estructura, migrando datos para incluir sectionPriorities...");
                    // No necesitamos eliminar datos existentes, pero podemos manejar la migración
                    // Si los productos existentes no tienen sectionPriorities, se asignará un valor por defecto
                }
            },
        });

        console.log("✅ IndexedDB inicializado correctamente.");
        return db;
    } catch (error) {
        console.error("❌ Error al inicializar IndexedDB:", error);
        return null;
    }
}

// ✅ Guardar tarjetas en IndexedDB (Solo nuevas o modificadas)
export async function saveCards(cards: Tarjeta[]) {
    try {
        const db = await initDB();
        if (!db) return;

        console.log(`💾 Guardando ${cards.length} tarjetas en IndexedDB...`);

        const tx = db.transaction(STORE_CARDS, "readwrite");
        const store = tx.objectStore(STORE_CARDS);

        for (const card of cards) {
            console.log(`📝 Insertando tarjeta: ${card.titulo}`);
            store.put({
                ...card,
                createdAt: card.createdAt ? card.createdAt.toISOString() : undefined,
                updatedAt: card.updatedAt ? card.updatedAt.toISOString() : undefined,
            });
        }

        await tx.done;
        console.log("✅ Tarjetas guardadas en IndexedDB correctamente.");
    } catch (error) {
        console.error("❌ Error al guardar tarjetas en IndexedDB:", error);
    }
}

// ✅ Obtener tarjetas desde IndexedDB
export async function getCardsFromDB(): Promise<Tarjeta[]> {
    try {
        const db = await initDB();
        if (!db) return [];

        const cards = await db.getAll(STORE_CARDS);
        console.log(`🔎 ${cards.length} tarjetas encontradas en IndexedDB.`);
        
        return cards.map(card => ({
            ...card,
            createdAt: card.createdAt ? new Date(card.createdAt) : undefined,
            updatedAt: card.updatedAt ? new Date(card.updatedAt) : undefined,
        })) as Tarjeta[];
    } catch (error) {
        console.error("❌ Error al obtener tarjetas de IndexedDB:", error);
        return [];
    }
}

// ✅ Verificar si es necesario actualizar las tarjetas (cada 2 días)
export async function shouldUpdateCards(): Promise<boolean> {
    const lastUpdate = await getLastUpdate("tarjetas");
    if (!lastUpdate) return true;

    const now = new Date();
    const diff = now.getTime() - lastUpdate.getTime();
    return diff > 2 * 24 * 60 * 60 * 1000; // 2 días en milisegundos
}

// ✅ Guarda la última fecha de actualización de una entidad
export async function saveLastUpdate(entidad: string, date: Date) {
    const db = await initDB();
    if (!db) return;

    const tx = db.transaction(STORE_UPDATES, "readwrite");
    const store = tx.objectStore(STORE_UPDATES);
    await store.put({ entidad, updatedAt: date.toISOString() });
    await tx.done;
}

// ✅ Obtiene la última fecha de actualización
export async function getLastUpdate(entidad: string): Promise<Date | null> {
    const db = await initDB();
    if (!db) return null;

    const result = await db.get(STORE_UPDATES, entidad);
    return result ? new Date(result.updatedAt) : null;
}

// ✅ Verifica si han pasado más de 2 horas desde la última actualización
export async function shouldUpdateProducts(): Promise<boolean> {
    const lastUpdate = await getLastUpdate("productos");
    if (!lastUpdate) return true;

    const now = new Date();
    const diff = now.getTime() - lastUpdate.getTime();
    return diff > 2 * 60 * 60 * 1000; // 2 horas en ms
}

// ✅ Guarda productos en IndexedDB
export async function saveProducts(products: Product[]) {
    try {
        const db = await initDB();
        if (!db) {
            console.warn("⚠️ No se pudo inicializar IndexedDB");
            return;
        }
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        for (const product of products) {
            store.put({
                ...product,
                status: product.status ?? "available", // ✅ Asegurar que `status` nunca sea `undefined`
                componentes: product.componentes ?? [], // ✅ Asegurar que `componentes` siempre sea un array
                sectionPriorities: product.sectionPriorities ?? {}, // ✅ Asegurar que `sectionPriorities` siempre sea un objeto
                createdAt: product.createdAt ? product.createdAt.toISOString() : undefined,
                updatedAt: product.updatedAt ? product.updatedAt.toISOString() : undefined,
            });
        }
        await tx.done;     
    } catch (error) {
        console.error("❌ Error al guardar productos en IndexedDB:", error);
    }
}

// ✅ Obtiene productos de IndexedDB
export async function getProductsFromDB(): Promise<Product[]> {
    if (typeof window === "undefined") {
        console.warn("⚠️ Intento de acceso a IndexedDB en el servidor, abortando.");
        return [];
    }

    try {
        const db = await initDB();
        if (!db) {
            console.error("❌ IndexedDB no está disponible.");
            return [];
        }

        const products = await db.getAll(STORE_NAME);

        return products.map(product => ({
            ...product,
            status: product.status && ["available", "out_of_stock", "discontinued"].includes(product.status)
                ? product.status
                : "available", // ✅ Garantiza que `status` tenga un valor válido
            componentes: Array.isArray(product.componentes) ? product.componentes : [], // ✅ Asegurar que `componentes` siempre sea un array
            sectionPriorities: product.sectionPriorities ?? {}, // ✅ Asegurar que `sectionPriorities` siempre sea un objeto
            createdAt: product.createdAt ? new Date(product.createdAt) : undefined,
            updatedAt: product.updatedAt ? new Date(product.updatedAt) : undefined,
        })) as Product[];
    } catch (error) {
        console.error("❌ Error al obtener productos de IndexedDB:", error);
        return [];
    }
}