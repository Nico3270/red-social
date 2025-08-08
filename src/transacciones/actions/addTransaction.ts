"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import {
  TransactionType,
  IncomeCategory,
  ExpenseCategory,
  PaymentMethod,
  Transaction,
} from "@/transacciones/interfaces/types";

export const addTransaction = async ({
  date,
  type,
  description,
  category,
  amount,
  paymentMethod,
}: Omit<Transaction, "id" | "createdAt" | "updatedAt">): Promise<{
  success: boolean;
  transaction?: Transaction;
  error?: string;
}> => {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {  // Agrego ? en user para seguridad extra
      return {
        success: false,
        error: "Usuario no autenticado. Debes iniciar sesión para agregar una transacción.",
      };
    }
    const usuarioId = session.user.id;  // Sin ?, ya que el if lo asegura

    // Validaciones básicas para evitar errores comunes
    if (amount <= 0) {
      return { success: false, error: "El monto debe ser mayor a cero." };
    }
    if (!date || isNaN(new Date(date).getTime())) {
      return { success: false, error: "Fecha inválida." };
    }

    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(date),
        type,
        description,
        category,
        amount,
        paymentMethod,
        usuarioId,
      },
    });

    return {
      success: true,
      transaction: {
        id: transaction.id,
        date: transaction.date.toISOString(),
        type: transaction.type as TransactionType,
        description: transaction.description,
        category: transaction.category as IncomeCategory | ExpenseCategory,
        amount: transaction.amount.toNumber(),
        paymentMethod: transaction.paymentMethod as PaymentMethod,
        
      },
    };
  } catch (error) {
    const errorMessage = (error as Error).message || "Error desconocido";
    console.error("Error al agregar la transacción:", errorMessage);
    return { success: false, error: `No se pudo agregar la transacción: ${errorMessage}` };
  }
};