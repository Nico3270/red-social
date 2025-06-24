"use client";

import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Transaction, TransactionType } from "@/transacciones/interfaces/types";
import { FiArrowUp, FiArrowDown } from "react-icons/fi";

interface ShowTransactionsProps {
  transactions: Transaction[];
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

const ShowTransactions: React.FC<ShowTransactionsProps> = ({ transactions }) => {
  return (
    <div className="w-full max-w-5xl mx-auto bg-white shadow-md rounded-lg p-6">
  <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">Transacciones</h1>
  
  <div className="overflow-x-auto">
    <table className="min-w-full border-collapse">
      <thead>
        <tr className="bg-gray-100 text-gray-700">
          <th className="border p-2 text-left">Fecha</th>
          <th className="border p-2 text-left">Descripción</th>
          <th className="border p-2 text-left">Categoría</th>
          <th className="border p-2 text-right">Monto</th>
          <th className="border p-2 text-left">Medio de Pago</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((transaction) => (
          <tr
            key={transaction.id}
            className={`hover:bg-gray-100 ${
              transaction.type === TransactionType.Ingreso
                ? "bg-green-50"
                : "bg-red-50"
            }`}
          >
            <td className="border p-2 text-sm">
              {format(new Date(transaction.date), "dd/MM/yyyy", { locale: es })}
            </td>
            <td className="border p-2 text-sm flex items-center gap-2">
              {transaction.type === TransactionType.Ingreso ? (
                <FiArrowUp className="text-green-500" />
              ) : (
                <FiArrowDown className="text-red-500" />
              )}
              {transaction.description}
            </td>
            <td className="border p-2 text-sm">
              {capitalize(transaction.category)}
            </td>
            <td
              className={`border p-2 text-sm text-right font-bold ${
                transaction.type === TransactionType.Ingreso
                  ? "text-green-700"
                  : "text-red-700"
              }`}
            >
              {transaction.type === TransactionType.Ingreso ? "+" : "-"} $
              {transaction.amount.toLocaleString("es-CO")}
            </td>
            <td className="border p-2 text-sm">
              {capitalize(transaction.paymentMethod)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>


  );
};

export default ShowTransactions;
