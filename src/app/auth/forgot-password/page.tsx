import ForgotPasswordForm from "../login/ui/ForgotPasswordForm";


export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
            Recupera tu contraseña
          </h1>
          <p className="text-md text-gray-600 dark:text-gray-200">
            Ingresa tu correo electrónico para enviar un enlace de recuperación.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}