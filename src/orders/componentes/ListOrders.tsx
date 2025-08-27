"use client";

import React, { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Box,
    Typography,
    Button,
    CircularProgress,
} from "@mui/material";
import { AiOutlineEye, AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";
import { Orders } from "../actions/getOrders";
import ShowOrderInformation from "./ShowOrderInformation"; // Ajusta la importación según la ubicación del componente
import DeleteOrderById from "./DeleteOrderById";
import EditOrderModal from "./EditOrderModal"; // Ajusta la importación según la ubicación del componente

interface ListOrdersProps {
    initialOrders: Orders[];
    total: number;
}

const ListOrders: React.FC<ListOrdersProps> = ({ initialOrders, total }) => {
    const [orders, setOrders] = useState<Orders[]>(initialOrders);
    const [page, setPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [currentTotal, setCurrentTotal] = useState(total); // Nuevo: total en estado para actualizarlo localmente
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [deletedOrderId, setDeleteOrderId] = useState<string | null>(null);
    const [editedOrderId, setEditedOrderId] = useState<string | null>(null);
    const limit = 10; // Coincide con el límite inicial de la server action
    const hasMore = orders.length < currentTotal; // Usar currentTotal para verificar si hay más

    const loadMoreOrders = async () => {
        setIsLoadingMore(true);
        try {
            const response = await fetch(`/api/orders?page=${page + 1}&limit=${limit}`);
            const data = await response.json();
            if (data.ok) {
                setOrders((prev) => [...prev, ...data.ordenes]);
                setPage((prev) => prev + 1);
                if (data.total !== undefined) {
                    setCurrentTotal(data.total); // Actualiza total con el valor fresco del servidor (asumiendo que la API lo devuelve)
                }
            }
        } catch (error) {
            console.error("Error al cargar más órdenes:", error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Nueva función callback para manejar la eliminación local
    const handleOrderDeleted = (deletedId: string) => {
        setOrders((prev) => prev.filter((order) => order.id !== deletedId));
        setCurrentTotal((prev) => prev - 1); // Decrementa total localmente
    };

    // Nueva función callback para manejar la actualización local optimista
    const handleOrderUpdated = (updatedOrder: Partial<Orders> & { id: string }) => {
        setOrders((prev) =>
            prev.map((order) =>
                order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
            )
        );
    };

    // Función para formatear fecha local
    const formatDate = (date: Date) => {
        return new Date(date).toLocaleString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    };

    // Función para generar descripción concatenada
    const getDescription = (items: Orders["items"]) => {
        return items
            .map((item) => `${item.quantity} ${item.description}`)
            .join(", ") || "Sin items";
    };

    return (
        <Box sx={{ maxWidth: "100%", overflowX: "auto", mt: 4 }}>
            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid rgba(0,0,0,0.1)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    bgcolor: "background.paper",
                }}
            >
                <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell
                                sx={{
                                    bgcolor: "grey.800",
                                    color: "white",
                                    fontWeight: 600,
                                    fontSize: "0.875rem",
                                    letterSpacing: "0.02em",
                                    py: 2,
                                    px: 3,
                                    borderRight: "1px solid rgba(255,255,255,0.1)",
                                    "&:last-child": { borderRight: "none" },
                                }}
                            >
                                Fecha
                            </TableCell>
                            <TableCell
                                sx={{
                                    bgcolor: "grey.800",
                                    color: "white",
                                    fontWeight: 600,
                                    fontSize: "0.875rem",
                                    letterSpacing: "0.02em",
                                    py: 2,
                                    px: 3,
                                    borderRight: "1px solid rgba(255,255,255,0.1)",
                                    "&:last-child": { borderRight: "none" },
                                }}
                            >
                                Descripción
                            </TableCell>
                            <TableCell
                                sx={{
                                    bgcolor: "grey.800",
                                    color: "white",
                                    fontWeight: 600,
                                    fontSize: "0.875rem",
                                    letterSpacing: "0.02em",
                                    py: 2,
                                    px: 3,
                                    borderRight: "1px solid rgba(255,255,255,0.1)",
                                    "&:last-child": { borderRight: "none" },
                                }}
                            >
                                Total
                            </TableCell>
                            <TableCell
                                sx={{
                                    bgcolor: "grey.800",
                                    color: "white",
                                    fontWeight: 600,
                                    fontSize: "0.875rem",
                                    letterSpacing: "0.02em",
                                    py: 2,
                                    px: 3,
                                    borderRight: "1px solid rgba(255,255,255,0.1)",
                                    "&:last-child": { borderRight: "none" },
                                }}
                            >
                                Estado
                            </TableCell>
                            <TableCell
                                sx={{
                                    bgcolor: "grey.800",
                                    color: "white",
                                    fontWeight: 600,
                                    fontSize: "0.875rem",
                                    letterSpacing: "0.02em",
                                    py: 2,
                                    px: 3,
                                    borderRight: "1px solid rgba(255,255,255,0.1)",
                                    "&:last-child": { borderRight: "none" },
                                }}
                            >
                                Acciones
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow
                                key={order.id}
                                sx={{
                                    "&:hover": { bgcolor: "action.hover" },
                                    transition: "background-color 0.2s ease",
                                }}
                            >
                                <TableCell
                                    sx={{
                                        py: 2,
                                        px: 3,
                                        borderBottom: "1px solid rgba(0,0,0,0.05)",
                                        color: "text.secondary",
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    {formatDate(order.createdAt)}
                                </TableCell>
                                <TableCell
                                    sx={{
                                        py: 2,
                                        px: 3,
                                        borderBottom: "1px solid rgba(0,0,0,0.05)",

                                        color: "text.secondary",
                                        fontSize: "0.875rem",
                                        cursor: "pointer",
                                        "&:hover": {
                                            textDecoration: "underline",
                                            color: "primary.main",
                                            backgroundColor: "transparent !important", // 👈 evita que el hover de la fila opaque el texto
                                        },
                                    }}
                                    onClick={() => setSelectedOrderId(order.id)}
                                >
                                    {getDescription(order.items)}
                                </TableCell>


                                <TableCell
                                    sx={{
                                        py: 2,
                                        px: 3,
                                        borderBottom: "1px solid rgba(0,0,0,0.05)",
                                        color: "text.secondary",
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    ${Number(order.totalAmount).toFixed(2)}
                                </TableCell>
                                <TableCell
                                    sx={{
                                        py: 2,
                                        px: 3,
                                        borderBottom: "1px solid rgba(0,0,0,0.05)",
                                        color: "text.secondary",
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    {order.status}
                                </TableCell>
                                <TableCell
                                    sx={{
                                        py: 2,
                                        px: 3,
                                        borderBottom: "1px solid rgba(0,0,0,0.05)",
                                    }}
                                >
                                    <Box sx={{ display: "flex", gap: 1.2 }}>
                                        {/* Ver */}
                                        <IconButton
                                            size="small"
                                            aria-label="ver"
                                            onClick={() => setSelectedOrderId(order.id)}
                                            sx={{
                                                backgroundColor: "#fff",
                                                color: "primary.main",
                                                borderRadius: "50%",
                                                p: 1,
                                                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                                                transition: "all 0.2s ease",
                                                "&:hover": {
                                                    backgroundColor: "rgba(25, 118, 210, 0.08)", // azul suave
                                                    transform: "scale(1.05)",
                                                },
                                            }}
                                        >
                                            <AiOutlineEye />
                                        </IconButton>

                                        {/* Editar */}
                                        <IconButton
                                            size="small"
                                            aria-label="editar"
                                            onClick={() => setEditedOrderId(order.id)}
                                            sx={{
                                                backgroundColor: "#fff",
                                                color: "info.main",
                                                borderRadius: "50%",
                                                p: 1,
                                                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                                                transition: "all 0.2s ease",
                                                "&:hover": {
                                                    backgroundColor: "rgba(2, 136, 209, 0.08)", // celeste suave
                                                    transform: "scale(1.05)",
                                                },
                                            }}
                                        >
                                            <AiOutlineEdit />
                                        </IconButton>

                                        {/* Eliminar */}
                                        <IconButton
                                            size="small"
                                            aria-label="eliminar"
                                            onClick={() => setDeleteOrderId(order.id)}
                                            sx={{
                                                backgroundColor: "#fff",
                                                color: "error.main",
                                                borderRadius: "50%",
                                                p: 1,
                                                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                                                transition: "all 0.2s ease",
                                                "&:hover": {
                                                    backgroundColor: "rgba(211, 47, 47, 0.08)", // rojo suave
                                                    transform: "scale(1.05)",
                                                },
                                            }}
                                        >
                                            <AiOutlineDelete />
                                        </IconButton>
                                    </Box>
                                </TableCell>

                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {hasMore && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                    <Button
                        variant="outlined"
                        onClick={loadMoreOrders}
                        disabled={isLoadingMore}
                        sx={{
                            px: 4,
                            py: 1.5,
                            borderRadius: 3,
                            textTransform: "none",
                            fontWeight: 600,
                            color: "primary.main",
                            borderColor: "primary.main",
                            "&:hover": { bgcolor: "primary.light", borderColor: "primary.main" },
                        }}
                    >
                        {isLoadingMore ? <CircularProgress size={20} /> : "Ver más órdenes"}
                    </Button>
                </Box>
            )}

            {/* Modal para ver detalles de la orden */}
            <ShowOrderInformation
                orderId={selectedOrderId || ""}
                open={!!selectedOrderId}
                onClose={() => setSelectedOrderId(null)}
            />
            {/* Modal para ver detalles de la orden */}
            <DeleteOrderById
                orderId={deletedOrderId || ""}
                open={!!deletedOrderId}
                onClose={() => setDeleteOrderId(null)}
                onOrderDeleted={handleOrderDeleted} // Pasa el callback
            />
            {/* Modal para editar la orden */}
            <EditOrderModal
                orderId={editedOrderId || ""}
                open={!!editedOrderId}
                onClose={() => setEditedOrderId(null)}
                onUpdateSuccess={handleOrderUpdated}
            />
        </Box>
    );
};

export default ListOrders;