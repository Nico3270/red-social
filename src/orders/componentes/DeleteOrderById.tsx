"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Modal,
  Fade,
  Backdrop,
  CircularProgress,
  Button,
  IconButton,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { ErrorOutline, CheckCircleOutline, Close } from "@mui/icons-material";

interface DeleteOrderByIdProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
  onOrderDeleted?: (id: string) => void;
}

const MotionBox = motion(Box);

const DeleteOrderById: React.FC<DeleteOrderByIdProps> = ({ orderId, open, onClose, onOrderDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/deleteOrder/${orderId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.ok) {
        onOrderDeleted?.(orderId);
        setSuccessMessage(data.message || "Orden eliminada exitosamente");
      } else {
        setError(data.message || "Error al eliminar la orden");
      }
    } catch (err) {
      setError("Error inesperado al eliminar la orden");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <Modal
  open={open}
  onClose={handleClose}
  closeAfterTransition
  slots={{ backdrop: Backdrop }}
  slotProps={{
    backdrop: { timeout: 500 },
  }}
  sx={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
          <Fade in={open}>
            <MotionBox
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      sx={{
        width: { xs: "90%", sm: 400 },
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "grey.300", // borde gris sutil
        borderRadius: 4, // más redondeado tipo Apple
        boxShadow:
          "0 4px 20px rgba(0,0,0,0.08), 0 8px 40px rgba(0,0,0,0.12)", // sombras suaves elegantes
        p: { xs: 3, sm: 4 },
        outline: "none",
        textAlign: "center",
        backdropFilter: "blur(12px)", // efecto cristal Apple
      }}
    >
              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                <IconButton onClick={handleClose} sx={{ color: "text.secondary" }}>
                  <Close />
                </IconButton>
              </Box>

              {loading ? (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4 }}>
                  <CircularProgress size={40} thickness={5} sx={{ color: "primary.main", mb: 2 }} />
                  <Typography variant="body1" sx={{ color: "text.secondary" }}>
                    Eliminando orden...
                  </Typography>
                </Box>
              ) : error ? (
                <Box sx={{ py: 4 }}>
                  <ErrorOutline sx={{ fontSize: 60, color: "error.main", mb: 2 }} />
                  <Typography variant="h6" sx={{ color: "error.main", fontWeight: 500, mb: 2 }}>
                    {error}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleClose}
                    sx={{
                      bgcolor: "error.main",
                      color: "white",
                      "&:hover": { bgcolor: "error.dark" },
                      borderRadius: 2,
                      px: 4,
                      py: 1,
                    }}
                  >
                    Cerrar
                  </Button>
                </Box>
              ) : successMessage ? (
                <Box sx={{ py: 4 }}>
                  <CheckCircleOutline sx={{ fontSize: 60, color: "success.main", mb: 2 }} />
                  <Typography variant="h6" sx={{ color: "success.main", fontWeight: 500, mb: 2 }}>
                    {successMessage}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleClose}
                    sx={{
                      bgcolor: "success.main",
                      color: "white",
                      "&:hover": { bgcolor: "success.dark" },
                      borderRadius: 2,
                      px: 4,
                      py: 1,
                    }}
                  >
                    Cerrar
                  </Button>
                </Box>
              ) : (
                <Box sx={{ py: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    ¿Estás seguro de que deseas eliminar esta orden?
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={handleClose}
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 600,
                        color: "text.primary",
                        borderColor: "divider",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={handleDelete}
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 600,
                        "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
                      }}
                    >
                      Continuar
                    </Button>
                  </Box>
                </Box>
              )}
            </MotionBox>
          </Fade>
        </Modal>
      )}
    </AnimatePresence>
  );
};

export default DeleteOrderById;