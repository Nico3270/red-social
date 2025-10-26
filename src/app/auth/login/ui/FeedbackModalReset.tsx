'use client';

import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  success: boolean;
  message: string;
  onClose: () => void;
}

export default function FeedbackModal({
  success,
  message,
  onClose,
}: FeedbackModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          {success ? (
            <CheckCircle className="w-16 h-16 text-green-500" />
          ) : (
            <XCircle className="w-16 h-16 text-red-500" />
          )}

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {success ? 'Éxito' : 'Error'}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            {message}
          </p>

          <button
            onClick={onClose}
            className={`mt-4 w-full py-2.5 px-4 rounded-xl font-medium transition-all duration-200 ${
              success
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              success ? 'focus:ring-blue-500' : 'focus:ring-gray-500'
            }`}
          >
            {success ? 'Ir a inicio de sesión' : 'Cerrar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}