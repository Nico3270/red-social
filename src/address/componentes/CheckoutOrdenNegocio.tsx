"use client";

import React, { useState } from "react";
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
import { trackAnalyticsEvent } from "@/analytics/events";
import { createNewPedido } from "../actions/createNewPedido";

const MotionBox = motion(Box);

const CheckoutOrdenNegocio: React.FC = () => {
  const router = useRouter();
  const { cart, clearCart, getTotalPrice } = useCartNegocioStore();
  const { address, clearAddress } = useAddressStore();

  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("Procesando orden...");
  const [toastSeverity, setToastSeverity] = useState<"info" | "success" | "error">("info");

  const total = getTotalPrice();

  const handleCreatePedido = async () => {
    setIsSubmitting(true);
    setIsLoading(true);
    setToastOpen(true);
    setToastMessage("Procesando orden...");
    setToastSeverity("info");
    setModalOpen(true);
    setModalMessage("Creando orden...");
    setIsSuccess(false);

    try {
      const pedidoData = {
        items: cart.map(item => ({
          productId: item.id,
          productVariantId: item.productVariantId ?? null,
          variantLabel: item.variantLabel ?? null,
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
        if (address?.orderType) {
          trackAnalyticsEvent({
            event: "catalog_order_submitted",
            timestamp: Date.now(),
            negocioSlug: "",
            navigationMode: "traditional",
            source: "carrito",
            orderType: address.orderType,
            totalAmount: total,
            itemCount: cart.reduce((sum, item) => sum + item.cantidad, 0),
            hasVariants: cart.some(
              (item) => Boolean(item.productVariantId) || Boolean(item.usaVariantes)
            ),
          });
        }

        setModalMessage(response.message || "Orden creada exitosamente.");
        setIsSuccess(true);
        setToastMessage("¡Orden creada con éxito!");
        setToastSeverity("success");
        clearCart();
        clearAddress();

        // Redirigir después de 3 segundos
        setTimeout(() => {
          router.push("/dashboard/orders");
        }, 3000);
      } else {
        setModalMessage(response.message || "Error al crear la orden.");
        setIsSuccess(false);
        setToastMessage("Error al crear la orden");
        setToastSeverity("error");
      }
    } catch (error) {
      console.error("Error en creación de pedido:", error);
      setModalMessage(error instanceof Error ? error.message : "Error inesperado al crear la orden.");
      setIsSuccess(false);
      setToastMessage("Error inesperado");
      setToastSeverity("error");
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
      // Auto-cierre toast después de 3s, pero modal queda para cierre manual
      setTimeout(() => setToastOpen(false), 3000);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Componente de resumen del carrito
  const CartSummary = () => (
    <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: "background.paper" }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: "text.primary" }}>
        Resumen de tu orden
      </Typography>
      <List disablePadding>
        {cart.map((item) => (
          <ListItem key={item.cartItemId} sx={{ py: 1, px: 0 }}>
            <ListItemText
              primary={`${item.nombre} x ${item.cantidad}`}
              secondary={`$${item.precio.toFixed(2)} cada uno${item.variantLabel ? ` • Variante: ${item.variantLabel}` : ""}`}
              primaryTypographyProps={{ variant: "body1", fontWeight: 500 }}
              secondaryTypographyProps={{ variant: "body2", color: "text.secondary" }}
            />
            <Typography variant="body1" sx={{ fontWeight: 600, ml: 2, flexShrink: 0 }}>
              ${(item.precio * item.cantidad).toFixed(2)}
            </Typography>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
          Total:
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
          ${total.toFixed(2)}
        </Typography>
      </Box>
    </Paper>
  );

  // Componente de datos de entrega
  const DeliveryDataSummary = () => (
    <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: "background.paper" }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: "text.primary" }}>
        {address.orderType === "DELIVERY" ? "Datos de entrega" : "Datos del pedido en sitio"}
      </Typography>
      <List disablePadding>
        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText
            primary="Tipo de pedido"
            secondary={address.orderType === "DELIVERY" ? "Entrega a domicilio" : "Consumo en sitio"}
            primaryTypographyProps={{ fontWeight: 500 }}
            secondaryTypographyProps={{ color: "text.secondary" }}
          />
        </ListItem>
        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText
            primary="Nombre del cliente"
            secondary={address.clientName || "No especificado"}
            primaryTypographyProps={{ fontWeight: 500 }}
            secondaryTypographyProps={{ color: "text.secondary" }}
          />
        </ListItem>
        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText
            primary="Teléfono"
            secondary={address.clientPhone || "No especificado"}
            primaryTypographyProps={{ fontWeight: 500 }}
            secondaryTypographyProps={{ color: "text.secondary" }}
          />
        </ListItem>
        {address.orderType === "DELIVERY" && (
          <>
            <ListItem sx={{ py: 0.5, px: 0 }}>
              <ListItemText
                primary="País"
                secondary={address.country || "No especificado"}
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ color: "text.secondary" }}
              />
            </ListItem>
            <ListItem sx={{ py: 0.5, px: 0 }}>
              <ListItemText
                primary="Departamento"
                secondary={address.departamento || "No especificado"}
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ color: "text.secondary" }}
              />
            </ListItem>
            <ListItem sx={{ py: 0.5, px: 0 }}>
              <ListItemText
                primary="Ciudad"
                secondary={address.ciudad || "No especificado"}
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ color: "text.secondary" }}
              />
            </ListItem>
            <ListItem sx={{ py: 0.5, px: 0 }}>
              <ListItemText
                primary="Dirección de entrega"
                secondary={address.deliveryAddress || "No especificado"}
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ color: "text.secondary" }}
              />
            </ListItem>
          </>
        )}
        {address.orderType === "ON_SITE" && (
          <ListItem sx={{ py: 0.5, px: 0 }}>
            <ListItemText
              primary="Ubicación en sitio"
              secondary={address.onSiteLocation || "No especificado"}
              primaryTypographyProps={{ fontWeight: 500 }}
              secondaryTypographyProps={{ color: "text.secondary" }}
            />
          </ListItem>
        )}
        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText
            primary="Fecha de entrega"
            secondary={address.deliveryDate ? new Date(address.deliveryDate).toLocaleDateString() : "No especificado"}
            primaryTypographyProps={{ fontWeight: 500 }}
            secondaryTypographyProps={{ color: "text.secondary" }}
          />
        </ListItem>
        {address.additionalComments && (
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
            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          Checkout de la Orden
        </Typography>

        <Grid container spacing={4}>
          {/* Resumen a la izquierda (en desktop), arriba en mobile */}
          <Grid item xs={12} md={6}>
            {CartSummary()}
          </Grid>

          {/* Datos de entrega a la derecha (en desktop), abajo en mobile */}
          <Grid item xs={12} md={6}>
            {DeliveryDataSummary()}
          </Grid>
        </Grid>

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleCreatePedido}
            disabled={isSubmitting || cart.length === 0}
            sx={{
              px: 6,
              py: 1.5,
              borderRadius: 3,
              textTransform: "none",
              fontWeight: 600,
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
              transition: "all 0.2s ease",
            }}
          >
            Crear orden
          </Button>
        </Box>

        {/* Modal con AnimatePresence */}
        <AnimatePresence>
          {modalOpen && (
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
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
                  bgcolor: "background.paper",
                  border: `2px solid ${isSuccess ? "success.main" : "error.main"}`,
                  borderRadius: 3,
                  boxShadow: 24,
                  p: 4,
                  textAlign: "center",
                }}
              >
                {isSubmitting ? (
                  <CircularProgress sx={{ mb: 2 }} />
                ) : isSuccess ? (
                  <CheckCircleOutline sx={{ fontSize: 60, color: "success.main", mb: 2 }} />
                ) : (
                  <ErrorOutline sx={{ fontSize: 60, color: "error.main", mb: 2 }} />
                )}
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  {modalMessage}
                </Typography>
                {!isSubmitting && (
                  <Button
                    onClick={() => setModalOpen(false)}
                    variant="contained"
                    sx={{
                      bgcolor: isSuccess ? "success.main" : "error.main",
                      color: "white",
                      "&:hover": { bgcolor: isSuccess ? "success.dark" : "error.dark" },
                    }}
                  >
                    Cerrar
                  </Button>
                )}
              </MotionBox>
            </Modal>
          )}
        </AnimatePresence>

        {/* Toast (Snackbar) para feedback no bloqueante */}
        <Snackbar
          open={toastOpen}
          autoHideDuration={3000}
          onClose={() => setToastOpen(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          TransitionComponent={MuiFade}
        >
          <Alert
            onClose={() => setToastOpen(false)}
            severity={toastSeverity}
            sx={{ width: "100%", borderRadius: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          >
            {toastMessage}
          </Alert>
        </Snackbar>
      </Container>
    </MuiFade>
  );
};

export default CheckoutOrdenNegocio;
