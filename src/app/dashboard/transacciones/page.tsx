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

type ActiveSection = "add" | "transactions" | "charts";

const AddTransactionIcon = <AddIcon fontSize="small" />;
const TransactionsIcon = <ListAltIcon fontSize="small" />;
const ChartsIcon = <BarChartIcon fontSize="small" />;

const navItems: {
  label: string;
  icon: React.ReactElement;
  value: ActiveSection;
}[] = [
  {
    label: "Agregar transacción",
    icon: AddTransactionIcon,
    value: "add",
  },
  {
    label: "Transacciones",
    icon: TransactionsIcon,
    value: "transactions",
  },
  {
    label: "Gráficos",
    icon: ChartsIcon,
    value: "charts",
  },
];

const tabPalette: Record<
  ActiveSection,
  {
    main: string;
    soft: string;
    hover: string;
    selectedBg: string;
    ring: string;
    shadow: string;
  }
> = {
  add: {
    main: "#2563EB",
    soft: "rgba(37, 99, 235, 0.08)",
    hover: "rgba(37, 99, 235, 0.14)",
    selectedBg: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(239,246,255,0.98) 100%)",
    ring: "rgba(37, 99, 235, 0.24)",
    shadow: "0 12px 26px rgba(37, 99, 235, 0.16)",
  },
  transactions: {
    main: "#059669",
    soft: "rgba(5, 150, 105, 0.08)",
    hover: "rgba(5, 150, 105, 0.14)",
    selectedBg: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(236,253,245,0.98) 100%)",
    ring: "rgba(5, 150, 105, 0.24)",
    shadow: "0 12px 26px rgba(5, 150, 105, 0.16)",
  },
  charts: {
    main: "#7C3AED",
    soft: "rgba(124, 58, 237, 0.08)",
    hover: "rgba(124, 58, 237, 0.14)",
    selectedBg: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(245,243,255,0.98) 100%)",
    ring: "rgba(124, 58, 237, 0.24)",
    shadow: "0 12px 26px rgba(124, 58, 237, 0.16)",
  },
};

const suspenseTextSx = {
  textAlign: "center",
  color: "#64748B",
  py: 4,
};

