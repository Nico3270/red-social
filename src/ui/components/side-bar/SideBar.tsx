"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import { useSession, signIn, signOut } from "next-auth/react";


interface SideBarProps {
  open: boolean;
  toggleDrawer: (open: boolean) => void;
  role?: string; // Hacemos que 'role' sea opcional
}

// Configuración del menú para cada rol
const menuConfig: Record<
  "admin" | "user" | "negocio", 
  {
    name: string;
    link?: string;
    onClick?: () => void;
    icon: React.JSX.Element;
  }[]
> = {
  user: [
    // { name: "Perfil", link: "/profile", icon: <PeopleIcon /> },
    { name: "Dashboard", link: "/dashboard", icon: <DashboardIcon /> },
    { name: "Perfil", link: "/dashboard/perfil", icon: <FaMoneyBillTransfer /> },
    { name: "Perfil 2", link: "/perfil", icon: <FaMoneyBillTransfer /> },

    // { name: "Nuevo producto", link: "/dashboard/productos/newProduct", icon: <MdAddBusiness /> },
    // { name: "Gestionar productos", link: "/dashboard/productos", icon: <MdDashboardCustomize /> },
    // { name: "Orden de los productos", link: "/dashboard/sections/order", icon: <MdDashboardCustomize /> },
    // { name: "Secciones", link: "/dashboard/sections", icon: <FaBookOpen /> },
    // { name: "Pedidos", link: "/dashboard/orders", icon: <AutoAwesomeMotionRoundedIcon /> },
    // { name: "Transacciones", link: "/dashboard/transacciones", icon: <FaMoneyBillTransfer /> },
    // { name: "Productos", link: "/dashboard/productos", icon: <MenuBookRoundedIcon /> },
    // { name: "Blogs", link: "/dashboard/blog", icon: <SiReadthedocs /> },
    // { name: "Nuevo Blog", link: "/dashboard/blog/newBlog", icon: <IoDocument /> },
    // { name: "Nueva sección", link: "/dashboard/newSection", icon: <FaBookmark /> },
    // { name: "Galería de imágenes", link: "/dashboard/galleryImages", icon: <IoMdPhotos /> },
    // { name: "Galería de videos", link: "/dashboard/galleryVideos", icon: <FaPhotoVideo /> },
    // { name: "Servicios", link: "/dashboard/servicios", icon: <MdMiscellaneousServices /> },
    // { name: "Usuarios", link: "/dashboard/users", icon: <FaUserEdit /> },

  ],
  admin: [
    // { name: "Perfil", link: "/profile", icon: <PeopleIcon /> },
    { name: "Perfil", link: "/dashboard/perfil", icon: <FaMoneyBillTransfer /> },
    { name: "Perfil 2", link: "/perfil", icon: <FaMoneyBillTransfer /> },
  ],
  negocio: [
    // { name: "Perfil", link: "/profile", icon: <PeopleIcon /> },
    { name: "Perfil", link: "/dashboard/perfil", icon: <FaMoneyBillTransfer /> },
    { name: "Perfil 2", link: "/perfil", icon: <FaMoneyBillTransfer /> },
  ],
};

export const SideBar: React.FC<SideBarProps> = ({ open, toggleDrawer }) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const role = (session?.user?.role as "admin" | "user") || "user";

  const handleLogout = async () => {
    await signOut({ redirect: false }); // Desactiva la redirección automática
    window.location.href = "/auth/login"; // Redirige manualmente
  };

  const handleLogin = async () => {
    await signIn();
  };

  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation" onClick={() => toggleDrawer(false)}>
      <List>
        {isAuthenticated ? (
          // Si está autenticado, mostrar opciones según el rol
          <>
            {menuConfig[role].map((item) => (
              <ListItem key={item.name} disablePadding>
                <ListItemButton
                  component={item.link ? "a" : "button"}
                  href={item.link ? item.link : undefined}
                  onClick={item.onClick ? item.onClick : undefined}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.name} />
                </ListItemButton>
              </ListItem>
            ))}
            <Divider />
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon>
                <ExitToAppIcon />
              </ListItemIcon>
              <ListItemText primary="Cerrar sesión" />
            </ListItemButton>
          </>
        ) : (
          // Si no está autenticado, mostrar solo la opción de iniciar sesión
          <ListItemButton onClick={handleLogin}>
            <ListItemIcon>
              <LoginRoundedIcon />
            </ListItemIcon>
            <ListItemText primary="Ingresar" />
          </ListItemButton>
        )}
      </List>
    </Box>
  );

  return (
    <Drawer open={open} anchor="right" onClose={() => toggleDrawer(false)}>
      {DrawerList}
    </Drawer>
  );
};
