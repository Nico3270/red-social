"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { FaUser, FaBox, FaShoppingCart, FaHome, FaUserEdit } from "react-icons/fa"; // Ejemplo de íconos
import { useSidebarStore } from "@/store/sideBar/sideBar-store";
import { IoMdAddCircle } from "react-icons/io";
import { FaFilePen } from "react-icons/fa6";

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { name: "Inicio", path: "/dashboard", icon: <FaHome /> },
  { name: "Perfil", path: "/dashboard/perfil", icon: <FaUser /> },
  { name: "Nuevo producto", path: "/dashboard/productos/nuevo_producto", icon: <IoMdAddCircle /> },
  { name: "Productos", path: "/dashboard/productos", icon: <FaBox /> },
  { name: "Nueva Publicación", path: "/dashboard/crear-publicacion", icon: <FaFilePen /> },
  { name: "Editar Perfil", path: "/dashboard/editar-perfil", icon: <FaUserEdit /> },
];

const SideBarDashboard: React.FC = () => {
  const { isSidebarOpen } = useSidebarStore();
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-gray-800 text-white">
      {/* Logo y nombre de la aplicación */}
      <div className="flex items-center justify-center p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          {/* Placeholder para el logo */}
          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold">L</span>
          </div>
          {isSidebarOpen && (
            <h1 className="text-xl font-semibold">Mi App</h1>
          )}
        </div>
      </div>

      {/* Menú de navegación */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                className={`flex items-center p-2 rounded-lg transition-colors duration-200 ${
                  pathname === item.path
                    ? "bg-gray-700 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
                aria-label={item.name}
              >
                <span className="text-xl">{item.icon}</span>
                {isSidebarOpen && (
                  <span className="ml-3 text-sm">{item.name}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default SideBarDashboard;