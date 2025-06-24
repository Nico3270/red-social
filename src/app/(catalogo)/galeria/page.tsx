import GalleryComponent from "@/galeria/componentes/GalleryComponent";
import { getProductsCarrusel } from "@/producto/actions/getProductsCarrusel";
import { ProductsCarrusel } from "@/producto/components/ProductsCarrusel";
import { fetchGalleryImages } from "@/galeria/actions/fetchGalleryImages";
import { fetchGalleryVideos } from "@/galeria/actions/fetchGalleryVideos";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché


export default async function GalleryPage() {
  // Llamada a las acciones para obtener los datos
  const productsCarrusel = await getProductsCarrusel();
  const images = await fetchGalleryImages();
  const videos = await fetchGalleryVideos();

  return (
    <div>
      {/* Pasamos las imágenes y videos desde la base de datos */}
      <GalleryComponent videos={videos} images={images} />
      <ProductsCarrusel products={productsCarrusel} />
    </div>
  );
}
