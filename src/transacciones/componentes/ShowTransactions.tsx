"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
  Typography,
  Button,
  Fab,
  Divider as MuiDivider,
} from "@mui/material";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from "date-fns";
import { es } from "date-fns/locale";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  BsArrowLeft,
  BsArrowRight,
  BsCalendar3,
  BsCalendarWeek,
  BsCalendarMonth,
  BsCalendarEvent,
} from "react-icons/bs";
import {
  ArrowUpward,
  ArrowDownward,
  Delete as DeleteIcon,
  Edit as EditIcon,
  GetAppOutlined,
  SearchOff as NoDataIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { Transaction } from "@/transacciones/interfaces/types";
import { TransactionType, PaymentMethod } from "@prisma/client";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import TransactionDetailModal from "./TransactionDetailModal";
import EditTransactionModal from "./EditTransactionModal";
import DeleteTransactionModal from "./DeleteTransactionModal";
import * as XLSX from "xlsx";

interface ShowTransactionsProps {
  initialTransactions?: Transaction[];
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

const formatISODate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const fetchTransacciones = async ({
  queryKey,
  pageParam = 0,
}: {
  queryKey: [string, string | undefined, string | undefined, string, string];
  pageParam?: number;
}) => {
  const [, startDate, endDate, filterType, filterPayment] = queryKey;
  const skip = pageParam ?? 0;
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: "10",
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(filterType !== "all" && { type: filterType }),
    ...(filterPayment !== "all" && { paymentMethod: filterPayment }),
  });
  const res = await fetch(`/api/transacciones?${params.toString()}`);
  if (!res.ok) throw new Error("Error en fetch");
  return await res.json();
};

