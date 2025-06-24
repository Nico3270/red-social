export interface Product {
  id: string;
  nombre: string;
  precio: number;
  imagenes: string[];
  descripcion: string;
  seccionIds: string[];
  descripcionCorta?: string;
  slug: string;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
  prioridad?: number;
  status?: "available" | "out_of_stock" | "discontinued";
}

export interface Section {
  id: string;
  name: string;
  iconName: string;
  href: string;
  order: number;
  isActive: boolean;
}

export interface Articulo {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string;
  imagen: string;
  imagenes: string[];
  parrafos: string[];
  subtitulos: string[];
  fechaPublicacion: Date;
  autor: string;
  orden: number;
}

export interface Order {
  id: string;
  estado: "RECIBIDA" | "ENTREGADA" | "PAGADA" | "CANCELADA" | "PREPARACION";
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  cantidad: number;
  productId: string;
  precio: number;
  comentario?: string;
}

export interface DeliveryData {
  id: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  dedicationMessage?: string;
  deliveryDate?: Date;
  deliveryTime?: string;
  additionalComments?: string;
}

export interface Testimonial {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string;
  createdAt?: Date;
}

export interface Service {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string;
  slug: string;
  isActive?: boolean;
}

export interface Video {
  id: string;
  url: string;
  title: string;
  description: string;
  order: number;
  createdAt?: Date;
}

