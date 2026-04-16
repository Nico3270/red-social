"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  FaTimes,
  FaHome,
  FaStar,
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
import ServicioViewer from "@/servicios/componentes/ServicioViewer";
import ResenaProductoCard from "@/resenas/componentes/ResenaProductoCard";
import { ServicioData } from "@/servicios/interfaces/servicios.interface";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { FollowButton } from "@/feed/componentes/FollowButton";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import { ResumenPerfil } from "@/perfil/interfaces/resumenPerfil.interface";
import LandingPage from "@/perfil/componentes/ PerfilLanding";
import type {
  BusinessGuideResolvedPreset,
  ProductGuideExploreContext,
} from "@/perfil/guide/business-guide.types";


interface TabErrorBoundaryState {
  hasError: boolean;
}

class TabErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  TabErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): TabErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error en tab de PerfilUsuarioHeader:", error, errorInfo);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

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
  activeTabComponent: "Inicio" | "Publicaciones" | "Productos" | "Negocio" | "Reseñas";
  productos?: ProductRedSocial[];
  publicaciones?: EnhancedPublicacion[];
  informacionNegocio?: InformacionInicialNegocio;
  seccionesProductos?: { id: string; nombre: string; slug: string };
  resumenPerfil?: ResumenPerfil;
  resenas?: EnhancedPublicacion[]; // Añadido
  servicios?: ServicioData[]; // Añadido
}

