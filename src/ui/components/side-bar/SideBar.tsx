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
import { FaMoneyBillTransfer, FaStore } from "react-icons/fa6";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

interface SideBarProps {
  open: boolean;
  toggleDrawer: (open: boolean) => void;
  role?: string;
}

type MenuItem = {
  name: string;
  link?: string;
  onClick?: () => void;
  icon: React.JSX.Element;
};

const menuConfig: Record<"admin" | "user" | "negocio", MenuItem[]> = {
  user: [
    { name: "Dashboard", link: "/dashboard", icon: <DashboardIcon /> },
    // { name: "Perfil", link: "/dashboard/perfil", icon: <FaMoneyBillTransfer /> },
  ],
  admin: [
    { name: "Perfil", link: "/dashboard/perfil", icon: <FaMoneyBillTransfer /> },
    { name: "Perfil 2", link: "/perfil", icon: <FaStore /> },
  ],
  negocio: [
    { name: "Dashboard", link: "/dashboard", icon: <DashboardIcon /> },
  ],
};

export const SideBar: React.FC<SideBarProps> = ({ open, toggleDrawer }) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const role = (session?.user?.role as "admin" | "user" | "negocio") || "user";

  const perfilNegocio: MenuItem = {
    name: session?.user?.negocioNombre || "Mi negocio",
    link: `/perfil/${session?.user?.negocioSlug || "perfil"}`,
    icon: <FaStore />,
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/auth/login";
  };

  const handleLogin = async () => {
    await signIn();
  };

  const DrawerList = (
    <Box
      sx={{
        width: { xs: 220, sm: 260 }, // 📱 más angosta en móviles
        bgcolor: "#222831",
        color: "white",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      role="presentation"
      onClick={() => toggleDrawer(false)}
    >
      {/* 🔥 Header con logo y nombre */}
      <Link href="/" >
       <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 2,
          borderBottom: "1px solid #333",
        }}
      >
        <Image
          src="/imgs/Logo Final.png"
          alt="Logo Myckeo"
          width={36}
          height={36}
          className="rounded-full"
        />
        <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>Myckeo</span>
      </Box>
      
      </Link>
     

      <List sx={{ flexGrow: 1, py: 1 }}>
        {isAuthenticated ? (
          <>
            {[...menuConfig[role], ...(role === "negocio" ? [perfilNegocio] : [])].map(
              (item) => (
                <ListItem key={item.name} disablePadding sx={{ my: 0.3 }}>
                  <ListItemButton
                    component={item.link ? "a" : "button"}
                    href={item.link || undefined}
                    onClick={item.onClick}
                    sx={{
                      px: 2,
                      "&:hover": {
                        bgcolor: "#2c2c2c",
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: "white", minWidth: 36 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.name} />
                  </ListItemButton>
                </ListItem>
              )
            )}
            <Divider sx={{ bgcolor: "#333", my: 1 }} />
            <ListItemButton
              onClick={handleLogout}
              sx={{
                color: "red",
                "&:hover": {
                  bgcolor: "rgba(255,0,0,0.1)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "red", minWidth: 36 }}>
                <ExitToAppIcon />
              </ListItemIcon>
              <ListItemText primary="Cerrar sesión" />
            </ListItemButton>
          </>
        ) : (
          <ListItemButton
            onClick={handleLogin}
            sx={{
              color: "limegreen",
              "&:hover": {
                bgcolor: "rgba(0,255,0,0.1)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "limegreen", minWidth: 36 }}>
              <LoginRoundedIcon />
            </ListItemIcon>
            <ListItemText primary="Ingresar" />
          </ListItemButton>
        )}
      </List>
    </Box>
  );

  return (
    <Drawer
      open={open}
      anchor="right"
      onClose={() => toggleDrawer(false)}
      PaperProps={{
        sx: { bgcolor: "transparent", boxShadow: "none" },
      }}
    >
      {DrawerList}
    </Drawer>
  );
};
