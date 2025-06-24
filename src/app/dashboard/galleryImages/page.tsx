import { fetchGalleryImages } from "@/galeria/actions/fetchGalleryImages";
import ShowGalleryImages from "@/galeria/componentes/ShowGalleryImages";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
const Page = async () => {
  // Obtenemos las imágenes desde la base de datos mediante una action
  const images = await fetchGalleryImages();

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-8 md:px-12">
      {/* Componente para mostrar y manejar la galería */}
      <ShowGalleryImages initialImages={images} />
    </main>
  );
};

export default Page;
