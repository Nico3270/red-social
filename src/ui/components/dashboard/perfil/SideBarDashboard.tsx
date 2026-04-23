"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import {
  FaUser,
  FaBox,
  FaHome,
  FaUserEdit,
  FaBook,
  FaListUl,
  FaShoppingCart,
  FaStore,
  FaQrcode,
} from "react-icons/fa";
import { useSidebarStore } from "@/store/sideBar/sideBar-store";
import { IoMdAddCircle } from "react-icons/io";
import { FaFilePen, FaMoneyBillTransfer, FaFolderTree } from "react-icons/fa6";
import { useSession } from "next-auth/react";
import { MdHomeRepairService } from "react-icons/md";
import { AdminPanelSettings } from "@mui/icons-material";

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

type AppRole = "user" | "negocio" | "admin" | "super_admin";

const isMobileViewport = () =>
  typeof window !== "undefined" && window.innerWidth < 640;

const isAppRole = (role: unknown): role is AppRole =>
  role === "user" ||
  role === "negocio" ||
  role === "admin" ||
  role === "super_admin";

const SideBarDashboard: React.FC = () => {
  const { isSidebarOpen } = useSidebarStore();
  const pathname = usePathname();
  const { data: session } = useSession();

  const nombreNegocio = session?.user?.negocioNombre || "";
  const slug = session?.user?.negocioSlug || null;
  const rawRole = session?.user?.role;
  const role: AppRole = isAppRole(rawRole) ? rawRole : "user";
  const isRestrictedBusiness =
    role === "negocio" &&
    session?.user?.hasManagedBusiness &&
    session.user.businessOperational === false;

  const navItemsNegocio: NavItem[] = [
    { name: "Inicio", path: "/", icon: <FaHome /> },
    { name: "Perfil", path: "/dashboard", icon: <FaUser /> },
    {
      name: nombreNegocio || "Mi negocio",
      path: slug ? `/perfil/${slug}` : "/dashboard",
      icon: <FaUser />,
    },
    {
      name: "Nuevo producto",
      path: "/dashboard/productos/nuevo_producto",
      icon: <IoMdAddCircle />,
    },
    { name: "Productos", path: "/dashboard/productos", icon: <FaBox /> },
    {
      name: "Organización del Catálogo",
      path: "/dashboard/organizacion-catalogo",
      icon: <FaFolderTree />,
    },
    {
      name: "Nueva Publicación",
      path: "/dashboard/crear-publicacion",
      icon: <FaFilePen />,
    },
    { name: "Pedidos", path: "/dashboard/orders", icon: <FaShoppingCart /> },
    {
      name: "Transacciones",
      path: "/dashboard/transacciones",
      icon: <FaMoneyBillTransfer />,
    },
    { name: "Reservas", path: "/dashboard/reservas", icon: <FaBook /> },
    {
      name: "Servicios",
      path: "/dashboard/servicios",
      icon: <MdHomeRepairService />,
    },
    { name: "Encuestas", path: "/dashboard/encuestas", icon: <FaListUl /> },
    {
      name: "Editar usuario",
      path: "/dashboard/editar-usuario",
      icon: <FaUserEdit />,
    },
    {
      name: "Editar Negocio",
      path: "/dashboard/editar-perfil",
      icon: <FaUserEdit />,
    },
    { name: "QR de tu negocio", path: "/dashboard/qr", icon: <FaQrcode /> },
  ];

  const navItemsNegocioArchivado: NavItem[] = [
    { name: "Inicio", path: "/", icon: <FaHome /> },
    { name: "Dashboard", path: "/dashboard", icon: <FaUser /> },
    {
      name: "Editar usuario",
      path: "/dashboard/editar-usuario",
      icon: <FaUserEdit />,
    },
  ];

  const navItemsUser: NavItem[] = [
    { name: "Inicio", path: "/", icon: <FaHome /> },
    { name: "Perfil", path: "/dashboard", icon: <FaUser /> },
    {
      name: "Editar usuario",
      path: "/dashboard/editar-usuario",
      icon: <FaUserEdit />,
    },
    {
      name: "Crear Negocio",
      path: `/crear_negocio/${session?.user?.id ?? ""}`,
      icon: <FaStore />,
    },
  ];

  const navItemsAdmin: NavItem[] = [
    { name: "Inicio", path: "/", icon: <FaHome /> },
    { name: "Clientes", path: "/dashboard", icon: <FaUser /> },
  ];

  const navItemsSuperAdmin: NavItem[] = [
    { name: "Inicio", path: "/", icon: <FaHome /> },
    { name: "Dashboard", path: "/dashboard", icon: <FaUser /> },
    {
      name: "Myckeo Admin",
      path: "/myckeoAdmin",
      icon: <AdminPanelSettings />,
    },
    {
      name: "Editar usuario",
      path: "/dashboard/editar-usuario",
      icon: <FaUserEdit />,
    },
  ];

  let items: NavItem[];

  if (role === "super_admin") {
    items = navItemsSuperAdmin;
  } else if (role === "admin") {
    items = navItemsAdmin;
  } else if (role === "negocio") {
    items = isRestrictedBusiness ? navItemsNegocioArchivado : navItemsNegocio;
  } else {
    items = navItemsUser;
  }

  const showLabels = isSidebarOpen || isMobileViewport();

  return (
    <div className="flex h-full flex-col bg-gray-900 text-white z-50">
      <div className="flex items-center justify-center border-b border-gray-700 bg-white pt-5 sm:mt-0 sm:p-3 sm:pt-0.5">
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/imgs/Logo Final (1).png"
            alt="Logo Myckeo"
            width={50}
            height={50}
            unoptimized
            className="rounded-full"
          />

          {showLabels && (
            <span
              className="relative text-xl font-bold tracking-tight text-gray-900"
              style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.15)" }}
            >
              Myckeo
            </span>
          )}
        </Link>
      </div>

      <nav className="z-50 flex-1 overflow-y-auto p-4">
        <ul className="space-y-3">
          {items.map((item) => {
            const isActive = pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center rounded-lg p-3 transition-colors duration-200 ${
                    isActive
                      ? "bg-gray-700 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                  aria-label={item.name}
                >
                  <span className="text-3xl sm:text-xl">{item.icon}</span>

                  {showLabels && <span className="ml-3 text-base">{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default SideBarDashboard;
