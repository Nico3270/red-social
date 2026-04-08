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
} from "@mui/material";
import { CheckCircleOutline, ErrorOutline } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { useAddressStore } from "@/store/address/address-store";
import { fetchNegocioName } from "@/carro/componentes/ProductsInCart";
import { createNewPedido } from "../actions/createNewPedido";

interface CheckoutOrderProps {
  slug: string;
}

type ModalStatus = "idle" | "loading" | "success" | "error";

const MotionBox = motion(Box);

const CheckoutOrder: React.FC<CheckoutOrderProps> = ({ slug }) => {
  const router = useRouter();
  const { getCartForNegocio, clearCartForNegocio } = useCartCatalogoStore();
  const { address, clearAddress } = useAddressStore();

  const [negocioName, setNegocioName] = useState<string>("Cargando...");
  const [isLoading, setIsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalStatus, setModalStatus] = useState<ModalStatus>("idle");

  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartItems = useMemo(() => {
    return getCartForNegocio(slug) || [];
  }, [getCartForNegocio, slug]);

  const total = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  }, [cartItems]);

  const isSubmitting = modalStatus === "loading";
  const isSuccess = modalStatus === "success";
  const isError = modalStatus === "error";

  const formatCurrency = useCallback((value: number) => {
    return `$${value.toFixed(2)}`;
  }, []);

  const clearRedirectTimeout = useCallback(() => {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const name = await fetchNegocioName(slug);

        if (!isMounted) return;
        setNegocioName(name || "Negocio");
      } catch (error) {
        console.error("Error cargando nombre del negocio:", error);

        if (!isMounted) return;
        setNegocioName("Negocio");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    return () => {
      clearRedirectTimeout();
    };
  }, [clearRedirectTimeout]);

  const openFeedbackModal = useCallback((status: ModalStatus, message: string) => {
    setModalStatus(status);
    setModalMessage(message);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;

    setModalOpen(false);

    // Dejamos un pequeño reset visual del estado después del cierre
    window.setTimeout(() => {
      setModalStatus("idle");
      setModalMessage("");
    }, 180);
  }, [isSubmitting]);

  const handleCreatePedido = useCallback(async () => {
    if (isSubmitting) return;

    if (cartItems.length === 0) {
      openFeedbackModal("error", "Tu carrito está vacío.");
      return;
    }

    if (!address?.orderType) {
      openFeedbackModal("error", "Faltan los datos del pedido.");
      return;
    }

    openFeedbackModal("loading", "Creando pedido...");

    try {
      const pedidoData = {
        slug,
        items: cartItems.map((item) => ({
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
        setModalStatus("success");
        setModalMessage(response.message || "Pedido creado exitosamente.");

        clearCartForNegocio(slug);
        clearAddress();

        clearRedirectTimeout();
        redirectTimeoutRef.current = setTimeout(() => {
          router.push("/");
        }, 3000);
      } else {
        setModalStatus("error");
        setModalMessage(response.message || "Error al crear el pedido.");
      }
    } catch (error) {
      console.error("Error en handleCreatePedido:", error);
      setModalStatus("error");
      setModalMessage(
        error instanceof Error
          ? error.message
          : "Error inesperado al crear el pedido."
      );
    }
  }, [
    address,
    cartItems,
    clearAddress,
    clearCartForNegocio,
    clearRedirectTimeout,
    isSubmitting,
    openFeedbackModal,
    router,
    slug,
    total,
  ]);

  const formattedDeliveryDate = useMemo(() => {
    if (!address?.deliveryDate) return "No especificado";

    const parsedDate = new Date(address.deliveryDate);
    if (Number.isNaN(parsedDate.getTime())) return "No especificado";

    return parsedDate.toLocaleDateString("es-CO");
  }, [address?.deliveryDate]);

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
        Resumen de tu pedido
      </Typography>

      {cartItems.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No hay productos en el carrito.
        </Typography>
      ) : (
        <>
          <List disablePadding>
            {cartItems.map((item) => (
              <ListItem key={item.id} sx={{ py: 1, px: 0 }}>
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
              sx={{ fontWeight: 600, color: "text.primary" }}
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
            secondary={formattedDeliveryDate}
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

  const getModalAccentColor = () => {
    if (modalStatus === "loading") return "rgba(25, 118, 210, 0.4)";
    if (modalStatus === "success") return "success.main";
    if (modalStatus === "error") return "error.main";
    return "divider";
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <MuiFade in timeout={600}>
      <Container maxWidth="lg" sx={{ mt: 2, mb: 8 }}>
        <Typography
          variant="h3"
          sx={{
            mb: 4,
            fontWeight: 600,
            textAlign: "center",
            color: "text.primary",
            letterSpacing: "-0.5px",
            fontSize: { xs: "1.8rem", sm: "1.6rem", md: "2rem" },
            fontFamily:
              "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          Checkout para {negocioName}
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
            justifyContent: { xs: "stretch", sm: "center" },
            mt: 4,
          }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={handleCreatePedido}
            disabled={isSubmitting || cartItems.length === 0}
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
            {isSubmitting ? "Creando pedido..." : "Crear pedido"}
          </Button>
        </Box>

        <Modal
          open={modalOpen}
          onClose={handleCloseModal}
          closeAfterTransition
          disableEscapeKeyDown={isSubmitting}
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 220,
              TransitionComponent: MuiFade,
              sx: {
                backgroundColor: "rgba(15, 23, 42, 0.42)",
              },
            },
          }}
        >
          <Box
            sx={{
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 2,
            }}
          >
            <MotionBox
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              sx={{
                bgcolor: "background.paper",
                border: `1px solid`,
                borderColor: getModalAccentColor(),
                borderRadius: 4,
                boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)",
                p: { xs: 2.5, sm: 4 },
                textAlign: "center",
                width: { xs: "100%", sm: 420 },
                maxWidth: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                outline: "none",
              }}
            >
              {isSubmitting ? (
                <CircularProgress sx={{ mb: 2 }} />
              ) : isSuccess ? (
                <CheckCircleOutline
                  sx={{ fontSize: 60, color: "success.main", mb: 2 }}
                />
              ) : isError ? (
                <ErrorOutline
                  sx={{ fontSize: 60, color: "error.main", mb: 2 }}
                />
              ) : null}

              <Typography
                variant="h6"
                sx={{ mb: 1.5, fontWeight: 700, color: "grey.900" }}
              >
                {isSubmitting
                  ? "Procesando pedido"
                  : isSuccess
                  ? "Pedido creado"
                  : isError
                  ? "No se pudo crear el pedido"
                  : ""}
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
                    minWidth: 120,
                    borderRadius: 3,
                    textTransform: "none",
                    fontWeight: 600,
                    bgcolor: isSuccess ? "success.main" : "error.main",
                    color: "#fff",
                    "&:hover": {
                      bgcolor: isSuccess ? "success.dark" : "error.dark",
                    },
                  }}
                >
                  Cerrar
                </Button>
              )}
            </MotionBox>
          </Box>
        </Modal>
      </Container>
    </MuiFade>
  );
};

export default CheckoutOrder;