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
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Fade,
  Modal,
  Backdrop,
  CircularProgress,
  Tooltip,
  // Íconos corregidos: Asegúrate de importarlos aquí

} from "@mui/material";
import { AddCircleOutline, ArrowDownward, ArrowUpward, CheckCircleOutline, ErrorOutline } from "@mui/icons-material";
// Nota: Si usas tree-shaking, puedes importar individualmente para optimizar bundle:
// import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
// import ErrorOutline from "@mui/icons-material/ErrorOutline";

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

  // Estados para manejo de envío y modal
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSeverity, setModalSeverity] = useState<"success" | "error">("success");
  const [addedTransaction, setAddedTransaction] = useState<Transaction | null>(null);

  // Resetear category al cambiar type
  useEffect(() => {
    if (transactionType === TransactionType.Ingreso) {
      setValue("category", IncomeCategory.Ventas);
    } else {
      setValue("category", ExpenseCategory.Materiales);
    }
  }, [transactionType, setValue]);

  const onSubmit = async (data: Transaction) => {
    setIsSubmitting(true); // Desactivar botón durante envío
    try {
      console.log("Datos enviados:", data);
      const response = await addTransaction(data);

      if (response.success && response.transaction) {
        setModalMessage("Transacción agregada con éxito.");
        setModalSeverity("success");
        setAddedTransaction(response.transaction);
        setModalOpen(true);
        reset();
        onTransactionAdded(response.transaction);
      } else {
        setModalMessage(response.error || "Error al agregar la transacción.");
        setModalSeverity("error");
        setModalOpen(true);
      }
    } catch (error) {
      console.error("Error al agregar la transacción:", error);
      setModalMessage("Error al agregar la transacción.");
      setModalSeverity("error");
      setModalOpen(true);
    } finally {
      setIsSubmitting(false); // Reactivar botón
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setAddedTransaction(null);
  };

  // Colores dinámicos para el botón Agregar y modal
  const submitButtonColor = transactionType === TransactionType.Ingreso ? "#4CAF50" : "#EF5350";
  const submitButtonHoverColor = transactionType === TransactionType.Ingreso ? "#66BB6A" : "#F44336";
  const modalBorderColor = addedTransaction?.type === TransactionType.Ingreso ? "#4CAF50" : "#EF5350";

  return (
    <Fade in timeout={600}>
      <Box
        sx={{
          width: "100%",
          maxWidth: "100%",
          mx: "auto",
          bgcolor: "white",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          borderRadius: 3,
          p: { xs: 2, sm: 3 },
          mt: 2,
          mb: 4,
        }}
      >
        <Typography
          variant="h6"
          align="center"
          sx={{ mb: 3, color: "grey.800", fontWeight: 500, letterSpacing: 0.5 }}
        >
          Agregar transacción
        </Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            {/* Tipo: ToggleButtonGroup con íconos y colores dinámicos */}
            <Grid item xs={12}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <ToggleButtonGroup
                    {...field}
                    exclusive
                    fullWidth
                    sx={{ mb: 1, height: 48 }}
                    onChange={(e, value) => {
                      if (value) field.onChange(value);
                    }}
                  >
                    <ToggleButton
                      value={TransactionType.Ingreso}
                      aria-label="Ingreso"
                      sx={{
                        textTransform: "none",
                        borderColor: "green.300",
                        color: transactionType === TransactionType.Ingreso ? "white !important" : "green.700",
                        bgcolor: transactionType === TransactionType.Ingreso ? "#4CAF50 !important" : "transparent",
                        "&:hover": { bgcolor: "#66BB6A" },
                        fontWeight: 600,
                        flex: 1,
                        gap: 1,
                        transition: "background-color 0.3s ease, color 0.3s ease",
                        "&.Mui-selected": {
                          color: "white !important",
                          bgcolor: "#4CAF50 !important",
                        },
                        "&.Mui-selected:hover": {
                          bgcolor: "#66BB6A !important",
                        },
                      }}
                    >
                      <ArrowUpward fontSize="small" />
                      Ingreso
                    </ToggleButton>
                    <ToggleButton
                      value={TransactionType.Gasto}
                      aria-label="Gasto"
                      sx={{
                        textTransform: "none",
                        borderColor: "red.300",
                        color: transactionType === TransactionType.Gasto ? "white !important" : "red.700",
                        bgcolor: transactionType === TransactionType.Gasto ? "#EF5350 !important" : "transparent",
                        "&:hover": { bgcolor: "#F44336" },
                        fontWeight: 600,
                        flex: 1,
                        gap: 1,
                        transition: "background-color 0.3s ease, color 0.3s ease",
                        "&.Mui-selected": {
                          color: "white !important",
                          bgcolor: "#EF5350 !important",
                        },
                        "&.Mui-selected:hover": {
                          bgcolor: "#F44336 !important",
                        },
                      }}
                    >
                      <ArrowDownward fontSize="small" />
                      Gasto
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
                  <TextField
                    {...field}
                    type="date"
                    label="Fecha"
                    fullWidth
                    variant="outlined"
                    error={!!errors.date}
                    helperText={errors.date?.message}
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
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
                    <Select {...field} labelId="category-label" label="Categoría" variant="outlined" sx={{ borderRadius: 2 }}>
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
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />
            </Grid>

            {/* Medio de pago */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel id="payment-method-label">Medio de pago</InputLabel>
                    <Select {...field} labelId="payment-method-label" label="Medio de pago" variant="outlined" sx={{ borderRadius: 2 }}>
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
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />
            </Grid>

            {/* Botón de agregar dinámico con disable durante envío */}
            <Grid item xs={12} sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Tooltip title={isSubmitting ? "Procesando transacción..." : ""}>
                <span>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <AddCircleOutline />}
                    disabled={isSubmitting}
                    sx={{
                      textTransform: "none",
                      bgcolor: submitButtonColor,
                      color: "white",
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      "&:hover": { bgcolor: submitButtonHoverColor },
                      transition: "background-color 0.2s, opacity 0.3s",
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

        {/* Modal para feedback con resumen */}
        <Modal
          open={modalOpen}
          onClose={handleModalClose}
          closeAfterTransition
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 500,
            },
          }}
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <Fade in={modalOpen}>
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: { xs: "90%", sm: 400 },
                bgcolor: "white",
                border: `4px solid ${modalSeverity === "success" ? modalBorderColor : "#EF5350"}`,
                borderRadius: 3,
                boxShadow: 24,
                p: 4,
                textAlign: "center",
              }}
            >
              {modalSeverity === "success" ? (
                <CheckCircleOutline sx={{ fontSize: 60, color: modalBorderColor, mb: 2 }} />
              ) : (
                <ErrorOutline sx={{ fontSize: 60, color: "#EF5350", mb: 2 }} />
              )}
              <Typography id="modal-title" variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {modalMessage}
              </Typography>
              {modalSeverity === "success" && addedTransaction && (
                <Box id="modal-description" sx={{ textAlign: "left", mb: 2 }}>
                  <Typography variant="body1">
                    <strong>Tipo:</strong>{" "}
                    {addedTransaction.type.charAt(0).toUpperCase() + addedTransaction.type.slice(1)}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Fecha:</strong>{" "}
                    {new Date(addedTransaction.date).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Typography>
                  <Typography variant="body1"><strong>Monto:</strong> ${addedTransaction.amount.toFixed(2)}</Typography>
                  <Typography variant="body1">
                    <strong>Categoría:</strong>{" "}
                    {addedTransaction.category.charAt(0).toUpperCase() + addedTransaction.category.slice(1)}
                  </Typography>
                  <Typography variant="body1"><strong>Descripción:</strong> {addedTransaction.description || "N/A"}</Typography>
                </Box>
              )}
              <Button
                onClick={handleModalClose}
                variant="contained"
                sx={{
                  textTransform: "none",
                  bgcolor: modalSeverity === "success" ? modalBorderColor : "#EF5350",
                  color: "white",
                  "&:hover": { bgcolor: modalSeverity === "success" ? submitButtonHoverColor : "#F44336" },
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