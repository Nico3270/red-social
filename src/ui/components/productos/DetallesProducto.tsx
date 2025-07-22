"use client";

import React, { useState } from "react";
import { BsWhatsapp } from "react-icons/bs";
import { SeccionesFont, titleFont } from "@/config/fonts";
import { InfoEmpresa } from "@/config/config";
import { IoMdClose } from "react-icons/io"; // Icono de cierre para el modal
import { HiOutlineCube } from "react-icons/hi"; // Icono de componente
import Link from "next/link";
import { BotonFavoritos } from "./BotonFavoritos";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import Divider from "../divider/Divider";
import { useSession } from "next-auth/react";
import { FaComment } from "react-icons/fa";
import { ModalPublicaciones } from "@/publicaciones/componentes/ModalPublicaciones";
import { PublicacionTipo } from "@prisma/client";
import { ContextoPublicacion } from "../autoUpload/UsoenForm";
import { TestimonioProductoCrearEditar } from "@/publicaciones/componentes/TestimonioProductoCrearEditar";


interface AddToCartProps {
  product: ProductRedSocial;
  telefonoNegocio?: string;
}

interface InformacionPublicacion {
  usuarioId?: string;
  publicacionId?: string;
  productoId: string;
  tipo: PublicacionTipo;
  contexto: ContextoPublicacion;
  nombreProducto: string;
  imagenProducto: string;
  descripcion?: string;
  multimedia?: string[];
}

export const DetallesProducto: React.FC<AddToCartProps> = ({ product, telefonoNegocio }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [isComponentsModalOpen, setIsComponentsModalOpen] = useState(false); // Estado para modal de componentes
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false); // Estado para modal de reseña

  // Crear mensaje de WhatsApp
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Estoy interesado en el siguiente producto:\n\n` +
    `*${product.nombre}*\n` +
    `Precio: $${(product.precio).toFixed(2)}\n\n` +
    `Puedes ver más detalles aquí:\n` +
    `${InfoEmpresa.linkWebProduccion}/producto/${product.slug}`
  );

  const whatsappUrl = `https://wa.me/${telefonoNegocio}?text=${whatsappMessage}`;
  const infoCrearPublicacion: InformacionPublicacion = {
    usuarioId: userId,
    productoId: product.id,
    tipo: PublicacionTipo.TESTIMONIO,
    contexto: "producto",
    nombreProducto: product.nombre || "",
    imagenProducto: product.imagenes[0] || ""
  }

  return (
    <div className="mt-0 flex flex-col items-center gap-6 bg-white p-4 mb-10 sm:m-0 rounded-lg shadow-md">
      {/* Información del producto */}
      <div className="text-center">
        <h1
          className={`text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 text-center leading-snug break-words ${SeccionesFont.className}`}
        >
          {product.nombre}
        </h1>
        <Divider />
        <div className="mt-0">
          <span className="text-sm text-gray-500">Precio:</span>
          <div className="text-4xl font-extrabold text-gray-800 tracking-tight mt-1">
            {new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            }).format(product.precio)}
          </div>
        </div>
        {/* Botón para abrir el modal de componentes */}
        <div className="flex justify-center py-2">
          <button
            onClick={() => setIsComponentsModalOpen(true)}
            className="mt-0 px-6 py-3 text-white font-semibold bg-gray-900 hover:bg-gray-800 rounded-lg shadow-md transition-all flex items-center gap-2"
          >
            <HiOutlineCube className="text-lg" />
            Especificaciones del Producto
          </button>
        </div>
        <p className={`color-descripcion-tarjeta text-md mt-2 ${titleFont.className}`}>{product.descripcion}</p>
      </div>

      {/* Modal de Componentes */}
      {isComponentsModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg transform transition-all scale-100">
            <div className="flex justify-between items-center mb-0">
              <h2 className="text-xl font-bold text-gray-800">Componentes del Producto</h2>
              <button onClick={() => setIsComponentsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <IoMdClose className="text-2xl" />
              </button>
            </div>

            <ul className="space-y-3">
              {product.componentes && product.componentes.length > 0 ? (
                product.componentes.map((componente, index) => (
                  <li key={index} className="flex items-center gap-3 p-3 border-b last:border-none">
                    <HiOutlineCube className="text-gray-700 text-xl" />
                    <p className="text-gray-700 font-medium">{componente}</p>
                  </li>
                ))
              ) : (
                <p className="text-gray-500">No hay componentes disponibles para este producto.</p>
              )}
            </ul>

            <button
              onClick={() => setIsComponentsModalOpen(false)}
              className="mt-4 w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-4">
        <Link
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all"
        >
          <BsWhatsapp className="text-lg" />
          WhatsApp
        </Link>
        <BotonFavoritos
          id={product.id}
          title={product.nombre}
          price={product.precio}
          description={product.descripcion}
          slug={product.slug}
          images={product.imagenes[0] ? [product.imagenes[0]] : []}
        />
      </div>

      {/* Nuevo botón para dejar reseña */}
      <div className="w-full flex justify-center mt-0">
        <button
          onClick={() => setIsReviewModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#274494] hover:bg-[#2c5282] text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all"
          aria-label="Deja una reseña de este producto"
        >
          <FaComment className="text-lg" />
          Deja una reseña de este producto
        </button>
      </div>

      {/* Modal de reseña */}
      {isReviewModalOpen && (
        // <PublicacionModalProducto
        //   userId={session?.user?.id}
        //   productId={product.id}
        //   contexto="producto"
        //   nombreProducto={product.nombre}
        //   urlImagenProducto={product.imagenes[0] || undefined}
        //   onClose={() => setIsReviewModalOpen(false)}
        // />
        <ModalPublicaciones
          onClose={() => setIsReviewModalOpen(false)} // ✅ Esto sí cierra el modal correcto
          userId={userId}
        >
          <TestimonioProductoCrearEditar
            infoPublicacion={
              infoCrearPublicacion
            }


          />
        </ModalPublicaciones>
      )}

    </div>
  );
};