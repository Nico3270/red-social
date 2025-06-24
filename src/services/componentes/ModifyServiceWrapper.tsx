"use client";

import { useState } from "react";
import { ModifyService } from "@/services/componentes/ModifyService";
import { Service } from "@/interfaces/product.interface";

interface ModifyServiceWrapperProps {
  service: Service;
}

export default function ModifyServiceWrapper({ service }: ModifyServiceWrapperProps) {
  const [currentService, setCurrentService] = useState(service);

  const handleUpdateService = (updatedService: Service) => {
    console.log("Servicio actualizado:", updatedService);
    setCurrentService(updatedService);  // Actualiza el estado
  };

  return <ModifyService service={currentService} onUpdateService={handleUpdateService} />;
}
