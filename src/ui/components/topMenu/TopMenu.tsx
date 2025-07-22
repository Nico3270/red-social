"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { FaHome, FaCompass, FaPlusSquare, FaBell, FaUserCircle, FaSearch } from "react-icons/fa";
import { SideBar } from "../side-bar/SideBar";
import { MenuSectionsBar } from "../menu-section-bar/MenuSectionBar";

export const TopMenu = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const filteredProducts = []; // Placeholder para los resultados de búsqueda

  return (
    <header className="fixed top-0 w-full z-50 bg-white shadow-md border-b">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-20">
        {/* Logo a la izquierda */}
        <Link href="/" className="flex items-center">
          <Image
            src="/imgs/logo final-1.png"
            alt="Logo MagiSurprise"
            width={80}
            height={80}
            className="rounded-full"
          />
        </Link>

        {/* Barra de búsqueda centrada */}
        <div className="relative w-full max-w-lg mx-4 p-1">
          <div className="flex items-center bg-white rounded-full shadow-md border border-gray-300 px-4 py-2">
            <FaSearch className="text-gray-500" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent outline-none ml-3 text-gray-800"
            />
          </div>
          
        </div>

        {/* Iconos de navegación alineados a la derecha */}
        <nav className="flex items-center space-x-6 text-gray-700">
          <Link href="/" className="flex flex-col items-center">
            <FaHome className="text-2xl md:text-3xl hover:text-[#ff6b6b]" />
            <span className="text-xs mt-1">Inicio</span>
          </Link>
          <Link href="/explorar" className="flex flex-col items-center">
            <FaCompass className="text-2xl md:text-3xl hover:text-[#ff6b6b]" />
            <span className="text-xs mt-1">Explorar</span>
          </Link>
          <Link href="/crear" className="flex flex-col items-center">
            <FaPlusSquare className="text-2xl md:text-3xl hover:text-[#ff6b6b]" />
            <span className="text-xs mt-1">Crear</span>
          </Link>
          <Link href="/notificaciones" className="flex flex-col items-center relative">
            <FaBell className="text-2xl md:text-3xl hover:text-[#ff6b6b]" />
            <span className="text-xs mt-1">Alertas</span>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center">3</span>
          </Link>
          <button onClick={() => setIsDrawerOpen(true)} className="flex flex-col items-center">
            <FaUserCircle className="text-2xl md:text-3xl hover:text-[#ff6b6b]" />
            <span className="text-xs mt-1">Perfil</span>
          </button>
        </nav>
      </div>

      {/* Drawer lateral */}
      <SideBar open={isDrawerOpen} toggleDrawer={setIsDrawerOpen} />
       <MenuSectionsBar />
    </header>
  );
};