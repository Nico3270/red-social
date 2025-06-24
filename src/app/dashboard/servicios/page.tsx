"use client";
import { useState, useEffect } from "react";
import { Service } from "@/interfaces/product.interface";
import { getServices } from "@/services/actions/service_actions";
import ListServices from "@/services/componentes/ListServices";
import { NewService } from "@/services/componentes/NewService";

export const dynamic = "force-dynamic"; // Asegura que la acción no use caché

export default function ServicesDashboard() {
    const [services, setServices] = useState<Service[]>([]);

    useEffect(() => {
        const fetchServices = async () => {
            const servicios = await getServices();
            const formattedServices: Service[] = servicios.map((service) => ({
                ...service,
                createdAt: new Date(service.createdAt).toISOString(),  // Convertimos Date a string
                updatedAt: new Date(service.updatedAt).toISOString(),
            }));
            setServices(formattedServices);  // Evitamos error de tipado
        };

        fetchServices();
    }, []);

    const handleAddService = (newService: Service) => {
        setServices((prev) => [newService, ...prev]);  // Añade el nuevo servicio al principio
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold text-center mb-10">Administrar Servicios</h1>

            <div className="mb-10">
                <NewService onAddService={handleAddService} />
            </div>

            <div className="pb-20">
                <ListServices services={services} setServices={setServices} />
            </div>
        </div>
    );
}


