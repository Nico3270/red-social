"use client";

import React, { useEffect, useState } from "react";
import {
  Modal,
  Fade,
  Backdrop,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";

interface DeleteTransactionModalProps {
  open: boolean;
  onClose: () => void;
  transactionId: string | null;
  onTransactionDeleted: (deletedId: string) => void;
}


const DeleteTransactionModal: React.FC<DeleteTransactionModalProps> = ({
  open,
  onClose,
  transactionId,
  onTransactionDeleted,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  }, [open, transactionId]);


  const handleDelete = async () => {
    if (!transactionId) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/eliminarTransaccion/${transactionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar la transacción");
      }

      setSuccess(true);
      // ❌ Quitamos setTimeout
      // Nota: No llamamos a onTransactionDeleted aquí, lo movemos al botón de cierre para que se ejecute solo después de que el usuario vea el mensaje y confirme.
    } catch (err) {
      setError("Error al eliminar la transacción. Intenta nuevamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const handleClose = () => {
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{ backdrop: { timeout: 500 } }}
    >
      <Fade in={open}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: 400 },
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          {!success && !error && (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                ¿Estás seguro de que deseas eliminar esta transacción?
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                <Button variant="outlined" onClick={handleClose} disabled={loading} sx={{ textTransform: "none" }}>
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDelete}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                  sx={{ textTransform: "none" }}
                >
                  {loading ? "Eliminando..." : "Eliminar"}
                </Button>
              </Box>
            </>
          )}

          {success && (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                Transacción eliminada con éxito.
              </Alert>
              <Button 
                variant="contained" 
                sx={{ textTransform: "none" }}
                onClick={() => {
                  if (transactionId) {
                    onTransactionDeleted(transactionId);
                  }
                  handleClose();
                }}
              >
                Cerrar
              </Button>
            </>
          )}

          {error && (
            <>
              <Alert severity="error" sx={{ mb: 2 , }}>
                {error}
              </Alert>
              <Button  variant="contained"  onClick={handleClose}>
                Cerrar
              </Button>
            </>
          )}
        </Box>
      </Fade>
    </Modal>
  );
};

export default DeleteTransactionModal;