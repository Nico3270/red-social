"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Fade,
  Tooltip,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Transaction, TransactionType } from "@/transacciones/interfaces/types";
import { Grid } from "@mui/material";  // Corrección: Import desde @mui/material para soporte responsive
import { BsFileArrowDown, BsFillArrowUpCircleFill, BsSortDown, BsSortUp } from "react-icons/bs";
import { Delete as DeleteIcon, Edit as EditIcon } from "lucide-react";  // Corrección: Usa 'as' para evitar conflictos de nombres
import { GetAppOutlined } from "@mui/icons-material";

interface ShowTransactionsProps {
  transactions: Transaction[];
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

const ShowTransactions: React.FC<ShowTransactionsProps> = ({ transactions }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState({ field: "date", order: "desc" as "asc" | "desc" });
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === "all" || t.type === filterType;
      const matchesCategory = filterCategory === "all" || t.category === filterCategory;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, search, filterType, filterCategory]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (sortBy.field === "date") {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortBy.order === "asc" ? dateA - dateB : dateB - dateA;
      } if (sortBy.field === "amount") {
        return sortBy.order === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }
      return 0;
    });
  }, [filteredTransactions, sortBy]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return sortedTransactions.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedTransactions, page]);

  const totalIngresos = filteredTransactions.filter((t) => t.type === TransactionType.Ingreso).reduce((sum, t) => sum + t.amount, 0);
  const totalGastos = filteredTransactions.filter((t) => t.type === TransactionType.Gasto).reduce((sum, t) => sum + t.amount, 0);

  const exportToCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Fecha,Descripción,Categoría,Monto,Medio de Pago\n" +
      filteredTransactions.map((t) => `${format(new Date(t.date), "dd/MM/yyyy", { locale: es })},${t.description},${capitalize(t.category)},${t.amount},${capitalize(t.paymentMethod)}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transacciones.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEdit = (t: Transaction) => {
    setSelectedTransaction(t);
    setOpenEdit(true);
  };

  const handleDelete = (t: Transaction) => {
    setSelectedTransaction(t);
    setOpenDelete(true);
  };

  const handleCloseModal = () => {
    setOpenEdit(false);
    setOpenDelete(false);
  };

  const handleSort = (field: "date" | "amount") => {
    setSortBy({ field, order: sortBy.field === field && sortBy.order === "asc" ? "desc" : "asc" });
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2, boxShadow: 1, maxWidth: "100%", overflowX: "hidden" }}>
      <Typography variant="h6" sx={{ mb: 3, textAlign: "center", color: "grey.800", fontWeight: 600 }}>
        Transacciones
      </Typography>

      {/* Filtros y búsqueda */}
      <Grid container spacing={2} sx={{ mb: 3, flexWrap: 'wrap', justifyContent: 'space-between' }}>  {/* Mejora: sx para elegancia responsive */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Buscar por descripción"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Tipo</InputLabel>
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value={TransactionType.Ingreso}>Ingreso</MenuItem>
              <MenuItem value={TransactionType.Gasto}>Gasto</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Categoría</InputLabel>
            <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <MenuItem value="all">Todas</MenuItem>
              {[...new Set(transactions.map((t) => t.category))].map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {capitalize(cat)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {isMobile ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {paginatedTransactions.map((transaction) => (
            <Fade in timeout={300} key={transaction.id}>
              <Card
                sx={{
                  bgcolor: transaction.type === TransactionType.Ingreso ? "green.50" : "red.50",
                  boxShadow: 1,
                  borderRadius: 2,
                  p: 2,
                  "&:hover": { bgcolor: "grey.100" },
                }}
              >
                <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                  <Typography variant="body2" color="grey.700">
                    <strong>Fecha:</strong> {format(new Date(transaction.date), "dd/MM/yyyy", { locale: es })}
                  </Typography>
                  <Tooltip title={transaction.description} arrow>
                    <Typography variant="body2" color="grey.700" noWrap sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <strong>Descripción:</strong>
                      {transaction.type === TransactionType.Ingreso ? <BsFillArrowUpCircleFill color="green" /> : <BsFileArrowDown color="red" />}
                      {transaction.description}
                    </Typography>
                  </Tooltip>
                  <Typography variant="body2" color="grey.700">
                    <strong>Categoría:</strong> {capitalize(transaction.category)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color={transaction.type === TransactionType.Ingreso ? "green.700" : "red.700"}
                    sx={{ fontWeight: "bold" }}
                  >
                    <strong>Monto:</strong> {transaction.type === TransactionType.Ingreso ? "+" : "-"} ${transaction.amount.toLocaleString("es-CO")}
                  </Typography>
                  <Typography variant="body2" color="grey.700">
                    <strong>Medio de pago:</strong> {capitalize(transaction.paymentMethod)}
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}>
                    <IconButton size="small" onClick={() => handleEdit(transaction)} aria-label="Editar transacción">
                      <EditIcon fontSize="small" color="primary" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(transaction)} aria-label="Eliminar transacción">
                      <DeleteIcon fontSize="small" color="error" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Fade>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ maxHeight: 440, overflowY: "auto", borderRadius: 2 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: "grey.100", fontWeight: 600, cursor: "pointer" }} onClick={() => handleSort("date")}>
                  Fecha {sortBy.field === "date" && (sortBy.order === "asc" ? <BsSortUp fontSize="small" /> : <BsSortDown fontSize="small" />)}
                </TableCell>
                <TableCell sx={{ bgcolor: "grey.100", fontWeight: 600 }}>Descripción</TableCell>
                <TableCell sx={{ bgcolor: "grey.100", fontWeight: 600 }}>Categoría</TableCell>
                <TableCell sx={{ bgcolor: "grey.100", fontWeight: 600, cursor: "pointer" }} align="right" onClick={() => handleSort("amount")}>
                  Monto {sortBy.field === "amount" && (sortBy.order === "asc" ? <BsSortUp fontSize="small" /> : <BsSortDown fontSize="small" />)}
                </TableCell>
                <TableCell sx={{ bgcolor: "grey.100", fontWeight: 600 }}>Medio de pago</TableCell>
                <TableCell sx={{ bgcolor: "grey.100", fontWeight: 600 }} align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedTransactions.map((transaction) => (
                <Fade in timeout={300} key={transaction.id}>
                  <TableRow
                    sx={{
                      "&:hover": { bgcolor: "grey.50" },
                      bgcolor: transaction.type === TransactionType.Ingreso ? "green.50" : "red.50",
                    }}
                  >
                    <TableCell>{format(new Date(transaction.date), "dd/MM/yyyy", { locale: es })}</TableCell>
                    <TableCell sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {transaction.type === TransactionType.Ingreso ? <BsFillArrowUpCircleFill color="green" /> : <BsFileArrowDown color="red" />}
                      <Tooltip title={transaction.description} arrow>
                        <Typography variant="body2" noWrap>
                          {transaction.description}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{capitalize(transaction.category)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", color: transaction.type === TransactionType.Ingreso ? "green.700" : "red.700" }}>
                      {transaction.type === TransactionType.Ingreso ? "+" : "-"} ${transaction.amount.toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell>{capitalize(transaction.paymentMethod)}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleEdit(transaction)} aria-label="Editar transacción">
                        <EditIcon fontSize="small" color="primary" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(transaction)} aria-label="Eliminar transacción">
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                </Fade>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Footer con totales y export */}
      <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="body2" color="green.700">
            Total Ingresos: ${totalIngresos.toLocaleString("es-CO")}
          </Typography>
          <Typography variant="body2" color="red.700">
            Total Gastos: ${totalGastos.toLocaleString("es-CO")}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<GetAppOutlined />} onClick={exportToCSV} sx={{ color: "grey.700", borderColor: "grey.300" }}>
          Exportar CSV
        </Button>
      </Box>

      {/* Paginación */}
      <Pagination
        count={Math.ceil(filteredTransactions.length / rowsPerPage)}
        page={page}
        onChange={(e, value) => setPage(value)}
        sx={{ mt: 2, justifyContent: "center", display: "flex" }}
        color="primary"
      />

      {/* Modal Editar (demo) */}
      <Dialog open={openEdit} onClose={handleCloseModal}>
        <DialogTitle>Editar Transacción</DialogTitle>
        <DialogContent>
          {/* Form para editar; integra con form similar a Add */}
          <Typography>Editar {selectedTransaction?.description}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancelar</Button>  {/* Corrección: onClose -> onClick */}
          <Button onClick={handleCloseModal} color="primary" variant="contained">Guardar</Button>  {/* Mejora: variant="contained" para elegancia */}
        </DialogActions>
      </Dialog>

      {/* Modal Borrar (demo) */}
      <Dialog open={openDelete} onClose={handleCloseModal}>
        <DialogTitle>Confirmar Borrado</DialogTitle>
        <DialogContent>
          <Typography>¿Eliminar {selectedTransaction?.description}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancelar</Button>  {/* Corrección: onClose -> onClick */}
          <Button onClick={handleCloseModal} color="error" variant="contained">Borrar</Button>  {/* Mejora: variant="contained" para resaltar acción */}
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ShowTransactions;