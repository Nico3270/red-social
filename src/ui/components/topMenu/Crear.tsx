"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

interface CrearOption {
  nombre: string;
  imagen: string;
  href: string;
}

const opciones: CrearOption[] = [
  { nombre: "Nueva Publicación", imagen: "/imgs/iconos/crear-publicacion.png", href: "/dashboard/crear-publicacion" },
  { nombre: "Nuevo Servicio", imagen: "/imgs/iconos/crear-servicio.png", href: "/dashboard/servicios" },
  { nombre: "Nuevo Producto", imagen: "/imgs/iconos/crear-producto.png", href: "/dashboard/productos/nuevo_producto" },
  { nombre: "Nuevo Pedido", imagen: "/imgs/iconos/crear-pedido.png", href: "/dashboard/orders" },
  { nombre: "Nueva Transacción", imagen: "/imgs/iconos/crear-transaccion.png", href: "/dashboard/transacciones" },
  { nombre: "Crear Encuesta", imagen: "/imgs/iconos/crear-encuesta.png", href: "/dashboard/dashboard/encuestas" },
  { nombre: "Crear Reservas", imagen: "/imgs/iconos/crear-reserva.png", href: "/dashboard/dashboard/reservas" },
];

interface CrearModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CrearModal = ({ isOpen, onClose }: CrearModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative m-4 w-full max-w-md md:max-w-lg lg:max-w-xl rounded-2xl bg-white p-6 shadow-2xl 
                       max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>

            {/* Título */}
            <h2 className="mb-4 text-center text-xl font-semibold text-gray-800 md:text-2xl">
              ¿Qué deseas crear?
            </h2>

            {/* Contenido scrollable */}
            <div className="overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {opciones.map((opcion, index) => (
                  <Link
                    key={index}
                    href={opcion.href}
                    className="group flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 
                               transition-all duration-300 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md"
                    onClick={onClose}
                  >
                    <div className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-100 transition-colors group-hover:bg-blue-100">
                      <Image
                        src={opcion.imagen}
                        alt={opcion.nombre}
                        width={48}
                        height={48}
                        className="object-contain"
                      />
                    </div>
                    <span className="text-center text-sm font-medium text-gray-700 group-hover:text-blue-600">
                      {opcion.nombre}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
