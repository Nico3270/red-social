export type DashboardIcon =
  | "products"
  | "newProduct"
  | "catalog"
  | "services"
  | "orders"
  | "reservations"
  | "transactions"
  | "publication"
  | "surveys"
  | "qr"
  | "business"
  | "admin"
  | "user";

export interface DashboardSection {
  id: string;
  titulo: string;
  resumen: string;
  descripcion: string;
  icono: DashboardIcon;
  url: string;
}

export interface DashboardGroup {
  id: string;
  titulo: string;
  sections: readonly DashboardSection[];
}

export const dashboardQuickActions: readonly DashboardSection[] = [
  {
    id: "new-product",
    titulo: "Nuevo Producto",
    resumen: "Amplía tu catálogo.",
    descripcion:
      "Añade un nuevo producto a tu catálogo. Sube imágenes, establece precios, define categorías y proporciona descripciones detalladas para captar la atención de tus clientes desde el primer vistazo.",
    icono: "newProduct",
    url: "/dashboard/productos/nuevo_producto",
  },
  {
    id: "new-publication",
    titulo: "Nueva Publicación",
    resumen: "Comparte una novedad.",
    descripcion:
      "Crea una publicación de carrusel o testimonio para tu negocio. Añade imágenes o videos y una descripción, y relaciona productos de tu catálogo cuando corresponda.",
    icono: "publication",
    url: "/dashboard/crear-publicacion",
  },
];

export const dashboardGroups: readonly DashboardGroup[] = [
  {
    id: "catalog",
    titulo: "Catálogo y oferta",
    sections: [
      {
        id: "products",
        titulo: "Gestión de Productos",
        resumen: "Precios, fotos y detalles.",
        descripcion:
          "Administra y organiza los productos de tu catálogo. Edita imágenes, precios, categorías y descripciones para mantener tu inventario actualizado y atractivo para los clientes.",
        icono: "products",
        url: "/dashboard/productos",
      },
      {
        id: "catalog-organization",
        titulo: "Organización del Catálogo",
        resumen: "Grupos y secciones.",
        descripcion:
          "Organiza los grupos de tu catálogo y asigna tus productos para que tus clientes encuentren lo que ofreces con mayor facilidad.",
        icono: "catalog",
        url: "/dashboard/organizacion-catalogo",
      },
      {
        id: "services",
        titulo: "Servicios",
        resumen: "Gestiona lo que ofreces.",
        descripcion:
          "Gestiona y actualiza los servicios que ofrece tu negocio. Edita sus precios, descripciones e imágenes para presentar tu oferta a los clientes.",
        icono: "services",
        url: "/dashboard/servicios",
      },
    ],
  },
  {
    id: "operations",
    titulo: "Operación",
    sections: [
      {
        id: "orders",
        titulo: "Gestión de Pedidos",
        resumen: "Consulta y actualiza órdenes.",
        descripcion:
          "Administra los pedidos de tus clientes. Revisa los detalles de cada orden, actualiza su estado y organiza su entrega desde el módulo de gestión de órdenes.",
        icono: "orders",
        url: "/dashboard/orders",
      },
      {
        id: "reservations",
        titulo: "Reservas",
        resumen: "Tu agenda y horarios.",
        descripcion:
          "Administra las reservas y citas de tus clientes. Configura horarios disponibles, consulta tu agenda y confirma o cancela reservas. Si aún no has configurado tu agenda, el módulo te guiará para hacerlo.",
        icono: "reservations",
        url: "/dashboard/reservas",
      },
      {
        id: "transactions",
        titulo: "Transacciones",
        resumen: "Registra ingresos y gastos.",
        descripcion:
          "Registra los ingresos y gastos de tu negocio. Consulta tus transacciones, organiza categorías y métodos de pago, y revisa los gráficos disponibles en el módulo.",
        icono: "transactions",
        url: "/dashboard/transacciones",
      },
    ],
  },
  {
    id: "presence",
    titulo: "Presencia del negocio",
    sections: [
      {
        id: "surveys",
        titulo: "Encuestas",
        resumen: "Configura tus preguntas.",
        descripcion:
          "Configura las preguntas de tu encuesta y selecciona las que quieres mostrar a tus clientes. Si aún no tienes una encuesta, el módulo te guiará para crearla.",
        icono: "surveys",
        url: "/dashboard/encuestas",
      },
      {
        id: "qr",
        titulo: "Código QR",
        resumen: "Comparte tu negocio.",
        descripcion:
          "Genera el código QR de tu negocio con los datos de tu perfil. Descarga o comparte la imagen para que tus clientes accedan a tu perfil, productos y servicios desde su teléfono.",
        icono: "qr",
        url: "/dashboard/qr",
      },
      {
        id: "business-profile",
        titulo: "Editar Negocio",
        resumen: "Perfil y datos de contacto.",
        descripcion:
          "Actualiza la información de tu perfil de negocio. Cambia imágenes de portada y logo, edita descripciones, datos de contacto y enlaces a redes sociales para mantener una presencia profesional y atractiva.",
        icono: "business",
        url: "/dashboard/editar-perfil",
      },
    ],
  },
];

export const superAdminGroups: readonly DashboardGroup[] = [
  {
    id: "administration",
    titulo: "Administración",
    sections: [
      {
        id: "myckeo-admin",
        titulo: "Panel Myckeo Admin",
        resumen: "Administración de la plataforma.",
        descripcion:
          "Accede al panel administrativo avanzado de Myckeo para gestionar negocios, revisar estados, administrar datos internos y operar herramientas exclusivas de super administración.",
        icono: "admin",
        url: "/myckeoAdmin",
      },
      {
        id: "user-profile",
        titulo: "Editar usuario",
        resumen: "Datos de tu cuenta.",
        descripcion:
          "Administra la información de tu usuario, ajusta tus datos de cuenta y mantén actualizado tu perfil administrativo.",
        icono: "user",
        url: "/dashboard/editar-usuario",
      },
    ],
  },
];
