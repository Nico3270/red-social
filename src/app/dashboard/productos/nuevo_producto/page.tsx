import CreateNewProduct from "@/ui/components/productos/CreateNewProduct";
import NewProductHeader from "@/ui/components/productos/newProduct/NewProductHeader";
import styles from "@/ui/components/productos/newProduct/newProduct.module.css";
import { inter } from "@/config/fonts";

export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
export default async function NewProductPage() {
  return (
    <div className={`${styles.shell} ${inter.className}`}>
      <NewProductHeader />
      <CreateNewProduct />
    </div>
  );
}
