"use client";


import React, { useState, useEffect, ReactNode } from "react";
import { IoMdClose } from "react-icons/io";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@mui/material";
import { motion } from "framer-motion"; // Importa para animaciones elegantes

interface ModalPublicacionesProps {
  userId?: string;
  onClose: () => void;
  children?: ReactNode;
  showAuthButtons?: boolean;
  successMessage?: string;
}

class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getDerivedStateFromError(_: unknown) {
    return { hasError: true };
  }

  componentDidCatch(_error: unknown, _errorInfo: React.ErrorInfo) {
    console.error('Error en child render', _error, _errorInfo);
  }

  

  render() {
    if (this.state.hasError) {
      return <p className="text-red-500">Error al cargar formulario. Intenta de nuevo.</p>;
    }
    return this.props.children;
  }
}

export const ModalPublicaciones: React.FC<ModalPublicacionesProps> = ({
  userId,
  onClose,
  children,
  showAuthButtons = true,
  successMessage = "Tu acción se ha completado exitosamente.",
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const router = useRouter();

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

  // Función helper para clonar recursivamente si hay envoltorio
  const cloneWithProps = (child: ReactNode): ReactNode => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<{ onCancel?: () => void; onSuccess?: (message?: string) => void }>, {
        onCancel: handleClose,
        onSuccess: handleSuccess,
      });
    }
    return child;
  };

  // Debug log para mount
  useEffect(() => {
    // console.log('Modal mounted, showSuccess:', showSuccess, 'userId:', userId);
  }, [showSuccess, userId]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.3 }}
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={handleClose} // Cierra al clic en backdrop (UX elegante como Instagram)
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Evita cierre al clic dentro
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
          // Elimina el duplicado: Solo un check de showSuccess
          <>
            {showSuccess ? (
              <Alert severity="success" className="mb-4">
                {customMessage || successMessage}
              </Alert>
            ) : (
              <ErrorBoundary>
                {cloneWithProps(children)}
              </ErrorBoundary>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
};