"use server";

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
    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(date),
        type,
        description,
        category,
        amount,
        paymentMethod,
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
        amount: transaction.amount.toNumber(), // Convierte Decimal a number
        paymentMethod: transaction.paymentMethod as PaymentMethod,
      },
    };
  } catch (error) {
    console.error("Error al agregar la transacción:", error);
    return { success: false, error: "No se pudo agregar la transacción." };
  }
};
