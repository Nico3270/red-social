"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { MdDevicesOther, MdOutlinePhoneIphone } from "react-icons/md";
import { FaTabletAlt, FaLaptop, FaHome, FaHeadphonesAlt, FaBirthdayCake } from "react-icons/fa";
import { BsSmartwatch } from "react-icons/bs";
import { IoBookSharp, IoTvSharp } from "react-icons/io5";
import { GiClothes } from "react-icons/gi";
import { FaSprayCanSparkles, FaPlateWheat, FaBasketShopping } from "react-icons/fa6";
import { LuSandwich } from "react-icons/lu";
import { GiTwirlyFlower } from "react-icons/gi";
import { FaChildren} from "react-icons/fa6";
import { MdFastfood } from "react-icons/md";
import { textmenuSections } from "@/config/fonts";
import { useState, useEffect } from 'react'




// Mapeamos los íconos a un objeto para fácil acceso
const IconSets: { [key: string]: React.ElementType } = {
  MdDevicesOther,
  FaSprayCanSparkles,
  BsSmartwatch,
  MdOutlinePhoneIphone,
  IoBookSharp,
  FaTabletAlt,
  FaLaptop,
  IoTvSharp,
  GiClothes,
  FaHome,
  FaHeadphonesAlt,
  LuSandwich,
  GiTwirlyFlower,
  FaChildren,
  FaBirthdayCake,
  FaPlateWheat,
  FaBasketShopping,
  MdFastfood,
};

// Secciones por defecto para la red social
const defaultSections = [
  { id: "1", name: "Carpintería", href: "carpinteria", iconName: "FaHome" },
  { id: "2", name: "Mecánica", href: "mecanica", iconName: "MdDevicesOther" },
  { id: "3", name: "Restaurantes", href: "restaurantes", iconName: "LuSandwich" },
  { id: "4", name: "Decoración", href: "decoracion", iconName: "GiTwirlyFlower" },
  { id: "5", name: "Moda", href: "moda", iconName: "GiClothes" },
  { id: "6", name: "Eventos", href: "eventos", iconName: "FaBirthdayCake" },
  { id: "7", name: "Eventos", href: "eventos", iconName: "FaBirthdayCake" },
  { id: "8", name: "Eventos", href: "eventos", iconName: "FaBirthdayCake" },
];

export const MenuSectionsBar = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false)
 
  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div className="relative w-full color-fondo-principal">
  <div
    ref={scrollContainerRef}
    className="flex overflow-x-auto space-x-6 p-2 w-full rounded-lg no-scrollbar justify-around md:justify-around color-principal"
    style={{ scrollBehavior: "smooth" }}
  >
    {defaultSections.length === 0
      ? Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="animate-pulse flex flex-col items-center text-center min-w-[80px] max-w-[100px] md:min-w-0">
            <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
            <div className="mt-2 h-3 w-16 bg-gray-300 rounded"></div>
          </div>
        ))
      : defaultSections.map((section) => {
          const IconComponent = IconSets[section.iconName] || MdDevicesOther;

          return (
            <Link key={section.id} href={`/seccion/${section.href}`}>
              <div className="flex flex-col items-center text-center w-[70px] sm:w-[80px] md:w-auto">
                <IconComponent className="text-3xl md:text-xl color-iconos" /> {/* 🔥 Más grande en móvil, normal en desktop */}
                <span
                  className={`text-xs md:text-sm mt-1 text-center leading-tight  color-iconos`}
                  style={{
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                    textWrap: "balance",
                    minHeight: "32px", // 🔥 Mantiene espacio suficiente para dos líneas si es necesario
                  }}
                >
                  {section.name}
                </span>
              </div>
            </Link>
          );
        })}
  </div>
</div>
  );
};