export default function PerfilUsuarioHeader({
  productos = [],
  publicaciones = [],
  activeTabComponent,
  informacionNegocio,
  resumenPerfil,
}: Props) {
  const [activeTab, setActiveTab] = useState<"Inicio" | "Publicaciones" | "Productos" | "Negocio" | "Reseñas">(
    activeTabComponent || "Inicio"
  );
  const [servicios, setServicios] = useState<ServicioData[]>([]);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [productGuideContext, setProductGuideContext] = useState<ProductGuideExploreContext | null>(null);
  const { data: session } = useSession();
  const isNegocio = session?.user.negocioSlug === informacionNegocio?.slugNegocio;

  // Filtrar reseñas de publicaciones
  const resenas = useMemo(() => {
    return publicaciones.filter(pub => pub.tipo === 'TESTIMONIO' && pub.producto);
  }, [publicaciones]);

  const handleExploreGuideProducts = (selection: BusinessGuideResolvedPreset) => {
    setProductGuideContext(selection.exploreContext);
    setActiveTab("Productos");
  };

  // Manejo de escape en modal
  useEffect(() => {
    if (isDescriptionModalOpen) {
      const modalElement = document.querySelector('[role="dialog"]');
      if (modalElement) {
        (modalElement as HTMLElement).focus();
      }
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isDescriptionModalOpen) {
        setIsDescriptionModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isDescriptionModalOpen]);

  // Fetch servicios
  useEffect(() => {
    const fetchServicios = async () => {
      if (informacionNegocio?.slugNegocio) {
        try {
          setLoadingServicios(true);
          const res = await fetch(`/api/getServiciosBySlug?slug=${informacionNegocio.slugNegocio}`);
          if (!res.ok) throw new Error("Error al obtener servicios");
          const data = await res.json();
          setServicios(data.servicios || []);
        } catch (err) {
          console.error("Error fetching servicios:", err);
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

  const visibleRedes = redes.filter(({ url }) => url?.trim() !== "");

  const tabStyles: Record<
    "Inicio" | "Publicaciones" | "Productos" | "Negocio" | "Reseñas",
    {
      active: string;
      inactive: string;
      iconActive: string;
      iconInactive: string;
      underlineActive: string;
      underlineInactive: string;
    }
  > = {
    Inicio: {
      active:
        "scale-[1.02] border-slate-900 bg-slate-900 text-white shadow-[0_12px_26px_rgba(15,23,42,0.18)]",
      inactive:
        "border-slate-200 bg-white text-slate-600 shadow-[0_4px_14px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
      iconActive: "text-amber-200",
      iconInactive: "text-slate-400 group-hover:text-slate-700",
      underlineActive: "bg-white/70",
      underlineInactive: "bg-slate-200/90 group-hover:bg-slate-300",
    },
    Publicaciones: {
      active:
        "scale-[1.02] border-sky-300 bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(219,234,254,0.98))] text-sky-900 shadow-[0_12px_26px_rgba(59,130,246,0.16)]",
      inactive:
        "border-sky-100 bg-white text-slate-600 shadow-[0_4px_14px_rgba(15,23,42,0.06)] hover:border-sky-200 hover:bg-sky-50/70 hover:text-sky-900",
      iconActive: "text-sky-600",
      iconInactive: "text-sky-400 group-hover:text-sky-600",
      underlineActive: "bg-sky-500/80",
      underlineInactive: "bg-sky-200/90 group-hover:bg-sky-300",
    },
    Productos: {
      active:
        "scale-[1.02] border-amber-300 bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(253,230,138,0.96))] text-amber-950 shadow-[0_12px_26px_rgba(245,158,11,0.18)]",
      inactive:
        "border-amber-100 bg-white text-slate-600 shadow-[0_4px_14px_rgba(15,23,42,0.06)] hover:border-amber-200 hover:bg-amber-50/80 hover:text-amber-900",
      iconActive: "text-amber-600",
      iconInactive: "text-amber-400 group-hover:text-amber-600",
      underlineActive: "bg-amber-500/80",
      underlineInactive: "bg-amber-200/90 group-hover:bg-amber-300",
    },
    Negocio: {
      active:
        "scale-[1.02] border-emerald-300 bg-[linear-gradient(135deg,rgba(236,253,245,0.98),rgba(209,250,229,0.98))] text-emerald-950 shadow-[0_12px_26px_rgba(16,185,129,0.16)]",
      inactive:
        "border-emerald-100 bg-white text-slate-600 shadow-[0_4px_14px_rgba(15,23,42,0.06)] hover:border-emerald-200 hover:bg-emerald-50/80 hover:text-emerald-900",
      iconActive: "text-emerald-600",
      iconInactive: "text-emerald-400 group-hover:text-emerald-600",
      underlineActive: "bg-emerald-500/80",
      underlineInactive: "bg-emerald-200/90 group-hover:bg-emerald-300",
    },
    Reseñas: {
      active:
        "scale-[1.02] border-violet-300 bg-[linear-gradient(135deg,rgba(245,243,255,0.98),rgba(237,233,254,0.98))] text-violet-950 shadow-[0_12px_26px_rgba(124,58,237,0.16)]",
      inactive:
        "border-violet-100 bg-white text-slate-600 shadow-[0_4px_14px_rgba(15,23,42,0.06)] hover:border-violet-200 hover:bg-violet-50/80 hover:text-violet-900",
      iconActive: "text-violet-600",
      iconInactive: "text-violet-400 group-hover:text-violet-600",
      underlineActive: "bg-violet-500/80",
      underlineInactive: "bg-violet-200/90 group-hover:bg-violet-300",
    },
  };

  // Pestañas dinámicas basadas en resumenPerfil
  const tabs = [
    { name: "Inicio", isActive: true },
    { name: "Publicaciones", isActive: (resumenPerfil?.publicaciones ?? 0) > 0 },
    { name: "Productos", isActive: (resumenPerfil?.productos ?? 0) > 0 },
    { name: "Negocio", isActive: (resumenPerfil?.servicios ?? 0) > 0 },
    { name: "Reseñas", isActive: (resumenPerfil?.reseñas ?? 0) > 0 },
  ].filter(tab => tab.isActive) as Array<{
    name: "Inicio" | "Publicaciones" | "Productos" | "Negocio" | "Reseñas";
    isActive: boolean;
  }>;

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
          <div className="flex w-full flex-col items-stretch gap-4 sm:mt-8 sm:w-auto sm:items-center sm:gap-6">
            <div className="flex w-full items-center justify-start gap-2 overflow-x-auto pb-1 sm:w-auto sm:justify-center sm:gap-3">
              <FollowButton
                followedId={informacionNegocio?.negocioId || ""}
                type="USER_TO_BUSINESS"
                className="mt-0 shrink-0"
              />

              {/* Botón de Solicitar Reserva */}
              {informacionNegocio?.configReservation && (
                <Link
                  href={`/reservas/${informacionNegocio.slugNegocio}`}
                  className="flex shrink-0 justify-center"
                >
                  <Button
                    variant="outline"
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm"
                    aria-label="Solicitar reserva"
                  >
                    <FaCalendarCheck className="text-base" />
                    Solicitar Reserva
                  </Button>
                </Link>
              )}

              {/* Botón de Encuesta */}
              {informacionNegocio?.configEncuestas && (
                <Link
                  href={`/encuestas/${informacionNegocio.slugNegocio}`}
                  className="flex shrink-0 justify-center"
                >
                  <Button
                    variant="outline"
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-700 sm:text-sm"
                    aria-label="Deja tu opinión"
                  >
                    <FaRegCommentDots className="text-base" />
                    Evalúanos
                  </Button>
                </Link>
              )}
            </div>

            {/* Social Media Links */}
            {visibleRedes.length > 0 && (
              <div className="flex w-full items-start justify-between gap-1.5 overflow-x-auto px-0.5 pt-0 pb-1 sm:w-auto sm:justify-center sm:gap-4 sm:px-1">
                {visibleRedes.map(
                  ({ icon, url, color, label }, index) => (
                    <Link
                      key={index}
                      href={url || ""}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex min-w-0 flex-1 flex-col items-center text-center sm:w-auto sm:flex-none"
                      aria-label={label}
                    >
                      <div
                        className={clsx(
                          "flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[1.5rem] shadow-[0_6px_18px_rgba(15,23,42,0.08)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:scale-[1.03] group-hover:border-slate-300 group-hover:shadow-[0_10px_24px_rgba(15,23,42,0.12)] sm:h-11 sm:w-11 sm:text-[1.65rem]",
                          color
                        )}
                      >
                        {icon}
                      </div>
                      <span className="mt-1.5 max-w-full text-[10px] leading-3.5 text-gray-500 transition-colors group-hover:text-gray-700 sm:text-xs sm:leading-4">
                        {label}
                      </span>
                    </Link>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Divider
        <div className="my-4 border-b border-gray-200 sm:my-6"></div> */}

        {/* Tabs */}
        <div className="mt-1 flex justify-start gap-2 overflow-x-auto whitespace-nowrap rounded-[22px] border border-slate-200/90 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-1.5 py-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-md sm:justify-between sm:gap-3 sm:px-3 sm:py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            const theme = tabStyles[tab.name];
            const icon =
              tab.name === "Inicio" ? (
                <FaHome
                  className={clsx(
                    "text-lg",
                    isActive ? theme.iconActive : theme.iconInactive
                  )}
                />
              ) : tab.name === "Publicaciones" ? (
                <FaRegNewspaper
                  className={clsx(
                    "text-lg",
                    isActive ? theme.iconActive : theme.iconInactive
                  )}
                />
              ) : tab.name === "Productos" ? (
                <FaStore
                  className={clsx(
                    "text-lg",
                    isActive ? theme.iconActive : theme.iconInactive
                  )}
                />
              ) : tab.name === "Negocio" ? (
                <FaBriefcase
                  className={clsx(
                    "text-lg",
                    isActive ? theme.iconActive : theme.iconInactive
                  )}
                />
              ) : (
                <FaStar
                  className={clsx(
                    "text-lg",
                    isActive ? theme.iconActive : theme.iconInactive
                  )}
                />
              );

            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={clsx(
                  "relative group flex min-w-max shrink-0 items-center gap-2 rounded-[16px] border px-4 py-2 text-sm font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 sm:px-6 sm:text-base",
                  isActive
                    ? theme.active
                    : theme.inactive
                )}
                aria-current={isActive ? "page" : undefined}
                aria-expanded={isActive}
              >
                {icon}
                <span>{tab.name}</span>

                <span
                  className={clsx(
                    "absolute bottom-1 left-1/2 h-[3px] -translate-x-1/2 rounded-full transition-all duration-300",
                    isActive
                      ? `w-2/3 ${theme.underlineActive}`
                      : `w-8 ${theme.underlineInactive} group-hover:w-10`
                  )}
                ></span>
              </button>
            );
          })}
        </div>


        {/* Tab Content */}
        <div className="mt-4 space-y-6 transition-opacity duration-300 ease-in-out sm:mt-6">
          {activeTab === "Inicio" && (
            <LandingPage
              informacionNegocio={informacionNegocio!}
              productos={productos}
              publicaciones={publicaciones || []} // Fallback para tipos opcionales
              resenas={resenas}
              servicios={servicios}
              resumenPerfil={resumenPerfil!}
              onSelectTab={setActiveTab}
              onExploreProducts={handleExploreGuideProducts}
            />
          )}
          {activeTab === "Publicaciones" && (
            <div className="flex flex-col items-center gap-3 text-gray-700 text-base sm:text-lg">
              <TabErrorBoundary fallback={
                <div className="text-center text-gray-500 p-8 rounded-lg bg-gray-50">
                  <p className="mb-2">Error al cargar publicaciones.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Recargar página
                  </button>
                </div>
              }>
                {publicaciones && publicaciones.length > 0 ? (
                  <FeedPublicaciones publicaciones={publicaciones} />
                ) : (
                  <div className="flex flex-col items-center justify-center pb-8 ">
                    <p className="text-center text-gray-800 font-bold mb-2 text-lg">
                      No hay publicaciones disponibles.
                    </p>
                    <Image
                      src="/imgs/no_publicaciones.png"
                      alt="No hay publicaciones disponibles"
                      width={500}
                      height={500}
                      className="max-w-xs md:max-w-md lg:max-w-lg w-full h-auto object-contain mb-4"
                      loading="lazy"
                  
                    />

                  </div>
                )}
              </TabErrorBoundary>
            </div>
          )}
          {activeTab === "Productos" && (
            <div className="flex flex-col items-center gap-4 text-gray-700">
              {!productos || productos.length === 0 ? (
                <div className="flex flex-col items-center justify-center pb-8 ">
                  <p className="text-center text-gray-800 font-bold mb-2 text-lg">
                    No hay productos disponibles.
                  </p>
                  <Image
                    src="/imgs/no_productos.png"
                    alt="No hay productos disponibles"
                    width={500}
                    height={500}
                    className="max-w-xs md:max-w-md lg:max-w-lg w-full h-auto object-contain mb-4"
                    loading="lazy"
               
                  />

                </div>
              ) : (
                <ProductGridWithSectionFilter
                  initialProducts={productos}
                  slug={informacionNegocio?.slugNegocio || ""}
                  guideContext={productGuideContext}
                />
              )}
            </div>
          )}
          {activeTab === "Negocio" && (
            <div className="flex flex-col gap-4 text-gray-700">
              <h2 className="flex items-center justify-center gap-2 font-semibold text-gray-900 text-lg sm:text-3xl">
                <FaBriefcase className="text-yellow-600 text-xl sm:text-3xl" />
                Servicios del Negocio
              </h2>

              {loadingServicios ? (
                <div className="animate-pulse space-y-4">  {/* Skeleton moderno: shimmer para perceived speed */}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-gray-200 rounded-lg h-32 p-4 flex items-center">
                      <div className="flex-1 h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="w-16 h-16 bg-gray-300 rounded-full ml-4"></div>
                    </div>
                  ))}
                </div>
              ) : servicios.length > 0 ? (
                <div className="flex flex-col gap-6">
                  {servicios.map((servicio, idx) => (
                    <ServicioViewer key={servicio.id || idx} servicio={servicio} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pb-8 ">
                  <p className="text-center text-gray-800 font-bold mb-2 text-lg">
                    No hay servicios disponibles para este negocio.
                  </p>
                  <Image
                    src="/imgs/no_servicios.png"
                    alt="No hay servicios disponibles"
                    width={500}
                    height={500}
                    className="max-w-xs md:max-w-md lg:max-w-lg w-full h-auto object-contain mb-4"
                    loading="lazy"
                  
                  />

                </div>
              )}
            </div>
          )}
          {activeTab === "Reseñas" && (
            <div className="flex flex-col gap-4 text-gray-700">
              <h2 className="flex items-center justify-center gap-2 font-semibold text-gray-900 text-lg sm:text-3xl">
                <FaStar className="text-indigo-600 text-xl sm:text-3xl" />
                Reseñas del Negocio
              </h2>

              {resenas.length > 0 ? (
                <div
                  className="
          grid 
          grid-cols-1           /* 🟢 1 por fila en móviles */
          sm:grid-cols-2        /* 🟢 2 por fila en pantallas medianas */
          lg:grid-cols-3        /* 🟢 4 por fila en pantallas grandes */
          gap-6                 /* Espaciado entre tarjetas */
          px-2 sm:px-4 md:px-8  /* Margen lateral adaptable */
        "
                >
                  {resenas.map((resena, idx) => (
                    <ResenaProductoCard key={resena.id || idx} publicacion={resena} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pb-8">
                  <p className="text-center text-gray-800 font-bold mb-2 text-lg">
                    No hay reseñas disponibles para este negocio.
                  </p>
                  <Image
                    src="/imgs/no_resenas.png"
                    alt="No hay reseñas disponibles"
                    width={500}
                    height={500}
                    className="max-w-xs md:max-w-md lg:max-w-lg w-full h-auto object-contain mb-4"
                    loading="lazy"
                    
                  />
                </div>
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
              role="dialog"
              aria-modal="true"
              aria-labelledby="description-title"
            >
              <button
                onClick={() => setIsDescriptionModalOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200 z-10"
                aria-label="Cerrar modal"
              >
                <FaTimes size={20} />
              </button>
              <div className="p-6 max-h-[80vh] overflow-y-auto">
                <h2 id="description-title" className="text-xl font-bold mb-4 text-gray-900">
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