const Page = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>("add");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const fetchTransactions = async () => {
      const data = await getTransactions();
      if (data.transactions) {
        setTransactions(data.transactions);
      }
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

  const getDesktopTabSx = (value: ActiveSection) => {
    const palette = tabPalette[value];
    const selected = activeSection === value;

    return {
      minHeight: 52,
      px: 2.5,
      py: 1.2,
      borderRadius: "18px",
      textTransform: "none",
      fontSize: "0.96rem",
      fontWeight: selected ? 700 : 600,
      minWidth: 0,
      color: palette.main,
      background: selected ? palette.selectedBg : palette.soft,
      border: `1px solid ${selected ? palette.ring : "rgba(15,23,42,0.06)"}`,
      boxShadow: selected ? palette.shadow : "none",
      transition: "all 0.22s ease",
      transform: selected ? "translateY(-1px)" : "translateY(0)",
      "& .MuiTab-iconWrapper": {
        color: "inherit",
      },
      "&:hover": {
        background: selected ? palette.selectedBg : palette.hover,
        borderColor: palette.ring,
      },
    };
  };

  const getMobileActionSx = (value: ActiveSection) => {
    const palette = tabPalette[value];

    return {
      color: "#64748B",
      transition: "all 0.22s ease",
      borderRadius: 3,
      mx: 0.4,
      my: 0.5,
      minWidth: 0,
      "& .MuiBottomNavigationAction-label": {
        fontSize: "0.72rem",
      },
      "&.Mui-selected": {
        color: palette.main,
        fontWeight: 700,
        backgroundColor: palette.soft,
      },
    };
  };

  return (
    <Box
      sx={{
        width: "100%",
        overflowX: "hidden",
        px: { xs: 0, sm: 1 },
      }}
    >
      {!isMobile && (
        <Box
          sx={{
            mb: 4,
            pt: { md: 1, lg: 2 },
          }}
        >
          <Box
            sx={{
              maxWidth: 1020,
              mx: "auto",
              px: { xs: 1.5, md: 2 },
              py: { xs: 2, md: 2.5 },
              borderRadius: "28px",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.96) 100%)",
              border: "1px solid rgba(15,23,42,0.06)",
              boxShadow: "0 14px 34px rgba(15,23,42,0.06)",
              backdropFilter: "blur(14px)",
            }}
          >
            <Typography
              variant="h5"
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: "#0F172A",
                mb: 2.5,
                letterSpacing: -0.5,
              }}
            >
              Dashboard de Transacciones
            </Typography>

            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Tabs
                value={activeSection}
                onChange={(_, newValue: ActiveSection) =>
                  setActiveSection(newValue)
                }
                TabIndicatorProps={{ style: { display: "none" } }}
                sx={{
                  minHeight: 0,
                  p: 0.85,
                  borderRadius: "24px",
                  backgroundColor: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(15,23,42,0.06)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.7), 0 6px 18px rgba(15,23,42,0.04)",
                  "& .MuiTabs-flexContainer": {
                    gap: 1.25,
                    justifyContent: "center",
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
                    sx={getDesktopTabSx(item.value)}
                  />
                ))}
              </Tabs>
            </Box>
          </Box>
        </Box>
      )}

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
            boxShadow: "0 -8px 24px rgba(15,23,42,0.08)",
          }}
        >
          <BottomNavigation
            showLabels
            value={activeSection}
            onChange={(_, newValue: ActiveSection) => setActiveSection(newValue)}
            sx={{
              borderRadius: 4,
              overflow: "hidden",
              background: "rgba(255,255,255,0.98)",
              border: "1px solid rgba(15,23,42,0.06)",
              boxShadow: "0 10px 28px rgba(15,23,42,0.08)",
              px: 0.5,
              "& .MuiBottomNavigationAction-root": {
                minWidth: 0,
              },
            }}
          >
            {navItems.map((item) => (
              <BottomNavigationAction
                key={item.value}
                label={item.label}
                value={item.value}
                icon={item.icon}
                sx={getMobileActionSx(item.value)}
              />
            ))}
          </BottomNavigation>
        </AppBar>
      )}

      {isMobile && (
        <Typography
          variant="h5"
          sx={{
            mt: 2,
            mb: 2,
            textAlign: "center",
            fontWeight: 700,
            color: "#0F172A",
            letterSpacing: -0.4,
          }}
        >
          Dashboard de Transacciones
        </Typography>
      )}

      <Box sx={{ pb: isMobile ? 14 : 4 }}>
        {activeSection === "add" && (
          <Suspense
            fallback={
              <Typography sx={suspenseTextSx}>
                Cargando formulario...
              </Typography>
            }
          >
            <Fade in timeout={600}>
              <Box sx={{ px: 0 }}>
                <AddTransactionComponent
                  onTransactionAdded={handleAddTransaction}
                />
              </Box>
            </Fade>
          </Suspense>
        )}

        {activeSection === "transactions" && (
          <Suspense
            fallback={
              <Typography sx={suspenseTextSx}>
                Cargando transacciones...
              </Typography>
            }
          >
            <Fade in timeout={600}>
              <Box sx={{ px: 0 }}>
                <ShowTransactions initialTransactions={transactions} />
              </Box>
            </Fade>
          </Suspense>
        )}

        {activeSection === "charts" && (
          <Suspense
            fallback={
              <Typography sx={suspenseTextSx}>
                Cargando gráficos...
              </Typography>
            }
          >
            <Fade in timeout={600}>
              <Box sx={{ px: { xs: 0, md: 1 } }}>
                <GraficosTransacciones transactions={transactions} />
              </Box>
            </Fade>
          </Suspense>
        )}
      </Box>

      {showScrollTop && (
        <Fab
          onClick={scrollToTop}
          sx={{
            position: "fixed",
            bottom: isMobile ? "7rem" : "2rem",
            right: "1.2rem",
            bgcolor: "#0F172A",
            color: "white",
            boxShadow: "0 10px 24px rgba(15,23,42,0.22)",
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