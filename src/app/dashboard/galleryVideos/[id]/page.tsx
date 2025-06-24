import React from "react";
import { getVideoFromGalleryById } from "@/galeria/actions/getVideoFromGalleryById";
import ModifyGalleryVideo from "@/galeria/componentes/ModifyGalleryVideo";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
interface Props {
  params: Promise<{ id: string }>;
}

const Page = async ({ params }: Props) => {
  // Resolver params antes de acceder a 'id'
  const { id } = await params;

  const video = await getVideoFromGalleryById(id);

  if (!video) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-800">Video no encontrado</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-8 md:px-12">
      <ModifyGalleryVideo initialVideo={video} />
    </main>
  );
};

export default Page;
