"use client";

import React, { useState, useEffect, lazy, Suspense } from "react";
import { useMediaQuery, useTheme } from "@mui/material";
import {
  Box,
  AppBar,
  Typography,
  Fade,
  Fab,
  BottomNavigation,
  BottomNavigationAction,
  Tabs,
  Tab,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import BarChartIcon from "@mui/icons-material/BarChart";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

import { getTransactions } from "@/transacciones/actions/getTransactions";
import { Transaction } from "@/transacciones/interfaces/types";

const AddTransactionComponent = lazy(() =>
  import("@/transacciones/componentes/AddTransactionComponent")
);
const GraficosTransacciones = lazy(() =>
  import("@/transacciones/componentes/GraficosTransacciones")
);
const ShowTransactions = lazy(() =>
  import("@/transacciones/componentes/ShowTransactions")
);

const Page = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState("add");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const fetchTransactions = async () => {
      const data = await getTransactions();
      if (data.transactions) setTransactions(data.transactions);
    };
    fetchTransactions();
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 200);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAddTransaction = (newTransaction: Transaction) => {
    setTransactions((prev) => [newTransaction, ...prev]);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navItems = [
    { label: "Agregar", icon: <AddIcon fontSize="small" />, value: "add" },
    { label: "Transacciones", icon: <ListAltIcon fontSize="small" />, value: "transactions" },
    { label: "Gráficos", icon: <BarChartIcon fontSize="small" />, value: "charts" },
  ];

  return (
    <Box sx={{ width: "100%", overflowX: "hidden" }}>
      
      {/* ================= DESKTOP NAV (Apple Style Tabs) ================= */}
      {!isMobile && (
        <Box
          sx={{
            bgcolor: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(12px)",
            borderRadius: 4,
            boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
            px: 1,
            pt: 3,
            pb: 2,
            mb: 3,
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              textAlign: "center",
              fontWeight: 700,
              color: "#0F172A",
              mb: 3,
              letterSpacing: -0.5,
            }}
          >
            Dashboard de Transacciones
          </Typography>

          {/* Tabs minimalistas tipo iOS */}
          <Tabs
            value={activeSection}
            onChange={(e, newValue) => setActiveSection(newValue)}
            TabIndicatorProps={{
              style: { backgroundColor: "#0F172A", height: 3, borderRadius: 2 },
            }}
            sx={{
              "& .MuiTab-root": {
                flex: 1,
                textTransform: "none",
                fontSize: "1rem",
                borderRadius: 3,
                background: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(0,0,0,0.06)",
                color: "#fffff",
                py: 1.5,
                transition: "0.25s all",
              },
              "& .Mui-selected": {
                backgroundColor: "#0F172A",
                color: "white",
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              },
              "& .MuiTab-root:hover": {
                background: "#1581BF",
                color: "white",

              },
              "& .MuiTabs-flexContainer": {
                gap: 1.5,
              },
            }}
          >
            {navItems.map((item) => (
              <Tab
                key={item.value}
                icon={item.icon}
                iconPosition="start"
                label={item.label}
                value={item.value}
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* ================= MOBILE NAV ================= */}
      {isMobile && (
        <AppBar
          position="fixed"
          color="transparent"
          elevation={0}
          sx={{
            top: "auto",
            bottom: 0,
            px: 1,
            pb: 1.5,
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 -6px 18px rgba(0,0,0,0.08)",
          }}
        >
          <BottomNavigation
            showLabels
            value={activeSection}
            onChange={(event, newValue) => setActiveSection(newValue)}
            sx={{
              borderRadius: 4,
              overflow: "hidden",
              background: "white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            {navItems.map((item) => (
              <BottomNavigationAction
                key={item.value}
                label={item.label}
                value={item.value}
                icon={item.icon}
                sx={{
                  "&.Mui-selected": {
                    color: "#0F172A",
                    fontWeight: 600,
                  },
                  color: "#64748B",
                  transition: "all 0.2s",
                }}
              />
            ))}
          </BottomNavigation>
        </AppBar>
      )}

      {/* ================= TITULO EN MOBILE ================= */}
      {isMobile && (
        <Typography
          variant="h5"
          sx={{
            mt: 2,
            mb: 1,
            textAlign: "center",
            fontWeight: 700,
            color: "#0F172A",
          }}
        >
          Dashboard de Transacciones
        </Typography>
      )}

      {/* ================= CONTENIDO PRINCIPAL ================= */}
      <Box sx={{ pb: isMobile ? 14 : 4 }}>
        {activeSection === "add" && (
          <Suspense fallback={<Typography>Cargando formulario...</Typography>}>
            <Fade in timeout={600}>
              <Box sx={{ px: 2 }}>
                <AddTransactionComponent onTransactionAdded={handleAddTransaction} />
              </Box>
            </Fade>
          </Suspense>
        )}

        {activeSection === "transactions" && (
          <Suspense fallback={<Typography>Cargando transacciones...</Typography>}>
            <Fade in timeout={600}>
              <Box sx={{ px: 2 }}>
                <ShowTransactions initialTransactions={transactions} />
              </Box>
            </Fade>
          </Suspense>
        )}

        {activeSection === "charts" && (
          <Suspense fallback={<Typography>Cargando gráficos...</Typography>}>
            <Fade in timeout={600}>
              <Box sx={{ px: 2 }}>
                <GraficosTransacciones transactions={transactions} />
              </Box>
            </Fade>
          </Suspense>
        )}
      </Box>

      {/* ================= BOTÓN SCROLL-to-TOP ================= */}
      {showScrollTop && (
        <Fab
          onClick={scrollToTop}
          sx={{
            position: "fixed",
            bottom: isMobile ? "7rem" : "2rem",
            right: "1.2rem",
            bgcolor: "#0F172A",
            color: "white",
            "&:hover": {
              bgcolor: "#1E293B",
            },
            transition: "0.3s ease",
          }}
        >
          <ArrowUpwardIcon />
        </Fab>
      )}
    </Box>
  );
};

export default Page;
