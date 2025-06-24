import Link from "next/link";
import {  FaWhatsapp } from "react-icons/fa";
import { GiArchiveRegister } from "react-icons/gi";  // Icono legal
import Image from "next/image";
import { LogoFont, SeccionesFont,  titleFont } from "@/config/fonts";
import { InfoEmpresa as empresa } from "@/config/config";

export default function Footer() {
  return (
    <footer className="color-fondo-principal color-principal py-6 pb-20 md:pb-6">

      <div className="container mx-auto px-4 flex flex-col md:flex-row md:justify-between items-center md:items-start space-y-6 md:space-y-0">
        
        {/* Columna izquierda: Logo y nombre */}
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Image
              src={empresa.imagenesPlaceholder.logoEmpresa}  // Ruta del logo
              alt="Detalles Sorpresas y Regalos Logo"
              width={80}
              height={80}
              className="rounded-lg"
            />
          </Link>
          <div>
            <Link href="/">
              <h2 className={`text-2xl font-bold color-logos ${LogoFont.className}`}>
                {empresa.nombreCompleto}
              </h2>
            </Link>
            <p className={`text-sm color-logos ${titleFont.className}`}>
              {empresa.titulo}
            </p>
          </div>
        </div>

        {/* Columna central: Redes Sociales */}
        <div className="flex flex-col items-center md:items-start space-y-2">
          <h3 className={`text-lg font-bold color-logos ${SeccionesFont.className}`}>Síguenos</h3>
          <div className="flex space-x-4">
            <Link
              href={`https://wa.me/${empresa.telefono}`}
              target="_blank"
              className="color-iconos  hover:text-green-500 transition-colors"
            >
              <FaWhatsapp size={28} />
            </Link>
            {/* <Link
              href={empresa.urlFacebook}
              target="_blank"
              className="color-iconos  hover:text-blue-500 transition-colors"
            >
              <FaFacebookF size={28} />
            </Link> */}
            {/* <Link
              href={empresa.urlInstagram}
              target="_blank"
              className="color-iconos  hover:text-pink-500 transition-colors"
            >
              <FaInstagram size={28} />
            </Link>
            <Link
              href={empresa.urlTiktok}
              target="_blank"
              className="color-iconos  hover:text-black transition-colors"
            >
              <FaTiktok size={28} />
            </Link> */}
          </div>

          {/* Link a términos y políticas */}
          <div className="mt-6 flex items-center space-x-2">
            <GiArchiveRegister className="text-xl color-logos" />
            <Link
              href="/legal"
              className={`text-sm  links transition-colors ${titleFont.className} color-logos`}
              >
              Términos, Condiciones y Políticas
            </Link>
          </div>
        </div>

        {/* Columna derecha: Secciones */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-2">
            <h3 className={`text-lg font-bold color-logos ${SeccionesFont.className}`}>Secciones</h3>
            {/* <Link href="/contacto" className={`links transition-colors ${SeccionesFont.className} color-principal`}>
              Contacto
            </Link> */}
            <Link href="/servicios" className={`links transition-colors ${SeccionesFont.className} color-principal`}>
              Servicios
            </Link>
          </div>
          <div className="flex flex-col space-y-2">
            <h3 className={`text-lg font-bold color-logos ${SeccionesFont.className}`}>Más</h3>
            <Link href="/productos" className={`links transition-colors ${SeccionesFont.className} color-principal`}>
              Productos
            </Link>
            {/* <Link href="/galeria" className={`links transition-colors ${SeccionesFont.className} color-principal`}>
              Galería
            </Link> */}
          </div>
        </div>
      </div>

      {/* Línea inferior: Derechos Reservados */}
      <div className="border-t border-gray-500 mt-4 pt-4 text-center">
        <p className="text-sm color-logos">
          © {new Date().getFullYear()} - {empresa.nombreCompleto}
        </p>
      </div>
    </footer>
  );
};
