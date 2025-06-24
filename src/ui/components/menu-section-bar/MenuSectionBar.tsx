"use client";

import { titleFont } from "@/config/fonts";
import Link from "next/link";
import React, { useCallback, useEffect, useRef } from "react";


// 🔥 Solo importamos los íconos que estás utilizando actualmente
import { MdDevicesOther, MdOutlinePhoneIphone } from "react-icons/md";
import {FaTabletAlt, FaLaptop, FaHome, FaHeadphonesAlt } from "react-icons/fa";
import { BsSmartwatch } from "react-icons/bs";
import { IoBookSharp, IoTvSharp } from "react-icons/io5";
import { GiClothes } from "react-icons/gi";
import { FaSprayCanSparkles } from "react-icons/fa6";
import { LuSandwich } from "react-icons/lu";
import { GiTwirlyFlower } from "react-icons/gi";
import { FaChildren } from "react-icons/fa6";
import { FaBirthdayCake } from "react-icons/fa";
import { useSectionStoreMagiSurprise } from "@/store/sections/sections-store";
import { FaPlateWheat } from "react-icons/fa6";
import { FaBasketShopping } from "react-icons/fa6";
import { MdFastfood } from "react-icons/md";


// 🔥 Mapeamos los iconos a un objeto para fácil acceso
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
  LuSandwich ,
  GiTwirlyFlower,
  FaChildren,
  FaBirthdayCake,
  FaPlateWheat,
  FaBasketShopping,
  MdFastfood
};

export const MenuSectionsBar = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { sections, fetchSections } = useSectionStoreMagiSurprise();

  // ✅ Memoriza la función para evitar que cambie en cada render
  const fetchSectionsMemoized = useCallback(() => {
    fetchSections();
  }, [fetchSections]);

  useEffect(() => {
    fetchSectionsMemoized(); // ✅ Ahora `useEffect` no lanza el error
  }, [fetchSectionsMemoized]);

  return (
    <div className="relative w-full color-fondo-principal">
  <div
    ref={scrollContainerRef}
    className="flex overflow-x-auto space-x-6 p-4 w-full rounded-lg no-scrollbar justify-around md:justify-around color-principal"
    style={{ scrollBehavior: "smooth" }}
  >
    {sections.length === 0
      ? Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="animate-pulse flex flex-col items-center text-center min-w-[80px] max-w-[100px] md:min-w-0">
            <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
            <div className="mt-2 h-3 w-16 bg-gray-300 rounded"></div>
          </div>
        ))
      : sections.map((section) => {
          const IconComponent = IconSets[section.iconName] || MdDevicesOther;

          return (
            <Link key={section.id} href={`/seccion/${section.href}`}>
              <div className="flex flex-col items-center text-center w-[70px] sm:w-[80px] md:w-auto">
                <IconComponent className="text-3xl md:text-xl color-iconos" /> {/* 🔥 Más grande en móvil, normal en desktop */}
                <span
                  className={`text-xs md:text-sm mt-1 text-center leading-tight ${titleFont.className} color-iconos`}
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
