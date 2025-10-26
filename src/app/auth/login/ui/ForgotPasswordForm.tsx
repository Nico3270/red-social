'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import FeedbackModal from './FeedbackModal';


const formSchema = z.object({
  email: z.string().email('Ingresa un correo válido').min(1, 'El correo es obligatorio'),
});

type FormData = z.infer<typeof formSchema>;

export default function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; success: boolean; message: string } | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await res.json();

      if (result.ok) {
        setModal({
          open: true,
          success: true,
          message: `Se ha enviado un enlace de recuperación a <strong>${data.email}</strong>. Revisa tu bandeja de entrada o carpeta de spam.`,
        });
      } else {
        setModal({
          open: true,
          success: false,
          message: result.message || 'Ocurrió un error. Intenta de nuevo.',
        });
      }
    } catch (error) {
      setModal({
        open: true,
        success: false,
        message: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setModal(null);
    if (modal?.success) {
      router.push('/');
    } else {
      reset();
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="sr-only">
            Correo electrónico
          </label>
          <input
            {...register('email')}
            type="email"
            id="email"
            placeholder="tu@correo.com"
            className={`w-full px-4 py-3 text-base rounded-xl border ${
              errors.email
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
            } bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fade-in">
              {errors.email.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-xl font-medium text-white transition-all duration-200 ${
            isLoading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg hover:shadow-xl'
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Enviando...
            </span>
          ) : (
            'Enviar enlace'
          )}
        </button>
      </form>

      <AnimatePresence>
        {modal && (
          <FeedbackModal
            isOpen={modal.open}
            success={modal.success}
            message={modal.message}
            onClose={closeModal}
          />
        )}
      </AnimatePresence>
    </>
  );
}