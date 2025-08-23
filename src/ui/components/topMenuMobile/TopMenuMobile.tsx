"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  FaHome,
  FaCompass,
  FaPlusSquare,
  FaBell,
  FaUserCircle,
  FaSearch,
  FaShoppingCart,
  FaHeart,
} from "react-icons/fa";
import { SideBar } from "../side-bar/SideBar";
import { MenuSectionsBar } from "../menu-section-bar/MenuSectionBar";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { useFavoritesCatalogoStore } from "@/store/favoritos/favoritos-store";

export const TopMenuMobile = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const filteredProducts: { id: number; slug: string; nombre: string }[] = []; // Placeholder
  const totalItemsInCart = useCartCatalogoStore((state) => state.getTotalItems());
  const totalFavorites = useFavoritesCatalogoStore((state) => state.getTotalItems());

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="sm:pb-16 shadow-lg"> {/* padding inferior para no tapar el contenido con el nav */}
      {/* Barra superior fija */}
      <header className="fixed top-0 w-full z-50 bg-white shadow-md border-b">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Logo a la izquierda */}
          <Link href="/" className="flex items-center">
            <Image
              src="/imgs/logo final-1.png"
              alt="Logo MagiSurprise"
              width={50}
              height={50}
              className="rounded-full"
            />
          </Link>

          {/* Barra de búsqueda en el centro */}
          <div className="flex-1 mx-4">
            <div className="flex items-center bg-white rounded-full shadow-md border border-green-600 px-3 py-1">
              <FaSearch className="text-green-600" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent outline-none ml-2 text-sm"
              />
            </div>
            {filteredProducts.length > 0 && (
              <div className="absolute z-10 bg-white shadow-lg rounded-lg w-full mt-2 max-h-60 overflow-auto border border-gray-200">
                {filteredProducts.map((product) => (
                  <Link key={`${product.id}-${product.slug}`} href={`/producto/${product.slug}`}>
                    <div className="p-3 hover:bg-gray-100 cursor-pointer">{product.nombre}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Espaciado para evitar que el contenido quede oculto */}
      <div className="mt-16">
        <MenuSectionsBar />
      </div>

      {/* Barra inferior de navegación fija */}
      <nav className="bg-white fixed bottom-0 w-full z-50 border-t shadow-md">
        <div className="flex justify-around items-center py-2">
          <Link
            href="/"
            className="group relative flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-sm"
          >
            <FaHome className="text-xl md:text-2xl text-gray-600 group-hover:text-blue-600 transition-colors" />
            <span className="text-[10px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-blue-600">
              Inicio
            </span>
          </Link>

          {/* Carrito */}
<Link
  href={mounted && totalItemsInCart > 0 ? "/carro" : "/empty"}
  className="group relative flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-sm"
>
  <FaShoppingCart className="text-xl md:text-2xl text-gray-600 group-hover:text-emerald-600 transition-colors" />

  {/* 👇 Evita mismatch usando mounted */}
  {mounted && totalItemsInCart > 0 && (
    <span className="absolute -top-1 -right-1 bg-emerald-600 text-white font-bold rounded-full text-[10px] min-w-[18px] h-[18px] flex items-center justify-center shadow-md">
      {totalItemsInCart}
    </span>
  )}

  <span className="text-[10px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-emerald-600">
    Carro
  </span>
</Link>



          {/* Favoritos */}
          <Link
            href="/favoritos"
            className="group relative flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-sm"
          >
            <FaHeart className="text-xl md:text-2xl text-gray-600 group-hover:text-red-500 transition-colors" />
            {mounted && totalFavorites > 0 && (
  <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold rounded-full text-[10px] min-w-[18px] h-[18px] flex items-center justify-center shadow-md">
    {totalFavorites}
  </span>
)}

            <span className="text-[10px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-red-500">
              Favoritos
            </span>
          </Link>
          
          {/* Crear */}
          <Link
            href="/crear"
            className="group relative flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-sm"
          >
            <FaPlusSquare className="text-xl md:text-2xl text-gray-600 group-hover:text-purple-600 transition-colors" />
            <span className="text-[10px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-purple-600">
              Crear
            </span>
          </Link>


          {/* Perfil */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="group relative flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-sm"
          >
            <FaUserCircle className="text-xl md:text-2xl text-gray-600 group-hover:text-indigo-600 transition-colors" />
            <span className="text-[10px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-indigo-600">
              Perfil
            </span>
          </button>
        </div>
      </nav>

      {/* Drawer lateral */}
      <SideBar open={isDrawerOpen} toggleDrawer={setIsDrawerOpen} />
    </div>
  );
};