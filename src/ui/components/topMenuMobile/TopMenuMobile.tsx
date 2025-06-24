"use client";

import Link from "next/link";
import React, { useState } from "react";
import {
  FaShoppingCart,
  FaHeart,
  FaUser,
  FaBars,
  FaGifts,
  FaBookOpen,
} from "react-icons/fa";
import Image from "next/image";
import { MenuSectionsBar } from "../menu-section-bar/MenuSectionBar";
import { SideBar } from "../side-bar/SideBar";
import { LogoFont } from "@/config/fonts";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { useFavoritesCatalogoStore } from "@/store/favoritos/favoritos-store";
import { TopMenuConfig as tp } from "@/config/config";
import { InfoEmpresa as empresa } from "@/config/config";

export const TopMenuMobile = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Extraer cantidades desde los stores
  const totalItemsInCart = useCartCatalogoStore((state) => state.getTotalItems());
  const totalFavorites = useFavoritesCatalogoStore((state) => state.getTotalItems());

  const toggleDrawer = (open: boolean) => {
    setIsDrawerOpen(open);
  };

  return (
    <div>
      {/* Barra superior fija para pantallas pequeñas */}
      <header
        className={`color-fondo-principal color-logos ${LogoFont.className} py-2 shadow-lg fixed top-0 w-full z-50`}
      >
        <div className="container mx-auto flex justify-between items-center px-4">
          {/* Logo y nombre del restaurante a la izquierda */}
          <div className="flex items-center">
            <Link href="/">
              <Image
                src={empresa.imagenesPlaceholder.logoEmpresa}
                alt={`Logo ${empresa.titulo}`}
                width={tp.width_height_logo_topMenuMobile}
                height={tp.height_height_logo_topMenuMobile}
              />
            </Link>
            <div className="ml-2 text-left">
              <Link href="/">
                <span className={`block text-md font-bold leading-tight`}>
                  {empresa.nombreCorto.parte1}
                </span>
                <span className={`block text-md font-bold leading-tight`}>
                  {empresa.nombreCorto.parte2}
                </span>
              </Link>
            </div>
          </div>

          {/* Menú hamburguesa a la derecha */}
          <button onClick={() => setMenuOpen(!menuOpen)}>
            <FaBars className="text-2xl" />
          </button>
        </div>

        {/* Menú desplegable */}
        {menuOpen && (
          <div className="absolute top-12 left-0 w-full bg-white shadow-lg z-20 py-4">
            <nav className="space-y-4 flex flex-col items-center">
              {tp.EnlacesNavegacionTopMenu.map((item) => (
                <Link
                  href={`${item.ruta}`}
                  key={item.section}
                  className="links"
                >
                  {item.section}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Barra de secciones fija */}
      <div className="fixed top-[4rem] w-full bg-white z-40 border-b shadow-md">
        <MenuSectionsBar />
      </div>

      {/* Espaciado para evitar que el contenido quede oculto */}
      <div className="mt-[8rem]">
        {/* Aquí va el contenido principal de la página */}
      </div>

      {/* Barra inferior de navegación fija */}
      <nav className="bg-white fixed bottom-0 w-full z-50 border-t shadow-lg">
        <div className="flex justify-around items-center py-2">
          <Link
            href={tp.enlacePrincipalInferior.ruta}
            className="flex flex-col items-center"
          >
            <FaGifts className="text-xl" />
            <span className="text-xs">{tp.enlacePrincipalInferior.nombre}</span>
          </Link>

          {/* Botón de Blogs*/}
          <Link
            href="/blog"
            className="relative flex flex-col items-center hover:text-gray-400"
          >
            <FaBookOpen className="text-xl" />
           
            <span className="text-xs">Blog</span>
          </Link>

          {/* Botón de favoritos */}
          <Link
            href="/favoritos"
            className="relative flex flex-col items-center hover:text-gray-400"
          >
            <FaHeart className="text-xl" />
            {totalFavorites > 0 && (
              <span
                className={`absolute top-0 right-0 ${tp.Color_Circulo_Numero_Iconos_Mobile} rounded-full text-xs w-4 h-4 flex items-center justify-center transform translate-x-1/4 -translate-y-1/2`}
              >
                {totalFavorites}
              </span>
            )}
            <span className="text-xs">Favoritos</span>
          </Link>

          {/* Botón de carrito */}
          <Link
            href="/carro"
            className="relative flex flex-col items-center hover:text-gray-400"
          >
            <FaShoppingCart className="text-xl" />
            {totalItemsInCart > 0 && (
              <span
                className={`absolute top-0 right-0 ${tp.Color_Circulo_Numero_Iconos_Mobile} rounded-full text-xs w-4 h-4 flex items-center justify-center transform translate-x-1/4 -translate-y-1/2`}
              >
                {totalItemsInCart}
              </span>
            )}
            <span className="text-xs">Carrito</span>
          </Link>

          {/* Botón de perfil */}
          <button
            onClick={() => toggleDrawer(true)}
            className="flex flex-col items-center"
          >
            <FaUser className="text-xl" />
            <span className="text-xs">Perfil</span>
          </button>
        </div>
      </nav>
      <SideBar role="admin" open={isDrawerOpen} toggleDrawer={toggleDrawer} />
    </div>
  );
};
