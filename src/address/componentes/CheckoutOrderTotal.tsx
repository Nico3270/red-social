"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { AnimatePresence, motion } from "framer-motion";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { useAddressStore } from "@/store/address/address-store";
import { fetchNegocioName } from "@/carro/componentes/ProductsInCart";
import { createNewPedido } from "../actions/createNewPedido";

const MotionBox = motion(Box);

const CheckoutOrderTotal: React.FC = () => {
  const router = useRouter();
  const { carts, clearCart } = useCartCatalogoStore();
  const { address, clearAddress } = useAddressStore();

  const [negocioNames, setNegocioNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartEntries = useMemo(() => Object.entries(carts), [carts]);

  const totalGlobal = useMemo(() => {
    return cartEntries.reduce((globalSum, [, items]) => {
      return (
        globalSum +
        items.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
      );
    }, 0);
  }, [cartEntries]);

  const hasItems = useMemo(() => {
    return cartEntries.some(([, items]) => items.length > 0);
  }, [cartEntries]);

  const clearRedirectTimeout = useCallback(() => {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
  }, []);

  const formatCurrency = useCallback((value: number) => {
    return `$${value.toFixed(2)}`;
  }, []);

  const formatDeliveryDate = useCallback((value?: string) => {
    if (!value) return "No especificado";

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return "No especificado";

    return parsedDate.toLocaleDateString("es-CO");
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);

        if (cartEntries.length === 0) {
          if (!isMounted) return;
          setNegocioNames({});
          return;
        }

        const namesArray = await Promise.all(
          cartEntries.map(async ([slug]) => {
            try {
              const name = await fetchNegocioName(slug);
              return [slug, name || "Negocio"] as const;
            } catch (error) {
              console.error(`Error cargando nombre del negocio ${slug}:`, error);
              return [slug, "Negocio"] as const;
            }
          })
        );

        if (!isMounted) return;

        const names = Object.fromEntries(namesArray);
        setNegocioNames(names);
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
  }, [cartEntries]);

  useEffect(() => {
    return () => {
      clearRedirectTimeout();
    };
  }, [clearRedirectTimeout]);

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    setModalOpen(false);
  }, [isSubmitting]);

  const handleCreatePedido = useCallback(async () => {
    if (isSubmitting) return;

    if (!hasItems) {
      setModalOpen(true);
      setModalMessage("Tu carrito está vacío.");
      setIsSuccess(false);
      return;
    }

    if (!address?.orderType) {
      setModalOpen(true);
      setModalMessage("Faltan los datos del pedido.");
      setIsSuccess(false);
      return;
    }

    setIsSubmitting(true);
    setModalOpen(true);
    setModalMessage("Creando pedidos...");
    setIsSuccess(false);

    try {
      const responses = await Promise.all(
        cartEntries.map(async ([slug, items]) => {
          const totalAmount = items.reduce(
            (sum, item) => sum + item.precio * item.cantidad,
            0
          );

          const pedidoData = {
            slug,
            items: items.map((item) => ({
              productId: item.id,
              quantity: item.cantidad,
              price: item.precio,
              subtotal: item.precio * item.cantidad,
              description: item.nombre,
            })),
            deliveryData: address,
            totalAmount,
          };

          const response = await createNewPedido(pedidoData);

          return {
            slug,
            response,
          };
        })
      );

      const allSuccess = responses.every(({ response }) => response.ok);

      const messages = responses
        .map(({ slug, response }) => {
          const name = negocioNames[slug] || slug || "Negocio";
          return `${name}: ${response.ok ? "Éxito" : `Error - ${response.message}`}`;
        })
        .join("\n");

      if (allSuccess) {
        setModalMessage(`Todos los pedidos creados exitosamente.\n${messages}`);
        setIsSuccess(true);

        clearCart();
        clearAddress();

        clearRedirectTimeout();
        redirectTimeoutRef.current = setTimeout(() => {
          router.push("/");
        }, 3000);
      } else {
        setModalMessage(`Algunos pedidos fallaron:\n${messages}`);
        setIsSuccess(false);
      }
    } catch (error) {
      console.error("Error en handleCreatePedido:", error);
      setModalMessage(
        error instanceof Error
          ? error.message
          : "Error inesperado al crear los pedidos."
      );
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    address,
    cartEntries,
    clearAddress,
    clearCart,
    clearRedirectTimeout,
    hasItems,
    isSubmitting,
    negocioNames,
    router,
  ]);

  const CartSummary = () => (
    <>
      {cartEntries.map(([slug, items]) => {
        const subtotal = items.reduce(
          (sum, item) => sum + item.precio * item.cantidad,
          0
        );

        return (
          <Paper
            key={slug}
            elevation={1}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
              bgcolor: "background.paper",
              mb: 3,
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2, fontWeight: 600, color: "text.primary" }}
            >
              {negocioNames[slug] || "Negocio Desconocido"}
            </Typography>

            {items.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay productos en este carrito.
              </Typography>
            ) : (
              <>
                <List disablePadding>
                  {items.map((item) => (
                    <ListItem key={item.id} sx={{ py: 1, px: 0 }}>
                      <ListItemText
                        primary={`${item.nombre} x ${item.cantidad}`}
                        secondary={`${formatCurrency(item.precio)} cada uno`}
                        primaryTypographyProps={{
                          variant: "body1",
                          fontWeight: 500,
                        }}
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Subtotal:
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {formatCurrency(subtotal)}
                  </Typography>
                </Box>
              </>
            )}
          </Paper>
        );
      })}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 2,
          p: 2,
          bgcolor: "background.paper",
          borderRadius: 3,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>
          Total Global:
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 700, color: "grey.900" }}>
          {formatCurrency(totalGlobal)}
        </Typography>
      </Box>
    </>
  );

  const DeliveryDataSummary = () => (
    <Paper
      elevation={1}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        bgcolor: "background.paper",
      }}
    >
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: 600, color: "text.primary" }}
      >
        {address?.orderType === "ON_SITE"
          ? "Datos del pedido en sitio"
          : "Datos de entrega"}
      </Typography>

      <List disablePadding>
        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText
            primary="Tipo de pedido"
            secondary={
              address?.orderType === "ON_SITE"
                ? "Consumo en sitio"
                : "Entrega a domicilio"
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

        {address?.orderType === "ON_SITE" && (
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
            secondary={formatDeliveryDate(address?.deliveryDate)}
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
          Checkout Total
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
            disabled={isSubmitting || !hasItems}
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
            {isSubmitting ? "Creando pedidos..." : "Crear pedidos"}
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
                  timeout: 300,
                  TransitionComponent: MuiFade,
                  sx: {
                    backgroundColor: "rgba(0,0,0,0.18)",
                    backdropFilter: "blur(2px)",
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
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  sx={{
                    bgcolor: "background.paper",
                    border: `2px solid ${
                      isSubmitting
                        ? "rgba(25, 118, 210, 0.4)"
                        : isSuccess
                        ? "success.main"
                        : "error.main"
                    }`,
                    borderRadius: 3,
                    boxShadow: 24,
                    p: { xs: 2.5, sm: 4 },
                    textAlign: "center",
                    width: { xs: "100%", sm: 460 },
                    maxHeight: "90vh",
                    overflowY: "auto",
                    outline: "none",
                    whiteSpace: "pre-line",
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

                  <Typography
                    variant="h6"
                    sx={{ mb: 1.5, fontWeight: 600, color: "grey.900" }}
                  >
                    {isSubmitting
                      ? "Procesando pedidos"
                      : isSuccess
                      ? "Pedidos creados"
                      : "No se pudieron crear todos los pedidos"}
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
          )}
        </AnimatePresence>
      </Container>
    </MuiFade>
  );
};

export default CheckoutOrderTotal;