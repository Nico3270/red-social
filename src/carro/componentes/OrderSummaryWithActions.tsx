"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { Precio } from "@/seccion/componentes/Precio";
import { titleFont } from "@/config/fonts";

export const OrderSummaryWithActions = () => {
  const [isMounted, setIsMounted] = useState(false); // Asegura que el componente se renderice solo en el cliente
  const totalItems = useCartCatalogoStore((state) => state.getTotalItems());
  const totalPrice = useCartCatalogoStore((state) => state.getTotalPrice());

  useEffect(() => {
    setIsMounted(true); // Marca como montado para evitar discrepancias
  }, []);

  if (!isMounted) {
    // Renderiza un marcador de posición mientras se monta
    return <div className="bg-white shadow-lg rounded-lg p-6">Cargando...</div>;
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h2 className={`text-2xl font-bold color-descripcion-tarjeta mb-6 text-center ${titleFont.className}`}>Resumen de tu Orden</h2>

      {totalItems === 0 ? (
        <div className="text-center">
          <p className="text-lg color-descripcion-tarjeta mb-4">No tienes productos en tu carrito.</p>
          <Link href="/productos">
            <button className="mt-4 px-6 py-2 text-white font-bold rounded-lg bg-[#be95c4] hover:bg-[#a373b3] transition-colors">
              Explorar Productos
            </button>
          </Link>
        </div>
      ) : (
        <>
          <p className="text-lg text-gray-700 mb-2">
            Cantidad de artículos: <span className="font-bold">{totalItems}</span>
          </p>
          <p className="text-lg text-gray-700 mb-6">
            Total a pagar: <span className="font-bold text-xl"><Precio value={totalPrice} /></span>
          </p>
          <Link
            href="/address"
            className={clsx(
              "block text-center px-6 py-2 font-bold text-white rounded-lg transition-colors",
              "color-boton-agregar"
            )}
          >
            Continuar con la orden
          </Link>
        </>
      )}
    </div>
  );
};