const ShowTransactions: React.FC<ShowTransactionsProps> = ({ initialTransactions = [] }) => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("day");
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [sortBy, setSortBy] = useState({ field: "date", order: "desc" as "asc" | "desc" });
  const [search, setSearch] = useState("");
  const [numPeriods, setNumPeriods] = useState(6);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openError, setOpenError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error } =
    useInfiniteQuery({
      queryKey: [
        "transacciones",
        selectedStartDate?.toISOString().split("T")[0],
        selectedEndDate?.toISOString().split("T")[0],
        filterType,
        filterPayment,
      ] as [string, string | undefined, string | undefined, string, string],
      queryFn: fetchTransacciones,
      getNextPageParam: (lastPage) =>
        lastPage.metadata.hasMore ? lastPage.metadata.currentSkip + 10 : undefined,
      initialPageParam: 0,
      enabled: !!session,
    });

  const allTransactions = data?.pages.flatMap((page) => page.data) || initialTransactions;
  const currentBalance = data?.pages[0]?.metadata.balance || { ingresos: 0, gastos: 0, neto: 0 };

  const sortedTransactions = useMemo(() => {
    let filtered = [...allTransactions];
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter((t) =>
        t.description.toLowerCase().includes(lowerSearch)
      );
    }
    return filtered.sort((a, b) => {
      if (sortBy.field === "date") {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortBy.order === "asc" ? dateA - dateB : dateB - dateA;
      }
      if (sortBy.field === "amount") {
        return sortBy.order === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }
      return 0;
    });
  }, [allTransactions, sortBy, search]);

  useEffect(() => {
    if (isError) {
      setErrorMessage(error?.message || "Error al cargar transacciones");
      setOpenError(true);
    }
  }, [isError, error]);

  if (!session) return <Typography align="center">No autenticado</Typography>;

  const currentDate = new Date();

  const generateDateBoxes = (tab: string) => {
    const boxes = [];
    if (tab === "day") {
      for (let i = numPeriods - 1; i >= 0; i--) {
        const date = subDays(currentDate, i);
        boxes.push(format(date, "dd/MM"));
      }
    } else if (tab === "week") {
      for (let i = numPeriods - 1; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(currentDate, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        boxes.push(`${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM")}`);
      }
    } else if (tab === "month") {
      for (let i = numPeriods - 1; i >= 0; i--) {
        const month = subMonths(currentDate, i);
        boxes.push(format(month, "MMMM", { locale: es }));
      }
    } else if (tab === "year") {
      for (let i = numPeriods - 1; i >= 0; i--) {
        const year = subYears(currentDate, i);
        boxes.push(format(year, "yyyy"));
      }
    }
    return boxes;
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setSelectedPeriod(null);
    setNumPeriods(6);
    queryClient.invalidateQueries({ queryKey: ["transacciones"] });
  };

  const handleDateBoxClick = (box: string) => {
    let newStart: Date | null = null;
    let newEnd: Date | null = null;

    if (activeTab === "day") {
      const [day, month] = box.split("/").map(Number);
      newStart = new Date(currentDate.getFullYear(), month - 1, day);
      newEnd = new Date(currentDate.getFullYear(), month - 1, day, 23, 59, 59);
    } else if (activeTab === "week") {
      const [startStr] = box.split(" - ");
      const [day, month] = startStr.split("/").map(Number);
      newStart = startOfWeek(new Date(currentDate.getFullYear(), month - 1, day), { weekStartsOn: 1 });
      newEnd = endOfWeek(newStart, { weekStartsOn: 1 });
    } else if (activeTab === "month") {
      const monthIndex = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
      ].indexOf(box.toLowerCase());
      if (monthIndex !== -1) {
        newStart = startOfMonth(new Date(currentDate.getFullYear(), monthIndex, 1));
        newEnd = endOfMonth(newStart);
      }
    } else if (activeTab === "year") {
      const year = parseInt(box);
      if (!isNaN(year)) {
        newStart = startOfYear(new Date(year, 0, 1));
        newEnd = endOfYear(newStart);
      }
    }

    if (newStart && newEnd) {
      setSelectedStartDate(newStart);
      setSelectedEndDate(newEnd);
      setSelectedPeriod(box);
      queryClient.invalidateQueries({ queryKey: ["transacciones"] });
    }
  };

  const handleCustomGo = () => {
    if (selectedStartDate && selectedEndDate) {
      const adjustedEnd = new Date(selectedEndDate);
      adjustedEnd.setHours(23, 59, 59, 999);
      setSelectedEndDate(adjustedEnd);
      setSelectedPeriod("custom");
      queryClient.invalidateQueries({ queryKey: ["transacciones"] });
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const startDateStr = selectedStartDate?.toISOString().split("T")[0];
      const endDateStr = selectedEndDate?.toISOString().split("T")[0];
      const params = new URLSearchParams({
        ...(startDateStr && { startDate: startDateStr }),
        ...(endDateStr && { endDate: endDateStr }),
        ...(filterType !== "all" && { type: filterType }),
        ...(filterPayment !== "all" && { paymentMethod: filterPayment }),
      });
      const res = await fetch(`/api/transaccionesExcel?${params.toString()}`);
      if (!res.ok) throw new Error("Error al exportar");
      const { data } = await res.json();
      const excelData = data.map((t: Transaction) => ({
        Fecha: formatISODate(t.date),
        Descripción: t.description,
        Categoría: capitalize(t.category),
        Monto: t.amount,
        "Medio de Pago": capitalize(t.paymentMethod),
      }));
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transacciones");
      XLSX.writeFile(workbook, "transacciones_myckeo.xlsx");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error al exportar");
      setOpenError(true);
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenDetail = (id: string) => {
    setDetailId(id);
    setOpenDetail(true);
  };

  const handleCloseDetail = () => {
    setOpenDetail(false);
    setDetailId(null);
  };

  const handleTransactionUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["transacciones"] });
    setOpenEdit(false);
    setSelectedTransaction(null);
  };

  const handleTransactionDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ["transacciones"] });
    setOpenDelete(false);
    setSelectedTransaction(null);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      {/* Contenedor principal con glassmorphism */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 5 },
          borderRadius: 5,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
          border: "1px solid rgba(255,255,255,0.3)",
          maxWidth: "100%",
          mx: "auto",
        }}
      >
        {/* Header Responsive */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: { xs: 1.5, sm: 0 },
            mb: 3,
          }}
        >
          {/* Título */}
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              letterSpacing: "-0.5px",
              color: "#0B132B",
              fontSize: { xs: "1.3rem", sm: "1.6rem" },
            }}
          >
            Resumen de Transacciones
          </Typography>

          {/* Fecha + Botón Excel */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              mt: { xs: 1, sm: 0 },
              width: { xs: "100%", sm: "auto" },
              justifyContent: { xs: "space-between", sm: "flex-end" },
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: { xs: "0.85rem", sm: "1rem" },
              }}
            >
              {format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}
            </Typography>

            <Button
              variant="outlined"
              startIcon={<GetAppOutlined />}
              onClick={exportToExcel}
              disabled={isExporting}
              size="small"
              sx={{
                borderRadius: 3,
                px: 2,
                py: 0.6,
                fontSize: { xs: "0.75rem", sm: "0.85rem" },
              }}
            >
              Excel
            </Button>
          </Box>
        </Box>

        {/* Balance Card Responsive */}
        <Fade in timeout={600}>
          <Card
            sx={{
              width: "100%",
              p: { xs: 2, sm: 4 },
              mb: 4,
              borderRadius: 4,
              background: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
              boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
              border: "1px solid #E2E8F0",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: { xs: "center", sm: "space-evenly" },
              alignItems: "center",
              textAlign: "center",
              gap: { xs: 2.5, sm: 3 },
            }}
          >
            {/* INGRESOS */}
            <Box>
              <Typography
                variant="subtitle2"
                color="success.main"
                fontWeight={600}
                sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
              >
                Ingresos
              </Typography>
              <Typography
                variant="h4"
                fontWeight={700}
                color="success.dark"
                sx={{ fontSize: { xs: "1.6rem", sm: "2.2rem" } }}
              >
                ${currentBalance.ingresos.toLocaleString("es-CO")}
              </Typography>
            </Box>

            {/* Divider SOLO EN ESCRITORIO */}
            <MuiDivider
              orientation="vertical"
              flexItem
              sx={{
                display: { xs: "none", sm: "block" },
                bgcolor: "grey.300",
                height: 60,
              }}
            />

            {/* GASTOS */}
            <Box>
              <Typography
                variant="subtitle2"
                color="error.main"
                fontWeight={600}
                sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
              >
                Gastos
              </Typography>
              <Typography
                variant="h4"
                fontWeight={700}
                color="error.dark"
                sx={{ fontSize: { xs: "1.6rem", sm: "2.2rem" } }}
              >
                ${currentBalance.gastos.toLocaleString("es-CO")}
              </Typography>
            </Box>

            {/* Divider SOLO EN ESCRITORIO */}
            <MuiDivider
              orientation="vertical"
              flexItem
              sx={{
                display: { xs: "none", sm: "block" },
                bgcolor: "grey.300",
                height: 60,
              }}
            />

            {/* BALANCE NETO */}
            <Box>
              <Typography
                variant="subtitle2"
                fontWeight={600}
                color={currentBalance.neto >= 0 ? "success.main" : "error.main"}
                sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
              >
                Balance Neto
              </Typography>
              <Typography
                variant="h4"
                fontWeight={700}
                color={currentBalance.neto >= 0 ? "success.dark" : "error.dark"}
                sx={{ fontSize: { xs: "1.6rem", sm: "2.2rem" } }}
              >
                ${currentBalance.neto.toLocaleString("es-CO")}
              </Typography>
            </Box>
          </Card>
        </Fade>
        {/* Tabs centrados y con área contenida */}
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            mb: 3,
          }}
        >
          <Box sx={{ maxWidth: 800, width: "100%" }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                "& .MuiTabs-flexContainer": {
                  justifyContent: "center",
                  gap: 1.5,
                },
                "& .MuiTab-root": {
                  borderRadius: 3,
                  backgroundColor: "#F1F5F9",
                  minWidth: 120,
                  textTransform: "none",
                  fontWeight: 600,
                  paddingY: 1.2,
                  transition: "0.25s ease",
                },
                "& .Mui-selected": {
                  backgroundColor: "#1E40AF",
                  color: "white !important",
                  boxShadow: "0 4px 12px rgba(30,64,162,0.25)",
                },
              }}
            >
              <Tab label="Día" value="day" icon={<BsCalendarEvent />} iconPosition="start" />
              <Tab label="Semana" value="week" icon={<BsCalendarWeek />} iconPosition="start" />
              <Tab label="Mes" value="month" icon={<BsCalendarMonth />} iconPosition="start" />
              <Tab label="Año" value="year" icon={<BsCalendar3 />} iconPosition="start" />
              <Tab label="Personalizado" value="custom" />
            </Tabs>
          </Box>
        </Box>

        {/* Chips – centrados dentro de contenedor restringido */}
        {activeTab !== "custom" && (
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              mb: 4,
            }}
          >
            {/* Contenedor máximo para que no se vaya a la izquierda */}
            <Box
              sx={{
                maxWidth: 1000,
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              {/* Flecha Izquierda */}
              <IconButton
                onClick={() => setNumPeriods((n) => n + 6)}
                sx={{
                  bgcolor: "white",
                  boxShadow: 2,
                  "&:hover": { bgcolor: "#EFF6FF" },
                }}
              >
                <BsArrowLeft />
              </IconButton>

              {/* Chips scrollable pero centrado */}
              <Box
                sx={{
                  flex: 1,
                  overflowX: "auto",
                  display: "flex",
                  justifyContent: "center",
                  gap: 1.5,
                  px: 1,
                  scrollSnapType: "x mandatory",
                  "&::-webkit-scrollbar": {
                    height: 6,
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: 3,
                  },
                }}
              >
                {generateDateBoxes(activeTab).map((box) => (
                  <Chip
                    key={box}
                    label={box}
                    clickable
                    color={box === selectedPeriod ? "primary" : "default"}
                    variant={box === selectedPeriod ? "filled" : "outlined"}
                    onClick={() => handleDateBoxClick(box)}
                    sx={{
                      px: 2.5,
                      py: 2,
                      minWidth: 110,
                      scrollSnapAlign: "center",
                      fontWeight: 600,
                      borderRadius: 4,
                      boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
                      transition: "0.25s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
                      },
                    }}
                  />
                ))}
              </Box>

              {/* Flecha Derecha */}
              <IconButton
                onClick={() => setNumPeriods((n) => Math.max(6, n - 6))}
                disabled={numPeriods <= 6}
                sx={{
                  bgcolor: "white",
                  boxShadow: 2,
                  "&:hover": { bgcolor: "#EFF6FF" },
                }}
              >
                <BsArrowRight />
              </IconButton>
            </Box>
          </Box>
        )}


        {/* Rango personalizado */}
        {activeTab === "custom" && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={5}>
              <DatePicker label="Desde" value={selectedStartDate} onChange={setSelectedStartDate} />
            </Grid>
            <Grid item xs={12} sm={5}>
              <DatePicker label="Hasta" value={selectedEndDate} onChange={setSelectedEndDate} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="contained" onClick={handleCustomGo} sx={{ height: 56 }}>
                Aplicar
              </Button>
            </Grid>
          </Grid>
        )}

        {/* Filtros — 2 columnas + búsqueda ancha */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 4,
            background: "rgba(248,250,252,0.9)",
            boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
            border: "1px solid #E2E8F0",
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de movimiento</InputLabel>
                <Select value={filterType} onChange={(e) => { setFilterType(e.target.value); queryClient.invalidateQueries({ queryKey: ["transacciones"] }); }}>
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value={TransactionType.ingreso}>Ingresos</MenuItem>
                  <MenuItem value={TransactionType.gasto}>Gastos</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Medio de pago</InputLabel>
                <Select value={filterPayment} onChange={(e) => { setFilterPayment(e.target.value); queryClient.invalidateQueries({ queryKey: ["transacciones"] }); }}>
                  <MenuItem value="all">Todos</MenuItem>
                  {Object.values(PaymentMethod).map((m) => (
                    <MenuItem key={m} value={m}>{capitalize(m)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Buscar en descripción"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ej: supermercado, alquiler, cliente..."
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Lista de transacciones */}
        {isLoading ? (
          <Box textAlign="center" my={8}><CircularProgress size={60} /></Box>
        ) : allTransactions.length === 0 ? (
          <Box textAlign="center" py={10}>
            <NoDataIcon sx={{ fontSize: 90, color: "grey.400", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No hay transacciones en este período
            </Typography>
          </Box>
        ) : (
          <>
            {/* Desktop: Tabla premium */}
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
                <Table stickyHeader>
                  <TableHead sx={{ backgroundColor: "#F8FAFC" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }} onClick={() => setSortBy(prev => ({ ...prev, order: prev.order === "asc" ? "desc" : "asc" }))}>
                        Fecha {sortBy.order === "asc" ? "↑" : "↓"}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                        Descripción
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                        Categoría
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }} onClick={() => setSortBy(prev => ({ ...prev, order: prev.order === "asc" ? "desc" : "asc" }))}>
                        Monto {sortBy.order === "asc" ? "↑" : "↓"}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                        Medio
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                        Acciones
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedTransactions.map((t) => (
                      <TableRow
                        key={t.id}
                        sx={{
                          backgroundColor: t.type === TransactionType.ingreso ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            backgroundColor: t.type === TransactionType.ingreso ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                            transform: "translateY(-1px)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          },
                        }}
                      >
                        <TableCell>{formatISODate(t.date)}</TableCell>
                        <TableCell>
                          <Typography sx={{ cursor: "pointer", color: "primary.main", fontWeight: 500 }} onClick={() => handleOpenDetail(t.id)}>
                            {t.description}
                          </Typography>
                        </TableCell>
                        <TableCell>{capitalize(t.category)}</TableCell>
                        <TableCell>
                          {t.type === TransactionType.ingreso ? (
                            <ArrowUpward sx={{ color: "success.main", verticalAlign: "middle", mr: 0.5 }} />
                          ) : (
                            <ArrowDownward sx={{ color: "error.main", verticalAlign: "middle", mr: 0.5 }} />
                          )}{" "}
                          ${t.amount.toLocaleString("es-CO")}
                        </TableCell>
                        <TableCell>{capitalize(t.paymentMethod)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <IconButton size="small" onClick={() => handleOpenDetail(t.id)} sx={{ bgcolor: "#F1F5F9", "&:hover": { bgcolor: "#E2E8F0" } }}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => { setSelectedTransaction(t); setOpenEdit(true); }} sx={{ bgcolor: "#F1F5F9", "&:hover": { bgcolor: "#E2E8F0" } }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => { setSelectedTransaction(t); setOpenDelete(true); }} sx={{ bgcolor: "#F1F5F9", "&:hover": { bgcolor: "#FECACA" } }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Mobile: Cards premium */}
            <Box sx={{ display: { xs: "block", md: "none" } }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                {sortedTransactions.map((t) => (
                  <Card
                    key={t.id}
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      background: "linear-gradient(145deg, #FFFFFF, #F8FAFC)",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.07)",
                      border: "1px solid #E2E8F0",
                      transition: "transform 0.2s ease",
                      "&:hover": { transform: "translateY(-4px)" },
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography fontWeight={600} color="text.primary">
                        {formatISODate(t.date)}
                      </Typography>
                      {t.type === TransactionType.ingreso ? (
                        <ArrowUpward color="success" />
                      ) : (
                        <ArrowDownward color="error" />
                      )}
                    </Box>
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      color="primary.main"
                      sx={{ cursor: "pointer", mb: 1 }}
                      onClick={() => handleOpenDetail(t.id)}
                    >
                      {t.description}
                    </Typography>
                    <Typography color="text.secondary" mb={1}>
                      {capitalize(t.category)} • {capitalize(t.paymentMethod)}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h5" fontWeight={700} color={t.type === TransactionType.ingreso ? "success.dark" : "error.dark"}>
                        ${t.amount.toLocaleString("es-CO")}
                      </Typography>
                      <Box>
                        <IconButton onClick={() => handleOpenDetail(t.id)}><VisibilityIcon /></IconButton>
                        <IconButton onClick={() => { setSelectedTransaction(t); setOpenEdit(true); }}><EditIcon /></IconButton>
                        <IconButton color="error" onClick={() => { setSelectedTransaction(t); setOpenDelete(true); }}><DeleteIcon /></IconButton>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Box>
            </Box>

            {/* Cargar más */}
            {hasNextPage && (
              <Box textAlign="center" mt={4}>
                <Button
                  variant="outlined"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  sx={{ borderRadius: 3, px: 4, py: 1.5 }}
                >
                  {isFetchingNextPage ? "Cargando..." : "Ver más"}
                </Button>
              </Box>
            )}
          </>
        )}

        {/* Botón flotante Exportar */}
        <Fab
          color="primary"
          onClick={exportToExcel}
          disabled={isExporting}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            boxShadow: "0 8px 28px rgba(59,130,246,0.4)",
          }}
        >
          {isExporting ? <CircularProgress size={24} color="inherit" /> : <GetAppOutlined />}
        </Fab>

        {/* Modales */}
        <Dialog open={openError} onClose={() => setOpenError(false)} PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle>Error</DialogTitle>
          <DialogContent><Typography>{errorMessage}</Typography></DialogContent>
          <DialogActions><Button onClick={() => setOpenError(false)}>Cerrar</Button></DialogActions>
        </Dialog>

        {detailId && (
          <TransactionDetailModal transactionId={detailId} isOpen={openDetail} onClose={handleCloseDetail} />
        )}

        <EditTransactionModal
          open={openEdit}
          onClose={() => { setOpenEdit(false); setSelectedTransaction(null); }}
          transactionId={selectedTransaction?.id || null}
          onTransactionUpdated={handleTransactionUpdated}
        />

        <DeleteTransactionModal
          open={openDelete}
          onClose={() => { setOpenDelete(false); setSelectedTransaction(null); }}
          transactionId={selectedTransaction?.id || null}
          onTransactionDeleted={handleTransactionDeleted}
        />
      </Paper>
    </LocalizationProvider>
  );
};

export default ShowTransactions;