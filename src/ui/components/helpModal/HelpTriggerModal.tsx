"use client";

import { useState } from "react";
import { HelpCircle, PlayCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils"; // opcional, o usa clsx directamente

type Variant = "primary" | "info" | "success" | "dark" | "outline" | "ghost" | "danger" | "warning" | "warningSolid" | "dangerSolid";
type Size = "sm" | "md" | "lg";

interface HelpTriggerModalProps {
    text?: string;
    title: string;
    youtubeUrl?: string;
    content?: React.ReactNode;
    variant?: Variant;
    size?: Size;
    icon?: "help" | "play";
    iconLeft?: boolean;
    className?: string;
}

export const HelpTriggerModal = ({
    text = "¿Necesitas ayuda?",
    title,
    youtubeUrl,
    content,
    variant = "info",
    size = "md",
    icon = "help",
    iconLeft = true,
    className,
}: HelpTriggerModalProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const IconComponent = icon === "play" ? PlayCircle : HelpCircle;

    const buttonBase = "inline-flex items-center gap-2 font-medium rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-30 disabled:opacity-50";

    const variants = {
        primary: "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500 shadow-lg hover:shadow-xl",
        info: "bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-400 border border-blue-200",
        success: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-400 border border-emerald-200",
        dark: "bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-700 shadow-lg",
        outline: "border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-400",
        ghost: "text-gray-600 hover:bg-gray-100 focus:ring-gray-400",
        warning: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 focus:ring-yellow-400 border border-yellow-200",
        danger: "bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-400 border border-red-200",
        warningSolid: "bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400 shadow-lg",
        dangerSolid: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-lg",
    };

    const sizes = {
        sm: "px-4 py-2 text-sm",
        md: "px-5 py-2.5 text-base",
        lg: "px-6 py-3 text-lg",
    };

    const iconSizes = {
        sm: "w-4 h-4",
        md: "w-5 h-5",
        lg: "w-6 h-6",
    };

    return (
        <>
            {/* Botón */}
            <button
                onClick={() => setIsOpen(true)}
                className={cn(
                    buttonBase,
                    variants[variant],
                    sizes[size],
                    "font-medium tracking-tight",
                    className
                )}
            >
                {iconLeft && <IconComponent className={iconSizes[size]} />}
                <span>{text}</span>
                {!iconLeft && <IconComponent className={iconSizes[size]} />}
            </button>

            {/* Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overscroll-contain"
                        // Wrapper para capturar eventos globales (ESC y scroll)
                        onClick={() => setIsOpen(false)} // Cierre global por blur
                        onKeyDown={(e) => {
                            if (e.key === "Escape") setIsOpen(false);
                        }}
                    >
                        {/* Backdrop con blur */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
                        // No necesita onClick aquí, se hereda del wrapper
                        />

                        {/* Contenido del modal - Bloquea propagación de clics */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative z-[9999] w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden bg-white rounded-2xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()} // ¡Clave! Evita cierre accidental
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
                                <h2 className="text-2xl font-bold text-gray-900 text-center">{title}</h2>
                                <button
  onClick={() => setIsOpen(false)}
  aria-label="Cerrar"
  className="
    group relative p-2 rounded-full 
    bg-gradient-to-br from-red-500 to-red-700 
    shadow-[0_4px_12px_rgba(0,0,0,0.25)] 
    hover:shadow-[0_6px_18px_rgba(0,0,0,0.35)]
    transition-all duration-300 
    hover:-translate-y-0.5 active:translate-y-0 
    border border-red-300/40
  "
>
  {/* Brillo superior */}
  <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-30 transition-opacity"></span>

  {/* Icono */}
  <X className="w-6 h-6 text-white drop-shadow-sm" />
</button>

                            </div>

                            {/* Body - Responsive para mobile */}
                            <div className="flex-1 overflow-y-auto bg-gray-50 p-6 min-h-0">
                                {youtubeUrl ? (
                                    <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden shadow-xl bg-black mb-4">
                                        <iframe
                                            src={`${youtubeUrl}?autoplay=1&rel=0&controls=1&playsinline=1`}
                                            title={title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen
                                            // 👈 CORRECCIÓN: Agregamos z-10 para asegurar que el iframe esté arriba
                                            className="absolute top-0 left-0 w-full h-full border-0 z-10000000"
                                        />
                                    </div>
                                ) : content ? (
                                    <div className="prose prose-lg max-w-none text-gray-700">
                                        {content}
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-500 py-16">
                                        No hay contenido de ayuda disponible.
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};