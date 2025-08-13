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

interface ItemInput {
  description: string;
  quantity: number;
  price: number;
  subtotal: number;
  productId?: string | null;
}

interface TransactionInput {
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string;
  items?: ItemInput[];
}

export const addTransaction = async (input: TransactionInput): Promise<{
  success: boolean;
  transaction?: Transaction;
  error?: string;
}> => {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Usuario no autenticado." };
  }
  const usuarioId = session.user.id;

  try {
    return await prisma.$transaction(async (tx) => {
      
      const negocioId = session.user.negocioId || null;

      let orderId: string | undefined;
      let generatedDescription = input.description || "";

      const transactionDate = new Date(input.date); // Ahora input.date es ISO full, ya combinado en frontend

      if (input.items && input.items.length > 0) {
        if (!generatedDescription) {
          generatedDescription = input.items
            .map((item) => `${item.description} x${item.quantity}`)
            .join(", ");
        }

        const newOrder = await tx.order.create({
          data: {
            date: transactionDate,
            type: input.type,
            description: generatedDescription,
            totalAmount: input.amount,
            paymentMethod: input.paymentMethod,
            category: input.category,
            status: "completada",
            usuarioId,
            negocioId,
          },
        });
        orderId = newOrder.id;

        await tx.orderItem.createMany({
          data: input.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
            orderId: newOrder.id,
            productId: item.productId || null,
          })),
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          date: transactionDate,
          type: input.type,
          description: generatedDescription,
          category: input.category,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          usuarioId,
          orderId,
        },
      });

      if (orderId) {
        await tx.order.update({
          where: { id: orderId },
          data: { transactionId: transaction.id },
        });
      }

      return {
        success: true,
        transaction: {
          id: transaction.id,
          date: transaction.date.toISOString(),
          type: transaction.type as TransactionType,
          description: transaction.description,
          category: transaction.category as IncomeCategory | ExpenseCategory,
          amount: Number(transaction.amount),
          paymentMethod: transaction.paymentMethod as PaymentMethod,
        },
      };
    });
  } catch (error) {
    console.error("Error al agregar la transacción:", error);
    return { success: false, error: "Error al agregar la transacción." };
  }
};