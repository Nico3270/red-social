"use client";

import { useCartCatalogoStore } from "@/store/carro/carro-store"; // Asegúrate de que la ruta sea correcta
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FaTrash } from "react-icons/fa"; // Para el ícono de eliminar

// Función para fetch real del nombre del negocio
const fetchNegocioName = async (slug: string): Promise<string> => {
  try {
    const res = await fetch(`/api/negocios/${slug}`);
    if (!res.ok) {
      throw new Error("Error al obtener la información del negocio");
    }
    const data = await res.json();
    return data.negocio?.nombre_negocio || "Negocio Desconocido"; // Fallback si no hay nombre
  } catch (error) {
    console.error(`Error fetching negocio ${slug}:`, error);
    return "Negocio Desconocido"; // Fallback en caso de error
  }
};

// Cache global/simple para nombres (puedes usar un Map o localStorage para persistencia)
const negocioNameCache: Record<string, string> = {}; // Fuera del componente, o usa useRef para persistir

export const ProductsInCart = () => {
  const {
    carts,
    updateProductQuantity,
    removeProduct,
    getTotalPrice,
    clearCartForNegocio,
    getCartForNegocio,
  } = useCartCatalogoStore();

  const [negocioNames, setNegocioNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true); // Estado de carga para evitar interacciones prematuras
  const negocioIds = useMemo(() => Object.keys(carts), [carts]); // Memoiza para evitar re-cálculos innecesarios

  // Fetch nombres de negocios - Usamos Promise.all para eficiencia y evitar loops
  useEffect(() => {
    const loadNames = async () => {
      setIsLoading(true);
      const newNames: Record<string, string> = { ...negocioNames }; // Copia actual
      const promises: Promise<void>[] = [];

      for (const id of negocioIds) {
        if (!negocioNameCache[id]) { // Solo fetch si no está en cache
          promises.push(
            fetchNegocioName(id).then((name) => {
              negocioNameCache[id] = name;
              newNames[id] = name;
            })
          );
        } else {
          newNames[id] = negocioNameCache[id];
        }
      }

      await Promise.all(promises);
      setNegocioNames(newNames);
      setIsLoading(false);
    };

    if (negocioIds.length > 0) {
      loadNames();
    } else {
      setIsLoading(false);
    }
  }, [negocioIds.join(',')]); // Dependencia solo en negocioIds memoizado

  // Calcular total general
  const total = useMemo(() => getTotalPrice(), [getTotalPrice]);

  // Número de negocios
  const numNegocios = negocioIds.length;

  // Función para calcular subtotal por negocio - Memoizada internamente si es necesario
  const getSubtotalForNegocio = (negocioId: string) => {
    return getCartForNegocio(negocioId).reduce(
      (sum, item) => sum + item.precio * item.cantidad,
      0
    );
  };

  if (numNegocios === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] bg-gray-50 rounded-2xl shadow-sm">
        <h2 className="text-2xl font-light text-gray-600 mb-4">Tu carrito está vacío</h2>
        <p className="text-gray-500 mb-6">Explora productos premium y agrega tus favoritos.</p>
        <Link
          href="/"
          className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 transition-all duration-300 shadow-sm"
        >
          Volver al catálogo
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sección Izquierda: Productos por Negocio (2/3) */}
      <div className="lg:w-2/3 w-full space-y-8 overflow-y-auto pr-0" style={{ maxHeight: 'calc(100vh - 200px)' }}> {/* Ajuste de altura para scroll, evitando congelamiento */}
        <AnimatePresence mode="wait"> {/* Agrega mode="wait" para manejar salidas antes de entradas y evitar overlaps */}
          {negocioIds.map((negocioId) => {
            const items = getCartForNegocio(negocioId);
            const nombreNegocio = negocioNames[negocioId] || "Negocio Desconocido";
            const subtotal = getSubtotalForNegocio(negocioId);

            return (
              <motion.section
                key={negocioId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-3xl p-2 border border-gray-300 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
              >

                <div className="flex justify-around items-center mb-6 border-b border-gray-200 pb-3">
                  <h2 className="text-2xl font-medium tracking-tight">
  <span className="text-gray-500">Productos en </span>
  <span className="text-gray-900 font-semibold">{nombreNegocio}</span>
</h2>

                  <button
                    onClick={() => clearCartForNegocio(negocioId)}
                    className="flex items-center gap-2 rounded-lg bg-gray-800 text-white px-3 py-1.5 text-sm font-medium 
               hover:bg-gray-700 active:scale-95 transition-all duration-200"
                  >
                    <FaTrash className="text-sm" />
                    Vaciar
                  </button>
                </div>

                {/* Cajón donde van los productos */}

                <div className="space-y-1">
                  <AnimatePresence mode="wait">
                    {items.map((item) => (
                      <motion.div
                        key={item.cartItemId}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between bg-white rounded-2xl p-4 
                   hover:shadow-md transition-all duration-300 border border-gray-100"
                      >
                        {/* Imagen - solo en pantallas medianas o más grandes */}
                        <div className="hidden md:block relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-xl shadow-sm">
                          <Image
                            src={item.imagen}
                            alt={item.nombre}
                            fill
                            className="object-cover"
                          />
                        </div>

                        {/* Título y Precio */}
                        <div className="flex-grow ml-0 md:ml-4">
                          <h3 className="text-base font-medium text-gray-900 leading-tight">
                            {item.nombre}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            ${new Intl.NumberFormat("es-CO").format(item.precio)}{" "}
                            <span className="text-gray-400">c/u</span>
                          </p>
                        </div>

                        {/* Selector de Cantidad */}
                        <div className="flex items-center rounded-full border border-gray-300 bg-gray-100 shadow-inner mx-2 sm:mx-4">
                          {/* Botón menos */}
                          <button
                            onClick={() =>
                              updateProductQuantity(negocioId, item.cartItemId, item.cantidad - 1)
                            }
                            className="px-3 py-2 bg-gray-800 text-white text-lg font-medium rounded-l-full 
                       hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-40"
                            disabled={item.cantidad <= 1}
                          >
                            –
                          </button>

                          {/* Cantidad */}
                          <div className="w-14 text-center text-gray-900 text-base font-semibold">
                            {item.cantidad}
                          </div>

                          {/* Botón más */}
                          <button
                            onClick={() =>
                              updateProductQuantity(negocioId, item.cartItemId, item.cantidad + 1)
                            }
                            className="px-3 py-2 bg-gray-800 text-white text-lg font-medium rounded-r-full 
                       hover:bg-gray-700 active:scale-95 transition-all"
                          >
                            +
                          </button>
                        </div>

                        {/* Botón Eliminar */}
                        <button
                          onClick={() => removeProduct(negocioId, item.cartItemId)}
                          className="ml-2 sm:ml-4 text-red-700 hover:text-red-400 transition-colors"
                        >
                          <FaTrash className="text-lg" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>


                {/* Parte del subtotal */}
                <div className="mt-6 flex justify-around items-center border-t border-gray-200 pt-4">
                  <span className="text-base text-gray-900 font-bold">Subtotal</span>
                  <span className="text-lg font-semibold text-gray-900 tracking-tight">
                    ${new Intl.NumberFormat("es-CO").format(subtotal)}
                  </span>
                </div>

              </motion.section>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Sección Derecha: Resumen (1/3, sticky) */}
      {/* Sección Derecha: Resumen (1/3, sticky) */}
      <div className="lg:w-1/3 w-full lg:sticky lg:top-4 self-start bg-white rounded-2xl shadow-md p-6 border border-gray-300">

        <h2 className="text-xl font-semibold text-gray-800 mb-6">Resumen de Compra</h2>

        {/* Encabezados tipo tabla */}
        <div className="grid grid-cols-3 text-sm font-medium text-gray-800 border-b border-gray-200 pb-2 mb-2">
          <span>Cantidad</span>
          <span className="text-center">Descripción</span>
          <span className="text-right">Precio</span>
        </div>

        {/* Filas de productos */}
        <div className="space-y-2">
          {negocioIds.map((negocioId) => {
            const items = getCartForNegocio(negocioId);
            return items.map((item) => (
              <div
                key={item.cartItemId}
                className="grid grid-cols-3 text-sm text-gray-700"
              >
                <span>{item.cantidad}</span>
                <p className="text-gray-600 font-medium text-sm sm:text-base leading-snug break-words">
                  {item.nombre}
                </p>
                <span className="text-right">
                  ${new Intl.NumberFormat("es-CO").format(item.precio * item.cantidad)}
                </span>
              </div>
            ));
          })}
        </div>

        {/* Línea divisoria */}
        <div className="border-t border-gray-200 mt-4 pt-4 flex justify-around text-base font-semibold text-gray-900">
          <span>Total</span>
          <span>${new Intl.NumberFormat("es-CO").format(total)}</span>
        </div>

        {/* Botones de acción */}
        <div className="mt-6 space-y-3">
          {numNegocios > 1 && (
            <>
              {negocioIds.map((negocioId) => (
                <Link
                  key={negocioId}
                  href={`/address?negocio=${negocioId}`}
                  className="block bg-gray-100 text-gray-800 px-4 py-3 rounded-full font-medium 
                       hover:bg-gray-200 transition-all duration-300 text-center shadow-sm"
                >
                  Continuar con {negocioNames[negocioId]}
                </Link>
              ))}
              <Link
                href="/addresstotal"
                className="block bg-gray-900 text-white px-4 py-3 rounded-full font-medium 
                     hover:bg-gray-600 transition-all duration-300 text-center shadow-sm"
              >
                Continuar con Todos
              </Link>
            </>
          )}
          {numNegocios === 1 && (
            <Link
              href="/address"
              className="block bg-gray-900 text-white px-4 py-3 rounded-full font-medium 
                   hover:bg-gray-600 transition-all duration-300 text-center shadow-sm"
            >
              Continuar con la Compra
            </Link>
          )}
        </div>
      </div>

    </div>
  );
};