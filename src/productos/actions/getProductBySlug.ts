import { Product } from "@/lib/indexedDB";

export async function getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const request = indexedDB.open("magicSurprise", 7);
  
      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction("products", "readonly");
          const store = transaction.objectStore("products");
          const getAll = store.getAll();
  
          getAll.onsuccess = () => {
            const product = getAll.result.find((p: Product) => p.slug === slug) || null;
            resolve(product);
          };
  
          getAll.onerror = () => reject(getAll.error);
        };
  
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("❌ Error al obtener el producto:", error);
      return null;
    }
  }
  