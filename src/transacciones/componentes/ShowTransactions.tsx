"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Box, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Fade, FormControl, Grid, IconButton, InputLabel, InputAdornment, MenuItem, Paper, Select, Skeleton, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, TextField, Tooltip, Typography, useMediaQuery, useTheme, Button } from "@mui/material";
import { Alert } from "@mui/material"; // Para Snackbar errors
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from "date-fns";
import { es } from "date-fns/locale";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { BsArrowLeft, BsArrowRight, BsCalendar3, BsCalendarWeek, BsCalendarMonth, BsCalendarEvent } from "react-icons/bs";
import { ArrowUpward, ArrowDownward, Delete as DeleteIcon, Edit as EditIcon, GetAppOutlined, SearchOff as NoDataIcon, Visibility as VisibilityIcon } from "@mui/icons-material"; // Icono para no-data y Visibility
import { Transaction, TransactionType, PaymentMethod } from "@/transacciones/interfaces/types";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"; // Para fetches optimizados
import { useSession } from "next-auth/react"; // Para auth en client
import Divider from "@/ui/components/divider/Divider";
import TransactionDetailModal from "./TransactionDetailModal"; // Ajusta la ruta si es necesario
import EditTransactionModal from "./EditTransactionModal"; // Ajusta la ruta si es necesario
import DeleteTransactionModal from "./DeleteTransactionModal"; // Ajusta la ruta si es necesario

interface ShowTransactionsProps {
  initialTransactions?: Transaction[]; // Opcional fallback
}

// Helper para capitalize
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();


// Helper para formatear fecha desde ISO UTC a local dd/MM/yyyy
const formatISODate = (isoDate: string): string => {
  const date = new Date(isoDate); // Parsea como UTC
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }); // Ajusta a timezone local del navegador y formatea
};

// Helper para fetch API
const fetchTransacciones = async ({ queryKey, pageParam = 0 }: { queryKey: [string, string | undefined, string | undefined, string, string]; pageParam?: number }) => {
  const [, startDate, endDate, filterType, filterPayment] = queryKey;
  const skip = pageParam ?? 0;
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: '10',
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(filterType !== 'all' && { type: filterType }),
    ...(filterPayment !== 'all' && { paymentMethod: filterPayment }),
  });
  const res = await fetch(`/api/transacciones?${params.toString()}`);
  if (!res.ok) throw new Error('Error en fetch');
  return await res.json();
};

