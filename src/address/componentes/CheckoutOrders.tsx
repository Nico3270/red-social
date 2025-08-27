"use client";

import React, { useEffect, useState } from "react";
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


interface Address {
  country: string;
  departamento: string;
  ciudad: string;
  clientName: string;
  clientPhone: string;
  deliveryAddress: string;
  deliveryDate: string;
  additionalComments?: string;
}

interface CheckoutOrderProps {
  slug: string;
}
const MotionBox = motion(Box);

const CheckoutOrder: React.FC<CheckoutOrderProps> = ({ slug }) => {
  const router = useRouter();
  const { getCartForNegocio, clearCartForNegocio } = useCartCatalogoStore();
  const { address, clearAddress } = useAddressStore();

  const [negocioName, setNegocioName] = useState<string>("Cargando...");
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch nombre del negocio
  useEffect(() => {
    const loadData = async () => {
      const name = await fetchNegocioName(slug);
      setNegocioName(name);
      setIsLoading(false);
    };
    loadData();
  }, [slug]);

  const cartItems = getCartForNegocio(slug) || [];
  const total = cartItems.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  const handleCreatePedido = async () => {
    setIsSubmitting(true);
    setModalOpen(true);
    setModalMessage("Creando pedido...");
    setIsSuccess(false);

    try {
      const pedidoData = {
        slug,
        items: cartItems.map(item => ({
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
        setModalMessage(response.message || "Pedido creado exitosamente.");
        setIsSuccess(true);
        clearCartForNegocio(slug);
        clearAddress();

        // Redirigir después de 3 segundos
        setTimeout(() => {
          router.push("/");
        }, 3000);
      } else {
        setModalMessage(response.message || "Error al crear el pedido.");
        setIsSuccess(false);
      }
    } catch (error) {
      setModalMessage("Error inesperado al crear el pedido.");
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
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
        Resumen de tu pedido
      </Typography>
      <List disablePadding>
        {cartItems.map((item) => (
          <ListItem key={item.id} sx={{ py: 1, px: 0 }}>
            <ListItemText
              primary={`${item.nombre} x ${item.cantidad}`}
              secondary={`$${item.precio.toFixed(2)} cada uno`}
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
        Datos de entrega
      </Typography>
      <List disablePadding>
        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText primary="País" secondary={address.country} />
        </ListItem>
        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText primary="Departamento" secondary={address.departamento} />
        </ListItem>
        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText primary="Ciudad" secondary={address.ciudad} />
        </ListItem>
        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText primary="Nombre del cliente" secondary={address.clientName} />
        </ListItem>
        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText primary="Teléfono" secondary={address.clientPhone} />
        </ListItem>
        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText primary="Dirección de entrega" secondary={address.deliveryAddress} />
        </ListItem>
        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemText primary="Fecha de entrega" secondary={new Date(address.deliveryDate).toLocaleDateString()} />
        </ListItem>
        {address.additionalComments && (
          <ListItem sx={{ py: 0.5, px: 0 }}>
            <ListItemText primary="Comentarios adicionales" secondary={address.additionalComments} />
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
          Checkout para {negocioName}
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
            disabled={isSubmitting || cartItems.length === 0}
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
            Crear pedido
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
                  TransitionComponent: MuiFade, // si quieres efecto Fade en el backdrop
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
                  boxShadow: 24, // ahora sí funciona
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
      </Container>
    </MuiFade>
  );
};

export default CheckoutOrder;