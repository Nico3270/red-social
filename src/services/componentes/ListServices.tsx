"use client";

import Link from "next/link";
import { useState } from "react";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from "@mui/material";
import { deleteService } from "@/services/actions/service_actions";
import { Service } from "@/interfaces/product.interface";



interface ListServicesProps {
  services: Service[];
  setServices: (services: Service[]) => void;
}

export default function ListServices({ services, setServices }: ListServicesProps) {
  const [open, setOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(false);

  // Abrir modal y seleccionar servicio
  const handleOpen = (service: Service) => {
    setSelectedService(service);
    setOpen(true);
  };

  // Cerrar modal
  const handleClose = () => {
    setOpen(false);
    setSelectedService(null);
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (selectedService) {
      setLoading(true);
      const result = await deleteService(selectedService.id);

      if (result.success) {
        const updatedServices = services.filter((s) => s.id !== selectedService.id);
        setServices(updatedServices);
      } else {
        alert("Hubo un error al eliminar el servicio.");
      }
      setLoading(false);
      handleClose();
    }
  };

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full leading-normal">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-sm font-semibold text-gray-600 uppercase">
              Título
            </th>
            <th className="px-5 py-3 border-b-2 border-gray-200 text-center text-sm font-semibold text-gray-600 uppercase">
              Estado
            </th>
            <th className="px-5 py-3 border-b-2 border-gray-200 text-center text-sm font-semibold text-gray-600 uppercase">
              Creado
            </th>
            <th className="px-5 py-3 border-b-2 border-gray-200 text-center text-sm font-semibold text-gray-600 uppercase">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {services.length > 0 ? (
            services.map((service) => (
              <tr key={service.id} className="hover:bg-gray-50 transition duration-200">
                <td className="px-5 py-5 border-b border-gray-200 text-sm">
                  <p className="text-gray-900 font-medium">{service.titulo}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm text-center">
                  {service.isActive ? (
                    <span className="inline-flex px-3 py-1 text-sm font-semibold text-green-800 bg-green-100 rounded-full">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex px-3 py-1 text-sm font-semibold text-red-800 bg-red-100 rounded-full">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm text-center">
                  {new Date(service.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm text-center">
                  <Link href={`/dashboard/servicios/${service.id}`}>
                    <button className="text-blue-600 hover:text-blue-800 mr-4" title="Editar">
                      <FaEdit className="inline" /> Editar
                    </button>
                  </Link>
                  <button
                    onClick={() => handleOpen(service)}
                    className="text-red-600 hover:text-red-800"
                    title="Eliminar"
                  >
                    <FaTrashAlt className="inline" /> Eliminar
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="px-5 py-5 text-center text-sm text-gray-500">
                No hay servicios disponibles.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* MODAL DE CONFIRMACIÓN */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Eliminar Servicio</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar el servicio <strong>{selectedService?.titulo}</strong>? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleConfirmDelete} color="error" disabled={loading}>
            {loading ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
