"use client";

import React, { useState } from "react";
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
} from "react-icons/fa";
import { Button } from "../button/Button";
import clsx from "clsx";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import { EstadoNegocio, ProductStatus } from "@prisma/client";
import { ProductGridWithSectionFilter } from "../sectonFilterBar/SectionFilterBar";
import Image from "next/image";
import Link from "next/link";
import { SiGooglemaps } from "react-icons/si";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import FeedPublicaciones from "@/publicaciones/componentes/FeedPublicaciones";


export interface InformacionInicialNegocio {
  nombreNegocio: string;
  slugNegocio: string;
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
  publicaciones?: EnhancedPublicacion[];
  informacionNegocio?: InformacionInicialNegocio;
  seccionesProductos?: { id: string; nombre: string; slug: string };
}

export default function PerfilUsuarioHeader({
  productos,
  activeTabComponent,
  informacionNegocio,
  publicaciones,
}: Props) {
  const [activeTab, setActiveTab] = useState<"Publicaciones" | "Productos" | "Negocio">(
    activeTabComponent || "Publicaciones"
  );

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

  return (
    <div className="w-full bg-white rounded-b-3xl shadow-lg overflow-hidden">
      {/* Cover Image */}
      <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 bg-gray-200">
        <Image
          src={informacionNegocio?.imagenPortada || "https://picsum.photos/1200/400?random=1"}
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
            src={informacionNegocio?.imagenPerfil || "https://picsum.photos/200?random=2"}
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
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              {informacionNegocio?.nombreNegocio}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">@{informacionNegocio?.slugNegocio}</p>

            {/* Business Description */}
            <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
              {informacionNegocio?.descripcionNegocio ||
                "Explora nuestros productos y servicios, diseñados para ofrecerte la mejor experiencia."}
            </p>

            {/* Location and Website */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 text-sm sm:text-base text-gray-600">
              <div className="flex items-center gap-2">
                <FaMapMarkerAlt className="text-gray-500" />
                <span>
                  {`${informacionNegocio?.ciudadNegocio}, ${informacionNegocio?.departamentoNegocio}`}
                  {informacionNegocio?.direccionNegocio && ` - ${informacionNegocio.direccionNegocio}`}
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
                  <span className="truncate max-w-xs">{informacionNegocio.sitioWeb}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Right Column: Stats, Follow Button, and Social Links */}
          <div className="flex sm:mt-8 flex-col items-center gap-6">
            {/* Statistics */}
            <div className="flex justify-around gap-6 sm:gap-8 text-center">
              <div>
                <p className="font-semibold text-lg text-gray-900">235</p>
                <p className="text-gray-600 text-sm">Publicaciones</p>
              </div>
              <div>
                <p className="font-semibold text-lg text-gray-900">4.1K</p>
                <p className="text-gray-600 text-sm">Seguidores</p>
              </div>
              <div>
                <p className="font-semibold text-lg text-gray-900">180</p>
                <p className="text-gray-600 text-sm">Siguiendo</p>
              </div>
              <div className="mt-0p-1">
                <Button
                  variant="outline"
                  className="text-sm sm:text-base px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  aria-label="Seguir negocio"
                >
                  Seguir
                </Button>
              </div>
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
            const icon = tab === "Publicaciones" ? (
              <FaRegNewspaper className={clsx("text-lg", isActive ? "text-blue-600" : "text-gray-500")} />
            ) : tab === "Productos" ? (
              <FaStore className={clsx("text-lg", isActive ? "text-green-600" : "text-gray-500")} />
            ) : (
              <FaBriefcase className={clsx("text-lg", isActive ? "text-yellow-600" : "text-gray-500")} />
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
              {/* {publicaciones?.length ? (
                publicaciones.map((pub) => (
                  <ShowTestimonioPublicacion key={pub.id} publicacion={pub} />
                ))
              ) : (
                <p>No hay publicaciones.</p>
              )} */}
              {publicaciones && publicaciones.length > 0 ? (
      <FeedPublicaciones
        publicaciones={publicaciones}
        
        widgets={[
          { id: "widget-1", titulo: "Oferta Especial", contenido: "¡Descubre nuestras promociones!" },
          { id: "widget-2", titulo: "Publicidad", contenido: "Espacio para anuncios." },
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
                <ProductGridWithSectionFilter products={productos} />
              )}
            </div>
          )}
          {activeTab === "Negocio" && (
            <div className="flex flex-col gap-4 text-gray-700">
              <div className="flex items-center gap-3 text-base sm:text-lg">
                <FaBriefcase className="text-yellow-600 text-xl" />
                <h2 className="font-semibold text-gray-900">Sobre el Negocio</h2>
              </div>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                {informacionNegocio?.descripcionNegocio ||
                  "No hay descripción disponible para este negocio."}
              </p>
              {informacionNegocio?.telefonoNegocio && (
                <p className="text-gray-600 text-sm sm:text-base">
                  <strong>Teléfono:</strong> {informacionNegocio.telefonoNegocio}
                </p>
              )}
              {informacionNegocio?.urlGoogleMaps && (
                <Link
                  href={informacionNegocio.urlGoogleMaps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <SiGooglemaps className="text-xl" />
                  <span>Ver en Google Maps</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}