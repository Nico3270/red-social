'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { CheckCircle2, XCircle } from 'lucide-react';

import FeedbackModal from './FeedbackModalReset';
import { resetPasswordAction } from '@/actions/auth/resetPasswordAction';

const formSchema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof formSchema>;

export default function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const [modal, setModal] = useState<{ open: boolean; success: boolean; message: string } | null>(null);
  const router = useRouter();
  const { token } = useParams<{ token: string }>();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  useEffect(() => {
    if (!confirmPassword) return;
    setPasswordsMatch(password === confirmPassword);
  }, [password, confirmPassword]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const result = await resetPasswordAction(token, data.password);
      if (result.ok) {
        setModal({ open: true, success: true, message: result.message || 'Contraseña actualizada con éxito.' });
      } else {
        setModal({ open: true, success: false, message: result.message || 'Ocurrió un error. Intenta de nuevo.' });
      }
    } catch {
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
      router.push('/auth/login');
    } else {
      reset();
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-md mx-auto space-y-8 bg-white/80 dark:bg-gray-900/60 p-8 rounded-3xl shadow-2xl backdrop-blur-md border border-gray-100 dark:border-gray-800"
      >
        <h2 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-4">
          Restablecer contraseña
        </h2>

        {/* Nueva contraseña */}
        <div className="relative">
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            id="password"
            placeholder=" "
            className={`peer w-full px-4 pt-5 pb-2 text-base rounded-2xl border ${
              errors.password
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-300 dark:border-gray-700 focus:border-blue-500'
            } bg-white/60 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-transparent transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20`}
            disabled={isLoading}
          />
          <label
            htmlFor="password"
            className="absolute left-4 top-3.5 text-gray-500 dark:text-gray-400 text-sm transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-placeholder-shown:translate-y-1 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
          >
            Nueva contraseña
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
          </button>
          <AnimatePresence>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-2 text-sm text-red-600 dark:text-red-400"
              >
                {errors.password.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Confirmar contraseña */}
        <div className="relative">
          <input
            {...register('confirmPassword')}
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            placeholder=" "
            className={`peer w-full px-4 pt-5 pb-2 text-base rounded-2xl border ${
              errors.confirmPassword
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-300 dark:border-gray-700 focus:border-blue-500'
            } bg-white/60 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-transparent transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20`}
            disabled={isLoading}
          />
          <label
            htmlFor="confirmPassword"
            className="absolute left-4 top-3.5 text-gray-500 dark:text-gray-400 text-sm transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-placeholder-shown:translate-y-1 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
          >
            Confirmar contraseña
          </label>

          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
            aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showConfirmPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
          </button>

          {passwordsMatch !== null && (
            <span className="absolute right-10 top-1/2 -translate-y-1/2">
              {passwordsMatch ? (
                <CheckCircle2 className="text-green-500" size={20} />
              ) : (
                <XCircle className="text-red-500" size={20} />
              )}
            </span>
          )}

          <AnimatePresence>
            {errors.confirmPassword && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-2 text-sm text-red-600 dark:text-red-400"
              >
                {errors.confirmPassword.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-2xl font-semibold text-white transition-all duration-300 ${
            isLoading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] shadow-lg hover:shadow-xl'
          } focus:outline-none focus:ring-4 focus:ring-blue-500/40`}
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
              Actualizando...
            </span>
          ) : (
            'Actualizar contraseña'
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
