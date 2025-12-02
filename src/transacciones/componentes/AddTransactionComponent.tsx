"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { addTransaction } from "@/transacciones/actions/addTransaction";
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
  Paper,
} from "@mui/material";

import {
  AddCircleOutline,
  ArrowDownward,
  ArrowUpward,
  CheckCircleOutline,
  ErrorOutline,
  DeleteOutline,
  Add,
} from "@mui/icons-material";

import { useProductosTransaccionesStore } from "@/store/productosTransacciones/productosTransaccionesStore";
import { editTransaction } from "../actions/editTransaction";

import { TransactionType, PaymentMethod } from "@prisma/client";
import { Transaction, FormData } from "@/transacciones/interfaces/types";


interface AddTransactionProps {
  onTransactionAdded: (newTransaction: Transaction) => void;
  initialData?: FormData & { transactionId: string };
}


const AddTransactionComponent: React.FC<AddTransactionProps> = ({
  onTransactionAdded,
  initialData,
}) => {
  const isEditMode = !!initialData;

  const {
    productos,
    fetchProductos,
    isLoading: productsLoading,
    error: productsError,
  } = useProductosTransaccionesStore();

  const IncomeCategories = [
    "ventas",
    "propinas",
    "ahorro",
    "otros",
    "prestamos",
  ];

  const ExpenseCategories = [
    "implementos",
    "materiales",
    "arriendo",
    "empleados",
    "servicios_publicos",
    "envios",
    "deudas",
    "mantenimiento",
    "impuestos",
    "otros",
  ];

  const todayLocal = new Date();
  const localDateStr = todayLocal.toLocaleDateString("sv-SE");

  const {
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      date: localDateStr,
      type: TransactionType.ingreso,
      category: "ventas",
      paymentMethod: PaymentMethod.efectivo,
      items: [
        {
          id: crypto.randomUUID(),
          description: "",
          quantity: 1,
          price: 0,
          subtotal: 0,
          isLocked: false,
        },
      ],
      amount: 0,
    },
  });

  const transactionType = watch("type");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Estados UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSeverity, setModalSeverity] = useState<"success" | "error">(
    "success"
  );
  const [addedTransaction, setAddedTransaction] =
    useState<Transaction | null>(null);


  // Fetch productos
  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);


  // Prefill para edición
  useEffect(() => {
    if (isEditMode && initialData) {
      reset({
        ...initialData,
        amount: Number(initialData.amount),
        items: initialData.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          price: Number(item.price),
          subtotal: Number(item.subtotal),
          id: crypto.randomUUID(),
          isLocked: !!item.productId,
        })),
      });
    }
  }, [initialData, isEditMode, reset]);


  // Calcula subtotal + total
  const calculateSubtotal = (index: number) => {
    const item = watch(`items.${index}`);
    const q = Number(item.quantity) || 0;
    const p = Number(item.price) || 0;
    const subtotal = q * p;

    setValue(`items.${index}.subtotal`, subtotal);

    const updated = watch("items");
    const total = updated.reduce(
      (sum, it) => sum + (Number(it.subtotal) || 0),
      0
    );
    setValue("amount", total);
  };

  // Autocomplete UX
  const handleAutocompleteChange = (
    index: number,
    selectedProduct: { id: string; nombre: string; precio: number } | null
  ) => {
    if (selectedProduct) {
      setValue(`items.${index}.description`, selectedProduct.nombre);
      setValue(`items.${index}.price`, selectedProduct.precio);
      setValue(`items.${index}.productId`, selectedProduct.id);
      setValue(`items.${index}.isLocked`, true);
      setValue(`items.${index}.quantity`, 1);
      calculateSubtotal(index);
    } else {
      setValue(`items.${index}.isLocked`, false);
      setValue(`items.${index}.productId`, null);
    }
  };

  // Submit
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const generatedDesc = data.items
        .map((i) => `${i.description} x${i.quantity}`)
        .join(", ");

      const now = new Date();
      const localTime = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      const localFull = new Date(`${data.date}T${localTime}`);

      const submitData = {
        ...data,
        date: localFull.toISOString(),
        description: generatedDesc || data.description || "",
        items: data.items.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
          price: Number(i.price),
          subtotal: Number(i.subtotal),
        })),
        amount: Number(data.amount),
      };

      let response;

      if (isEditMode) {
        response = await editTransaction({
          ...submitData,
          transactionId: initialData?.transactionId,
        });
      } else {
        response = await addTransaction(submitData);
      }

      if (response.success && response.transaction) {
        setModalMessage(
          isEditMode
            ? "Transacción editada correctamente"
            : "Transacción creada con éxito"
        );
        setModalSeverity("success");
        setAddedTransaction(response.transaction);
        setModalOpen(true);

        reset();
        onTransactionAdded(response.transaction);
      } else {
        setModalMessage(response.error || "Error inesperado");
        setModalSeverity("error");
        setModalOpen(true);
      }
    } catch (e) {
      console.error(e);
      setModalMessage("Error procesando la transacción");
      setModalSeverity("error");
      setModalOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ingresoColor = "#0EA35A";
  const ingresoHover = "#15BF6C";
  const gastoColor = "#D64545";
  const gastoHover = "#E25757";

  const submitColor =
    transactionType === TransactionType.ingreso ? ingresoColor : gastoColor;

  const submitHoverColor =
    transactionType === TransactionType.ingreso
      ? ingresoHover
      : gastoHover;


  if (productsError)
    return (
      <Typography color="error">
        Error cargando productos: {productsError}
      </Typography>
    );


  return (
    <Fade in timeout={400}>
      <Box
        sx={{
          width: "100%",
          maxWidth: "800px",
          mx: "auto",
          p: { xs: 2.5, sm: 3 },
          borderRadius: 4,
          mb: 4,
          boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <Typography
          variant="h6"
          align="center"
          sx={{
            mb: 3,
            fontWeight: 700,
            color: "#0F172A",
            letterSpacing: -0.3,
          }}
        >
          {isEditMode ? "Editar transacción" : "Agregar transacción"}
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>


            {/* ================= TIPO ================= */}
            <Grid item xs={12}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <ToggleButtonGroup
                    {...field}
                    exclusive
                    fullWidth
                    sx={{
                      borderRadius: 3,
                      overflow: "hidden",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                    onChange={(e, value) => {
                      if (value !== null) {
                        const prev = field.value;
                        field.onChange(value);

                        if (prev !== value) {
                          if (value === TransactionType.ingreso) {
                            setValue("category", "ventas");
                          } else {
                            setValue("category", "materiales");
                            setValue("items", []);
                            setValue("amount", 0);
                          }
                        }
                      }
                    }}
                  >
                    <ToggleButton
                      value={TransactionType.ingreso}
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        flex: 1,
                        py: 1.8,
                        color:
                          transactionType === TransactionType.ingreso
                            ? "white"
                            : "#14532D",
                        bgcolor:
                          transactionType === TransactionType.ingreso
                            ? ingresoColor
                            : "transparent",
                        "&:hover": {
                          bgcolor:
                            transactionType === TransactionType.ingreso
                              ? ingresoHover
                              : "#E8F5E9",
                        },
                      }}
                    >
                      <ArrowUpward fontSize="small" sx={{ mr: 1 }} /> Ingreso
                    </ToggleButton>

                    <ToggleButton
                      value={TransactionType.gasto}
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        flex: 1,
                        py: 1.8,
                        color:
                          transactionType === TransactionType.gasto
                            ? "white"
                            : "#7F1D1D",
                        bgcolor:
                          transactionType === TransactionType.gasto
                            ? gastoColor
                            : "transparent",
                        "&:hover": {
                          bgcolor:
                            transactionType === TransactionType.gasto
                              ? gastoHover
                              : "#FEE2E2",
                        },
                      }}
                    >
                      <ArrowDownward fontSize="small" sx={{ mr: 1 }} /> Gasto
                    </ToggleButton>
                  </ToggleButtonGroup>
                )}
              />
            </Grid>

            {/* ================= FECHA ================= */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="date"
                control={control}
                rules={{ required: "La fecha es requerida" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="date"
                    fullWidth
                    label="Fecha"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.date}
                    helperText={errors.date?.message}
                    sx={{
                      borderRadius: 3,
                    }}
                  />
                )}
              />
            </Grid>

            {/* ================= CATEGORÍA ================= */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Categoría</InputLabel>
                    <Select
                      {...field}
                      label="Categoría"
                      sx={{ borderRadius: 3 }}
                    >
                      {(transactionType === TransactionType.ingreso
                        ? IncomeCategories
                        : ExpenseCategories
                      ).map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* ================= MEDIO DE PAGO ================= */}
            <Grid item xs={12}>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Medio de pago</InputLabel>
                    <Select
                      {...field}
                      label="Medio de pago"
                      sx={{ borderRadius: 3 }}
                    >
                      {Object.values(PaymentMethod).map((pm) => (
                        <MenuItem key={pm} value={pm}>
                          {pm.charAt(0).toUpperCase() + pm.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* ================= ITEMS (INGRESOS) ================= */}
            {transactionType === TransactionType.ingreso && (
              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 4,
                    border: "1px solid rgba(0,0,0,0.05)",
                    background: "rgba(255,255,255,0.6)",
                    backdropFilter: "blur(8px)",
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 2, fontWeight: 600, color: "#334155" }}
                  >
                    Items de la transacción
                  </Typography>

                  {productsLoading ? (
                    <CircularProgress size={26} />
                  ) : (
                    <>
                      {fields.map((field, index) => (
                        <Paper
                          key={field.id}
                          elevation={0}
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            mb: 2,
                            border: "1px solid rgba(0,0,0,0.06)",
                            background: "white",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                          }}
                        >
                          <Grid container spacing={2}>

                            {/* ==== AUTOCOMPLETE ==== */}
                            <Grid item xs={12}>
                              <Controller
                                name={`items.${index}.description`}
                                control={control}
                                rules={{ required: "Descripción requerida" }}
                                render={({ field }) => (
                                  <Autocomplete
                                    freeSolo
                                    options={productos}
                                    getOptionLabel={(o) =>
                                      typeof o === "string" ? o : o.nombre
                                    }
                                    value={field.value}
                                    onInputChange={(_, v) => field.onChange(v)}
                                    disabled={watch(
                                      `items.${index}.isLocked`
                                    )}
                                    onChange={(_, value) => {
                                      const selected =
                                        typeof value === "string"
                                          ? null
                                          : value;
                                      handleAutocompleteChange(
                                        index,
                                        selected
                                      );
                                    }}
                                    renderInput={(params) => (
                                      <TextField
                                        {...params}
                                        label="Descripción"
                                        variant="outlined"
                                        error={
                                          !!errors.items?.[index]?.description
                                        }
                                        helperText={
                                          errors.items?.[index]?.description
                                            ?.message
                                        }
                                        sx={{ borderRadius: 3 }}
                                      />
                                    )}
                                  />
                                )}
                              />
                            </Grid>

                            {/* ==== CANTIDAD - PRECIO - TOTAL ==== */}
                            <Grid item xs={12}>
                              <Grid container spacing={2}>
                                <Grid item xs={4}>
                                  <Controller
                                    name={`items.${index}.quantity`}
                                    control={control}
                                    rules={{
                                      required: "Cantidad requerida",
                                      min: {
                                        value: 1,
                                        message: "Mínimo 1",
                                      },
                                    }}
                                    render={({ field }) => (
                                      <TextField
                                        {...field}
                                        label="Cantidad"
                                        fullWidth
                                        type="number"
                                        variant="outlined"
                                        error={
                                          !!errors.items?.[index]?.quantity
                                        }
                                        helperText={
                                          errors.items?.[index]?.quantity
                                            ?.message
                                        }
                                        inputProps={{ min: 1 }}
                                        sx={{ borderRadius: 3 }}
                                        onChange={(e) => {
                                          field.onChange(
                                            e.target.value === ""
                                              ? ""
                                              : Number(e.target.value)
                                          );
                                          calculateSubtotal(index);
                                        }}
                                      />
                                    )}
                                  />
                                </Grid>

                                <Grid item xs={4}>
                                  <Controller
                                    name={`items.${index}.price`}
                                    control={control}
                                    rules={{
                                      required: "Precio requerido",
                                      min: {
                                        value: 0.01,
                                        message: "Mínimo 0.01",
                                      },
                                    }}
                                    render={({ field }) => (
                                      <TextField
                                        {...field}
                                        label="Precio"
                                        fullWidth
                                        type="number"
                                        variant="outlined"
                                        error={!!errors.items?.[index]?.price}
                                        helperText={
                                          errors.items?.[index]?.price?.message
                                        }
                                        inputProps={{ step: "0.01" }}
                                        sx={{ borderRadius: 3 }}
                                        onChange={(e) => {
                                          field.onChange(
                                            e.target.value === ""
                                              ? ""
                                              : Number(e.target.value)
                                          );
                                          calculateSubtotal(index);
                                        }}
                                      />
                                    )}
                                  />
                                </Grid>

                                <Grid item xs={4}>
                                  <TextField
                                    label="Total"
                                    fullWidth
                                    value={(
                                      Number(
                                        watch(
                                          `items.${index}.subtotal`
                                        ) || 0
                                      )
                                    ).toFixed(2)}
                                    InputProps={{ readOnly: true }}
                                    sx={{ borderRadius: 3 }}
                                  />
                                </Grid>
                              </Grid>
                            </Grid>

                            {/* Botón eliminar */}
                            <Grid
                              item
                              xs={12}
                              sx={{ display: "flex", justifyContent: "flex-end" }}
                            >
                              <IconButton
                                color="error"
                                onClick={() => remove(index)}
                                disabled={fields.length === 1}
                              >
                                <DeleteOutline />
                              </IconButton>
                            </Grid>
                          </Grid>
                        </Paper>
                      ))}

                      <Button
                        startIcon={<Add />}
                        onClick={() =>
                          append({
                            id: crypto.randomUUID(),
                            description: "",
                            quantity: 1,
                            price: 0,
                            subtotal: 0,
                            isLocked: false,
                          })
                        }
                        sx={{
                          textTransform: "none",
                          fontWeight: 600,
                          color: "#0F172A",
                        }}
                      >
                        Añadir item
                      </Button>
                    </>
                  )}
                </Paper>
              </Grid>
            )}

            {/* ================= GASTOS ================= */}
            {transactionType === TransactionType.gasto && (
              <>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="amount"
                    control={control}
                    rules={{
                      required: "Valor requerido",
                      min: { value: 0.01, message: "Debe ser mayor a 0" },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        fullWidth
                        label="Valor"
                        variant="outlined"
                        error={!!errors.amount}
                        helperText={errors.amount?.message}
                        sx={{ borderRadius: 3 }}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? ""
                              : Number(e.target.value)
                          )
                        }
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Descripción"
                        multiline
                        rows={2}
                        fullWidth
                        variant="outlined"
                        sx={{ borderRadius: 3 }}
                      />
                    )}
                  />
                </Grid>
              </>
            )}

            {/* ================= TOTAL + SUBMIT ================= */}
            <Grid
              item
              xs={12}
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 2,
                mt: 2,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: "#1E293B" }}
              >
                Total: ${(Number(watch("amount")) || 0).toFixed(2)}
              </Typography>

              <Tooltip title={isSubmitting ? "Procesando..." : ""}>
                <span>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={
                      isSubmitting ? (
                        <CircularProgress size={20} />
                      ) : (
                        <AddCircleOutline />
                      )
                    }
                    disabled={isSubmitting || productsLoading}
                    sx={{
                      px: 4,
                      py: 1.5,
                      textTransform: "none",
                      borderRadius: 3,
                      fontWeight: 600,
                      bgcolor: submitColor,
                      "&:hover": { bgcolor: submitHoverColor },
                      opacity: isSubmitting ? 0.7 : 1,
                    }}
                  >
                    {isSubmitting
                      ? "Procesando..."
                      : isEditMode
                      ? "Guardar cambios"
                      : "Crear transacción"}
                  </Button>
                </span>
              </Tooltip>
            </Grid>
          </Grid>
        </form>

        {/* ================= MODAL ================= */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          closeAfterTransition
          slots={{ backdrop: Backdrop }}
          slotProps={{ backdrop: { timeout: 400 } }}
        >
          <Fade in={modalOpen}>
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: { xs: "90%", sm: 420 },
                bgcolor: "white",
                borderRadius: 4,
                boxShadow: "0 14px 40px rgba(0,0,0,0.2)",
                p: 4,
                textAlign: "center",
              }}
            >
              {modalSeverity === "success" ? (
                <CheckCircleOutline
                  sx={{
                    fontSize: 70,
                    color: submitColor,
                    mb: 2,
                  }}
                />
              ) : (
                <ErrorOutline
                  sx={{
                    fontSize: 70,
                    color: "#D64545",
                    mb: 2,
                  }}
                />
              )}

              <Typography
                variant="h6"
                sx={{ mb: 2, fontWeight: 700, color: "#0F172A" }}
              >
                {modalMessage}
              </Typography>

              {modalSeverity === "success" && addedTransaction && (
                <Box
                  sx={{
                    textAlign: "left",
                    mb: 2,
                    color: "#334155",
                    fontSize: "0.95rem",
                  }}
                >
                  <Typography>
                    <strong>Tipo:</strong>{" "}
                    {addedTransaction.type.charAt(0).toUpperCase() +
                      addedTransaction.type.slice(1)}
                  </Typography>
                  <Typography>
                    <strong>Fecha:</strong>{" "}
                    {new Date(addedTransaction.date).toLocaleDateString(
                      "es-CO",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </Typography>
                  <Typography>
                    <strong>Monto:</strong> $
                    {addedTransaction.amount.toFixed(2)}
                  </Typography>
                  <Typography>
                    <strong>Categoría:</strong>{" "}
                    {addedTransaction.category
                      .charAt(0)
                      .toUpperCase() +
                      addedTransaction.category.slice(1)}
                  </Typography>
                  <Typography>
                    <strong>Descripción:</strong>{" "}
                    {addedTransaction.description || "N/A"}
                  </Typography>
                </Box>
              )}

              <Button
                variant="contained"
                onClick={() => setModalOpen(false)}
                sx={{
                  mt: 2,
                  bgcolor:
                    modalSeverity === "success"
                      ? submitColor
                      : "#D64545",
                  color: "white",
                  borderRadius: 3,
                  textTransform: "none",
                  "&:hover": {
                    bgcolor:
                      modalSeverity === "success"
                        ? submitHoverColor
                        : "#E25757",
                  },
                }}
              >
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
