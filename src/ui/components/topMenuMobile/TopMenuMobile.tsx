"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  FaHome,
  FaCompass,
  FaPlusSquare,
  FaBell,
  FaUserCircle,
  FaSearch,
} from "react-icons/fa";
import { SideBar } from "../side-bar/SideBar";
import { MenuSectionsBar } from "../menu-section-bar/MenuSectionBar";

export const TopMenuMobile = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const filteredProducts: { id: number; slug: string; nombre: string }[] = []; // Placeholder

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
          <Link href="/" className="flex flex-col items-center">
            <FaHome className="text-xl" />
            <span className="text-xs">Inicio</span>
          </Link>
          <Link href="/explorar" className="flex flex-col items-center">
            <FaCompass className="text-xl" />
            <span className="text-xs">Explorar</span>
          </Link>
          <Link href="/crear" className="flex flex-col items-center">
            <FaPlusSquare className="text-xl" />
            <span className="text-xs">Crear</span>
          </Link>
          <Link href="/notificaciones" className="flex flex-col items-center relative">
            <FaBell className="text-xl" />
            <span className="text-xs">Alertas</span>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center">
              3
            </span>
          </Link>
          <button onClick={() => setIsDrawerOpen(true)} className="flex flex-col items-center">
            <FaUserCircle className="text-xl" />
            <span className="text-xs">Perfil</span>
          </button>
        </div>
      </nav>

      {/* Drawer lateral */}
      <SideBar open={isDrawerOpen} toggleDrawer={setIsDrawerOpen} />
    </div>
  );
};