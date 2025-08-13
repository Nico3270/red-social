"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import {
  TransactionType,
  IncomeCategory,
  ExpenseCategory,
  PaymentMethod,
  Transaction,
} from "@/transacciones/interfaces/types";
import { addTransaction } from "@/transacciones/actions/addTransaction"; // Asumimos editTransaction existe similar a add
import {
  Box,
  Grid,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Fade,
  Modal,
  Backdrop,
  CircularProgress,
  Tooltip,
  IconButton,
  Autocomplete,
  Divider,
  Paper,
} from "@mui/material";
import { AddCircleOutline, ArrowDownward, ArrowUpward, CheckCircleOutline, ErrorOutline, DeleteOutline, Add, Save } from "@mui/icons-material";
import { useProductosTransaccionesStore } from "@/store/productosTransacciones/productosTransaccionesStore";
import { editTransaction } from "../actions/editTransaction";

interface Item {
  id?: string; // ID temporal para líneas
  description: string;
  quantity: number;
  price: number;
  subtotal: number;
  productId?: string | null; // Para productos, null para genéricos
  isLocked?: boolean; // Para bloquear edición de descripción si es de autocomplete
}

interface FormData {
  date: string;
  type: TransactionType;
  category: string;
  paymentMethod: PaymentMethod;
  items: Item[]; // Para multi-líneas en ingresos
  amount: number; // Calculado auto
  description?: string; // Opcional, auto-generado de items
}

interface AddTransactionProps {
  onTransactionAdded: (newTransaction: Transaction) => void;
  initialData?: FormData & { transactionId: string }; // Para modo edición: datos iniciales + ID
}

