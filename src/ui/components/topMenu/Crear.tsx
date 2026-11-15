"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import { inter } from "@/config/fonts";
import styles from "./createModal.module.css";

interface CrearOption {
  nombre: string;
  imagen: string;
  href: string;
}

const opciones: CrearOption[] = [
  {
    nombre: "Nueva Publicación",
    imagen: "/imgs/iconos/crear-publicacion.png",
    href: "/dashboard/crear-publicacion",
  },
  {
    nombre: "Nuevo Servicio",
    imagen: "/imgs/iconos/crear-servicio.png",
    href: "/dashboard/servicios",
  },
  {
    nombre: "Nuevo Producto",
    imagen: "/imgs/iconos/crear-producto.png",
    href: "/dashboard/productos/nuevo_producto",
  },
  {
    nombre: "Nuevo Pedido",
    imagen: "/imgs/iconos/crear-pedido.png",
    href: "/dashboard/orders",
  },
  {
    nombre: "Nueva Transacción",
    imagen: "/imgs/iconos/crear-transaccion.png",
    href: "/dashboard/transacciones",
  },
  {
    nombre: "Crear Encuesta",
    imagen: "/imgs/iconos/crear-encuesta.png",
    href: "/dashboard/encuestas",
  },
  {
    nombre: "Crear Reservas",
    imagen: "/imgs/iconos/crear-reserva.png",
    href: "/dashboard/reservas",
  },
];

interface CrearModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CrearModal = ({ isOpen, onClose }: CrearModalProps) => {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      transitionDuration={reducedMotion ? 0 : 180}
      aria-labelledby="create-content-title"
      sx={{ zIndex: 10010 }}
      PaperProps={{
        sx: {
          m: 1.5,
          width: "calc(100% - 24px)",
          maxHeight: "calc(100dvh - 24px)",
          borderRadius: 3,
          fontFamily: inter.style.fontFamily,
          boxShadow: "0 16px 48px #11182726",
        },
      }}
    >
      <DialogTitle
        component="h2"
        id="create-content-title"
        sx={{
          pr: 8,
          fontFamily: "inherit",
          fontSize: { xs: 20, sm: 24 },
          fontWeight: 650,
          color: "#292c32",
          flexShrink: 0,
        }}
      >
        ¿Qué deseas crear?
      </DialogTitle>
      <IconButton
        onClick={onClose}
        aria-label="Cerrar Crear"
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
          width: 44,
          height: 44,
          color: "#4b5563",
          "&:focus-visible": { outline: "2px solid #C93545" },
        }}
      >
        <X size={21} />
      </IconButton>
      <DialogContent sx={{ minHeight: 0, overflowY: "auto", p: 2, pt: 1 }}>
        <div className={styles.grid}>
          {opciones.map((opcion) => (
            <Link
              key={opcion.href}
              href={opcion.href}
              onClick={onClose}
              className={styles.option}
            >
              <span className={styles.icon}>
                <Image
                  src={opcion.imagen}
                  alt=""
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </span>
              <span>{opcion.nombre}</span>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
