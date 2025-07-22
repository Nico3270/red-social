// TopBarDashBoard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { FaBars, FaSignOutAlt } from "react-icons/fa";
import Image from "next/image";
import { useSidebarStore } from "@/store/sideBar/sideBar-store";

export const TopBarDashBoard: React.FC = () => {
  const { data: session } = useSession();
  const { isSidebarOpen, toggleSidebar } = useSidebarStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-between h-16 bg-white shadow-md px-6 z-30">
        <button
          className="p-2 text-gray-800 hover:text-gray-900 focus:outline-none rounded-md hover:bg-gray-100 transition-colors duration-200 z-50"
          aria-label="Abrir menú lateral"
        >
          <FaBars className="text-2xl" />
        </button>
        <div className="flex-1 text-center">
          <h2 className="text-lg font-semibold text-gray-800">Usuario</h2>
        </div>
        <div className="flex items-center space-x-4">
          <Image
            src="/default-profile.png"
            alt="Perfil del usuario"
            width={32}
            height={32}
            className="rounded-full"
          />
          <button
            className="flex items-center space-x-2 text-gray-800 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-md transition-colors duration-200"
            aria-label="Cerrar sesión"
          >
            <FaSignOutAlt className="text-xl" />
            <span className="hidden md:inline text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    );
  }

  const userName = session?.user?.name || "Usuario";
  const userImage = session?.user?.image || "/default-profile.png";

  return (
    <div className="flex items-center justify-between h-16 bg-white shadow-md px-6 z-30">
      <button
        className="p-2 text-gray-800 hover:text-gray-900 focus:outline-none rounded-md hover:bg-gray-100 transition-colors duration-200 z-50"
        onClick={toggleSidebar}
        aria-label={isSidebarOpen ? "Cerrar menú lateral" : "Abrir menú lateral"}
      >
        <FaBars className="text-2xl" />
      </button>
      <div className="flex-1 text-center">
        <h2 className="text-lg font-semibold text-gray-800">{userName}</h2>
      </div>
      <div className="flex items-center space-x-4">
        <Image
          src={userImage}
          alt="Perfil del usuario"
          width={32}
          height={32}
          className="rounded-full"
        />
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center space-x-2 text-gray-800 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-md transition-colors duration-200"
          aria-label="Cerrar sesión"
        >
          <FaSignOutAlt className="text-xl" />
          <span className="hidden md:inline text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

export default TopBarDashBoard;