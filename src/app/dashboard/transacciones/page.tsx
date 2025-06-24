"use client";

import { useState, useEffect } from "react";
import AddTransactionComponent from "@/transacciones/componentes/AddTransactionComponent";
import ShowTransactions from "@/transacciones/componentes/ShowTransactions";
import GraficosTransacciones from "@/transacciones/componentes/GraficosTransacciones";
import { getTransactions } from "@/transacciones/actions/getTransactions";
import { Transaction } from "@/transacciones/interfaces/types";
import { FiArrowUp } from "react-icons/fi";
import { FaChartPie, FaListAlt, FaPlusCircle } from "react-icons/fa";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
const Page = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Cargar transacciones al montar el componente
  useEffect(() => {
    const fetchTransactions = async () => {
      const data = await getTransactions();
      setTransactions(data);
    };

    fetchTransactions();
  }, []);

  // Mostrar el botón "Subir" al hacer scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Función para agregar una nueva transacción
  const handleAddTransaction = (newTransaction: Transaction) => {
    setTransactions((prev) => [newTransaction, ...prev]);
  };

  // Función para subir al inicio
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="relative min-h-screen bg-gray-50">
      {/* Menú superior dentro del contenedor */}
      <nav className="sticky top-0 pt-5 bg-white shadow-lg z-10">
        <ul className="flex justify-around items-center py-3 border-b border-gray-200">
          <li>
            <a
              href="#addTransaction"
              className="flex flex-col items-center text-gray-600 hover:text-[#640D5F] transition-colors duration-300"
            >
              <FaPlusCircle className="text-2xl mb-1" />
              <span className="text-sm font-medium">Agregar</span>
            </a>
          </li>
          <li>
            <a
              href="#charts"
              className="flex flex-col items-center text-gray-600 hover:text-[#640D5F] transition-colors duration-300"
            >
              <FaChartPie className="text-2xl mb-1" />
              <span className="text-sm font-medium">Gráficos</span>
            </a>
          </li>
          <li>
            <a
              href="#transactions"
              className="flex flex-col items-center text-gray-600 hover:text-[#640D5F] transition-colors duration-300"
            >
              <FaListAlt className="text-2xl mb-1" />
              <span className="text-sm font-medium">Transacciones</span>
            </a>
          </li>
        </ul>
      </nav>


      {/* Contenido principal */}
      <div className="pt-4 pb-20 flex flex-col gap-8 px-4 sm:px-8 md:px-12">
        <section id="addTransaction">
          <AddTransactionComponent onTransactionAdded={handleAddTransaction} />
        </section>

        <section id="charts">
          <GraficosTransacciones transactions={transactions} />
        </section>

        <section id="transactions">
          <ShowTransactions transactions={transactions} />
        </section>
      </div>

      {/* Botón para volver al inicio */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          style={{ bottom: 'calc(3rem + 60px)' }}  // Ajusta '60px' según la altura de tu barra inferior
          className="fixed right-6 bg-blue-500 text-white p-3 mr-5 rounded-full shadow-lg hover:bg-blue-600 transition"
          aria-label="Subir al inicio"
        >
          <FiArrowUp size={24} />
        </button>
      )}
    </main>
  );
};

export default Page;
