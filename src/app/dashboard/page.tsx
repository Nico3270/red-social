import DashboardSections from "@/dashboard/componentes/DashboardSections";
import { FaBox, FaClipboardList, FaUsers, FaImages, FaChartLine, FaUserCog } from "react-icons/fa";
import { TfiGallery } from "react-icons/tfi";
import { FcGallery } from "react-icons/fc";
import { TbNewSection } from "react-icons/tb";
import { AiFillProduct } from "react-icons/ai";
import { MdCategory } from "react-icons/md";
import { RiCustomerService2Fill } from "react-icons/ri";
import { FiPlusSquare } from "react-icons/fi";
import { IoMdDocument } from "react-icons/io";

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
        icono: <FiPlusSquare className="text-5xl text-[#38B2AC]" />,  // Icono que simboliza claramente añadir o crear
        url: "/dashboard/productos/newProduct",
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
        icono: <FaChartLine className="text-5xl text-[#4CAF50]" />,  // Icono que refleja crecimiento financiero
        url: "/dashboard/transacciones",
        habilitado: true,
    },
    {
        titulo: "Nueva Sección de Productos",
        descripcion: "Crea y administra categorías de productos que aparecerán en la barra de navegación principal. Estas secciones ayudarán a organizar y presentar tus productos de manera atractiva y accesible para los clientes. Los iconos personalizados se seleccionan desde react-icons para reflejar mejor cada categoría.",
        icono: <TbNewSection className="text-5xl text-[#5f161c]" />,
        url: "/dashboard/newSection",
        habilitado: true,

    },
    {
        titulo: "Gestión de Secciones",
        descripcion: "Administra las secciones de productos que aparecen en la barra de navegación principal. Reordena, edita y personaliza cada sección para mejorar la experiencia de tus clientes y resaltar tus productos destacados.",
        icono: <MdCategory className="text-5xl text-[#173168]" />,  // Icono que refleja categorías o secciones
        url: "/dashboard/seccionesCarrusel",
        habilitado: true,
    },
    {
        titulo: "Carrusel de Imágenes Principal",
        descripcion: "Destaca productos en promoción o secciones especiales con imágenes atractivas y enlaces directos. Crea carruseles temáticos para eventos, temporadas o fechas importantes que capturen la atención de tus clientes.",
        icono: <FaImages className="text-5xl text-[#ED8936]" />,  // Ícono más representativo para un carrusel de imágenes
        url: "/dashboard/seccionesCarrusel",
        habilitado: true,
    },

    {
        titulo: "Galería de Imágenes",
        descripcion: "Gestiona y actualiza la galería de imágenes en la sección Galería para captar la atención de tus clientes . Añade fotos llamativas y de alta calidad con descripciones que transmitan emociones y reflejen la esencia de tu marca.",
        icono: <TfiGallery className="text-5xl text-[#D91656]" />,
        url: "/dashboard/galleryImages",
        habilitado: true,

    },

    {
        titulo: "Galería de Videos",
        descripcion: "Gestiona y organiza los videos promocionales y testimoniales. Añade contenido visual impactante que destaque tus productos y servicios, capturando la atención de tus clientes con historias y experiencias en movimiento.",
        icono: <FcGallery className="text-5xl text-[#501428]" />,
        url: "/dashboard/galleryVideos",
        habilitado: true,

    },
    {
        titulo: "Blog",
        descripcion: "Crea y gestiona artículos que destacan en la página principal. Publica contenido relevante y optimizado para mejorar el posicionamiento SEO y atraer más visitantes mediante búsquedas y palabras clave estratégicas.",
        icono: <FaBox className="text-5xl text-[#17494d]" />,
        url: "/dashboard/blog",
        habilitado: true,

    },

    {
        titulo: "Nuevo Blog",
        descripcion: "Crear un nuevo blog",
        icono: <IoMdDocument className="text-5xl text-[#17494d]" />,
        url: "/dashboard/blog/newBlog",
        habilitado: true,

    },

    {
        titulo: "Quiénes Somos",
        descripcion: "Comparte la historia de tu negocio, su misión, visión y valores. Añade imágenes que resalten el crecimiento, la cultura y los logros de tu empresa, brindando a los clientes una conexión más cercana con tu marca.",
        icono: <FaUsers className="text-5xl text-[#38A169]" />,  // Ícono más representativo para una sección de "Nosotros"
        url: "/dashboard/quienesSomos",
        habilitado: true,
    },
    {
        titulo: "Gestión de Servicios",
        descripcion: "Administra y actualiza los servicios y productos destacados que ofreces a tus clientes. Agrega, edita o elimina servicios fácilmente para mantener la sección siempre actualizada y alineada con las necesidades del negocio.",
        icono: <RiCustomerService2Fill className="text-5xl text-[#e63535]" />,  // Icono que representa claramente servicios
        url: "/dashboard/servicios",
        habilitado: true,
    },
    {
        titulo: "Testimonios y Clientes",
        descripcion: "Comparte las experiencias de tus clientes con imágenes, testimonios y entregas exitosas. Aumenta la confianza y credibilidad mostrando reseñas y fotos de clientes satisfechos con tus productos o servicios.",
        icono: <FaUsers className="text-5xl text-[#e63535]" />,  // Icono que representa mejor comunidad y clientes
        url: "/dashboard/testimonials",
        habilitado: true,
    },

    {
        titulo: "Gestión de Usuarios",
        descripcion: "Administra los usuarios registrados en la plataforma. Modifica roles, otorga permisos y gestiona el acceso de colaboradores o administradores.",
        icono: <FaUserCog className="text-5xl text-[#2D3748]" />,  // Icono que representa configuración de usuarios
        url: "/dashboard/usuarios",
        habilitado: true,
    },
];

export default function DashboardPage() {
    return (
        <main className="max-w-7xl mx-auto p-6">
            <h1 className="text-4xl font-bold text-center mb-12">
                Panel Administrativo
            </h1>

            {/* Renderizar el componente DashboardSections con las secciones */}
            <DashboardSections sections={dashboardSections} />
        </main>
    );
}
