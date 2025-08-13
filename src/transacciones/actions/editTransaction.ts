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
  transactionId: string;
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string;
  items?: ItemInput[];
}

export const editTransaction = async (input: TransactionInput): Promise<{
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
      // Verificar que la transacción existe y pertenece al usuario
      const existingTransaction = await tx.transaction.findUnique({
        where: { id: input.transactionId },
        include: { order: { include: { items: true } } },
      });

      if (!existingTransaction || existingTransaction.usuarioId !== usuarioId) {
        return { success: false, error: "Transacción no encontrada o no autorizada." };
      }

      let orderId = existingTransaction.orderId;
      let generatedDescription = input.description || "";

      // Manejar Order y OrderItems si hay items
      if (input.items && input.items.length > 0) {
        // Generar descripción de items si no hay
        if (!generatedDescription) {
          generatedDescription = input.items
            .map((item) => `${item.description} x${item.quantity}`)
            .join(", ");
        }

        // Obtener negocioId
        const negocio = await tx.negocio.findUnique({
          where: { usuarioId },
          select: { id: true },
        });
        const negocioId = negocio?.id || null;

        if (orderId) {
          // Update existing Order
          await tx.order.update({
            where: { id: orderId },
            data: {
              date: new Date(input.date),
              type: input.type,
              description: generatedDescription,
              totalAmount: input.amount,
              paymentMethod: input.paymentMethod,
              category: input.category,
              status: "completada",
              negocioId,
            },
          });

          // Delete old OrderItems
          await tx.orderItem.deleteMany({
            where: { orderId },
          });

          // Create new OrderItems
          await tx.orderItem.createMany({
            data: input.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
              orderId: orderId!,
              productId: item.productId || null,
            })),
          });
        } else {
          // Create new Order if none existed
          const newOrder = await tx.order.create({
            data: {
              date: new Date(input.date),
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

          // Create OrderItems
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

          // Link Order to Transaction
          await tx.transaction.update({
            where: { id: input.transactionId },
            data: { orderId: newOrder.id },
          });

          // Link back Transaction to Order
          await tx.order.update({
            where: { id: newOrder.id },
            data: { transactionId: input.transactionId },
          });
        }
      } else if (orderId) {
        // Si no hay items pero había Order, unlink y delete Order
        await tx.orderItem.deleteMany({ where: { orderId } });
        await tx.order.delete({ where: { id: orderId } });
        orderId = null;
      }

      // Update Transaction
      const updatedTransaction = await tx.transaction.update({
        where: { id: input.transactionId },
        data: {
          date: new Date(input.date),
          type: input.type,
          description: generatedDescription,
          category: input.category,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          orderId, // Update link (null si no items)
        },
      });

      return {
        success: true,
        transaction: {
          id: updatedTransaction.id,
          date: updatedTransaction.date.toISOString(),
          type: updatedTransaction.type as TransactionType,
          description: updatedTransaction.description,
          category: updatedTransaction.category as IncomeCategory | ExpenseCategory,
          amount: Number(updatedTransaction.amount),
          paymentMethod: updatedTransaction.paymentMethod as PaymentMethod,
        },
      };
    });
  } catch (error) {
    console.error("Error al editar la transacción:", error);
    return { success: false, error: "Error al editar la transacción." };
  }
};