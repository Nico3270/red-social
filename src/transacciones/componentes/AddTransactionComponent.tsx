"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  TransactionType,
  IncomeCategory,
  ExpenseCategory,
  PaymentMethod,
  Transaction,
} from "@/transacciones/interfaces/types";
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
  Snackbar,
  Alert,
  Typography,
} from "@mui/material";

interface AddTransactionProps {
  onTransactionAdded: (newTransaction: Transaction) => void;
}

const AddTransactionComponent: React.FC<AddTransactionProps> = ({
  onTransactionAdded,
}) => {
  const {
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<Transaction>({
    defaultValues: {
      date: new Date().toISOString().substring(0, 10),
      type: TransactionType.Ingreso,
      description: "",
      category: IncomeCategory.Ventas,
      amount: 0,
      paymentMethod: PaymentMethod.Efectivo,
    },
  });

  const transactionType = watch("type");

  // Estado para Snackbar: mensaje, abierto y severidad (success/error)
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

  // Resetear category al cambiar type
  useEffect(() => {
    if (transactionType === TransactionType.Ingreso) {
      setValue("category", IncomeCategory.Ventas);
    } else {
      setValue("category", ExpenseCategory.Materiales);
    }
  }, [transactionType, setValue]);

  const onSubmit = async (data: Transaction) => {
    try {
      console.log("Datos enviados:", data);
      const response = await addTransaction(data);

      if (response.success && response.transaction) {
        setSnackbarMessage("Transacción agregada con éxito.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        reset();
        onTransactionAdded(response.transaction);
      } else {
        setSnackbarMessage(response.error || "Error al agregar la transacción.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error al agregar la transacción:", error);
      setSnackbarMessage("Error al agregar la transacción.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "3xl",
        mx: "auto",
        bgcolor: "white",
        boxShadow: 3,
        borderRadius: 2,
        p: 3,
        mt: 4,
      }}
    >
      <Typography variant="h5" align="center" sx={{ mb: 4, color: "gray.800", fontWeight: "bold" }}>
        Agregar Transacción
      </Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          {/* Fecha */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="date"
              control={control}
              rules={{ required: "La fecha es requerida" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="date"
                  label="Fecha"
                  fullWidth
                  variant="outlined"
                  error={!!errors.date}
                  helperText={errors.date?.message}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />
          </Grid>

          {/* Tipo */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="type-label">Tipo</InputLabel>
                  <Select {...field} labelId="type-label" label="Tipo">
                    <MenuItem value={TransactionType.Ingreso}>Ingreso</MenuItem>
                    <MenuItem value={TransactionType.Gasto}>Gasto</MenuItem>
                  </Select>
                </FormControl>
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
                  <InputLabel id="category-label">Categoría</InputLabel>
                  <Select {...field} labelId="category-label" label="Categoría">
                    {transactionType === TransactionType.Ingreso
                      ? Object.values(IncomeCategory).map((category) => (
                          <MenuItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </MenuItem>
                        ))
                      : Object.values(ExpenseCategory).map((category) => (
                          <MenuItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </MenuItem>
                        ))}
                  </Select>
                </FormControl>
              )}
            />
          </Grid>

          {/* Valor */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="amount"
              control={control}
              rules={{ required: "El valor es requerido", min: { value: 0.01, message: "El valor debe ser mayor a 0" } }}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Valor"
                  fullWidth
                  variant="outlined"
                  error={!!errors.amount}
                  helperText={errors.amount?.message}
                  inputProps={{ step: "0.01", min: "0" }}
                />
              )}
            />
          </Grid>

          {/* Descripción */}
          <Grid item xs={12}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descripción"
                  fullWidth
                  variant="outlined"
                  placeholder="Descripción de la transacción"
                  multiline
                  rows={2}
                />
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
                  <InputLabel id="payment-method-label">Medio de Pago</InputLabel>
                  <Select {...field} labelId="payment-method-label" label="Medio de Pago">
                    {Object.values(PaymentMethod).map((method) => (
                      <MenuItem key={method} value={method}>
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Grid>

          {/* Botón de agregar */}
          <Grid item xs={12} sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              type="submit"
              variant="contained"
              sx={{
                bgcolor: "#EB5B00",
                color: "white",
                px: 4,
                py: 1,
                borderRadius: 2,
                "&:hover": { bgcolor: "#FFB200" },
                transition: "background-color 0.2s",
              }}
            >
              Agregar
            </Button>
          </Grid>
        </Grid>
      </form>

      {/* Snackbar para feedback elegante */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddTransactionComponent;