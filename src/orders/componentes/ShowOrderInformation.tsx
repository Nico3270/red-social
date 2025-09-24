"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Modal,
  Fade,
  Backdrop,
  CircularProgress,
  List,
  ListItem,
  Paper,
  IconButton,
  Grid,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { ErrorOutline, Close } from "@mui/icons-material";

interface OrderDetails {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  date: Date;
  status: string;
  type: string;
  TipoUsuario: string;
  category: string;
  description: string | null;
  totalAmount: number;
  paymentMethod: string | null;
  orderType: string; // Added orderType
  items: {
    id: string;
    description: string;
    quantity: number;
    price: number;
    subtotal: number;
    productId: string | null;
  }[];
  datosDeEntrega: {
    id: string;
    country?: string | null;
    departamento?: string | null;
    ciudad?: string | null;
    clientName: string;
    clientPhone: string;
    deliveryAddress?: string | null;
    onSiteLocation?: string | null; // Added onSiteLocation
    deliveryDate: Date | null;
    additionalComments: string | null;
  } | null;
}

interface ShowOrderInformationProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
}

const MotionBox = motion(Box);

const ShowOrderInformation: React.FC<ShowOrderInformationProps> = ({ orderId, open, onClose }) => {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && orderId) {
      const fetchOrder = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/order/${orderId}`);
          const data = await response.json();
          if (data.ok) {
            setOrder(data.order);
          } else {
            setError(data.message || "Error al obtener la orden");
          }
        } catch (err) {
          console.error(err);
          setError("Error inesperado al cargar la orden");
        } finally {
          setLoading(false);
        }
      };
      fetchOrder();
    }
  }, [open, orderId]);

  const formatDate = (date: Date | null) => {
    if (!date) return "No especificado";
    return new Date(date).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <Modal
          open={open}
          onClose={onClose}
          closeAfterTransition
          slots={{ backdrop: Backdrop }}
          slotProps={{ backdrop: { timeout: 500 } }}
        >
          <Fade in={open}>
            <MotionBox
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                outline: "none",
              }}
            >
              <Box
                sx={{
                  width: { xs: "90%", sm: "80%", md: 600 },
                  maxHeight: "80vh",
                  overflowY: "auto",
                  bgcolor: "background.paper",
                  borderRadius: 3,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                  p: { xs: 3, sm: 4 },
                  position: "relative",
                }}
              >
                {/* HEADER */}
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 500,
                    color: "text.primary",
                    letterSpacing: "-0.01em",
                    fontFamily:
                      "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    textAlign: "center",
                    mb: 2,
                    fontSize: { xs: "1.5rem", md: "1.75rem" },
                    lineHeight: 1.2,
                  }}
                >
                  Detalles de la Orden
                </Typography>

                <IconButton
                  onClick={onClose}
                  sx={{
                    color: "#fff",
                    backgroundColor: "#1c1c1e",
                    "&:hover": {
                      backgroundColor: "#2c2c2e",
                    },
                    position: "absolute",
                    top: 16,
                    right: 16,
                    p: 0.8,
                    borderRadius: "50%",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
                    width: 36,
                    height: 36,
                  }}
                >
                  <Close sx={{ fontSize: 20 }} />
                </IconButton>

                {/* CONTENIDO */}
                {loading ? (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: 200,
                    }}
                  >
                    <CircularProgress
                      size={40}
                      thickness={5}
                      sx={{ color: "primary.main" }}
                    />
                  </Box>
                ) : error ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <ErrorOutline
                      sx={{ fontSize: 60, color: "error.main", mb: 2 }}
                    />
                    <Typography
                      variant="h6"
                      sx={{ color: "error.main", fontWeight: 500 }}
                    >
                      {error}
                    </Typography>
                  </Box>
                ) : order ? (
                  <>
                    {/* Items */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        mb: 3,
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: "grey.300",
                        boxShadow: "0px 4px 20px rgba(0,0,0,0.08)",
                        backgroundColor: "background.paper",
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{ mb: 2, fontWeight: 600 }}
                      >
                        Items
                      </Typography>
                      <List disablePadding>
                        {order.items.map((item) => (
                          <ListItem
                            key={item.id}
                            sx={{
                              py: 1.2,
                              px: 0,
                              display: "flex",
                              justifyContent: "space-between",
                              borderBottom: "1px dashed",
                              borderColor: "grey.300",
                            }}
                          >
                            <Box>
                              <Typography fontWeight={500}>
                                {item.quantity} x {item.description}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                ${item.price.toFixed(2)} cada uno
                              </Typography>
                            </Box>
                            <Typography fontWeight={600}>
                              ${item.subtotal.toFixed(2)}
                            </Typography>
                          </ListItem>
                        ))}
                      </List>
                      <Box
                        sx={{
                          mt: 3,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          pt: 2,
                          borderTop: "2px solid",
                          borderColor: "grey.400",
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          Total
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          ${order.totalAmount.toFixed(2)}
                        </Typography>
                      </Box>
                    </Paper>

                    {/* Datos de Entrega */}
                    {order.datosDeEntrega && (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 3,
                          mb: 3,
                          borderRadius: 3,
                          bgcolor: "background.paper",
                          borderColor: "grey.700",
                          boxShadow: "0px 4px 10px rgba(0,0,0,0.15)",
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ mb: 2, fontWeight: 600, textAlign: "center" }}
                        >
                          {order.orderType === "DELIVERY" ? "Datos de Entrega" : "Datos del Pedido en Sitio"}
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Tipo de Pedido
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={500}>
                              {order.orderType === "DELIVERY" ? "Entrega a domicilio" : "Consumo en sitio"}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Cliente
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={500}>
                              {order.datosDeEntrega.clientName || "No especificado"}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Teléfono
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={500}>
                              {order.datosDeEntrega.clientPhone || "No especificado"}
                            </Typography>
                          </Grid>
                          {order.orderType === "DELIVERY" && (
                            <>
                              <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">
                                  Dirección
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={500}>
                                  {order.datosDeEntrega.deliveryAddress || "No especificado"}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                  Ciudad
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={500}>
                                  {order.datosDeEntrega.departamento && order.datosDeEntrega.ciudad
                                    ? `${order.datosDeEntrega.departamento}, ${order.datosDeEntrega.ciudad}, ${order.datosDeEntrega.country || "No especificado"}`
                                    : "No especificado"}
                                </Typography>
                              </Grid>
                            </>
                          )}
                          {order.orderType === "ON_SITE" && (
                            <Grid item xs={12}>
                              <Typography variant="body2" color="text.secondary">
                                Ubicación en Sitio
                              </Typography>
                              <Typography variant="subtitle1" fontWeight={500}>
                                {order.datosDeEntrega.onSiteLocation || "No especificado"}
                              </Typography>
                            </Grid>
                          )}
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Fecha de Entrega
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={500}>
                              {formatDate(order.datosDeEntrega.deliveryDate)}
                            </Typography>
                          </Grid>
                          {order.datosDeEntrega.additionalComments && (
                            <Grid item xs={12}>
                              <Typography variant="body2" color="text.secondary">
                                Comentarios
                              </Typography>
                              <Typography variant="subtitle1" fontWeight={500}>
                                {order.datosDeEntrega.additionalComments}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </Paper>
                    )}

                    {/* Información General */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        mb: 3,
                        borderRadius: 3,
                        bgcolor: "background.paper",
                        borderColor: "grey.400",
                        boxShadow: 2,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{ mb: 2, fontWeight: 600, textAlign: "center" }}
                      >
                        Información General
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            Estado
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={500}>
                            {order.status}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            Creado el
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={500}>
                            {formatDate(order.createdAt)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  </>
                ) : null}
              </Box>
            </MotionBox>
          </Fade>
        </Modal>
      )}
    </AnimatePresence>
  );
};

export default ShowOrderInformation;