const ShowTransactions: React.FC<ShowTransactionsProps> = ({ initialTransactions = [] }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();
  const { data: session } = useSession(); // Asegura auth
  if (!session) return <Typography>No autenticado</Typography>;

  const [activeTab, setActiveTab] = useState('day'); // Tabs: day, week, month, year, custom
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [sortBy, setSortBy] = useState({ field: "date", order: "desc" as "asc" | "desc" });
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openError, setOpenError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false); // Para toasts
  const [numPeriods, setNumPeriods] = useState(6);
  const [openDetail, setOpenDetail] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Fecha actual calculada automáticamente
  const currentDate = new Date();

  // Generar cajas para tabs (responsive: chips con scroll horizontal)
  const generateDateBoxes = (tab: string) => {
    const boxes = [];
    if (tab === 'day') {
      for (let i = numPeriods - 1; i >= 0; i--) {
        const date = subDays(currentDate, i);
        boxes.push(format(date, 'dd/MM'));
      }
    } else if (tab === 'week') {
      for (let i = numPeriods - 1; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(currentDate, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 }); // siempre domingo
        boxes.push(`${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`);
      }
    } else if (tab === 'month') {
      for (let i = numPeriods - 1; i >= 0; i--) {
        const month = subMonths(currentDate, i);
        boxes.push(format(month, 'MMMM', { locale: es }));
      }
    } else if (tab === 'year') {
      for (let i = numPeriods - 1; i >= 0; i--) {
        const year = subYears(currentDate, i);
        boxes.push(format(year, 'yyyy'));
      }
    }
    return boxes;
  };

  // Fetch con TanStack para infinite scroll y caching
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error } = useInfiniteQuery({
    queryKey: ['transacciones', selectedStartDate?.toISOString().split('T')[0], selectedEndDate?.toISOString().split('T')[0], filterType, filterPayment] as [string, string | undefined, string | undefined, string, string],
    queryFn: fetchTransacciones,
    getNextPageParam: (lastPage) => lastPage.metadata.hasMore ? lastPage.metadata.currentSkip + 10 : undefined,
    initialPageParam: 0,
    enabled: !!session, // Solo fetch si autenticado
  });

  // Flatten data para lista plana
  const allTransactions = data?.pages.flatMap(page => page.data) || initialTransactions;
  const currentBalance = data?.pages[0]?.metadata.balance || { ingresos: 0, gastos: 0, neto: 0 };

  // Handle tab change y selección de caja (refetch con nuevo rango)
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setSelectedPeriod(null);
    setNumPeriods(6);
    queryClient.invalidateQueries({ queryKey: ['transacciones'] }); // Refetch
  };

  const handleDateBoxClick = (box: string) => {
    let newStart: Date | null = null;
    let newEnd: Date | null = null;

    if (activeTab === 'day') {
      const [day, month] = box.split('/').map(Number);
      newStart = new Date(currentDate.getFullYear(), month - 1, day);
      newEnd = new Date(currentDate.getFullYear(), month - 1, day, 23, 59, 59);
    } else if (activeTab === 'week') {
      const [startStr] = box.split(' - ');
      const [day, month] = startStr.split('/').map(Number);
      newStart = startOfWeek(new Date(currentDate.getFullYear(), month - 1, day), { weekStartsOn: 1 });
      newEnd = endOfWeek(newStart, { weekStartsOn: 1 });
    } else if (activeTab === 'month') {
      const monthIndex = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ].indexOf(box.toLowerCase());
      if (monthIndex !== -1) {
        newStart = startOfMonth(new Date(currentDate.getFullYear(), monthIndex, 1));
        newEnd = endOfMonth(newStart);
      }
    } else if (tab === 'year') {
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
      queryClient.invalidateQueries({ queryKey: ['transacciones'] });
    }
  };

  // Handle custom range
  const handleCustomGo = () => {
    if (selectedStartDate && selectedEndDate) {
      // Ajustar fecha final al final del día
      const adjustedEnd = new Date(selectedEndDate);
      adjustedEnd.setHours(23, 59, 59, 999);
      setSelectedEndDate(adjustedEnd);

      setSelectedPeriod('custom');
      queryClient.invalidateQueries({ queryKey: ['transacciones'] });
    }
  };

  // Handle filters (refetch si cambia)
  const handleFilterChange = () => {
    queryClient.invalidateQueries({ queryKey: ['transacciones'] });
  };

  // Export CSV (de todas las cargadas)
  const exportToCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Fecha,Descripción,Categoría,Monto,Medio de Pago\n" +
      allTransactions.map((t) => `${formatISODate(t.date)},${t.description},${capitalize(t.category)},${t.amount},${capitalize(t.paymentMethod)}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transacciones.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sort local (post-fetch, para elegancia sin refetch)
  const sortedTransactions = useMemo(() => {
    let filtered = [...allTransactions];
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(t => t.description.toLowerCase().includes(lowerSearch));
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

  // Error handling
  useEffect(() => {
    if (isError) {
      setErrorMessage(error?.message || 'Error al cargar transacciones');
      setOpenError(true);
    }
  }, [isError, error]);

  // Función para abrir modal
  const handleOpenDetail = (id: string) => {
    setDetailId(id);
    setOpenDetail(true);
  };

  // Función para cerrar modal
  const handleCloseDetail = () => {
    setOpenDetail(false);
    setDetailId(null);
  };

  const handleTransactionUpdated = (updatedTransaction: Transaction) => {
    queryClient.invalidateQueries({ queryKey: ['transacciones'] });
    setOpenEdit(false);
    setSelectedTransaction(null);
  };

  const handleTransactionDeleted = (deletedId: string) => {
    queryClient.invalidateQueries({ queryKey: ['transacciones'] });
    setOpenDelete(false);
    setSelectedTransaction(null);
  };

  const canGoOlder = true; // siempre se puede ir hacia atrás
  const canGoNewer = numPeriods > 6;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2, boxShadow: 1, maxWidth: "100%", overflowX: "hidden" }}>
        <Typography
          variant="h6"
          sx={{ mb: 3, textAlign: "center", color: "grey.800", fontWeight: 600 }}
        >
          Resumen de transacciones
          {selectedPeriod
            ? ` para ${selectedPeriod}`
            : activeTab === "custom" && selectedStartDate && selectedEndDate
              ? ` del ${format(selectedStartDate, "dd/MM/yyyy")} al ${format(selectedEndDate, "dd/MM/yyyy")}`
              : ""}
        </Typography>

        {/* Widget de Balance (sticky, elegante) */}
        <Fade in timeout={500}>
          <Card
            variant="outlined"
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              mb: 2,
              p: 2,
              borderRadius: 2,
              boxShadow: 3,
              border: "1px solid",
              borderColor: "divider",
              background: "linear-gradient(145deg, #f9f9f9, #ffffff)"
            }}
          >

            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={4}>
                <Typography variant="body2" color="green.700" align="center">
                  Ingresos: ${currentBalance.ingresos.toLocaleString("es-CO")}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="red.700" align="center">
                  Gastos: ${currentBalance.gastos.toLocaleString("es-CO")}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color={currentBalance.neto >= 0 ? "green.700" : "red.700"} align="center">
                  Balance: ${currentBalance.neto.toLocaleString("es-CO")}
                </Typography>
              </Grid>
            </Grid>
          </Card>
        </Fade>
        {/* Tabs para periodos (responsive) */}
        <Tabs value={activeTab} onChange={handleTabChange} variant={isMobile ? "scrollable" : "fullWidth"} scrollButtons="auto" sx={{ mb: 2 }}>
          <Tab label="Día" value="day" icon={<BsCalendarEvent />} sx={{ border: '1px solid', textTransform: 'none', borderColor: 'divider', borderRadius: 1, mx: 0.5, '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', borderColor: 'primary.main' } }} />
          <Tab label="Semana" value="week" icon={<BsCalendarWeek />} sx={{ border: '1px solid', textTransform: 'none', borderColor: 'divider', borderRadius: 1, mx: 0.5, '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', borderColor: 'primary.main' } }} />
          <Tab label="Mes" value="month" icon={<BsCalendarMonth />} sx={{ border: '1px solid', textTransform: 'none',  borderColor: 'divider', borderRadius: 1, mx: 0.5, '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', borderColor: 'primary.main' } }} />
          <Tab label="Año" value="year" icon={<BsCalendar3 />} sx={{ border: '1px solid', textTransform: 'none',  borderColor: 'divider', borderRadius: 1, mx: 0.5, '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', borderColor: 'primary.main' } }} />
          <Tab label="Personalizado" value="custom" sx={{ border: '1px solid', textTransform: 'none',  borderColor: 'divider', borderRadius: 1, mx: 0.5, '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', borderColor: 'primary.main' } }} />
        </Tabs>
        {/* Cajas para selección (chips con scroll horizontal, < > navegación) */}
        {activeTab !== 'custom' && (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 2,
          }}>
            <IconButton
              onClick={() => setNumPeriods(n => n + 6)}
              disabled={!canGoOlder}
              sx={{
                flexShrink: 0,
                backgroundColor: 'white',
                borderRadius: '50%',
                boxShadow: 2,
                color: "blue",
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  boxShadow: 4,
                },
                '& svg': {
                  fontSize: 24,
                },
                '&:hover svg': {
                  color: 'white',
                }
              }}
            >
              <BsArrowLeft />
            </IconButton>

            <Box
              sx={{
                flex: 1,
                overflowX: 'auto',
                display: 'flex',
                gap: 1,
                mx: 1,
                flexWrap: 'nowrap',
                justifyContent: 'space-between',
                '&::-webkit-scrollbar': {
                  height: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: 'rgba(0, 0, 0, 0.4)',
                },
              }}
            >
              {generateDateBoxes(activeTab).map((box, idx) => (
                <Chip
                  key={idx}
                  label={box}
                  variant={box === selectedPeriod ? "filled" : "outlined"}
                  color="primary"
                  onClick={() => handleDateBoxClick(box)}
                  sx={{
                    cursor: 'pointer',
                    flexShrink: 0,
                    maxWidth: '120px',
                    '&:hover': {
                      bgcolor: box === selectedPeriod ? 'primary.dark' : 'primary.light'
                    }
                  }}
                />
              ))}
            </Box>

            <IconButton
              onClick={() => setNumPeriods(n => Math.max(6, n - 6))}
              disabled={!canGoNewer}
              sx={{
                flexShrink: 0,
                backgroundColor: 'white',
                borderRadius: '50%',
                border: '1px solid #e0e0e0', // borde gris suave
                boxShadow: 2,
                color: "blue",

                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  borderColor: 'primary.main',
                  boxShadow: 4,
                },
                '& svg': {
                  fontSize: 24,
                },
                '&:hover svg': {
                  color: 'white',
                }
              }}
            >
              <BsArrowRight />
            </IconButton>

          </Box>
        )}


        {activeTab === 'custom' && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={5}>
              <DatePicker label="Fecha Inicial" value={selectedStartDate} onChange={setSelectedStartDate} />
            </Grid>
            <Grid item xs={12} sm={5}>
              <DatePicker
                label="Fecha Final"
                value={selectedEndDate}
                onChange={(date) => {
                  if (date) {
                    const adjusted = new Date(date);
                    adjusted.setHours(23, 59, 59, 999);
                    setSelectedEndDate(adjusted);
                  } else {
                    setSelectedEndDate(null);
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button variant="contained" onClick={handleCustomGo}>Ir</Button>
            </Grid>
          </Grid>
        )}
        <Divider />
        {/* Filtros (por tipo y medio de pago, encima de tabla) */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel sx={{ backgroundColor: 'white', px: 0.5, color: '#1976d2', }}>Tipo</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value as string); handleFilterChange(); }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value={TransactionType.Ingreso}>Ingreso</MenuItem>
                <MenuItem value={TransactionType.Gasto}>Gasto</MenuItem>
              </Select>
            </FormControl>


          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel sx={{ backgroundColor: 'white', px: 0.5, color: '#1976d2', }}>Medio de Pago</InputLabel>
              <Select value={filterPayment} onChange={(e) => { setFilterPayment(e.target.value as string); handleFilterChange(); }}>
                <MenuItem value="all">Todos</MenuItem>
                {Object.values(PaymentMethod).map(method => <MenuItem key={method} value={method}>{capitalize(method)}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Buscar por descripción" value={search} onChange={(e) => setSearch(e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
        <Divider />
        {/* Tabla/Lista (responsive: tabla desktop, cards mobile) */}
        <Typography
          variant="subtitle1"
          sx={{ mt: 3, mb: 2, fontWeight: 600, color: "grey.900", align: "center",  textAlign: "center"  }}
        >
          Lista de transacciones
        </Typography>

        {isLoading ? (
          <Box sx={{ textAlign: 'center', my: 4 }}><CircularProgress /></Box>
        ) : allTransactions.length === 0 ? (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <NoDataIcon sx={{ fontSize: 60, color: 'grey.500' }} />
            <Typography variant="body1" color="grey.600">No hay transacciones para este período</Typography>
          </Box>
        ) : isMobile ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {sortedTransactions.map((t) => (
              <Fade in key={`fade-mobile-${t.id}-${activeTab}`}>
                <Card key={t.id} sx={{ bgcolor: t.type === TransactionType.Ingreso ? "green.50" : "red.50", p: 2, borderBottom: `4px solid ${theme.palette[t.type === TransactionType.Ingreso ? 'success' : 'error'].light}`, borderRadius: 2 }}>
                  <Typography><strong>Fecha:</strong> {formatISODate(t.date)}</Typography>
                  <Typography
                    sx={{
                      cursor: 'pointer',
                      color: 'text.primary',
                      fontWeight: 500,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        color: 'primary.contrastText',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }
                    }}
                    onClick={() => handleOpenDetail(t.id)}
                    aria-label="Ver detalles"
                  >
                    {t.description}
                  </Typography>
                  <Typography><strong>Categoría:</strong> {capitalize(t.category)}</Typography>
                  <Typography><strong>Monto:</strong> {t.type === TransactionType.Ingreso ? <ArrowUpward color="success" fontSize="small" sx={{ verticalAlign: 'middle' }} /> : <ArrowDownward color="error" fontSize="small" sx={{ verticalAlign: 'middle' }} />} ${t.amount.toLocaleString("es-CO")}</Typography>
                  <Typography><strong>Medio:</strong> {capitalize(t.paymentMethod)}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Tooltip title="Ver detalles">
                      <IconButton onClick={() => handleOpenDetail(t.id)}><VisibilityIcon /></IconButton>
                    </Tooltip>
                    <IconButton onClick={() => { setSelectedTransaction(t); setOpenEdit(true); }}><EditIcon /></IconButton>
                    <IconButton onClick={() => { setSelectedTransaction(t); setOpenDelete(true); }}><DeleteIcon /></IconButton>
                  </Box>
                </Card>
              </Fade>
            ))}
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: 440, overflowY: "auto", borderRadius: 2 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      borderRight: '1px solid rgba(224, 224, 224, 1)',
                      backgroundColor: '#424242',
                      color: 'white',
                      fontWeight: 600,
                      textAlign: "center" 
                    }}
                  >
                    Fecha
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      borderRight: '1px solid rgba(224, 224, 224, 1)', 
                      maxWidth: '200px',
                      backgroundColor: '#424242',
                      color: 'white',
                      fontWeight: 600,
                      textAlign: "center" 
                    }}
                  >
                    Descripción
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      borderRight: '1px solid rgba(224, 224, 224, 1)',
                      backgroundColor: '#424242',
                      color: 'white',
                      fontWeight: 600,
                      textAlign: "center" 
                    }}
                  >
                    Categoría
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      borderRight: '1px solid rgba(224, 224, 224, 1)',
                      backgroundColor: '#424242',
                      color: 'white',
                      fontWeight: 600,
                      textAlign: "center" 
                    }}
                  >
                    Monto
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      borderRight: '1px solid rgba(224, 224, 224, 1)',
                      backgroundColor: '#424242',
                      color: 'white',
                      fontWeight: 600,
                      textAlign: "center" 
                    }}
                  >
                    Medio
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      width: '150px',
                      backgroundColor: '#424242',
                      color: 'white',
                      fontWeight: 600,
                      textAlign: "center" 
                    }}
                  >
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedTransactions.map((t) => (
                  <Fade in key={`fade-desktop-${t.id}-${activeTab}`}>
                    <TableRow
                      key={t.id}
                      sx={{
                        bgcolor: t.type === TransactionType.Ingreso ? "green.50" : "red.50",
                        borderBottom: `2px solid ${theme.palette[t.type === TransactionType.Ingreso ? 'success' : 'error'].light}`,
                        boxShadow: `inset 0 -2px 0 ${theme.palette[t.type === TransactionType.Ingreso ? 'success' : 'error'].light}`,
                        '&:hover': { bgcolor: t.type === TransactionType.Ingreso ? "green.100" : "red.100" }
                      }}
                    >
                      <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{formatISODate(t.date)}</TableCell>
                      <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', maxWidth: '200px' }}>

                        <Typography
                          sx={{
                            cursor: 'pointer',
                            color: 'text.primary',
                            fontWeight: 500,
                            position: 'relative',
                            transition: 'color 0.2s ease-in-out',
                            '&:hover': {
                              color: 'primary.main',
                            },
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              width: '0',
                              height: '2px',
                              bottom: '-2px',
                              left: '0',
                              backgroundColor: 'primary.main',
                              transition: 'width 0.3s ease-in-out',
                            },
                            '&:hover::after': {
                              width: '100%',
                            }
                          }}
                          onClick={() => handleOpenDetail(t.id)}
                          aria-label="Ver detalles"
                        >
                          {t.description}
                        </Typography>


                      </TableCell>
                      <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{capitalize(t.category)}</TableCell>
                      <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                        {t.type === TransactionType.Ingreso
                          ? <ArrowUpward sx={{ color: theme.palette.success.main, verticalAlign: 'middle', mr: 0.5 }} />
                          : <ArrowDownward sx={{ color: theme.palette.error.main, verticalAlign: 'middle', mr: 0.5 }} />}
                        ${t.amount.toLocaleString("es-CO")}
                      </TableCell>
                      <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{capitalize(t.paymentMethod)}</TableCell>
                      <TableCell sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Ver detalles">
                          <IconButton onClick={() => handleOpenDetail(t.id)}><VisibilityIcon /></IconButton>
                        </Tooltip>
                        <IconButton onClick={() => { setSelectedTransaction(t); setOpenEdit(true); }}><EditIcon /></IconButton>
                        <IconButton onClick={() => { setSelectedTransaction(t); setOpenDelete(true); }}><DeleteIcon /></IconButton>
                      </TableCell>
                    </TableRow>
                  </Fade>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {isFetchingNextPage && <Skeleton variant="rectangular" height={100} sx={{ my: 2 }} />}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          {hasNextPage ? (
            <Button
              variant="contained"
              color="info"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              sx={{
                borderRadius: 20,
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4,
                },
              }}
            >
              {isFetchingNextPage ? 'Cargando...' : 'Ver más transacciones'}
            </Button>
          ) : (
            allTransactions.length > 0 && <Typography color="text.secondary">No hay más transacciones</Typography>
          )}
        </Box>
        {/* Footer export */}
        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button variant="outlined" startIcon={<GetAppOutlined />} onClick={exportToCSV}>Exportar CSV</Button>
        </Box>
        {/* Modals edit/delete como antes */}
        {/* Error Modal */}
        <Dialog open={openError} onClose={() => setOpenError(false)}>
          <DialogTitle>Error</DialogTitle>
          <DialogContent><Typography>{errorMessage}</Typography></DialogContent>
          <DialogActions><Button onClick={() => setOpenError(false)}>Cerrar</Button></DialogActions>
        </Dialog>
        {/* Snackbar para loads */}
        <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
          <Alert severity="info">Cargando transacciones...</Alert>
        </Snackbar>
        {/* Modal de detalles */}
        {detailId && (
          <TransactionDetailModal
            transactionId={detailId}
            isOpen={openDetail}
            onClose={handleCloseDetail}
          />
        )}
        {/* Modal de edición */}
        <EditTransactionModal
          open={openEdit}
          onClose={() => { setOpenEdit(false); setSelectedTransaction(null); }}
          transactionId={selectedTransaction?.id || null}
          onTransactionUpdated={handleTransactionUpdated}
        />
        {/* Modal de eliminación */}
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