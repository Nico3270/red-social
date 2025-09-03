"use client";

import React, { useEffect, useState } from "react";
import {
  FaMapMarkerAlt,
  FaLink,
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaYoutube,
  FaWhatsapp,
  FaRegNewspaper,
  FaStore,
  FaBriefcase,
  FaCalendarCheck,
  FaRegCommentDots,
  FaPencilAlt,
  FaTimes, // Icono para cerrar el modal
} from "react-icons/fa";
import { Button } from "../button/Button";
import clsx from "clsx";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import { EstadoNegocio, ProductStatus } from "@prisma/client";
import { ProductGridWithSectionFilter } from "../sectonFilterBar/SectionFilterBar";
import Image from "next/image";
import Link from "next/link";
import { SiGooglemaps } from "react-icons/si";
import FeedPublicaciones from "@/publicaciones/componentes/FeedPublicaciones";
import { PublicacionSencilla } from "@/publicaciones/interfaces/publicacionSencilla.interface";
import ServicioViewer from "@/servicios/componentes/ServicioViewer";
import { ServicioData } from "@/servicios/interfaces/servicios.interface";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion"; // Importar para el modal
import { FollowButton } from "@/feed/componentes/FollowButton";

export interface InformacionInicialNegocio {
  nombreNegocio: string;
  slugNegocio: string;
  negocioId: string;
  descripcionNegocio: string;
  telefonoNegocio: string;
  ciudadNegocio: string;
  departamentoNegocio: string;
  direccionNegocio?: string;
  telefonoContacto?: string;
  imagenPerfil?: string;
  imagenPortada?: string;
  sitioWeb?: string;
  urlGoogleMaps?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  latitudNegocio: number;
  longitudNegocio: number;
  categoriaIds: string[];
  seccionesIds: string[];
  estadoNegocio: EstadoNegocio;
  configReservation: boolean;
  configEncuestas: boolean;
}

export interface Product {
  id: string;
  nombre: string;
  precio: number;
  imagenes: string[];
  descripcion: string;
  seccionIds: string[];
  descripcionCorta?: string;
  slug: string;
  tags: string[];
  componentes?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  prioridad?: number;
  status?: ProductStatus;
}

interface Props {
  activeTabComponent: "Publicaciones" | "Productos" | "Negocio";
  productos?: ProductRedSocial[];
  publicaciones?: PublicacionSencilla[];
  informacionNegocio?: InformacionInicialNegocio;
  seccionesProductos?: { id: string; nombre: string; slug: string };
}

