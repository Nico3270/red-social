"use client";

import React, { useState, useEffect } from "react";
import { Pie, Line, Bar } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, BarElement, TooltipItem, Filler } from "chart.js";
import { Transaction } from "@/transacciones/interfaces/types";
import { subDays, startOfMonth, startOfYear, isAfter, isBefore, format, eachDayOfInterval, addDays } from "date-fns";
import { SeccionesFont, titulosPrincipales } from "@/config/fonts";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  Fade,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import FilterListIcon from "@mui/icons-material/FilterList";

// Registro completo de ChartJS para evitar errors TS
ChartJS.register(ArcElement, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, BarElement, Filler);

interface GraficosTransaccionesProps {
  transactions: Transaction[];
}

const GraficosTransacciones: React.FC<GraficosTransaccionesProps> = ({ transactions }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const [darkMode, setDarkMode] = useState(false); // Toggle dark mode
  const [filters, setFilters] = useState({
    period: "all", // "day", "week", "month", "year", "custom"
    startDate: "",
    endDate: "",
    category: "all",
    paymentMethod: "all",
  });
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // Definir isMobile correctamente

  // Toggle dark mode
  useEffect(() => {
    // Aquí podrías integrar con un theme provider global si lo tienes
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const handleFilterChange = (period: string) => {
    const today = new Date();
    let start = "";
    let end = today.toISOString().split("T")[0];
    if (period === "day") {
      start = end;
    } else if (period === "week") {
      start = subDays(today, 7).toISOString().split("T")[0];
    } else if (period === "month") {
      start = startOfMonth(today).toISOString().split("T")[0];
    } else if (period === "year") {
      start = startOfYear(today).toISOString().split("T")[0];
    }
    setFilters({ ...filters, period, startDate: start, endDate: end });
  };

  const applyFilters = () => {
    let filtered = transactions;
    const { startDate, endDate, category, paymentMethod } = filters;

    if (startDate) filtered = filtered.filter((t) => !isBefore(new Date(t.date), new Date(startDate)));
    if (endDate) filtered = filtered.filter((t) => !isAfter(new Date(t.date), addDays(new Date(endDate), 1))); // Incluye el endDate
    if (category !== "all") filtered = filtered.filter((t) => t.category === category);
    if (paymentMethod !== "all") filtered = filtered.filter((t) => t.paymentMethod === paymentMethod);

    return filtered;
  };

  const filteredTransactions = applyFilters();

  const ingresos = filteredTransactions.filter((t) => t.type === "ingreso");
  const gastos = filteredTransactions.filter((t) => t.type === "gasto");

  const calcularDatosPorCategoria = (transacciones: Transaction[]) => {
    const categorias = [...new Set(transacciones.map((t) => t.category))];
    const datos = categorias.map((cat) =>
      transacciones.filter((t) => t.category === cat).reduce((sum, t) => sum + t.amount, 0)
    );
    return { categorias, datos };
  };

  const ingresosPorCategoria = calcularDatosPorCategoria(ingresos);
  const gastosPorCategoria = calcularDatosPorCategoria(gastos);

  const totalIngresos = ingresos.reduce((sum, t) => sum + t.amount, 0);
  const totalGastos = gastos.reduce((sum, t) => sum + t.amount, 0);
  const balanceValue = totalIngresos - totalGastos;

  // Datos para Line Chart (tendencias temporales) - Corregido para retornar un data object con datasets combinados
  const getTrendData = () => {
    const dates = eachDayOfInterval({ start: new Date(filters.startDate || subDays(new Date(), 30)), end: new Date(filters.endDate || new Date()) });
    const ingresosAmounts = dates.map((date) => {
      return ingresos
        .filter((t) => format(new Date(t.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"))
        .reduce((sum, t) => sum + t.amount, 0);
    });
    const gastosAmounts = dates.map((date) => {
      return gastos
        .filter((t) => format(new Date(t.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"))
        .reduce((sum, t) => sum + t.amount, 0);
    });
    return {
      labels: dates.map((date) => format(date, "dd/MM")),
      datasets: [
        {
          label: "Ingresos",
          data: ingresosAmounts,
          borderColor: "#2196F3",
          backgroundColor: "rgba(33, 150, 243, 0.2)",
          fill: true,
        },
        {
          label: "Gastos",
          data: gastosAmounts,
          borderColor: "#F44336",
          backgroundColor: "rgba(244, 67, 54, 0.2)",
          fill: true,
        },
      ],
    };
  };

  // Datos para Bar Chart (comparación categorías)
  const getBarData = () => {
    const categorias = [...new Set([...ingresosPorCategoria.categorias, ...gastosPorCategoria.categorias])];
    const ingresosData = categorias.map((cat) => ingresosPorCategoria.datos[ingresosPorCategoria.categorias.indexOf(cat)] || 0);
    const gastosData = categorias.map((cat) => gastosPorCategoria.datos[gastosPorCategoria.categorias.indexOf(cat)] || 0);
    return {
      labels: categorias.map((cat) => cat.charAt(0).toUpperCase() + cat.slice(1)),
      datasets: [
        {
          label: "Ingresos",
          data: ingresosData,
          backgroundColor: "#64B5F6",
        },
        {
          label: "Gastos",
          data: gastosData,
          backgroundColor: "#EF9A9A",
        },
      ],
    };
  };

  // Colores para Pie Charts (profesional y minimalista)
  const colores = ["#2196F3", "#64B5F6", "#BBDEFB", "#E3F2FD", "#90CAF9", "#42A5F5", "#1976D2"];

  const opcionesGrafico = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" as const },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"pie">) => {
            const value = context.raw as number;
            const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
            const porcentaje = ((value / total) * 100).toFixed(2);
            return `${context.label}: $${value.toLocaleString("es-CO")} (${porcentaje}%)`;
          },
        },
      },
    },
  };

  const datosIngresos = {
    labels: ingresosPorCategoria.categorias.map((cat) => cat.charAt(0).toUpperCase() + cat.slice(1)),
    datasets: [{ data: ingresosPorCategoria.datos, backgroundColor: colores }],
  };

  const datosGastos = {
    labels: gastosPorCategoria.categorias.map((cat) => cat.charAt(0).toUpperCase() + cat.slice(1)),
    datasets: [{ data: gastosPorCategoria.datos, backgroundColor: colores }],
  };

  const datosBalance = {
    labels: ["Ingresos", "Gastos"],
    datasets: [{ data: [totalIngresos, totalGastos], backgroundColor: ["#2196F3", "#F44336"] }],
  };

  return (
    <Fade in timeout={800}>
      <Box sx={{ py: 4, px: { xs: 2, sm: 4 }, maxWidth: "100%", overflowX: "hidden" }}>
        <Typography variant="h6" sx={{ mb: 3, textAlign: "center", fontWeight: 600, color: "#640D5F" }}>
          Resumen de transacciones
        </Typography>

        {/* Filtros en Accordion para móvil - Mejora visual */}
        <Accordion
          defaultExpanded={!isMobile}
          sx={{
            mb: 4,
            borderRadius: 2,
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
            '&:before': { display: 'none' }, // Elimina línea divisoria superior
          }}
          elevation={0}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: theme.palette.primary.main }} />}
            sx={{
              bgcolor: theme.palette.background.paper,
              borderBottom: `1px solid ${theme.palette.divider}`,
              '& .MuiAccordionSummary-content': {
                alignItems: 'center',
              },
              px: 3,
              py: 1,
            }}
          >
            <FilterListIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Filtros
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3, bgcolor: theme.palette.background.default }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Período</InputLabel>
                  <Select value={filters.period} onChange={(e) => handleFilterChange(e.target.value as string)} label="Período">
                    <MenuItem value="all">Todo</MenuItem>
                    <MenuItem value="day">Día</MenuItem>
                    <MenuItem value="week">Semana</MenuItem>
                    <MenuItem value="month">Mes</MenuItem>
                    <MenuItem value="year">Año</MenuItem>
                    <MenuItem value="custom">Personalizado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {filters.period === "custom" && (
                <>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      type="date"
                      label="Desde"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      type="date"
                      label="Hasta"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Categoría</InputLabel>
                  <Select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value as string })} label="Categoría">
                    <MenuItem value="all">Todas</MenuItem>
                    {[...new Set(transactions.map((t) => t.category))].map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Medio de pago</InputLabel>
                  <Select value={filters.paymentMethod} onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value as string })} label="Medio de pago">
                    <MenuItem value="all">Todos</MenuItem>
                    {[...new Set(transactions.map((t) => t.paymentMethod))].map((method) => (
                      <MenuItem key={method} value={method}>
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start", mt: 1 }}>
                <Typography variant="body2" sx={{ mr: 2, color: theme.palette.text.primary }}>
                  Modo oscuro
                </Typography>
                <Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} color="primary" />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Gráficos en Grid responsive */}
        <Grid container spacing={3}>
          {/* Ingresos Pie */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, textAlign: "center", color: "#2196F3" }}>
                Ingresos
              </Typography>
              <Pie data={datosIngresos} options={opcionesGrafico} />
              <Box sx={{ mt: 2 }}>
                {ingresosPorCategoria.categorias.map((cat, index) => (
                  <Typography component="div" key={cat} variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: colores[index], borderRadius: "50%" }} />
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}: ${ingresosPorCategoria.datos[index].toLocaleString("es-CO")}
                  </Typography>
                ))}
                <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: "bold" }}>
                  Total: ${totalIngresos.toLocaleString("es-CO")}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Gastos Pie */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, textAlign: "center", color: "#F44336" }}>
                Gastos
              </Typography>
              <Pie data={datosGastos} options={opcionesGrafico} />
              <Box sx={{ mt: 2 }}>
                {gastosPorCategoria.categorias.map((cat, index) => (
                  <Typography component="div" key={cat} variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: colores[index], borderRadius: "50%" }} />
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}: ${gastosPorCategoria.datos[index].toLocaleString("es-CO")}
                  </Typography>
                ))}
                <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: "bold" }}>
                  Total: ${totalGastos.toLocaleString("es-CO")}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Balance Pie + KPI */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, textAlign: "center", color: "#757575" }}>
                Balance
              </Typography>
              <Pie data={datosBalance} options={opcionesGrafico} />
              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: balanceValue >= 0 ? "#4CAF50" : "#F44336", display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                  {balanceValue >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                  Total: ${balanceValue.toLocaleString("es-CO")}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Line Chart para tendencias */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, textAlign: "center", color: "#2196F3" }}>
                Tendencias temporales
              </Typography>
              <Line data={getTrendData()} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />
            </Paper>
          </Grid>

          {/* Bar Chart para comparación categorías */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, textAlign: "center", color: "#757575" }}>
                Comparación por categorías
              </Typography>
              <Bar data={getBarData()} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Fade>
  );
};

export default GraficosTransacciones;