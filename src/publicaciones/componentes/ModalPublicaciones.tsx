"use client";

import React, { useEffect, useState, ReactNode } from "react";
import { IoMdClose } from "react-icons/io";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@mui/material";

interface ModalPublicacionesProps {
  userId?: string;
  onClose: () => void;
  children?: ReactNode;
  showAuthButtons?: boolean;
  successMessage?: string;
}

export const ModalPublicaciones: React.FC<ModalPublicacionesProps> = ({
  userId,
  onClose,
  children,
  showAuthButtons = true,
  successMessage = "Tu acción se ha completado exitosamente.",
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();
  const [customMessage, setCustomMessage] = useState<string | null>(null);


  const handleSuccess = (message?: string) => {
    if (message) setCustomMessage(message);
    setShowSuccess(true);
  };

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        onClose();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, onClose]);

  const handleClose = () => {
    setShowSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-end mb-4">
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <IoMdClose className="text-2xl" />
          </button>
        </div>

        {!userId && showAuthButtons ? (
          <div className="space-y-4 text-center">
            <p className="text-gray-600">Debes iniciar sesión o registrarte para continuar.</p>
            <div className="flex justify-center gap-4">
              <Button
                variant="contained"
                color="primary"
                onClick={() => router.push("/auth/login")}
                className="bg-[#274494] hover:bg-[#2c5282]"
              >
                Iniciar sesión
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => router.push("/auth/new-account")}
                className="border-[#274494] text-[#274494] hover:bg-gray-50"
              >
                Registrarse
              </Button>
            </div>
          </div>
        ) : (
          <>
            {showSuccess ? (
              <Alert severity="success" className="mb-4">
                {customMessage || successMessage}
              </Alert>

            ) : (
              // Aquí se inyecta cualquier formulario (por ejemplo: <TestimonioProductoCrearEditar ... />)
              children &&
              React.cloneElement(children as React.ReactElement<any>, {
                onCancel: handleClose,
                onSuccess: handleSuccess,
              })
            )}
          </>
        )}
      </div>
    </div>
  );
};