export interface Tarjeta {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string;  // URL de la imagen
  createdAt: Date;
  updatedAt: Date;
};

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
  image?: string;
  emailVerified?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  date: Date;
  type: "ingreso" | "gasto";
  description: string;
  category: string;
  amount: number;
  paymentMethod: "efectivo" | "nequi" | "daviplata" | "cuenta_principal" | "transferencias";
  createdAt: Date;
  updatedAt: Date;
}
export interface ImageGallery {
  id: string;
  url: string;
  title: string;
  description: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarruselSection {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Articulo {
  id: string; // Identificador único
  slug: string; // Identificador para la ruta dinámica
  titulo: string; // Título del artículo
  descripcion: string; // Breve descripción del artículo
  imagen: string; // Imagen destacada para el carrusel
  imagenes: string[]; // Array de URLs para imágenes adicionales
  parrafos: string[]; // Contenido dividido en varios párrafos
  subtitulos: string[]; // Subtítulos para dividir secciones
  fechaPublicacion: Date; // Fecha de publicación
  autor: string; // Nombre del autor
  orden: number; // Orden del blog
}


export const sectionsMenuSectionsBar: Section[] = [
  { name: "Desayuno Sorpresa", iconName: "LuSandwich", href: "desayuno_sorpresa", isActive: true, order: 1, id: "1" },
  { name: "Detalles Hombre", iconName: "FaBlackTie", href: "detalles_hombre", isActive: true, order: 2, id: "2" },
  { name: "Detalles Mujer", iconName: "GiTwirlyFlower", href: "detalles_mujer", isActive: true, order: 3, id: "3" },
  { name: "Detalles Niños", iconName: "FaChildren", href: "datelles_ninos", isActive: true, order: 4, id: "4" },
  { name: "Fechas Especiales", iconName: "FaBirthdayCake", href: "fechas_especiales", isActive: true, order: 5, id: "5" },
];

export interface SeedData {
  products: Product[];
  secciones: Section[];
  articulos: Articulo[];
  orders: Order[];
  deliveryData: DeliveryData[];
  testimonials: Testimonial[];
  services: Service[];
  videos: Video[];
  tarjetas: Tarjeta[];
  usuarios: User[];
  transacciones: Transaction[];
  imagenesGaleria : ImageGallery[];
}

export const initialData: SeedData = {
  products: [
    
    
  ],
  secciones: sectionsMenuSectionsBar,


  articulos: [
    
  ],
  orders: [
    
    
  ],
  deliveryData: [
   
  ],
  testimonials: [
   
    
  ],
  services: [
    {
      id: "serv-001",
      titulo: "Desayunos Sorpresa Personalizados",
      descripcion: "Comienza el día con una sorpresa especial. Ofrecemos desayunos personalizados con una presentación elegante y detalles únicos. Añade un mensaje especial y personaliza cada elemento para sorprender a tus seres queridos.",
      imagen: "https://res.cloudinary.com/dkfsejtx9/image/upload/v1741199590/magicSurprise_images/servicio_1_ajtjjr.png",
      slug: "desayunos-sorpresa-personalizados",
      isActive: true,
    },
    {
      id: "serv-002",
      titulo: "Regalos Temáticos para Ocasiones Especiales",
      descripcion: "Celebra cada ocasión con un regalo único. Desde cumpleaños hasta aniversarios y graduaciones, diseñamos detalles temáticos con una presentación especial para hacer inolvidable cada momento.",
      imagen: "/https://res.cloudinary.com/dkfsejtx9/image/upload/v1741199590/magicSurprise_images/servicio2_rxj4vr.png",
      slug: "regalos-temticos-para-ocasiones-especiales",
      isActive: true,
    },
    {
      id: "serv-003",
      titulo: "Box de Experiencias Gastronómicas",
      descripcion: "Una experiencia culinaria lista para disfrutar. Nuestras cajas de regalo incluyen una selección especial de productos para diferentes gustos y ocasiones, perfectas para compartir o regalar.",
      imagen: "https://res.cloudinary.com/dkfsejtx9/image/upload/v1741199592/magicSurprise_images/servicio3_dblvcl.png",
      slug: "box-de-experiencias-gastronmicas",
      isActive: true,
    },
    {
      id: "serv-004",
      titulo: "Refrigerios Corporativos y Empresariales",
      descripcion: "Ideales para reuniones y eventos, nuestros refrigerios están diseñados para brindar una experiencia práctica y deliciosa. Presentaciones elegantes y opciones versátiles para cualquier tipo de evento empresarial.",
      imagen: "https://res.cloudinary.com/dkfsejtx9/image/upload/v1741199591/magicSurprise_images/servicio4_s1om9v.png",
      slug: "refrigerios-corporativos-y-empresariales",
      isActive: true,
    },
    {
      id: "serv-005",
      titulo: "Catering para Eventos",
      descripcion: "Transforma cualquier evento en una experiencia memorable con nuestro servicio de catering. Ofrecemos opciones deliciosas, bien presentadas y adaptadas a cada ocasión.",
      imagen: "https://res.cloudinary.com/dkfsejtx9/image/upload/v1741199590/magicSurprise_images/servicio_5_ysni8r.png",
      slug: "catering-para-eventos",
      isActive: true,
    },   
    
  ],

  videos: [
   
  ],
  tarjetas: [
    {
      id: "tarjeta-001",
      titulo: "Nuestra Esencia: La Magia de Sorprender",
      descripcion: "En MagiSurprise, transformamos pequeños detalles en grandes momentos. Nos especializamos en regalos personalizados, desayunos sorpresa y experiencias únicas para cada ocasión. Nuestra pasión es ayudarte a sorprender con amor y creatividad.",
      imagen: "https://res.cloudinary.com/dkfsejtx9/image/upload/v1741203857/magicSurprise_images/tarjeta1_jfjnzq.png",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "tarjeta-002",
      titulo: "Nuestro Propósito: Llevar Felicidad en Cada Detalle",
      descripcion: "Trabajamos para hacer de cada regalo una experiencia inolvidable. Nuestra misión es ofrecer detalles personalizados, cuidadosamente diseñados, que transmitan amor y felicidad a cada destinatario. Cada desayuno sorpresa o caja de regalo está pensado para emocionar..",
      imagen: "https://res.cloudinary.com/dkfsejtx9/image/upload/v1741203857/magicSurprise_images/tarjeta2_idux3q.png",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "tarjeta-003",
      titulo: "Dónde Encontrarnos: Más Cerca de Ti",
      descripcion: "Nuestro servicio de desayunos sorpresa y regalos personalizados está disponible en Tunja, con planes de expansión. Realizamos entregas puntuales con la mejor presentación para que tu sorpresa llegue perfecta..",
      imagen: "https://res.cloudinary.com/dkfsejtx9/image/upload/v1741203857/magicSurprise_images/tarjeta3_un3wyi.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "tarjeta-004",
      titulo: "Nuestra Visión: Convertir Momentos en Recuerdos Inolvidables",
      descripcion: "Aspiramos a ser la marca líder en regalos y detalles sorpresa en Colombia. Queremos expandir nuestra magia, llevando emociones a más personas a través de desayunos personalizados, obsequios temáticos y experiencias memorables.",
      imagen: "https://res.cloudinary.com/dkfsejtx9/image/upload/v1741203858/magicSurprise_images/tarjeta4_xjoor8.png",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "tarjeta-005",
      titulo: "Lo Que Hacemos: Más que Regalos, Emociones",
      descripcion: "Ofrecemos más que productos: creamos experiencias. Desde desayunos sorpresa hasta obsequios temáticos y catering, cada detalle está diseñado para emocionar y conectar con quienes más quieres.",
      imagen: "https://res.cloudinary.com/dkfsejtx9/image/upload/v1741203858/magicSurprise_images/tarjeta5_d4wujw.png",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    

  ],
  usuarios: [
   
    
  ],
  transacciones:[
   
  ],
  imagenesGaleria: [
    
  ]
};
