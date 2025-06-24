"use client";

import React from "react";

interface DeleteModalProps {
  blog: { id: string; titulo: string };
  onClose: () => void;
  onDelete: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ blog, onClose, onDelete }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]"
      style={{ zIndex: 1000 }} // Asegura que esté al frente
    >
      <div className="bg-white rounded-lg shadow-lg p-6 w-96 relative">
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
          onClick={onClose}
        >
          ✖
        </button>
        <h2 className="text-lg font-bold mb-4 text-center">
          ¿Estás seguro de eliminar el blog &quot;{blog.titulo}&quot;?

        </h2>
        <div className="flex justify-between">
          <button
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            onClick={onDelete}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
