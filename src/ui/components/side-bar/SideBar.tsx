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
  role?: string;
}

// ✅ Tipo unificado para todos los items
type MenuItem = {
  name: string;
  link?: string;
  onClick?: () => void;
  icon: React.JSX.Element;
};

// Configuración del menú para cada rol
const menuConfig: Record<"admin" | "user" | "negocio", MenuItem[]> = {
  user: [
    { name: "Dashboard", link: "/dashboard", icon: <DashboardIcon /> },
    { name: "Perfil", link: "/dashboard/perfil", icon: <FaMoneyBillTransfer /> },
  ],
  admin: [
    { name: "Perfil", link: "/dashboard/perfil", icon: <FaMoneyBillTransfer /> },
    { name: "Perfil 2", link: "/perfil", icon: <FaMoneyBillTransfer /> },
  ],
  negocio: [
    { name: "Dashboard", link: "/dashboard", icon: <FaMoneyBillTransfer /> },

  ],
};

export const SideBar: React.FC<SideBarProps> = ({ open, toggleDrawer }) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const role = (session?.user?.role as "admin" | "user" | "negocio") || "user";

  // Perfil dinámico SOLO si es negocio
  const perfilNegocio: MenuItem = {
    name: session?.user?.negocioNombre || "Mi negocio",
    link: `/perfil/${session?.user?.negocioSlug || "perfil"}`,
    icon: <FaMoneyBillTransfer />,
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/auth/login";
  };

  const handleLogin = async () => {
    await signIn();
  };

  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation" onClick={() => toggleDrawer(false)}>
      <List>
        {isAuthenticated ? (
          <>
            {[...menuConfig[role], ...(role === "negocio" ? [perfilNegocio] : [])].map((item) => (
              <ListItem key={item.name} disablePadding>
                <ListItemButton
                  component={item.link ? "a" : "button"}
                  href={item.link || undefined}
                  onClick={item.onClick}
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
