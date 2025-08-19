"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, CircularProgress, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { FaEye, FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import { ServicioData } from "../interfaces/servicios.interface";
import ServicioViewer from "./ServicioViewer";
import CrearServicio from "./CrearServicio";


interface Props {
    servicios?: ServicioData[]; // Opcional array de servicios
}

const ListaServiciosNegocio: React.FC<Props> = ({ servicios: initialServicios = [] }) => {
    const [servicios, setServicios] = useState(initialServicios);
    const [loading, setLoading] = useState(true);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    // Nuevo estado (arriba con los demás useState)
    const [deleteResultModal, setDeleteResultModal] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [selectedServicio, setSelectedServicio] = useState<ServicioData | null>(null);
    const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const fetchServicios = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/getServiciosNegocio");
            const data = await res.json();
            if (data.ok) {
                setServicios(data.servicios);
            } else {
                setAlert({ type: "error", message: data.message });
            }
        } catch (error) {
            console.error("Error al obtener servicios:", error);
            setAlert({
                type: "error",
                message: "No se pudieron obtener los servicios",
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchServicios();
    }, [fetchServicios]);

    const handleView = (servicio: ServicioData) => {
        setSelectedServicio(servicio);
        setViewModalOpen(true);
    };

    const handleEdit = (servicio: ServicioData) => {
        setSelectedServicio(servicio);
        setEditModalOpen(true);
    };

    const handleDeleteConfirm = (servicio: ServicioData) => {
        setSelectedServicio(servicio);
        setConfirmDeleteOpen(true);
    };

    const deleteServicioApi = async (id: string) => {
        try {
            const res = await fetch(`/api/eliminarServicio?id=${id}`, {
                method: "DELETE",
            });
            return await res.json(); // { ok: boolean, message: string }
        } catch (error) {
            console.error("Error en la petición DELETE:", error);
            return { ok: false, message: "No se pudo conectar con el servidor" };
        }
    };

    const handleDelete = async () => {
        if (!selectedServicio) return;

        setConfirmDeleteOpen(false);
        setLoadingId(selectedServicio.id ?? null);


        // Optimistic update: remove local
        const optimisticServicios = servicios.filter(s => s.id !== selectedServicio.id);
        setServicios(optimisticServicios);

        const result = await deleteServicioApi(selectedServicio.id!);


        setLoadingId(null);
        setDeleteResultModal({ type: result.ok ? "success" : "error", message: result.message });


        if (!result.ok) {
            // Revert on error
            setServicios(servicios);
        }
        setSelectedServicio(null); // Clear selected
    };

    const handleEditSuccess = () => {
        setEditModalOpen(false);
        setSelectedServicio(null);
        // 🔹 Re-fetch servicios tras éxito
        fetchServicios();
    };

    return (
        <div className="overflow-x-auto">

            {loading ? (
                <div className="flex justify-center items-center py-6 gap-3 text-gray-600">
                    <CircularProgress size={22} />
                    <span className="text-sm">Obteniendo servicios...</span>
                </div>
            ) : (

                <Table className="min-w-full border-collapse divide-y divide-gray-200">
                    <TableHead>
                        <TableRow className="divide-x divide-gray-200">
                            <TableCell
                                sx={{ backgroundColor: "#17313E", color: "white", fontWeight: "bold", textAlign: "center", textTransform: "none", fontSize: "1rem" }}
                                className="px-6 py-3 text-left text-xs uppercase tracking-wider"
                            >
                                Título
                            </TableCell>
                            <TableCell
                                sx={{ backgroundColor: "#17313E", color: "white", fontWeight: "bold", textAlign: "center", textTransform: "none", fontSize: "1rem" }}
                                className="px-6 py-3 text-center text-xs uppercase tracking-wider"
                            >
                                Acciones
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody className="bg-white divide-y divide-gray-200">
                        {servicios.map((servicio) => (
                            <TableRow
                                key={servicio.id}
                                className="hover:bg-gray-50 transition-colors divide-x divide-gray-200"
                            >
                                <TableCell className="px-6 py-4 text-sm text-gray-800">
                                    <span
                                        className="
      block 
      whitespace-normal          /* Permite múltiples líneas */
      break-words                /* Corta palabras largas */
      max-w-[150px] sm:max-w-[200px] md:max-w-[600px] /* Limita ancho según pantalla */
      text-base md:text-md font-semibold tracking-wide 
      transition-colors duration-200
    "
                                    >
                                        {servicio.titulo}
                                    </span>
                                </TableCell>

                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex justify-around gap-2">
                                        {/* Ver */}
                                        <IconButton
                                            onClick={() => handleView(servicio)}
                                            aria-label="Ver"
                                            className="group"
                                        >
                                            <FaEye className="text-gray-500 group-hover:text-blue-500 transition-colors duration-200" />
                                        </IconButton>

                                        {/* Editar */}
                                        <IconButton
                                            onClick={() => handleEdit(servicio)}
                                            aria-label="Editar"
                                            className="group"
                                        >
                                            <FaEdit className="text-gray-500 group-hover:text-yellow-500 transition-colors duration-200" />
                                        </IconButton>

                                        {/* Eliminar */}
                                        <IconButton
                                            onClick={() => handleDeleteConfirm(servicio)}
                                            aria-label="Eliminar"
                                            className="group"
                                        >
                                            <FaTrash className="text-gray-500 group-hover:text-red-500 transition-colors duration-200" />
                                        </IconButton>
                                    </div>
                                </TableCell>


                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* Modal View */}
            <AnimatePresence>
                {viewModalOpen && selectedServicio && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                        onClick={() => setViewModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 50 }}
                            transition={{ duration: 0.3 }}
                            className="relative w-full max-w-4xl max-h-[80vh] bg-white rounded-3xl shadow-xl overflow-y-auto p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <IconButton onClick={() => setViewModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                                <FaTimes size={24} />
                            </IconButton>
                            <ServicioViewer servicio={selectedServicio} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Delete Result */}
            <AnimatePresence>
                {deleteResultModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                        onClick={() => setDeleteResultModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 50 }}
                            transition={{ duration: 0.3 }}
                            className={`relative w-full max-w-md bg-white rounded-3xl shadow-xl p-6 border-t-4 ${deleteResultModal.type === "success"
                                    ? "border-green-500"
                                    : "border-red-500"
                                }`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Typography variant="h6" className="text-gray-900 mb-4">
                                {deleteResultModal.type === "success" ? "✅ Éxito" : "❌ Error"}
                            </Typography>
                            <Typography className="text-gray-700 mb-6">
                                {deleteResultModal.message}
                            </Typography>
                            <div className="flex justify-end">
                                <Button
                                    onClick={() => setDeleteResultModal(null)}
                                    className="text-blue-600"
                                >
                                    Cerrar
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Modal Edit */}
            <AnimatePresence>
                {editModalOpen && selectedServicio && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                        onClick={() => setEditModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 50 }}
                            transition={{ duration: 0.3 }}
                            className="relative w-full max-w-2xl max-h-[80vh] bg-white rounded-3xl shadow-xl overflow-y-auto p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <IconButton onClick={() => setEditModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                                <FaTimes size={24} />
                            </IconButton>
                            <CrearServicio servicio={selectedServicio} onSuccess={handleEditSuccess} onCancel={() => setEditModalOpen(false)} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Confirm Delete */}
            <AnimatePresence>
                {confirmDeleteOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                        onClick={() => setConfirmDeleteOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 50 }}
                            transition={{ duration: 0.3 }}
                            className="relative w-full max-w-md bg-white rounded-3xl shadow-xl p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Typography variant="h6" className="text-gray-900 mb-4">
                                ¿Estás seguro de eliminar "{selectedServicio?.titulo}"?
                            </Typography>
                            <div className="flex justify-end gap-4">
                                <Button onClick={() => setConfirmDeleteOpen(false)} className="text-gray-500">
                                    Cancelar
                                </Button>
                                <Button onClick={handleDelete} className="text-red-500">
                                    Continuar
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast Alert */}
            <AnimatePresence>
                {alert && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className={`fixed top-4 left-1/2 transform -translate-x-1/2 p-4 rounded-3xl shadow-md flex items-center gap-2 z-50 ${alert.type === "success" ? "bg-green-50 text-green-700" : alert.type === "error" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}
                    >
                        <span>{alert.type === "success" ? "✅" : alert.type === "error" ? "❌" : "ℹ️"}</span>
                        {alert.message}
                        <button onClick={() => setAlert(null)} className="ml-2 text-sm font-medium hover:underline">
                            Cerrar
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading Toast for Delete */}
            <AnimatePresence>
                {loadingId && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed top-4 left-1/2 transform -translate-x-1/2 p-4 rounded-3xl shadow-md flex items-center gap-2 z-50 bg-blue-50 text-blue-700"
                    >
                        <CircularProgress size={20} className="text-blue-700" />
                        Eliminando servicio...
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ListaServiciosNegocio;