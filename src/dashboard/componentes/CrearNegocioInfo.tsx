"use client";

import React from "react";
import Link from "next/link";
import {
    Box,
    Button,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import { styled } from "@mui/system";
import { motion } from "framer-motion";
import {
    StorefrontOutlined as StoreIcon,
    SpeedOutlined as QuickIcon,
    GroupOutlined as CommunityIcon,
    StarOutlined as ReviewIcon,
    QrCodeOutlined as QrIcon,
    MonetizationOnOutlined as MonetizeIcon,
    EventSeat,
    LibraryBooks,
    Poll,
} from "@mui/icons-material";
import Image from "next/image";

// Estilos premium: contenedor responsive con sombras suaves, usando @media puro
const StyledContainer = styled(Box)({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: "20px",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "12px", // 👈 menos padding por defecto (móvil)
    "@media (min-width: 900px)": {
        flexDirection: "row",
        padding: "0", // 👈 en desktop ya no necesitas margen interno
    },
});

const ImageContainer = styled(Box)({
    width: "100%",
    height: "auto",
    "@media (max-width: 899px)": {
        maxHeight: "240px", // límite en móviles
        overflow: "hidden",
    },
    "@media (min-width: 900px)": {
        width: "50%",
        padding: "12px",
    },
});

const ContentContainer = styled(Box)({
    width: "100%",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    "@media (min-width: 900px)": {
        width: "50%",
        padding: "24px",
        alignItems: "flex-start",
        textAlign: "left",
    },
});

const StyledButton = styled(Button)({
    borderRadius: "50px", // Bordes redondeados premium
    padding: "12px 32px",
    fontSize: "1rem",
    fontWeight: 600,
    textTransform: "none",
    backgroundColor: "#4CAF50", // Verde premium para CTA
    color: "#FFFFFF",
    boxShadow: "0 4px 12px rgba(76, 175, 80, 0.25)", // Sombra verde sutil
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    "&:hover": {
        transform: "scale(1.05)",
        boxShadow: "0 6px 16px rgba(76, 175, 80, 0.35)",
        backgroundColor: "#43A047",
    },
});

const StyledList = styled(List)({
    width: "100%",
    marginTop: "4px",
    marginBottom: "6px",
});

interface Props {
    userId: string; // ID del usuario de la sesión, pasado del padre
}

const CrearNegocioInfo: React.FC<Props> = ({ userId }) => {
    const benefits = [
        { icon: <QuickIcon color="success" />, text: "Crea tu tienda en minutos sin conocimientos técnicos." }, // Verde para velocidad y frescura
        { icon: <StoreIcon color="info" />, text: "Gestiona productos con catálogos estructurados y secciones personalizadas." }, // Azul claro para organización informativa
        { icon: <CommunityIcon color="secondary" />, text: "Interactúa con clientes a través de publicaciones, likes y comentarios." }, // Púrpura para comunidad creativa
        { icon: <ReviewIcon color="warning" />, text: "Recibe reseñas multimedia para construir reputación verificable." }, // Naranja para atención en calificaciones
        { icon: <QrIcon color="error" />, text: "Genera QR codes y comparte rápidamente tus productos y servicios." }, // Rojo para acción rápida y destacada
        { icon: <EventSeat color="info" />, text: "Crea un módulo de reservas para recibir, gestionar y modificar citas de manera eficiente." }, // Azul claro para planificación calmada
        { icon: <MonetizeIcon color="warning" />, text: "Administra tu contabilidad con un módulo de transacciones que maneja ingresos, gastos, balances y reportes por tipo de cuentas." }, // Naranja para control financiero dinámico
        { icon: <LibraryBooks color="secondary" />, text: "Recibe y administra pedidos en un módulo dedicado, con seguimiento y actualizaciones en tiempo real." }, // Púrpura para procesos interactivos
        { icon: <Poll color="error" />, text: "Crea encuestas personalizadas para que los clientes califiquen y opinen sobre tu negocio, impulsando mejoras continuas." }, // Rojo para feedback activo y urgente
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <StyledContainer className="px-2 md:px-6 lg:px-8">
                {/* Imagen representativa */}
                <ImageContainer>
                    <Image
                        src="/imgs/crear-negocio.png"
                        alt="Crea tu negocio"
                        width={800}      // puedes ajustar el valor según la imagen real
                        height={400}
                        className="w-full h-auto rounded-2xl shadow-lg"
                        style={{ objectFit: "cover" }}
                    />
                </ImageContainer>

                {/* Contenido: Título, Botón inicial, Lista, Botón final */}
                <ContentContainer>
                    <Box className="w-full flex justify-center ">
                        <h2 className="text-3xl font-bold mb-2  text-[#333]" style={{ letterSpacing: "-0.5px" }}>
                            Comienza a crear tu negocio
                        </h2>
                    </Box>
                    {/* Botón inicial */}
                    {/* <Link href={`/crear_negocio/${userId}`} passHref>
                        <StyledButton variant="contained">Crear Negocio</StyledButton>
                    </Link> */}

                    {/* Lista de beneficios */}
                    <StyledList className="flex flex-col gap-1">
                        {benefits.map((benefit, index) => (
                            <ListItem key={index} disablePadding>
                                <ListItemIcon>{benefit.icon}</ListItemIcon>
                                <ListItemText
                                    primary={benefit.text}
                                    primaryTypographyProps={{
                                        variant: "body1",
                                        color: "textPrimary",
                                        fontWeight: 500,
                                    }}
                                />
                            </ListItem>
                        ))}
                    </StyledList>
                    <Box className="w-full flex justify-center ">
                        {/* Botón final */}
                        <Link href={`/crear_negocio/${userId}`} passHref>
                            <StyledButton variant="contained">Crear Negocio</StyledButton>
                        </Link>
                    </Box>

                </ContentContainer>
            </StyledContainer>
        </motion.div>
    );
};

export default CrearNegocioInfo;