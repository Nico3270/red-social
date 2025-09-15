"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { FaUser, FaBox, FaHome, FaUserEdit, FaBook, FaListUl, FaShoppingCart, FaStore } from "react-icons/fa";
import { useSidebarStore } from "@/store/sideBar/sideBar-store";
import { IoMdAddCircle } from "react-icons/io";
import { FaFilePen, FaMoneyBillTransfer } from "react-icons/fa6";
import { useSession } from "next-auth/react";
import { MdHomeRepairService } from "react-icons/md";

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const SideBarDashboard: React.FC = () => {
  const { isSidebarOpen } = useSidebarStore();
  const pathname = usePathname();
  const { data: session } = useSession();
  const nombreNegocio = session?.user.negocioNombre || "";
  const slug = session?.user?.negocioSlug || null;
  const role = session?.user?.role || "user"; // 'user' | 'negocio' | 'admin' - Default a 'user' para seguridad

  // Array para roles 'negocio' - Opciones completas y premium
  const navItemsNegocio: NavItem[] = [
    { name: "Inicio", path: "/", icon: <FaHome /> },
    { name: "Perfil", path: "/dashboard/perfil", icon: <FaUser /> },
    { name: `${nombreNegocio}`, path: `/perfil/${slug}`, icon: <FaUser /> },
    { name: "Nuevo producto", path: "/dashboard/productos/nuevo_producto", icon: <IoMdAddCircle /> },
    { name: "Productos", path: "/dashboard/productos", icon: <FaBox /> },
    { name: "Nueva Publicación", path: "/dashboard/crear-publicacion", icon: <FaFilePen /> },
    { name: "Pedidos", path: "/dashboard/orders", icon: <FaShoppingCart /> },
    { name: "Transacciones", path: "/dashboard/transacciones", icon: <FaMoneyBillTransfer /> },
    { name: "Reservas", path: "/dashboard/reservas", icon: <FaBook /> },
    { name: "Servicios", path: "/dashboard/servicios", icon: <MdHomeRepairService /> },
    { name: "Encuestas", path: "/dashboard/encuestas", icon: <FaListUl /> },
    { name: "Editar Perfil", path: "/dashboard/editar-perfil", icon: <FaUserEdit /> },
  ];

  // Array para otros roles - Opciones básicas para onboarding elegante
  const navItems: NavItem[] = [
    { name: "Inicio", path: "/", icon: <FaHome /> },
    { name: "Perfil", path: "/dashboard/perfil", icon: <FaUser /> },
    { name: "Crear Negocio", path: `/crear_negocio/${session?.user.id}`, icon: <FaStore /> },
  ];

  // Lógica condicional moderna: Selecciona items según rol para UX personalizada
  const items = role === 'negocio' ? navItemsNegocio : navItems;

  return (
    <div className="flex flex-col h-full bg-gray-800 text-white">
      {/* Logo y nombre de la aplicación - Centrado y responsive */}
      <div className="flex items-center justify-center sm:mt-0 mt-10 pt-5 sm:pt-3 sm:p-3 border-b bg-white border-gray-700">
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/imgs/Logo Final (1).png"
            alt="Logo Myckeo"
            width={50}
            height={50}
            unoptimized
            className="rounded-full"
          />
          {/* Mostrar nombre si el sidebar está abierto o en móviles - Con shadow sutil para elegancia */}
          {(isSidebarOpen || typeof window !== "undefined" && window.innerWidth < 640) && (
            <span
              className="text-xl font-bold tracking-tight relative text-gray-900"
              style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.15)" }}
            >
              Myckeo
            </span>
          )}
        </Link>
      </div>

      {/* Menú de navegación - Flexible y con scroll si excede altura */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
                  pathname === item.path
                    ? "bg-gray-700 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
                aria-label={item.name} // Accesibilidad premium, como en LinkedIn
              >
                <span className="text-3xl sm:text-xl">{item.icon}</span>
                {/* Mostrar nombres si sidebar abierto o mobile - Responsive y elegante */}
                {(isSidebarOpen || typeof window !== "undefined" && window.innerWidth < 640) && (
                  <span className="ml-3 text-base">{item.name}</span>
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