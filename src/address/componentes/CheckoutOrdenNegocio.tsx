"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  CircularProgress,
  Container,
  Modal,
  Fade as MuiFade,
  Backdrop,
  Snackbar,
  Alert,
} from "@mui/material";
import { CheckCircleOutline, ErrorOutline } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useCartNegocioStore } from "@/store/carro-negocio/carro-negocio-store";
import { useAddressStore } from "@/store/address/address-store";
import { createNewPedido } from "../actions/createNewPedido";

const MotionBox = motion(Box);

const CheckoutOrdenNegocio: React.FC = () => {
  const router = useRouter();
  const { cart, clearCart, getTotalPrice } = useCartNegocioStore();
  const { address, clearAddress } = useAddressStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("Procesando orden...");
  const [toastSeverity, setToastSeverity] = useState<"info" | "success" | "error">("info");

  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = getTotalPrice();

  const formatCurrency = useCallback((value: number) => `$${value.toFixed(2)}`, []);
  const formattedDate = useMemo(() => {
    if (!address?.deliveryDate) return "No especificado";

    const parsedDate = new Date(address.deliveryDate);
    if (Number.isNaN(parsedDate.getTime())) return "No especificado";

    return parsedDate.toLocaleDateString("es-CO");
  }, [address?.deliveryDate]);

  const clearTimers = useCallback(() => {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const closeToastLater = useCallback((delay = 3000) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setToastOpen(false);
    }, delay);
  }, []);

  const handleCloseToast = useCallback(
    (_?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === "clickaway") return;
      setToastOpen(false);
    },
    []
  );

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    setModalOpen(false);
  }, [isSubmitting]);

  const handleCreatePedido = useCallback(async () => {
    if (isSubmitting) return;

    if (!cart.length) {
      setToastOpen(true);
      setToastMessage("Tu carrito está vacío.");
      setToastSeverity("error");
      closeToastLater();
      return;
    }

    setIsSubmitting(true);
    setToastOpen(true);
    setToastMessage("Procesando orden...");
    setToastSeverity("info");
    setModalOpen(true);
    setModalMessage("Creando orden...");
    setIsSuccess(false);

    try {
      const pedidoData = {
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.cantidad,
          price: item.precio,
          subtotal: item.precio * item.cantidad,
          description: item.nombre,
        })),
        deliveryData: address,
        totalAmount: total,
      };

      const response = await createNewPedido(pedidoData);

      if (response.ok) {
        setModalMessage(response.message || "Orden creada exitosamente.");
        setIsSuccess(true);
        setToastMessage("¡Orden creada con éxito!");
        setToastSeverity("success");

        clearCart();
        clearAddress();

        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current);
        }

        redirectTimeoutRef.current = setTimeout(() => {
          router.push("/dashboard/orders");
        }, 3000);
      } else {
        setModalMessage(response.message || "Error al crear la orden.");
        setIsSuccess(false);
        setToastMessage(response.message || "Error al crear la orden.");
        setToastSeverity("error");
      }
    } catch (error) {
      console.error("Error en creación de pedido:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error inesperado al crear la orden.";

      setModalMessage(errorMessage);
      setIsSuccess(false);
      setToastMessage("Error inesperado");
      setToastSeverity("error");
    } finally {
      setIsSubmitting(false);
      closeToastLater();
    }
  }, [
    address,
    cart,
    clearAddress,
    clearCart,
    closeToastLater,
    isSubmitting,
    router,
    total,
  ]);

  const CartSummary = () => (
    <Paper
      elevation={1}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        bgcolor: "background.paper",
        height: "100%",
      }}
    >
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: 600, color: "text.primary" }}
      >
        Resumen de tu orden
      </Typography>

      {cart.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No hay productos en el carrito.
        </Typography>
      ) : (
        <>
          <List disablePadding>
            {cart.map((item) => (
              <ListItem key={item.cartItemId} sx={{ py: 1, px: 0 }}>
                <ListItemText
                  primary={`${item.nombre} x ${item.cantidad}`}
                  secondary={`${formatCurrency(item.precio)} cada uno`}
                  primaryTypographyProps={{ variant: "body1", fontWeight: 500 }}
                  secondaryTypographyProps={{
                    variant: "body2",
                    color: "text.secondary",
                  }}
                />
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, ml: 2, flexShrink: 0 }}
                >
                  {formatCurrency(item.precio * item.cantidad)}
                </Typography>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: "text.primary" }}
            >
              Total:
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: "text.primary" }}
            >
              {formatCurrency(total)}
            </Typography>
          </Box>
        </>
      )}
    </Paper>
  );

  const DeliveryDataSummary = () => (
    <Paper
      elevation={1}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        bgcolor: "background.paper",
        height: "100%",
      }}
    >
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: 600, color: "text.primary" }}
      >
        {address?.orderType === "DELIVERY"
          ? "Datos de entrega"
          : "Datos del pedido en sitio"}
      </Typography>

      <List disablePadding>
        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText
            primary="Tipo de pedido"
            secondary={
              address?.orderType === "DELIVERY"
                ? "Entrega a domicilio"
                : "Consumo en sitio"
            }
            primaryTypographyProps={{ fontWeight: 500 }}
            secondaryTypographyProps={{ color: "text.secondary" }}
          />
        </ListItem>

        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText
            primary="Nombre del cliente"
            secondary={address?.clientName || "No especificado"}
            primaryTypographyProps={{ fontWeight: 500 }}
            secondaryTypographyProps={{ color: "text.secondary" }}
          />
        </ListItem>

        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText
            primary="Teléfono"
            secondary={address?.clientPhone || "No especificado"}
            primaryTypographyProps={{ fontWeight: 500 }}
            secondaryTypographyProps={{ color: "text.secondary" }}
          />
        </ListItem>

        {address?.orderType === "DELIVERY" && (
          <>
            <ListItem sx={{ py: 0.5, px: 0 }}>
              <ListItemText
                primary="País"
                secondary={address?.country || "No especificado"}
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ color: "text.secondary" }}
              />
            </ListItem>

            <ListItem sx={{ py: 0.5, px: 0 }}>
              <ListItemText
                primary="Departamento"
                secondary={address?.departamento || "No especificado"}
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ color: "text.secondary" }}
              />
            </ListItem>

            <ListItem sx={{ py: 0.5, px: 0 }}>
              <ListItemText
                primary="Ciudad"
                secondary={address?.ciudad || "No especificado"}
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ color: "text.secondary" }}
              />
            </ListItem>

            <ListItem sx={{ py: 0.5, px: 0 }}>
              <ListItemText
                primary="Dirección de entrega"
                secondary={address?.deliveryAddress || "No especificado"}
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ color: "text.secondary" }}
              />
            </ListItem>
          </>
        )}

        {address?.orderType === "ON_SITE" && (
          <ListItem sx={{ py: 0.5, px: 0 }}>
            <ListItemText
              primary="Ubicación en sitio"
              secondary={address?.onSiteLocation || "No especificado"}
              primaryTypographyProps={{ fontWeight: 500 }}
              secondaryTypographyProps={{ color: "text.secondary" }}
            />
          </ListItem>
        )}

        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText
            primary="Fecha de entrega"
            secondary={formattedDate}
            primaryTypographyProps={{ fontWeight: 500 }}
            secondaryTypographyProps={{ color: "text.secondary" }}
          />
        </ListItem>

        {address?.additionalComments && (
          <ListItem sx={{ py: 0.5, px: 0 }}>
            <ListItemText
              primary="Comentarios adicionales"
              secondary={address.additionalComments}
              primaryTypographyProps={{ fontWeight: 500 }}
              secondaryTypographyProps={{ color: "text.secondary" }}
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );

  return (
    <MuiFade in timeout={600}>
      <Container maxWidth="lg" sx={{ mt: 6, mb: 8 }}>
        <Typography
          variant="h3"
          sx={{
            mb: 6,
            fontWeight: 600,
            textAlign: "center",
            color: "text.primary",
            letterSpacing: "-0.5px",
            fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
            fontFamily:
              "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          Checkout de la Orden
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <CartSummary />
          </Grid>

          <Grid item xs={12} md={6}>
            <DeliveryDataSummary />
          </Grid>
        </Grid>

        <Box
          sx={{
            display: "flex",
            justifyContent: { xs: "stretch", sm: "flex-end" },
            mt: 4,
          }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={handleCreatePedido}
            disabled={isSubmitting || cart.length === 0}
            startIcon={
              isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined
            }
            sx={{
              width: { xs: "100%", sm: "auto" },
              minWidth: { sm: 220 },
              px: 6,
              py: 1.5,
              borderRadius: 3,
              textTransform: "none",
              fontWeight: 600,
              bgcolor: "primary.main",
              "&:hover": {
                bgcolor: "primary.dark",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              },
              transition: "all 0.2s ease",
            }}
          >
            {isSubmitting ? "Creando orden..." : "Crear orden"}
          </Button>
        </Box>

        <AnimatePresence>
          {modalOpen && (
            <Modal
              open={modalOpen}
              onClose={handleCloseModal}
              closeAfterTransition
              slots={{ backdrop: Backdrop }}
              slotProps={{
                backdrop: {
                  timeout: 500,
                  TransitionComponent: MuiFade,
                },
              }}
            >
              <MotionBox
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: { xs: "calc(100% - 32px)", sm: 420 },
                  maxWidth: 420,
                  bgcolor: "background.paper",
                  border: `2px solid`,
                  borderColor: isSubmitting
                    ? "primary.main"
                    : isSuccess
                    ? "success.main"
                    : "error.main",
                  borderRadius: 3,
                  boxShadow: 24,
                  p: { xs: 3, sm: 4 },
                  textAlign: "center",
                  outline: "none",
                }}
              >
                {isSubmitting ? (
                  <CircularProgress sx={{ mb: 2 }} />
                ) : isSuccess ? (
                  <CheckCircleOutline
                    sx={{ fontSize: 60, color: "success.main", mb: 2 }}
                  />
                ) : (
                  <ErrorOutline
                    sx={{ fontSize: 60, color: "error.main", mb: 2 }}
                  />
                )}

                <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
                  {isSubmitting
                    ? "Procesando tu orden"
                    : isSuccess
                    ? "Orden creada"
                    : "No se pudo crear la orden"}
                </Typography>

                <Typography
                  variant="body1"
                  sx={{ mb: isSubmitting ? 0 : 3, color: "text.secondary" }}
                >
                  {modalMessage}
                </Typography>

                {!isSubmitting && (
                  <Button
                    onClick={handleCloseModal}
                    variant="contained"
                    sx={{
                      minWidth: 140,
                      bgcolor: isSuccess ? "success.main" : "error.main",
                      color: "white",
                      "&:hover": {
                        bgcolor: isSuccess ? "success.dark" : "error.dark",
                      },
                    }}
                  >
                    Cerrar
                  </Button>
                )}
              </MotionBox>
            </Modal>
          )}
        </AnimatePresence>

        <Snackbar
          open={toastOpen}
          autoHideDuration={3000}
          onClose={handleCloseToast}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          TransitionComponent={MuiFade}
        >
          <Alert
            onClose={handleCloseToast}
            severity={toastSeverity}
            sx={{
              width: "100%",
              borderRadius: 2,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            {toastMessage}
          </Alert>
        </Snackbar>
      </Container>
    </MuiFade>
  );
};

export default CheckoutOrdenNegocio;