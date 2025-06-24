"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaShoppingCart, FaHeart, FaUser } from "react-icons/fa";
import Image from "next/image";
import { SideBar } from "../side-bar/SideBar";
import { MenuSectionsBar } from "../menu-section-bar/MenuSectionBar";
import { SeccionesFont} from "@/config/fonts";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { useFavoritesCatalogoStore } from "@/store/favoritos/favoritos-store";
import { TopMenuConfig as tp } from "@/config/config";
import { InfoEmpresa as empresa } from "@/config/config";

export const TopMenu = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const totalItemsInCart = useCartCatalogoStore((state) => state.getTotalItems());
  const totalFavorites = useFavoritesCatalogoStore((state) => state.getTotalItems());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = (open: boolean) => {
    setIsDrawerOpen(open);
  };

  // Renderizar un fallback si no está hidratado
  if (!hydrated) {
    return null;
  }

  return (
    <header
    
      className="py-2 shadow-lg sticky top-0 z-50 color-principal color-fondo-principal"
    >
      <div className="container mx-auto flex justify-between items-center px-4">
        {/* Logo de la empresa */}
        <div className="flex items-center">
          <Link href="/">
            <Image
              src={empresa.imagenesPlaceholder.logoEmpresa}
              alt={empresa.descripcion}
              width={tp.widthLogo}
              height={tp.heightLogo}
            />
          </Link>
          <div className="ml-4 text-left">
            <Link href="/">
              <span
                
                className={`block text-xl font-bold leading-tight color-logos ${SeccionesFont.className}`}
              >
                {empresa.nombreCorto.parte1}
              </span>
              <span
                
                className={`block text-xl font-bold color-logos leading-tight ${SeccionesFont.className}`}
              >
                {empresa.nombreCorto.parte2}
              </span>
            </Link>
          </div>
        </div>

        {/* Enlaces de navegación */}
        <nav className="space-x-8 hidden md:flex">
          {tp.EnlacesNavegacionTopMenu.map((item) => (
            <Link
              key={item.section}
              href={item.ruta}
              className={` ${SeccionesFont.className} color-principal font-bold text-xl`}
            >
              {item.section} 
            </Link>
          ))}
        </nav>

        {/* Iconos */}
        <div className="flex space-x-6 items-center">
          <Link
            href={totalItemsInCart === 0 ? "/empty" : "/carro"}
            className="relative links"
          >
            <FaShoppingCart
              
              className="text-2xl color-iconos"
            />
            {totalItemsInCart > 0 && (
              <span
                className=
                {`absolute top-0 right-0 numeros-iconos  font-bold rounded-full text-xs w-5 h-5 flex items-center justify-center transform translate-x-1/2 -translate-y-1/2`}
              >
                {totalItemsInCart}
              </span>
            )}
          </Link>
          <Link href="/favoritos" className="relative links">
            <FaHeart
              
              className="text-2xl color-iconos"
            />
            {totalFavorites > 0 && (
              <span
                className={`absolute top-0 right-0 numeros-iconos  font-bold rounded-full text-xs w-5 h-5 flex items-center justify-center transform translate-x-1/2 -translate-y-1/2`}
              >
                {totalFavorites}
              </span>
            )}
          </Link>
          <button onClick={() => toggleDrawer(true)}>
            <FaUser
              
              className="text-2xl color-iconos"
            />
          </button>
        </div>
      </div>
      <SideBar open={isDrawerOpen} toggleDrawer={toggleDrawer}  />
      <MenuSectionsBar />
    </header>
  );
};
