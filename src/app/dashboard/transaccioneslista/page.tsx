import { getTransactions } from "@/transacciones/actions/getTransactions";
import ShowTransactions from "@/transacciones/componentes/ShowTransactions";
import React from "react";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché

const Page = async () => {
  // Obtenemos las transacciones y ya las formateamos
  const transactions = await getTransactions();

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-8 md:px-12">
      <ShowTransactions transactions={transactions} />
    </main>
  );
};

export default Page;
