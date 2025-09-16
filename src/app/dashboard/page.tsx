import {  FaClipboardList, FaChartLine, FaPlus,  FaCalendarCheck, FaTools, FaPoll, FaUserEdit,  } from "react-icons/fa";
import { AiFillProduct } from "react-icons/ai";
import { FiPlusSquare } from "react-icons/fi";
import DashboardSections from "@/dashboard/componentes/DashboardSections";
import { auth } from "@/auth.config";
import CrearNegocioInfo from "@/dashboard/componentes/CrearNegocioInfo";

const dashboardSections = [
  {
    titulo: "Gestión de Productos",
    descripcion: "Administra y organiza los productos de tu catálogo. Edita imágenes, precios, categorías y descripciones para mantener tu inventario actualizado y atractivo para los clientes.",
    icono: <AiFillProduct className="text-5xl text-[#eb5f35]" />,
    url: "/dashboard/productos",
    habilitado: true,
  },
  {
    titulo: "Nuevo Producto",
    descripcion: "Añade un nuevo producto a tu catálogo. Sube imágenes, establece precios, define categorías y proporciona descripciones detalladas para captar la atención de tus clientes desde el primer vistazo.",
    icono: <FiPlusSquare className="text-5xl text-[#38B2AC]" />,
    url: "/dashboard/productos/nuevo_producto",
    habilitado: true,
  },
  {
    titulo: "Gestión de Órdenes",
    descripcion: "Administra y supervisa las órdenes de los clientes en tiempo real. Revisa los detalles de cada transacción, realiza actualizaciones de estado y gestiona solicitudes para garantizar una experiencia fluida y eficiente.",
    icono: <FaClipboardList className="text-5xl text-[#5A67D8]" />,
    url: "/dashboard/orders",
    habilitado: true,
  },
  {
    titulo: "Transacciones",
    descripcion: "Administra y controla los ingresos y gastos de tu negocio. Registra transacciones, métodos de pago y obtén un resumen visual con gráficos detallados del estado financiero.",
    icono: <FaChartLine className="text-5xl text-[#4CAF50]" />,
    url: "/dashboard/transacciones",
    habilitado: true,
  },
  // Nuevas secciones agregadas a continuación
  {
    titulo: "Nueva Publicación",
    descripcion: "Crea una nueva publicación para tu red social o catálogo. Sube multimedia como imágenes o videos, agrega descripciones atractivas y selecciona productos o servicios relacionados para aumentar el engagement con tu audiencia.",
    icono: <FaPlus className="text-5xl text-[#ED64A6]" />, // Color rosado vibrante para creatividad
    url: "/dashboard/crear-publicacion",
    habilitado: true,
  },

  {
    titulo: "Módulo de Reservas",
    descripcion: "Administra las reservas y citas de tus clientes. Configura horarios disponibles, confirma o cancela reservas, y sincroniza con calendarios externos para una gestión organizada y sin conflictos.",
    icono: <FaCalendarCheck className="text-5xl text-[#4299E1]" />, // Color azul claro para organización temporal
    url: "/dashboard/reservas",
    habilitado: true,
  },
  {
    titulo: "Servicios",
    descripcion: "Gestiona y actualiza los servicios que ofrece tu negocio. Define precios, descripciones, duración y requisitos para atraer clientes y facilitar la programación de citas o consultas.",
    icono: <FaTools className="text-5xl text-[#ECC94B]" />, // Color amarillo para herramientas/servicios
    url: "/dashboard/servicios",
    habilitado: true,
  },
  {
    titulo: "Módulo de Encuestas",
    descripcion: "Crea y analiza encuestas para recopilar feedback de clientes. Diseña preguntas personalizadas, envía encuestas vía email o redes sociales, y visualiza resultados con gráficos para mejorar tu negocio basado en datos reales.",
    icono: <FaPoll className="text-5xl text-[#9F7AEA]" />, // Color morado para análisis y opiniones
    url: "/dashboard/encuestas",
    habilitado: true,
  },
  {
    titulo: "Editar Perfil",
    descripcion: "Actualiza la información de tu perfil de negocio. Cambia imágenes de portada y logo, edita descripciones, datos de contacto y enlaces a redes sociales para mantener una presencia profesional y atractiva.",
    icono: <FaUserEdit className="text-5xl text-[#48BB78]" />, // Color verde esmeralda para edición personal
    url: "/dashboard/editar-perfil",
    habilitado: true,
  },
];

export default async function DashboardPage() {
  const session = await auth();
  const userType = session?.user?.role; // 'admin', 'negocio', 'user' u otros roles

  return (
    <main className="max-w-7xl mx-auto p-0 sm:p-2">
      {userType === 'negocio' ? (
        // Mostrar DashboardSections si es 'negocio' - Dashboard completo y modular
        <DashboardSections sections={dashboardSections} />
      ) : (
        // Mostrar CrearNegocioInfo para otros roles - Guía onboarding elegante
        <CrearNegocioInfo userId={session?.user?.id || ""} />
      )}
    </main>
  );
}