export default function PerfilUsuarioHeader({
  productos,
  activeTabComponent,
  informacionNegocio,
  publicaciones,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "Publicaciones" | "Productos" | "Negocio"
  >(activeTabComponent || "Publicaciones");
  const [servicios, setServicios] = useState<ServicioData[]>([]);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false); // Estado para el modal
  const { data: session } = useSession();
  const isNegocio =
    session?.user.negocioSlug === informacionNegocio?.slugNegocio;

  // Manejar cierre del modal con tecla Escape
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isDescriptionModalOpen) {
        setIsDescriptionModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isDescriptionModalOpen]);

  useEffect(() => {
    const fetchServicios = async () => {
      if (activeTab === "Negocio" && informacionNegocio?.slugNegocio) {
        try {
          setLoadingServicios(true);
          const res = await fetch(
            `/api/getServiciosBySlug?slug=${informacionNegocio.slugNegocio}`
          );
          if (!res.ok) throw new Error("Error al obtener servicios");
          const data = await res.json();
          setServicios(data.servicios || []);
        } catch (err) {
          console.error(err);
          setServicios([]);
        } finally {
          setLoadingServicios(false);
        }
      }
    };

    fetchServicios();
  }, [activeTab, informacionNegocio?.slugNegocio]);

  const redes = [
    {
      icon: <FaInstagram aria-label="Instagram" />,
      url: informacionNegocio?.instagram,
      color: "text-pink-600 hover:text-pink-700",
      label: "Instagram",
    },
    {
      icon: <FaFacebook aria-label="Facebook" />,
      url: informacionNegocio?.facebook,
      color: "text-blue-600 hover:text-blue-700",
      label: "Facebook",
    },
    {
      icon: <FaTiktok aria-label="TikTok" />,
      url: informacionNegocio?.tiktok,
      color: "text-gray-900 hover:text-gray-800",
      label: "TikTok",
    },
    {
      icon: <FaYoutube aria-label="YouTube" />,
      url: informacionNegocio?.youtube,
      color: "text-red-600 hover:text-red-700",
      label: "YouTube",
    },
    {
      icon: <FaWhatsapp aria-label="WhatsApp" />,
      url: informacionNegocio?.telefonoContacto,
      color: "text-green-600 hover:text-green-700",
      label: "WhatsApp",
    },
    {
      icon: <SiGooglemaps aria-label="Google Maps" />,
      url: informacionNegocio?.urlGoogleMaps,
      color: "text-rose-600 hover:text-rose-700",
      label: "Google Maps",
    },
  ];

  const tabs: Array<"Publicaciones" | "Productos" | "Negocio"> = [
    "Publicaciones",
    "Productos",
    "Negocio",
  ];

  // Función para truncar la descripción
  const truncateDescription = (description: string, maxLength: number) => {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength).trim() + "...";
  };

  return (
    <div className="w-full bg-white rounded-b-3xl shadow-lg overflow-auto">
      {/* Cover Image */}
      <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 bg-gray-200">
        <Image
          src={
            informacionNegocio?.imagenPortada ||
            "https://picsum.photos/1200/400?random=1"
          }
          alt={`Portada de ${informacionNegocio?.nombreNegocio || "Negocio"}`}
          className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
          width={1200}
          height={400}
          loading="lazy"
          quality={85}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>

        {/* Profile Image */}
        <div className="absolute bottom-[-20px] left-4 sm:left-6 z-10">
          <Image
            src={
              informacionNegocio?.imagenPerfil ||
              "https://picsum.photos/200?random=2"
            }
            alt={`Perfil de ${informacionNegocio?.nombreNegocio || "Negocio"}`}
            className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full border-4 border-white shadow-xl object-cover transition-transform duration-300 hover:scale-105"
            width={160}
            height={160}
            loading="lazy"
            quality={90}
          />
        </div>
      </div>

      {/* Business Information */}
      <div className="pt-8 sm:pt-12 px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6 lg:gap-10">
          {/* Left Column: Business Info */}
          <div className="flex flex-col space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
                {informacionNegocio?.nombreNegocio}
              </h1>
              {isNegocio && (
                <Link href={`/dashboard/editar-perfil`}>
                  <Button
                    className="
                      px-4 py-2 mx-4
                      rounded-full 
                      bg-yellow-400 
                      text-gray-900 
                      font-semibold 
                      text-sm
                      shadow-md 
                      hover:shadow-lg 
                      hover:bg-yellow-500 
                      hover:scale-105 
                      transition-all duration-300 ease-out
                      flex items-center gap-2
                      focus:outline-none focus:ring-2 focus:ring-yellow-300
                    "
                    aria-label="Editar Perfil"
                  >
                    <FaPencilAlt className="text-gray-800 text-base" />
                    Editar Perfil
                  </Button>
                </Link>
              )}
            </div>
            <p className="text-gray-600 text-sm sm:text-base">
              @{informacionNegocio?.slugNegocio}
            </p>

            {/* Business Description with Truncation and Modal Trigger */}
            <div className="flex items-center gap-2">
              <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
                {informacionNegocio?.descripcionNegocio
                  ? truncateDescription(
                      informacionNegocio.descripcionNegocio,
                      200
                    )
                  : "Explora nuestros productos y servicios, diseñados para ofrecerte la mejor experiencia."}
              </p>
              {informacionNegocio?.descripcionNegocio &&
                informacionNegocio.descripcionNegocio.length > 200 && (
                  <button
                    onClick={() => setIsDescriptionModalOpen(true)}
                    className="
        px-3 py-1.5
        text-sm sm:text-base
        font-semibold
        text-blue-600
        rounded-full
        bg-blue-50
        hover:bg-blue-100 hover:text-blue-700
        transition-all duration-200
        shadow-sm hover:shadow-md
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
        active:scale-95
      "
                    aria-label="Ver descripción completa"
                  >
                    Ver más
                  </button>
                )}
            </div>

            {/* Location and Website */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 text-sm sm:text-base text-gray-600">
              <div className="flex items-center gap-2">
                <FaMapMarkerAlt className="text-gray-500" />
                <span>
                  {`${informacionNegocio?.ciudadNegocio}, ${informacionNegocio?.departamentoNegocio}`}
                  {informacionNegocio?.direccionNegocio &&
                    ` - ${informacionNegocio.direccionNegocio}`}
                </span>
              </div>
              {informacionNegocio?.sitioWeb && (
                <Link
                  href={informacionNegocio.sitioWeb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <FaLink />
                  <span className="truncate max-w-xs">
                    {informacionNegocio.sitioWeb}
                  </span>
                </Link>
              )}
            </div>
          </div>

          {/* Right Column: Stats, Follow Button, and Social Links */}
          <div className="flex sm:mt-8 flex-col items-center gap-6">
            <div className="flex items-center gap-4">
              <FollowButton
                followedId={informacionNegocio?.negocioId || ""}
                type="USER_TO_BUSINESS"
                className="mt-2"
              />

              {/* Botón de Solicitar Reserva (condicional, premium y responsive) */}
              {informacionNegocio?.configReservation && (
                <Link
                  href={`/reservas/${informacionNegocio.slugNegocio}`}
                  className="w-full sm:w-auto flex justify-center"
                >
                  <Button
                    variant="outline"
                    className="text-sm sm:text-base px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors duration-200 shadow-sm font-semibold rounded-md flex items-center gap-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    aria-label="Solicitar reserva"
                  >
                    <FaCalendarCheck className="text-xl" />
                    Solicitar Reserva
                  </Button>
                </Link>
              )}

              {/* Botón de Encuesta (condicional, premium y responsive) */}
              {informacionNegocio?.configEncuestas && (
                <Link
                  href={`/encuestas/${informacionNegocio.slugNegocio}`}
                  className="w-full sm:w-auto flex justify-center"
                >
                  <Button
                    variant="outline"
                    className="text-sm sm:text-base px-4 py-2 bg-gray-900 text-white hover:bg-black transition-colors duration-200 shadow-sm font-semibold rounded-md flex items-center gap-2 focus:ring-2 focus:ring-gray-700 focus:outline-none"
                    aria-label="Deja tu opinión"
                  >
                    <FaRegCommentDots className="text-lg" />
                    Evalúanos
                  </Button>
                </Link>
              )}
            </div>

            {/* Social Media Links */}
            <div className="flex justify-around px-2 sm:gap-8 gap-6 pt-2">
              {redes.map(
                ({ icon, url, color, label }, index) =>
                  url?.trim() !== "" && (
                    <Link
                      key={index}
                      href={url || ""}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center group"
                      aria-label={label}
                    >
                      <div
                        className={clsx(
                          "text-3xl transition-transform duration-200 group-hover:scale-110",
                          color
                        )}
                      >
                        {icon}
                      </div>
                      <span className="mt-1 text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
                        {label}
                      </span>
                    </Link>
                  )
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-b border-gray-200 my-6"></div>

        {/* Tabs */}
        <div className="flex justify-center sm:justify-between gap-2 sm:gap-3 border-b border-blue-400 pb-2 px-4 sm:px-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            const icon =
              tab === "Publicaciones" ? (
                <FaRegNewspaper
                  className={clsx(
                    "text-lg",
                    isActive ? "text-blue-600" : "text-gray-500"
                  )}
                />
              ) : tab === "Productos" ? (
                <FaStore
                  className={clsx(
                    "text-lg",
                    isActive ? "text-green-600" : "text-gray-500"
                  )}
                />
              ) : (
                <FaBriefcase
                  className={clsx(
                    "text-lg",
                    isActive ? "text-yellow-600" : "text-gray-500"
                  )}
                />
              );

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  "flex items-center gap-2 py-2 px-4 sm:px-6 rounded-xl transition-all duration-200 font-medium",
                  isActive
                    ? "bg-gray-100 shadow-sm text-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {icon}
                <span>{tab}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="mt-6 transition-opacity duration-300 ease-in-out space-y-6">
          {activeTab === "Publicaciones" && (
            <div className="flex flex-col items-center gap-3 text-gray-700 text-base sm:text-lg">
              <FaRegNewspaper className="text-blue-600 text-xl" />
              {publicaciones && publicaciones.length > 0 ? (
                <FeedPublicaciones
                  publicaciones={publicaciones}
                  widgets={[
                    {
                      id: "widget-1",
                      titulo: "Oferta Especial",
                      contenido: "¡Descubre nuestras promociones!",
                    },
                    {
                      id: "widget-2",
                      titulo: "Publicidad",
                      contenido: "Espacio para anuncios.",
                    },
                  ]}
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base">
                  No hay publicaciones disponibles.
                </p>
              )}
            </div>
          )}
          {activeTab === "Productos" && (
            <div className="flex flex-col items-center gap-4 text-gray-700">
              {!productos || productos.length === 0 ? (
                <p className="text-gray-600 text-sm sm:text-base">
                  No hay productos disponibles.
                </p>
              ) : (
                <ProductGridWithSectionFilter
                  initialProducts={productos}
                  slug={informacionNegocio?.slugNegocio || ""}
                />
              )}
            </div>
          )}

          {/* Información del Negocio */}
          {activeTab === "Negocio" && (
            <div className="flex flex-col gap-4 text-gray-700">
              <h2 className="flex items-center justify-center gap-2 font-semibold text-gray-900 text-lg sm:text-3xl">
                <FaBriefcase className="text-yellow-600 text-xl sm:text-3xl" />
                Servicios del Negocio
              </h2>

              {loadingServicios ? (
                <p className="text-gray-600 text-sm sm:text-base animate-pulse">
                  Cargando servicios, por favor espera...
                </p>
              ) : servicios.length > 0 ? (
                <div className="flex flex-col gap-6">
                  {servicios.map((servicio, idx) => (
                    <ServicioViewer
                      key={servicio.id || idx}
                      servicio={servicio}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-sm sm:text-base">
                  No hay servicios disponibles para este negocio.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal para la descripción completa */}
      <AnimatePresence>
        {isDescriptionModalOpen && informacionNegocio?.descripcionNegocio && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={() => setIsDescriptionModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsDescriptionModalOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200 z-10"
                aria-label="Cerrar modal"
              >
                <FaTimes size={20} />
              </button>
              <div className="p-6 max-h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 text-gray-900">
                  Descripción Completa
                </h2>
                <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
                  {informacionNegocio.descripcionNegocio}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
