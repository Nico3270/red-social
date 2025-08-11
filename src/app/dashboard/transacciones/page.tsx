"use client";

import React, { useState, useEffect, lazy, Suspense } from "react";
import { useMediaQuery, useTheme } from "@mui/material";
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Fade,
  Fab,
  Grid,
  Card,
  CardContent,
  BottomNavigation,
  BottomNavigationAction,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import BarChartIcon from "@mui/icons-material/BarChart";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { Tabs, Tab } from "@mui/material";
import { getTransactions } from "@/transacciones/actions/getTransactions";
import { Transaction, TransactionType } from "@/transacciones/interfaces/types";

// Lazy loading para componentes
const AddTransactionComponent = lazy(() => import("@/transacciones/componentes/AddTransactionComponent"));
const GraficosTransacciones = lazy(() => import("@/transacciones/componentes/GraficosTransacciones"));
const ShowTransactions = lazy(() => import("@/transacciones/componentes/ShowTransactions"));

const Page = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState("add"); // Sección activa

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Cargar transacciones
  useEffect(() => {
    const fetchTransactions = async () => {
      const data = await getTransactions();
      if (data.transactions) {
        setTransactions(data.transactions);
      }
    };
    fetchTransactions();
  }, []);

  // Mostrar botón scroll-to-top
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Agregar nueva transacción
  const handleAddTransaction = (newTransaction: Transaction) => {
    setTransactions((prev) => [newTransaction, ...prev]);
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calcular KPIs
  const calculateKPIs = () => {
    const ingresos = transactions
      .filter((t) => t.type === TransactionType.Ingreso)
      .reduce((sum, t) => sum + t.amount, 0);
    const gastos = transactions
      .filter((t) => t.type === TransactionType.Gasto)
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = ingresos - gastos;
    return { ingresos, gastos, balance };
  };

  const { ingresos, gastos, balance } = calculateKPIs();

  // Navegación items
  const navItems = [
    { label: "Agregar", icon: <AddIcon />, value: "add" },
    { label: "Gráficos", icon: <BarChartIcon />, value: "charts" },
    { label: "Transacciones", icon: <ListAltIcon />, value: "transactions" },
  ];

  return (
    <Box sx={{ overflowX: "hidden", width: "100%" }}>
      {/* AppBar para desktop con botón de menú */}
      {!isMobile && (
        <Box
          sx={{
            bgcolor: "white",
            borderRadius: 3,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            mb: 1,
            px: 3,
            pt: 1,
            pb: 1, // espacio extra inferior en toda la caja
          }}
        >
          {/* Título centrado */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              color: "#021526", // azul oscuro elegante
              textAlign: "center",
              mb: 2,
              fontSize: "1.4rem",
            }}
          >
            Dashboard de Transacciones
          </Typography>

          {/* Barra de pestañas */}
          <Tabs
            value={activeSection}
            onChange={(e, newValue) => setActiveSection(newValue)}
            textColor="inherit"
            TabIndicatorProps={{
              style: { backgroundColor: "#021526", height: "3px", borderRadius: "2px" },
            }}
            sx={{
              "& .MuiTabs-flexContainer": {
                justifyContent: "space-around", // distribución uniforme
                gap: 1.5,
              },
              "& .MuiTab-root": {
                flex: 1,
                minHeight: "48px",
                py: 1.5, // más padding vertical
                border: "1px solid #1D1616",
                borderRadius: 4,
                textTransform: "none",
                fontWeight: 500,
                color: "#1D1616",
                transition: "all 0.2s ease",
                backgroundColor: "#fafafa",
              },
              "& .MuiTab-root:hover": {
                backgroundColor: "#000B58",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                color: "#EEEEEE",

              },
              "& .Mui-selected": {
                backgroundColor: "#021526", // gris claro
                color: "#E2DFD0", // azul oscuro
                fontWeight: "bold",
                boxShadow: "0 2px 8px rgba(30, 58, 138, 0.15)",
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




      {/* Nav: BottomNavigation en móvil */}
      {isMobile ? (
        <AppBar position="fixed" color="default" sx={{ top: "auto", bottom: 0, boxShadow: 3 }}>
          <BottomNavigation
            showLabels
            value={activeSection}
            onChange={(event, newValue) => setActiveSection(newValue)}
            sx={{ bgcolor: "white" }}
          >
            {navItems.map((item) => (
              <BottomNavigationAction
                key={item.label}
                label={item.label}
                value={item.value}
                icon={item.icon}
                sx={{
                  "&.Mui-selected": { color: "#640D5F", bgcolor: "grey.100", fontWeight: "bold" },
                  color: "grey.600",
                  "&:hover": { color: "#640D5F", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" },
                  transition: "all 0.2s",
                }}
              />
            ))}
          </BottomNavigation>
        </AppBar>
      ) : null}

      {/* Drawer para desktop (temporal, se abre con el botón del AppBar) */}
      {/* {!isMobile && (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{ width: 240, flexShrink: 0, "& .MuiDrawer-paper": { width: 240, boxSizing: "border-box" } }}
        >
          <List>
            {navItems.map((item) => (
              <ListItem key={item.label} disablePadding>
                <ListItemButton
                  onClick={() => {
                    setActiveSection(item.value);
                    setDrawerOpen(false);
                  }}
                  selected={activeSection === item.value}
                  sx={{
                    "&.Mui-selected": { bgcolor: "grey.200", color: "#640D5F" },
                    "&:hover": { bgcolor: "grey.100" },
                    "&.Mui-selected:hover": { bgcolor: "grey.300" },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>
      )} */}

      {/* Header con KPIs modestos/elegantes: smaller, outlined, reduced spacing */}
      <Fade in timeout={500}>
        <Box sx={{ mb: 1, px: 2 }}>
          {isMobile && (
            <Typography variant="h5" sx={{ mb: 1.5, color: "#640D5F", fontWeight: "medium", textAlign: "center" }}>
              Dashboard de Transacciones
            </Typography>
          )}
          <Grid container spacing={1} justifyContent="center">
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "grey.300" }}>
                <CardContent sx={{ p: 1.5, textAlign: "center" }}>
                  <Typography variant="body2" color="grey.600" sx={{ mb: 0.5 }}>
                    Ingresos
                  </Typography>
                  <Typography variant="subtitle2" color="green.600">
                    ${ingresos.toLocaleString("es-CO")}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "grey.300" }}>
                <CardContent sx={{ p: 1.5, textAlign: "center" }}>
                  <Typography variant="body2" color="grey.600" sx={{ mb: 0.5 }}>
                    Gastos
                  </Typography>
                  <Typography variant="subtitle2" color="red.600">
                    ${gastos.toLocaleString("es-CO")}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "grey.300" }}>
                <CardContent sx={{ p: 1.5, textAlign: "center" }}>
                  <Typography variant="body2" color="grey.600" sx={{ mb: 0.5 }}>
                    Balance
                  </Typography>
                  <Typography variant="subtitle2" color={balance >= 0 ? "green.600" : "red.600"}>
                    ${balance.toLocaleString("es-CO")}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Fade>

      {/* Contenido principal: Render condicional de sección activa */}
      <Box sx={{ pb: isMobile ? 12 : 4, overflowX: "hidden" }}>
        {activeSection === "add" && (
          <Suspense fallback={<Typography>Cargando formulario...</Typography>}>
            <Fade in timeout={700}>
              <Box sx={{ maxWidth: "100%", overflowX: "auto" }}>
                <AddTransactionComponent onTransactionAdded={handleAddTransaction} />
              </Box>
            </Fade>
          </Suspense>
        )}
        {activeSection === "charts" && (
          <Suspense fallback={<Typography>Cargando gráficos...</Typography>}>
            <Fade in timeout={700}>
              <Box sx={{ maxWidth: "100%", overflowX: "auto" }}>
                <GraficosTransacciones transactions={transactions} />
              </Box>
            </Fade>
          </Suspense>
        )}
        {activeSection === "transactions" && (
          <Suspense fallback={<Typography>Cargando transacciones...</Typography>}>
            <Fade in timeout={700}>
              <Box sx={{ maxWidth: "100%", overflowX: "auto" }}>
                <ShowTransactions transactions={transactions} />
              </Box>
            </Fade>
          </Suspense>
        )}
      </Box>

      {/* Botón scroll-to-top */}
      {showScrollTop && (
        <Fab
          color="primary"
          aria-label="Subir"
          onClick={scrollToTop}
          sx={{
            position: "fixed",
            bottom: isMobile ? "calc(5rem + 56px)" : "2rem",
            right: "1rem",
            bgcolor: "#640D5F",
            "&:hover": { bgcolor: "#4B0A47" },
          }}
        >
          <ArrowUpwardIcon />
        </Fab>
      )}
    </Box>
  );
};

export default Page;