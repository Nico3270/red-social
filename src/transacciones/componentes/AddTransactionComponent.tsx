"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import {
  TransactionType,
  IncomeCategory,
  ExpenseCategory,
  PaymentMethod,
  Transaction,
} from "@/transacciones/interfaces/types";
import { addTransaction } from "@/transacciones/actions/addTransaction";

interface AddTransactionProps {
  onTransactionAdded: (newTransaction: Transaction) => void;
}

const AddTransactionComponent: React.FC<AddTransactionProps> = ({
  onTransactionAdded,
}) => {
  const { handleSubmit, control, watch, reset } = useForm<Transaction>({
    defaultValues: {
      date: new Date().toISOString().substring(0, 10),
      type: TransactionType.Ingreso,
      description: "",
      category: IncomeCategory.Ventas,
      amount: 0,
      paymentMethod: PaymentMethod.Efectivo,
    },
  });

  const transactionType = watch("type");

  const onSubmit = async (data: Transaction) => {
    try {
      const response = await addTransaction(data);

      if (response.success && response.transaction) {
        alert("Transacción agregada con éxito.");
        reset();
        onTransactionAdded(response.transaction); // Actualiza el estado del padre
      } else {
        alert(response.error || "Error al agregar la transacción.");
      }
    } catch (error) {
      console.error("Error al agregar la transacción:", error);
      alert("Error al agregar la transacción.");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white shadow-md rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Agregar Transacción
      </h1>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fecha */}
        <Controller
          name="date"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha</label>
              <input
                {...field}
                type="date"
                className="mt-1 block w-full border rounded-md p-2"
              />
            </div>
          )}
        />

        {/* Tipo */}
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <select {...field} className="mt-1 block w-full border rounded-md p-2">
                <option value={TransactionType.Ingreso}>Ingreso</option>
                <option value={TransactionType.Gasto}>Gasto</option>
              </select>
            </div>
          )}
        />

        {/* Categoría */}
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium text-gray-700">Categoría</label>
              <select {...field} className="mt-1 block w-full border rounded-md p-2">
                {transactionType === TransactionType.Ingreso
                  ? Object.values(IncomeCategory).map((category) => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))
                  : Object.values(ExpenseCategory).map((category) => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
              </select>
            </div>
          )}
        />

        {/* Descripción */}
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Descripción</label>
              <input
                {...field}
                type="text"
                placeholder="Descripción de la transacción"
                className="mt-1 block w-full border rounded-md p-2"
              />
            </div>
          )}
        />

        {/* Valor */}
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium text-gray-700">Valor</label>
              <input
                {...field}
                type="number"
                min="0"
                step="0.01"
                className="mt-1 block w-full border rounded-md p-2"
              />
            </div>
          )}
        />

        {/* Medio de pago */}
        <Controller
          name="paymentMethod"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium text-gray-700">Medio de Pago</label>
              <select {...field} className="mt-1 block w-full border rounded-md p-2">
                {Object.values(PaymentMethod).map((method) => (
                  <option key={method} value={method}>
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}
        />

        {/* Botón de agregar */}
        <div className="sm:col-span-2 flex justify-end">
          <button
            type="submit"
            className="bg-[#EB5B00] text-white px-6 py-2 rounded-md hover:bg-[#FFB200]"
          >
            Agregar
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTransactionComponent;
