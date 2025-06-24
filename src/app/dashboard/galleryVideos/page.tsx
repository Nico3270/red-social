import { fetchGalleryVideos } from "@/galeria/actions/fetchGalleryVideos";
import ShowGalleryVideos from "@/galeria/componentes/ShowGalleryVideos";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
const Page = async () => {
  // Obtenemos los videos desde la base de datos mediante una action
  const videos = await fetchGalleryVideos();

  // Filtramos las propiedades innecesarias
  const filteredVideos = videos.map(({ id, url, title, description, order }) => ({
    id,
    url,
    title,
    description,
    order,
  }));

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-8 md:px-12">
      
      {/* Componente para mostrar y manejar la galería */}
      <ShowGalleryVideos initialVideos={filteredVideos} />
    </main>
  );
};

export default Page;
