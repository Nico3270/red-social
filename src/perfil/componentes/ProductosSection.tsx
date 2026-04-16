"use client";
import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import Divider from "@/ui/components/divider/Divider";

interface ProductosSectionProps {
  productos: ProductRedSocial[];
  onSelectTab: () => void;
}

const ProductosSection: React.FC<ProductosSectionProps> = ({
  productos,
  onSelectTab,
}) => {
  // Escoge 4 productos aleatorios pero asegúrate de tener al menos 4 visibles
  const teasers =
    productos.length >= 4
      ? [...productos].sort(() => 0.5 - Math.random()).slice(0, 4)
      : productos;

  return (
    <section className="relative py-8 sm:py-2 bg-gradient-to-b from-white via-green-50/20 to-white overflow-hidden">
      {/* Fondo animado más liviano */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {productos.slice(0, 6).map((p, i) => (
          <motion.div
            key={p.id}
            className="absolute rounded-3xl overflow-hidden shadow-md opacity-20"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 8,
              delay: i * 0.15,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "mirror",
            }}
            style={{
              top: `${Math.random() * 70}%`,
              left: `${Math.random() * 70}%`,
              width: `${180 + Math.random() * 160}px`,
              height: `${140 + Math.random() * 180}px`,
              rotate: `${Math.random() * 20 - 10}deg`,
            }}
          >
            <Image
              src={p.imagenes[0] || "/placeholder-product.jpg"}
              alt={p.nombre}
              fill
              className="object-cover"
              
              sizes="30vw"
            />
          </motion.div>
        ))}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />
      </div>

      {/* Título + botón principal */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center mb-10 sm:mb-14 px-6"
      >
        <motion.h2
          className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight drop-shadow-sm mb-2"
          whileInView={{ scale: [0.97, 1] }}
          transition={{ duration: 0.6 }}
        >
          Nuestros productos
        </motion.h2>

      </motion.div>

      {/* Tarjetas principales */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5 px-2 sm:px-4">
        {teasers.map((producto, index) => (
          <motion.div
            key={producto.id}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            whileHover={{ scale: 1.03 }}
            onClick={onSelectTab}
            className="group relative cursor-pointer overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500"
          >
            <div className="relative w-full aspect-[4/5]">
              <Image
                src={producto.imagenes[0] || "/placeholder-product.jpg"}
                alt={producto.nombre}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
      
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity duration-500" />
              <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-black/60 text-center">
                <p className="text-white text-lg sm:text-xl font-semibold tracking-tight">
                  {producto.nombre}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Botón inferior */}
      <div className="relative z-10 flex justify-center mt-12">
        <motion.button
          onClick={onSelectTab}
          whileTap={{ scale: 0.97 }}
          className="px-8 py-3 rounded-full bg-green-600 text-white font-semibold text-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105"
        >
          Ver catálogo
        </motion.button>
      </div>
      <Divider />
    </section>
  );
};

export default ProductosSection;
