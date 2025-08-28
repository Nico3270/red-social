"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import {

  Transaction,
} from "@/transacciones/interfaces/types";
import { TransactionType, PaymentMethod, IncomeCategory, ExpenseCategory } from "@prisma/client";

interface GetTransactionsParams {
  page?: number; // Página actual (para paginación)
  limit?: number; // Límite por página (default: 20)
  type?: TransactionType; // Filtro opcional por tipo
  startDate?: string; // Filtro por fecha inicial (ISO string)
  endDate?: string; // Filtro por fecha final (ISO string)
}

export const getTransactions = async (params: GetTransactionsParams = {}): Promise<{
  success: boolean;
  transactions?: Transaction[];
  total?: number;
  error?: string;
}> => {
  try {
    const session = await auth();
    if (!session || !session.user.id) {
      return {
        success: false,
        error: "Usuario no autenticado. Debes iniciar sesión para obtener transacciones.",
      };
    }
    const usuarioId = session.user.id;

    const { page = 1, limit = 20, type, startDate, endDate } = params;

    // Construir filtros dinámicos
    const whereClause = {
      usuarioId,
      ...(type && { type }),
      ...(startDate && endDate && {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    // Obtener transacciones con paginación
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where: whereClause }), // Para paginación frontend
    ]);

    // Mapeo de transacciones
    const mappedTransactions = transactions.map((transaction) => ({
      id: transaction.id,
      date: transaction.date.toISOString(),
      type: transaction.type as TransactionType,
      description: transaction.description,
      category: transaction.category as IncomeCategory | ExpenseCategory,
      amount: transaction.amount.toNumber(),
      paymentMethod: transaction.paymentMethod as PaymentMethod,
      // Agrego estos por completitud, ajusta si no los necesitas
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    }));

    return {
      success: true,
      transactions: mappedTransactions,
      total,
    };
  } catch (error) {
    console.error("Error al obtener transacciones:", error);
    return {
      success: false,
      error: "No se pudieron obtener las transacciones. Verifica tu conexión o intenta más tarde.",
    };
  }
};