"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  FaHome,
  FaPlusSquare,
  FaUserCircle,
  FaSearch,
  FaShoppingCart,
  FaHeart,
} from "react-icons/fa";
import { SideBar } from "../side-bar/SideBar";
import { MenuSectionsBar } from "../menu-section-bar/MenuSectionBar";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { useFavoritesCatalogoStore } from "@/store/favoritos/favoritos-store";
import { CrearModal } from "./Crear";
import { useSession } from "next-auth/react";

export const TopMenu = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const totalItemsInCart = useCartCatalogoStore((state) =>
    state.getTotalItems()
  );
  const totalFavorites = useFavoritesCatalogoStore((state) =>
    state.getTotalItems()
  );
  const { data: session } = useSession();
  const isNegocio = session?.user.role === "negocio";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
        <nav className="flex items-center space-x-2 md:space-x-4 text-gray-700">
          {/* Inicio */}
          <Link
            href="/"
            className="
      group relative flex flex-col items-center justify-center 
      w-12 h-12 md:w-14 md:h-14 
      rounded-xl border border-gray-200 
      bg-white shadow-md 
      hover:shadow-lg hover:border-blue-200
      transition-all duration-300
    "
          >
            <Image
              src="/imgs/iconos/home.png"
              alt="Inicio"
              width={24}
              height={24}
              className="
        w-5 h-5 md:w-6 md:h-6 text-gray-600 
        transform transition-all duration-300 
        group-hover:scale-110 group-hover:-translate-y-0.5 
        group-hover:rotate-3
      "
            />
            <span className="text-[10px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-blue-600">
              Inicio
            </span>
          </Link>

          {/* Carrito */}
          <Link
            href={mounted && totalItemsInCart > 0 ? "/carro" : "/empty"}
            className="
      group relative flex flex-col items-center justify-center 
      w-12 h-12 md:w-14 md:h-14 
      rounded-xl border border-gray-200 
      bg-white shadow-md 
      hover:shadow-lg hover:border-blue-200
      transition-all duration-300
    "
          >
            <Image
              src="/imgs/iconos/cart.png"
              alt="Inicio"
              width={24}
              height={24}
              className="
        w-5 h-5 md:w-6 md:h-6 text-gray-600 
        transform transition-all duration-300 
        group-hover:scale-110 group-hover:-translate-y-0.5 
        group-hover:rotate-3
      "
            />

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
            className="
      group relative flex flex-col items-center justify-center 
      w-12 h-12 md:w-14 md:h-14 
      rounded-xl border border-gray-200 
      bg-white shadow-md 
      hover:shadow-lg hover:border-blue-200
      transition-all duration-300
    "
          >
            <Image
              src="/imgs/iconos/heart.png"
              alt="Inicio"
              width={24}
              height={24}
              className="
        w-5 h-5 md:w-6 md:h-6 text-gray-600 
        transform transition-all duration-300 
        group-hover:scale-110 group-hover:-translate-y-0.5 
        group-hover:rotate-3
      "
            />
            {mounted && totalFavorites > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold rounded-full text-[10px] min-w-[18px] h-[18px] flex items-center justify-center shadow-md">
                {totalFavorites}
              </span>
            )}
            <span className="text-[10px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-red-500">
              Favoritos
            </span>
          </Link>

          {isNegocio && (
            <button
              onClick={() => setIsCrearModalOpen(true)}
              className="
      group relative flex flex-col items-center justify-center 
      w-12 h-12 md:w-14 md:h-14 
      rounded-xl border border-gray-200 
      bg-white shadow-md 
      hover:shadow-lg hover:border-blue-200
      transition-all duration-300
    "
            >
              <Image
                src="/imgs/iconos/plus.png"
                alt="Inicio"
                width={24}
                height={24}
                className="
        w-5 h-5 md:w-6 md:h-6 text-gray-600 
        transform transition-all duration-300 
        group-hover:scale-110 group-hover:-translate-y-0.5 
        group-hover:rotate-3
      "
              />
              <span className="text-[10px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-purple-600">
                Crear
              </span>
            </button>
          )}

          {/* Perfil */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="
      group relative flex flex-col items-center justify-center 
      w-12 h-12 md:w-14 md:h-14 
      rounded-xl border border-gray-200 
      bg-white shadow-md 
      hover:shadow-lg hover:border-blue-200
      transition-all duration-300
    "
          >
            <Image
              src="/imgs/iconos/profile.png"
              alt="Inicio"
              width={24}
              height={24}
              className="
        w-5 h-5 md:w-6 md:h-6 text-gray-600 
        transform transition-all duration-300 
        group-hover:scale-110 group-hover:-translate-y-0.5 
        group-hover:rotate-3
      "
            />
            <span className="text-[10px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-indigo-600">
              Perfil
            </span>
          </button>
        </nav>
      </div>

      {/* Drawer lateral */}
      <SideBar open={isDrawerOpen} toggleDrawer={setIsDrawerOpen} />
      <MenuSectionsBar />
      <CrearModal
        isOpen={isCrearModalOpen}
        onClose={() => setIsCrearModalOpen(false)}
      />
    </header>
  );
};
