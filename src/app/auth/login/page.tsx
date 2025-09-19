import { LoginForm } from "./ui/LoginForm";
import Image from "next/image";
import Link from "next/link";
import { FaShoppingBag, FaUsers, FaLock, FaRocket, FaGlobeAmericas } from "react-icons/fa"; // Importa iconos relevantes de React Icons

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <LoginForm />

      <div className="w-full md:w-1/2 relative flex flex-col items-center justify-center bg-white p-8 overflow-hidden">
        {/* Fondo sutil con overlay para premium feel */}
        <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />

        {/* Imagen representativa - Usa una imagen de alta calidad */}
        <div className="relative w-full max-w-md mb-8 rounded-2xl shadow-xl overflow-hidden">
          <Image
            src="/imgs/business-customers.png" // Reemplaza con tu ruta de imagen real (ej. un negocio vibrante con clientes interactuando)
            alt="Negocio vibrante con clientes"
            width={600}
            height={400}
            className="object-cover"
            priority
          />
        </div>

        {/* Título principal - Elegante y atractivo */}
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center z-10">
          Descubre una Nueva Forma de Comprar Local
        </h1>

        {/* Lista de beneficios/características con iconos - Premium y concisa */}
        <ul className="space-y-4 mb-8 max-w-lg z-10">
          <li className="flex items-center gap-3 text-gray-700">
            <FaShoppingBag className="text-blue-600 text-2xl" />
            <span>Explora catálogos premium de negocios locales en un solo lugar.</span>
          </li>
          <li className="flex items-center gap-3 text-gray-700">
            <FaUsers className="text-blue-600 text-2xl" />
            <span>Conecta con comunidades y descubre recomendaciones reales de usuarios.</span>
          </li>
          <li className="flex items-center gap-3 text-gray-700">
            <FaLock className="text-blue-600 text-2xl" />
            <span>Transacciones seguras y privadas para una experiencia sin preocupaciones.</span>
          </li>
          <li className="flex items-center gap-3 text-gray-700">
            <FaRocket className="text-blue-600 text-2xl" />
            <span>Pedidos rápidos y personalizados, adaptados a tus necesidades.</span>
          </li>
          <li className="flex items-center gap-3 text-gray-700">
            <FaGlobeAmericas className="text-blue-600 text-2xl" />
            <span>Apoya el comercio local mientras disfrutas de una red global de oportunidades.</span>
          </li>
        </ul>

        {/* Tip adicional - Como un "pro tip" elegante */}
        <p className="text-sm text-gray-500 italic mb-6 text-center z-10">
          Tip: Regístrate para acceder a ofertas exclusivas y gestionar tus pedidos con facilidad.
        </p>

        {/* Botón de explorar - Call to action premium */}
        <Link
          href="/"
          className="bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg z-10"
        >
          Explorar Productos
        </Link>
      </div>
    </div>
  );
}