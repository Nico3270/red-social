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
import MenuIcon from "@mui/icons-material/Menu"; // Agregado para el botón de menú en desktop
import AddIcon from "@mui/icons-material/Add";
import BarChartIcon from "@mui/icons-material/BarChart";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { getTransactions } from "@/transacciones/actions/getTransactions";
import { Transaction, TransactionType } from "@/transacciones/interfaces/types";

// Lazy loading para componentes
const AddTransactionComponent = lazy(() => import("@/transacciones/componentes/AddTransactionComponent"));
const GraficosTransacciones = lazy(() => import("@/transacciones/componentes/GraficosTransacciones"));
const ShowTransactions = lazy(() => import("@/transacciones/componentes/ShowTransactions"));

const Page = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
        <AppBar position="static" color="default" sx={{ boxShadow: 3 }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Dashboard de Transacciones
            </Typography>
          </Toolbar>
        </AppBar>
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
      {!isMobile && (
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
      )}

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
              <Card variant="outlined" sx={{ borderRadius: 1, borderColor: "grey.300" }}>
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