const AddTransactionComponent: React.FC<AddTransactionProps> = ({ onTransactionAdded, initialData }) => {
  const isEditMode = !!initialData;

  const { productos, fetchProductos, isLoading: productsLoading, error: productsError } = useProductosTransaccionesStore();

  const {
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      date: new Date().toISOString().substring(0, 10),
      type: TransactionType.Ingreso,
      category: IncomeCategory.Ventas,
      paymentMethod: PaymentMethod.Efectivo,
      items: [{ id: crypto.randomUUID(), description: "", quantity: 1, price: 0, subtotal: 0, isLocked: false }], // Inicial con una línea
      amount: 0,
    },
  });

  const transactionType = watch("type");
  const items = watch("items");
  const category = watch("category");

  const { fields, append, remove, } = useFieldArray({
    control,
    name: "items",
  });

  // Estados para manejo de envío y modal
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSeverity, setModalSeverity] = useState<"success" | "error">("success");
  const [addedTransaction, setAddedTransaction] = useState<Transaction | null>(null);

  // Cargar productos al render
  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  // Pre-llenar form si es edición
  useEffect(() => {
    if (isEditMode && initialData) {
      reset({
        ...initialData,
        items: initialData.items.map(item => ({
          ...item,
          id: crypto.randomUUID(), // Generar ID temporal para field array
          isLocked: !!item.productId, // Bloquear si es producto
        })),
      });
    }
  }, [initialData, isEditMode, reset]);

  // Resetear category al cambiar type y manejar items solo para ingresos
  useEffect(() => {
    if (transactionType === TransactionType.Ingreso) {
      setValue("category", IncomeCategory.Ventas);
    } else {
      setValue("category", ExpenseCategory.Materiales);
      setValue("items", []); // Limpiar items para gastos
    }
  }, [transactionType, setValue]);

  // Función para calcular subtotal en una línea y actualizar total global
  const calculateSubtotal = (index: number) => {
    const item = watch(`items.${index}`);
    const subtotal = (item.quantity || 0) * (item.price || 0);
    setValue(`items.${index}.subtotal`, subtotal);

    // Calcular y actualizar total global inmediatamente
    const updatedItems = watch("items");
    const total = updatedItems.reduce((sum, it) => sum + (it.subtotal || 0), 0);
    setValue("amount", total);
  };

  // Función para manejar selección de autocomplete
  const handleAutocompleteChange = (index: number, selectedProduct: { id: string; nombre: string; precio: number } | null) => {
    if (selectedProduct) {
      setValue(`items.${index}.description`, selectedProduct.nombre);
      setValue(`items.${index}.price`, selectedProduct.precio);
      setValue(`items.${index}.productId`, selectedProduct.id);
      setValue(`items.${index}.isLocked`, true); // Bloquear edición
      setValue(`items.${index}.quantity`, 1); // Default cantidad
      calculateSubtotal(index);
    } else {
      // Si borra selección, desbloquear
      setValue(`items.${index}.isLocked`, false);
      setValue(`items.${index}.productId`, null);
    }
  };

  // Submit: Preparar data para server (crear o editar)
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Generar descripción auto si multi-items
      const generatedDesc = data.items.map(item => `${item.description} x${item.quantity}`).join(", ");

      // Parsear data.date como local midnight explícitamente
    const [year, month, day] = data.date.split('-').map(Number);
    const selectedDateLocal = new Date(year, month - 1, day); // Crea 00:00 local

    // Agregar hora actual local
    // Crear cadena de fecha/hora LOCAL explícita (YYYY-MM-DDTHH:mm:ss)
    const now = new Date(); // Hora actual local
    const localTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const localDateStr = `${data.date}T${localTimeStr}`; // e.g., '2025-08-13T11:07:00'

    // Parsear como LOCAL (sin 'Z' para forzar timezone del navegador)
    const fullDate = new Date(localDateStr);

      const submitData = {
        ...data,
        date: fullDate.toISOString(), // Enviar como ISO (UTC), con hora local convertida
        description: generatedDesc || data.description || "",
        items: data.items?.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          price: Number(item.price),
          subtotal: Number(item.subtotal),
        })),
        amount: Number(data.amount),
      };

      let response;
      if (isEditMode) {
        // Modo edición: Llamar a editTransaction con ID
        response = await editTransaction({ ...submitData, transactionId: initialData?.transactionId });
      } else {
        // Modo add
        console.log('Fecha enviada:', fullDate.toISOString());
        response = await addTransaction(submitData);
      }

      if (response.success && response.transaction) {
        setModalMessage(isEditMode ? "Transacción editada con éxito." : "Transacción agregada con éxito.");
        setModalSeverity("success");
        setAddedTransaction(response.transaction);
        setModalOpen(true);
        reset();
        onTransactionAdded(response.transaction);
      } else {
        setModalMessage(response.error || "Error al procesar la transacción.");
        setModalSeverity("error");
        setModalOpen(true);
      }
    } catch (error) {
      console.error("Error al procesar la transacción:", error);
      setModalMessage("Error al procesar la transacción.");
      setModalSeverity("error");
      setModalOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setAddedTransaction(null);
  };

  // Colores dinámicos para toggle buttons y botón agregar
  const ingresoColor = "#4CAF50";
  const ingresoHover = "#66BB6A";
  const gastoColor = "#EF5350";
  const gastoHover = "#F44336";

  const submitButtonColor = transactionType === TransactionType.Ingreso ? ingresoColor : gastoColor;
  const submitButtonHoverColor = transactionType === TransactionType.Ingreso ? ingresoHover : gastoHover;
  const modalBorderColor = addedTransaction?.type === TransactionType.Ingreso ? ingresoColor : gastoColor;

  // Si error en productos
  if (productsError) {
    return <Typography color="error">Error cargando productos: {productsError}</Typography>;
  }

  return (
    <Fade in timeout={600}>
      <Box
        sx={{
          width: "100%",
          maxWidth: "lg",
          mx: "auto",
          bgcolor: "white",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          borderRadius: 3,
          p: { xs: 2, sm: 3 },
          mt: 2,
          mb: 4,
        }}
      >
        <Typography variant="h6" align="center" sx={{ mb: 3, color: "grey.800", fontWeight: 500 }}>
          {isEditMode ? "Editar transacción" : "Agregar transacción"}
        </Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            {/* Tipo */}
            <Grid item xs={12}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <ToggleButtonGroup
                    {...field}
                    exclusive
                    fullWidth
                    sx={{ mb: 2, height: 48 }}
                    onChange={(e, value) => value && field.onChange(value)}
                  >
                    <ToggleButton
                      value={TransactionType.Ingreso}
                      sx={{
                        textTransform: "none",
                        borderColor: "green.300",
                        color: transactionType === TransactionType.Ingreso ? "white !important" : "green.700",
                        bgcolor: transactionType === TransactionType.Ingreso ? ingresoColor : "transparent",
                        "&:hover": { bgcolor: transactionType === TransactionType.Ingreso ? ingresoHover : "#E8F5E9" },
                        fontWeight: 600,
                        flex: 1,
                        gap: 1,
                        transition: "background-color 0.3s ease, color 0.3s ease",
                        "&.Mui-selected": { color: "white !important", bgcolor: ingresoColor + " !important" },
                        "&.Mui-selected:hover": { bgcolor: ingresoHover + " !important" },
                      }}
                    >
                      <ArrowUpward fontSize="small" /> Ingreso
                    </ToggleButton>
                    <ToggleButton
                      value={TransactionType.Gasto}
                      sx={{
                        textTransform: "none",
                        borderColor: "red.300",
                        color: transactionType === TransactionType.Gasto ? "white !important" : "red.700",
                        bgcolor: transactionType === TransactionType.Gasto ? gastoColor : "transparent",
                        "&:hover": { bgcolor: transactionType === TransactionType.Gasto ? gastoHover : "#FFEBEE" },
                        fontWeight: 600,
                        flex: 1,
                        gap: 1,
                        transition: "background-color 0.3s ease, color 0.3s ease",
                        "&.Mui-selected": { color: "white !important", bgcolor: gastoColor + " !important" },
                        "&.Mui-selected:hover": { bgcolor: gastoHover + " !important" },
                      }}
                    >
                      <ArrowDownward fontSize="small" /> Gasto
                    </ToggleButton>
                  </ToggleButtonGroup>
                )}
              />
            </Grid>

            {/* Fecha */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="date"
                control={control}
                rules={{ required: "La fecha es requerida" }}
                render={({ field }) => (
                  <TextField {...field} type="date" label="Fecha" fullWidth variant="outlined" error={!!errors.date} helperText={errors.date?.message} InputLabelProps={{ shrink: true }} sx={{ borderRadius: 2 }} />
                )}
              />
            </Grid>

            {/* Categoría */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Categoría</InputLabel>
                    <Select {...field} label="Categoría" variant="outlined" sx={{ borderRadius: 2 }}>
                      {transactionType === TransactionType.Ingreso
                        ? Object.values(IncomeCategory).map((cat) => <MenuItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</MenuItem>)
                        : Object.values(ExpenseCategory).map((cat) => <MenuItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Medio de pago */}
            <Grid item xs={12}>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Medio de pago</InputLabel>
                    <Select {...field} label="Medio de pago" variant="outlined" sx={{ borderRadius: 2 }}>
                      {Object.values(PaymentMethod).map((method) => <MenuItem key={method} value={method}>{method.charAt(0).toUpperCase() + method.slice(1)}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Sección de Items solo para Ingresos */}
            {transactionType === TransactionType.Ingreso && (
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>Items de la transacción</Typography>
                  {productsLoading ? (
                    <CircularProgress size={24} />
                  ) : (
                    fields.map((field, index) => (
                      <Paper
                        key={field.id}
                        elevation={2}
                        sx={{
                          p: 2,
                          mb: 2,
                          borderRadius: 2,
                          border: "1px solid #e0e0e0",
                        }}
                      >
                        <Grid container spacing={2} alignItems="center">
                          {/* Descripción con Autocomplete */}
                          <Grid item xs={12}>
                            <Controller
                              name={`items.${index}.description`}
                              control={control}
                              rules={{ required: "Descripción requerida" }}
                              render={({ field }) => (
                                <Autocomplete
                                  freeSolo
                                  options={productos}
                                  getOptionLabel={(option) => (typeof option === "string" ? option : option.nombre)}
                                  onChange={(_, value) => {
                                    const selected = typeof value === "string" ? null : value;
                                    handleAutocompleteChange(index, selected);
                                  }}
                                  onInputChange={(_, value) => field.onChange(value)}
                                  inputValue={field.value}
                                  disabled={watch(`items.${index}.isLocked`)} // Bloquear si seleccionado
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Descripción"
                                      variant="outlined"
                                      error={!!errors.items?.[index]?.description}
                                      helperText={errors.items?.[index]?.description?.message}
                                      sx={{ borderRadius: 2 }}
                                    />
                                  )}
                                />
                              )}
                            />
                          </Grid>

                          {/* Row para Cantidad, Precio, Subtotal */}
                          <Grid item xs={12}>
                            <Grid container spacing={2}>
                              <Grid item xs={4}>
                                <Controller
                                  name={`items.${index}.quantity`}
                                  control={control}
                                  rules={{ required: true, min: 1 }}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      type="number"
                                      label="Cantidad"
                                      variant="outlined"
                                      fullWidth
                                      onChange={(e) => {
                                        field.onChange(e);
                                        calculateSubtotal(index);
                                      }}
                                      error={!!errors.items?.[index]?.quantity}
                                      helperText={errors.items?.[index]?.quantity?.message}
                                      inputProps={{ min: 1 }}
                                      sx={{ borderRadius: 2 }}
                                    />
                                  )}
                                />
                              </Grid>
                              <Grid item xs={4}>
                                <Controller
                                  name={`items.${index}.price`}
                                  control={control}
                                  rules={{ required: true, min: 0.01 }}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      type="number"
                                      label="Precio"
                                      variant="outlined"
                                      fullWidth
                                      onChange={(e) => {
                                        field.onChange(Number(e.target.value));
                                        calculateSubtotal(index);
                                      }}
                                      error={!!errors.items?.[index]?.price}
                                      helperText={errors.items?.[index]?.price?.message}
                                      inputProps={{ step: "0.01", min: "0.01" }}
                                      sx={{ borderRadius: 2 }}
                                    />
                                  )}
                                />
                              </Grid>
                              <Grid item xs={4}>
                                <TextField
                                  value={watch(`items.${index}.subtotal`).toFixed(2)}
                                  label="Total"
                                  variant="outlined"
                                  fullWidth
                                  InputProps={{ readOnly: true }}
                                  sx={{ borderRadius: 2 }}
                                />
                              </Grid>
                            </Grid>
                          </Grid>

                          {/* Botón eliminar línea */}
                          <Grid item xs={12} sx={{ display: "flex", justifyContent: "flex-end" }}>
                            <IconButton color="error" onClick={() => remove(index)} disabled={fields.length === 1}>
                              <DeleteOutline />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))
                  )}
                  <Button
                    startIcon={<Add />}
                    onClick={() => append({ id: crypto.randomUUID(), description: "", quantity: 1, price: 0, subtotal: 0, isLocked: false })}
                    sx={{ mb: 2 }}
                  >
                    Añadir item
                  </Button>
                </Paper>
              </Grid>
            )}

            {/* Para Gastos: Mantener campos simples */}
            {transactionType === TransactionType.Gasto && (
              <>
                {/* Valor para gastos */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="amount"
                    control={control}
                    rules={{ required: "El valor es requerido", min: { value: 0.01, message: "El valor debe ser mayor a 0" } }}
                    render={({ field }) => (
                      <TextField {...field} type="number" label="Valor" fullWidth variant="outlined" error={!!errors.amount} helperText={errors.amount?.message} inputProps={{ step: "0.01", min: "0" }} sx={{ borderRadius: 2 }} />
                    )}
                  />
                </Grid>
                {/* Descripción para gastos */}
                <Grid item xs={12}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} label="Descripción" fullWidth variant="outlined" multiline rows={2} placeholder="Descripción de la transacción" sx={{ borderRadius: 2 }} />
                    )}
                  />
                </Grid>
              </>
            )}

            {/* Botón agregar con total al lado */}
            <Grid item xs={12} sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Total: ${watch("amount").toFixed(2)}
              </Typography>
              <Tooltip title={isSubmitting ? "Procesando..." : ""}>
                <span>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={isSubmitting ? <CircularProgress size={20} /> : <AddCircleOutline />}
                    disabled={isSubmitting || productsLoading}
                    sx={{
                      textTransform: "none",
                      bgcolor: submitButtonColor,
                      color: "white",
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      "&:hover": { bgcolor: submitButtonHoverColor },
                      fontWeight: 600,
                      opacity: isSubmitting ? 0.7 : 1,
                    }}
                  >
                    {isSubmitting ? "Agregando..." : "Agregar"}
                  </Button>
                </span>
              </Tooltip>
            </Grid>
          </Grid>
        </form>

        {/* Modal feedback */}
        <Modal open={modalOpen} onClose={handleModalClose} closeAfterTransition slots={{ backdrop: Backdrop }} slotProps={{ backdrop: { timeout: 500 } }}>
          <Fade in={modalOpen}>
            <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: { xs: "90%", sm: 400 }, bgcolor: "white", border: `4px solid ${modalSeverity === "success" ? modalBorderColor : "#EF5350"}`, borderRadius: 3, boxShadow: 24, p: 4, textAlign: "center" }}>
              {modalSeverity === "success" ? <CheckCircleOutline sx={{ fontSize: 60, color: modalBorderColor, mb: 2 }} /> : <ErrorOutline sx={{ fontSize: 60, color: "#EF5350", mb: 2 }} />}
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>{modalMessage}</Typography>
              {modalSeverity === "success" && addedTransaction && (
                <Box sx={{ textAlign: "left", mb: 2 }}>
                  <Typography><strong>Tipo:</strong> {addedTransaction.type.charAt(0).toUpperCase() + addedTransaction.type.slice(1)}</Typography>
                  <Typography><strong>Fecha:</strong> {new Date(addedTransaction.date).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</Typography>
                  <Typography><strong>Monto:</strong> ${addedTransaction.amount.toFixed(2)}</Typography>
                  <Typography><strong>Categoría:</strong> {addedTransaction.category.charAt(0).toUpperCase() + addedTransaction.category.slice(1)}</Typography>
                  <Typography><strong>Descripción:</strong> {addedTransaction.description || "N/A"}</Typography>
                </Box>
              )}
              <Button onClick={handleModalClose} variant="contained" sx={{ bgcolor: modalSeverity === "success" ? modalBorderColor : "#EF5350", color: "white", "&:hover": { bgcolor: modalSeverity === "success" ? submitButtonHoverColor : "#F44336" } }}>
                Cerrar
              </Button>
            </Box>
          </Fade>
        </Modal>
      </Box>
    </Fade>
  );
};

export default AddTransactionComponent;