
import { titleFont } from "@/config/fonts";
import { FavoritesGrid } from "@/favoritos/componentes/FavoritosGrid";
import { FaHeart } from "react-icons/fa";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché

export default function FavoritePage() {
  return (
    <div className="container mx-auto p-2 sm:mt-20 mb-10">
      {/* Título con Icono */}
      <div className="flex items-center justify-center sm:mt-24">
        <FaHeart className="text-red-500 text-4xl mr-3" />
        <h1 className={`text-2xl sm:text-3xl pt-4 font-bold text-center text-gray-800 ${titleFont.className}`}>Mis Favoritos</h1>
      </div>
      <FavoritesGrid />
    </div>
  );
}
