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
import AddTransactionComponent from "./AddTransactionComponent";
import { TransactionType, PaymentMethod, IncomeCategory, ExpenseCategory } from "@prisma/client";
import { FormData,  Transaction } from "@/transacciones/interfaces/types"; // Import compartido

// Interface auxiliar para API (category como string, ya que viene de DB)
interface ApiTransactionData {
  date: string;
  type: TransactionType;
  category: string; // String crudo de DB
  paymentMethod: PaymentMethod;
  orderItems?: Array<{
    description: string;
    quantity: number;
    price: number;
    subtotal: number;
    product?: { id: string };
  }>;
  amount: number;
  description: string;
}

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
  const [initialData, setInitialData] = useState<(FormData & { transactionId: string }) | null>(null);
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
          const { data }: { data: ApiTransactionData } = await response.json();

          const formattedDate = new Date(data.date).toISOString().substring(0, 10);
          const items = data.orderItems
            ? data.orderItems.map((item) => ({
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
            category: data.category as IncomeCategory | ExpenseCategory, // Casting seguro (validado en DB)
            paymentMethod: data.paymentMethod,
            items,
            amount: data.amount,
            description: data.description,
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