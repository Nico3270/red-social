"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Modal,
  Fade,
  Backdrop,
  CircularProgress,
  Typography,
  IconButton,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import AddTransactionComponent from "./AddTransactionComponent"; // Ajusta la ruta según sea necesario
import { Transaction } from "@/transacciones/interfaces/types"; // Ajusta la ruta según sea necesario
import { TransactionType } from "@prisma/client";

interface EditTransactionModalProps {
  open: boolean;
  onClose: () => void;
  transactionId: string | null;
  onTransactionUpdated: (updatedTransaction: Transaction) => void;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  open,
  onClose,
  transactionId,
  onTransactionUpdated,
}) => {
  const [initialData, setInitialData] = useState<any>(null); // Tipar como FormData & { transactionId: string } si es posible
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && transactionId) {
      const fetchTransaction = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/resumenTransaccion/${transactionId}`);
          if (!response.ok) {
            throw new Error("Error al obtener la transacción");
          }
          const { data } = await response.json();

          // Mapear los datos de la API al formato esperado por el componente
          const formattedDate = new Date(data.date).toISOString().substring(0, 10);
          const items = data.orderItems
            ? data.orderItems.map((item: any) => ({
                description: item.description,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                productId: item.product?.id || null,
                isLocked: !!item.product,
              }))
            : [];

          setInitialData({
            date: formattedDate,
            type: data.type || TransactionType.ingreso,
            category: data.category,
            paymentMethod: data.paymentMethod,
            items,
            amount: data.amount,
            description: data.description, // Cambiado de 'descripcion' a 'description' en la API
            transactionId,
          });
        } catch (err) {
          setError("Error al cargar la transacción. Intenta nuevamente.");
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

      fetchTransaction();
    } else {
      setInitialData(null);
    }
  }, [open, transactionId]);

  const handleTransactionAdded = (updatedTransaction: Transaction) => {
    onTransactionUpdated(updatedTransaction);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
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
            width: { xs: "90%", sm: "80%", md: "60%" },
            maxHeight: "90vh",
            overflowY: "auto",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: { xs: 2, sm: 4 },
            borderRadius: 2,
          }}
        >
          <IconButton
            onClick={onClose}
            sx={{ position: "absolute", top: 8, right: 8 }}
          >
            <Close />
          </IconButton>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error" align="center">
              {error}
            </Typography>
          ) : initialData ? (
            <AddTransactionComponent
              onTransactionAdded={handleTransactionAdded}
              initialData={initialData}
            />
          ) : (
            <Typography align="center">No hay datos para editar.</Typography>
          )}
        </Box>
      </Fade>
    </Modal>
  );
};

export default EditTransactionModal;