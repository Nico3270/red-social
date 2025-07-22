export interface Section {
  id: string;
  nombre: string;
  iconName: string;
  slug: string;
  href: string;
  order: number;
  isActive: boolean;
  categorySlug: string;
}

export interface Category {
  id: string;
  nombre: string;
  iconName: string;
  slug: string;
  isActive: boolean;
}

export interface SeedData {
  categorias: Category[];
  secciones: Section[];
}

export const initialData: SeedData = {
  categorias: [
    { id: '2', nombre: 'Comida', iconName: 'FaUtensils', slug: 'comida', isActive: true },
    { id: '11', nombre: 'Bebidas', iconName: 'RiDrinks2Fill', slug: 'bebidas', isActive: true },
    { id: '1', nombre: 'Moda y Accesorios', iconName: 'FaTshirt', slug: 'moda', isActive: true },
    { id: '3', nombre: 'Tecnología', iconName: 'FaLaptop', slug: 'tecnologia', isActive: true },
    { id: '4', nombre: 'Hogar y Decoración', iconName: 'FaHome', slug: 'hogar', isActive: true },
    { id: '5', nombre: 'Belleza y Cuidado', iconName: 'FaSpa', slug: 'belleza', isActive: true },
    { id: '6', nombre: 'Salud y Bienestar', iconName: 'FaHeartbeat', slug: 'salud', isActive: true },
    { id: '7', nombre: 'Deportes y Fitness', iconName: 'FaDumbbell', slug: 'deportes', isActive: true },
    { id: '8', nombre: 'Mascotas', iconName: 'FaPaw', slug: 'mascotas', isActive: true },
    { id: '9', nombre: 'Libros y Papelería', iconName: 'FaBook', slug: 'libros', isActive: true },
    { id: '10', nombre: 'Vehículos y Motores', iconName: 'FaCar', slug: 'vehiculos', isActive: true },
    { id: '12', nombre: 'Juguetes y Niños', iconName: 'FaPuzzlePiece', slug: 'juguetes-ninos', isActive: true },
    { id: '13', nombre: 'Jardinería', iconName: 'FaLeaf', slug: 'jardineria', isActive: true },
    { id: '14', nombre: 'Viajes y Aventura', iconName: 'FaPlane', slug: 'viajes', isActive: true },
  ],
  secciones: [
    // Moda y Accesorios
    { id: 's1', nombre: 'Camisas', iconName: 'FaTshirt', slug: 'camisas', href: '/productos/moda/camisas', order: 1, isActive: true, categorySlug: 'moda' },
    { id: 's2', nombre: 'Pantalones', iconName: 'FaTshirt', slug: 'pantalones', href: '/productos/moda/pantalones', order: 2, isActive: true, categorySlug: 'moda' },
    { id: 's3', nombre: 'Zapatos', iconName: 'FaShoePrints', slug: 'zapatos', href: '/productos/moda/zapatos', order: 3, isActive: true, categorySlug: 'moda' },
    { id: 's4', nombre: 'Accesorios', iconName: 'FaGem', slug: 'accesorios', href: '/productos/moda/accesorios', order: 4, isActive: true, categorySlug: 'moda' },
    { id: 's5', nombre: 'Chaquetas', iconName: 'FaTshirt', slug: 'chaquetas', href: '/productos/moda/chaquetas', order: 5, isActive: true, categorySlug: 'moda' },
    { id: 's6', nombre: 'Vestidos', iconName: 'FaTshirt', slug: 'vestidos', href: '/productos/moda/vestidos', order: 6, isActive: true, categorySlug: 'moda' },
    { id: 's7', nombre: 'Ropa Interior', iconName: 'FaTshirt', slug: 'ropa-interior', href: '/productos/moda/ropa-interior', order: 7, isActive: true, categorySlug: 'moda' },

    // Comida
    { id: 's8', nombre: 'Comida Rápida', iconName: 'FaHamburger', slug: 'comida-rapida', href: '/productos/comida/comida-rapida', order: 1, isActive: true, categorySlug: 'comida' },
    { id: 's9', nombre: 'Bebidas', iconName: 'FaWineGlass', slug: 'bebidas', href: '/productos/comida/bebidas', order: 2, isActive: true, categorySlug: 'comida' },
    { id: 's10', nombre: 'Postres', iconName: 'FaIceCream', slug: 'postres', href: '/productos/comida/postres', order: 3, isActive: true, categorySlug: 'comida' },
    { id: 's11', nombre: 'Menús del Día', iconName: 'FaConciergeBell', slug: 'menus-dia', href: '/productos/comida/menus-dia', order: 4, isActive: true, categorySlug: 'comida' },
    { id: 's78', nombre: 'Comida Saludable', iconName: 'FaLeaf', slug: 'comida-saludable', href: '/productos/comida/comida-saludable', order: 5, isActive: true, categorySlug: 'comida' },
    { id: 's12', nombre: 'Carnes', iconName: 'FaDrumstickBite', slug: 'carnes', href: '/productos/comida/carnes', order: 6, isActive: true, categorySlug: 'comida' },
    { id: 's13', nombre: 'Pescados', iconName: 'FaFish', slug: 'pescados', href: '/productos/comida/pescados', order: 7, isActive: true, categorySlug: 'comida' },
    { id: 's14', nombre: 'Hamburguesas', iconName: 'FaHamburger', slug: 'hamburguesas', href: '/productos/comida/hamburguesas', order: 8, isActive: true, categorySlug: 'comida' },
    { id: 's15', nombre: 'Pizzas', iconName: 'FaPizzaSlice', slug: 'pizzas', href: '/productos/comida/pizzas', order: 9, isActive: true, categorySlug: 'comida' },
    { id: 's16', nombre: 'Mexicana', iconName: 'FaPepperHot', slug: 'mexicana', href: '/productos/comida/mexicana', order: 10, isActive: true, categorySlug: 'comida' },
    { id: 's17', nombre: 'Italiana', iconName: 'FaPizzaSlice', slug: 'italiana', href: '/productos/comida/italiana', order: 11, isActive: true, categorySlug: 'comida' },
    { id: 's18', nombre: 'Oriental', iconName: 'FaBowlFood', slug: 'oriental', href: '/productos/comida/oriental', order: 12, isActive: true, categorySlug: 'comida' },
    { id: 's19', nombre: 'Pollo', iconName: 'FaDrumstickBite', slug: 'pollo', href: '/productos/comida/pollo', order: 13, isActive: true, categorySlug: 'comida' },
    { id: 's20', nombre: 'Vegetariana', iconName: 'FaCarrot', slug: 'vegetariana', href: '/productos/comida/vegetariana', order: 14, isActive: true, categorySlug: 'comida' },
    { id: 's21', nombre: 'Almuerzos', iconName: 'FaCarrot', slug: 'almuerzos', href: '/productos/comida/almuerzos', order: 15, isActive: true, categorySlug: 'comida' },
    { id: 's22', nombre: 'Desayunos', iconName: 'FaCarrot', slug: 'desayunos', href: '/productos/comida/desayunos', order: 16, isActive: true, categorySlug: 'comida' },
    { id: 's79', nombre: 'Especiales', iconName: 'FaCarrot', slug: 'especiales', href: '/productos/comida/desayunos', order: 17, isActive: true, categorySlug: 'comida' },
    { id: 's80', nombre: 'Perros calientes', iconName: 'FaHotdog', slug: 'perros-calientes', href: '/productos/comida/perros-calientes', order: 18, isActive: true, categorySlug: 'comida' },


    // Tecnología
    { id: 's24', nombre: 'Celulares', iconName: 'FaMobileAlt', slug: 'celulares', href: '/productos/tecnologia/celulares', order: 1, isActive: true, categorySlug: 'tecnologia' },
    { id: 's25', nombre: 'Laptops', iconName: 'FaLaptop', slug: 'laptops', href: '/productos/tecnologia/laptops', order: 2, isActive: true, categorySlug: 'tecnologia' },
    { id: 's26', nombre: 'Accesorios Tech', iconName: 'FaHeadphones', slug: 'accesorios-tech', href: '/productos/tecnologia/accesorios-tech', order: 3, isActive: true, categorySlug: 'tecnologia' },
    { id: 's27', nombre: 'Smartwatches', iconName: 'FaClock', slug: 'smartwatches', href: '/productos/tecnologia/smartwatches', order: 4, isActive: true, categorySlug: 'tecnologia' },
    { id: 's28', nombre: 'Tablets', iconName: 'FaTabletAlt', slug: 'tablets', href: '/productos/tecnologia/tablets', order: 5, isActive: true, categorySlug: 'tecnologia' },
    { id: 's29', nombre: 'Cámaras', iconName: 'FaCamera', slug: 'camaras', href: '/productos/tecnologia/camaras', order: 6, isActive: true, categorySlug: 'tecnologia' },

    // Hogar y Decoración
    { id: 's30', nombre: 'Decoración', iconName: 'FaPaintRoller', slug: 'decoracion', href: '/productos/hogar/decoracion', order: 1, isActive: true, categorySlug: 'hogar' },
    { id: 's31', nombre: 'Electrodomésticos', iconName: 'FaBlender', slug: 'electrodomesticos', href: '/productos/hogar/electrodomesticos', order: 2, isActive: true, categorySlug: 'hogar' },
    { id: 's32', nombre: 'Muebles', iconName: 'FaCouch', slug: 'muebles', href: '/productos/hogar/muebles', order: 3, isActive: true, categorySlug: 'hogar' },
    { id: 's33', nombre: 'Cocina', iconName: 'FaUtensilSpoon', slug: 'cocina', href: '/productos/hogar/cocina', order: 4, isActive: true, categorySlug: 'hogar' },
    { id: 's34', nombre: 'Ropa de Cama', iconName: 'FaBed', slug: 'ropa-de-cama', href: '/productos/hogar/ropa-de-cama', order: 5, isActive: true, categorySlug: 'hogar' },
    { id: 's35', nombre: 'Iluminación', iconName: 'FaLightbulb', slug: 'iluminacion', href: '/productos/hogar/iluminacion', order: 6, isActive: true, categorySlug: 'hogar' },

    // Belleza y Cuidado
    { id: 's36', nombre: 'Maquillaje', iconName: 'FaPalette', slug: 'maquillaje', href: '/productos/belleza/maquillaje', order: 1, isActive: true, categorySlug: 'belleza' },
    { id: 's37', nombre: 'Cuidado Facial', iconName: 'FaSmile', slug: 'cuidado-facial', href: '/productos/belleza/cuidado-facial', order: 2, isActive: true, categorySlug: 'belleza' },
    { id: 's38', nombre: 'Cabello', iconName: 'FaCut', slug: 'cabello', href: '/productos/belleza/cabello', order: 3, isActive: true, categorySlug: 'belleza' },
    { id: 's39', nombre: 'Perfumes', iconName: 'FaSprayCan', slug: 'perfumes', href: '/productos/belleza/perfumes', order: 4, isActive: true, categorySlug: 'belleza' },
    { id: 's40', nombre: 'Cuidado Corporal', iconName: 'FaSoap', slug: 'cuidado-corporal', href: '/productos/belleza/cuidado-corporal', order: 5, isActive: true, categorySlug: 'belleza' },

    // Salud y Bienestar
    { id: 's41', nombre: 'Vitaminas', iconName: 'FaPills', slug: 'vitaminas', href: '/productos/salud/vitaminas', order: 1, isActive: true, categorySlug: 'salud' },
    { id: 's42', nombre: 'Suplementos', iconName: 'FaCapsules', slug: 'suplementos', href: '/productos/salud/suplementos', order: 2, isActive: true, categorySlug: 'salud' },
    { id: 's43', nombre: 'Botiquín', iconName: 'FaFirstAid', slug: 'botiquin', href: '/productos/salud/botiquin', order: 3, isActive: true, categorySlug: 'salud' },
    { id: 's44', nombre: 'Equipo Médico', iconName: 'FaStethoscope', slug: 'equipo-medico', href: '/productos/salud/equipo-medico', order: 4, isActive: true, categorySlug: 'salud' },

    // Deportes y Fitness
    { id: 's45', nombre: 'Ropa Deportiva', iconName: 'FaTshirt', slug: 'ropa-deportiva', href: '/productos/deportes/ropa-deportiva', order: 1, isActive: true, categorySlug: 'deportes' },
    { id: 's46', nombre: 'Equipos de Ejercicio', iconName: 'FaBiking', slug: 'equipos-ejercicio', href: '/productos/deportes/equipos-ejercicio', order: 2, isActive: true, categorySlug: 'deportes' },
    { id: 's47', nombre: 'Suplementos Deportivos', iconName: 'FaDumbbell', slug: 'suplementos-deportivos', href: '/productos/deportes/suplementos-deportivos', order: 3, isActive: true, categorySlug: 'deportes' },
    { id: 's48', nombre: 'Accesorios Deportivos', iconName: 'FaRunning', slug: 'accesorios-deportivos', href: '/productos/deportes/accesorios-deportivos', order: 4, isActive: true, categorySlug: 'deportes' },

    // Mascotas
    { id: 's49', nombre: 'Alimento', iconName: 'FaBone', slug: 'alimento-mascotas', href: '/productos/mascotas/alimento-mascotas', order: 1, isActive: true, categorySlug: 'mascotas' },
    { id: 's50', nombre: 'Juguetes', iconName: 'FaPaw', slug: 'juguetes-mascotas', href: '/productos/mascotas/juguetes-mascotas', order: 2, isActive: true, categorySlug: 'mascotas' },
    { id: 's51', nombre: 'Higiene', iconName: 'FaBath', slug: 'higiene-mascotas', href: '/productos/mascotas/higiene-mascotas', order: 3, isActive: true, categorySlug: 'mascotas' },
    { id: 's52', nombre: 'Accesorios Mascotas', iconName: 'FaDog', slug: 'accesorios-mascotas', href: '/productos/mascotas/accesorios-mascotas', order: 4, isActive: true, categorySlug: 'mascotas' },

    // Libros y Papelería
    { id: 's53', nombre: 'Literatura', iconName: 'FaBookOpen', slug: 'literatura', href: '/productos/libros/literatura', order: 1, isActive: true, categorySlug: 'libros' },
    { id: 's54', nombre: 'Educativos', iconName: 'FaGraduationCap', slug: 'educativos', href: '/productos/libros/educativos', order: 2, isActive: true, categorySlug: 'libros' },
    { id: 's55', nombre: 'Papelería', iconName: 'FaPen', slug: 'papeleria', href: '/productos/libros/papeleria', order: 3, isActive: true, categorySlug: 'libros' },
    { id: 's56', nombre: 'Libros Infantiles', iconName: 'FaChild', slug: 'libros-infantiles', href: '/productos/libros/libros-infantiles', order: 4, isActive: true, categorySlug: 'libros' },

    // Vehículos y Motores
    { id: 's57', nombre: 'Motos', iconName: 'FaMotorcycle', slug: 'motos', href: '/productos/vehiculos/motos', order: 1, isActive: true, categorySlug: 'vehiculos' },
    { id: 's58', nombre: 'Carros', iconName: 'FaCar', slug: 'carros', href: '/productos/vehiculos/carros', order: 2, isActive: true, categorySlug: 'vehiculos' },
    { id: 's59', nombre: 'Accesorios Auto', iconName: 'FaTools', slug: 'accesorios-auto', href: '/productos/vehiculos/accesorios-auto', order: 3, isActive: true, categorySlug: 'vehiculos' },
    { id: 's60', nombre: 'Bicicletas', iconName: 'FaBicycle', slug: 'bicicletas', href: '/productos/vehiculos/bicicletas', order: 4, isActive: true, categorySlug: 'vehiculos' },

    // Bebidas
    { id: 's61', nombre: 'Cafés', iconName: 'FaMugHot', slug: 'cafes', href: '/productos/bebidas/cafes', order: 1, isActive: true, categorySlug: 'bebidas' },
    { id: 's62', nombre: 'Jugos', iconName: 'FaGlassWater', slug: 'jugos', href: '/productos/bebidas/jugos', order: 2, isActive: true, categorySlug: 'bebidas' },
    { id: 's63', nombre: 'Gaseosas', iconName: 'FaBottleWater', slug: 'gaseosas', href: '/productos/bebidas/gaseosas', order: 3, isActive: true, categorySlug: 'bebidas' },
    { id: 's64', nombre: 'Cervezas', iconName: 'FaBeer', slug: 'cervezas', href: '/productos/bebidas/cervezas', order: 4, isActive: true, categorySlug: 'bebidas' },
    { id: 's65', nombre: 'Whiskies', iconName: 'FaWhiskeyGlass', slug: 'whiskies', href: '/productos/bebidas/whiskies', order: 5, isActive: true, categorySlug: 'bebidas' },
    { id: 's66', nombre: 'Granizados', iconName: 'FaSnowflake', slug: 'granizados', href: '/productos/bebidas/granizados', order: 6, isActive: true, categorySlug: 'bebidas' },
    { id: 's67', nombre: 'Bebidas frías', iconName: 'RiDrinks2Fill', slug: 'bebidas-frias', href: '/productos/bebidas/bebidas-frias', order: 9, isActive: true, categorySlug: 'bebidas' },
    { id: 's68', nombre: 'Bebidas calientes', iconName: 'GiCoffeeCup', slug: 'benidas-calientes', href: '/productos/bebidas/bebidas-calientes', order: 10, isActive: true, categorySlug: 'bebidas' },

    // Juguetes y Niños
    { id: 's69', nombre: 'Juguetes Educativos', iconName: 'FaPuzzlePiece', slug: 'juguetes-educativos', href: '/productos/juguetes-ninos/juguetes-educativos', order: 1, isActive: true, categorySlug: 'juguetes-ninos' },
    { id: 's70', nombre: 'Ropa Infantil', iconName: 'FaBaby', slug: 'ropa-infantil', href: '/productos/juguetes-ninos/ropa-infantil', order: 2, isActive: true, categorySlug: 'juguetes-ninos' },
    { id: 's71', nombre: 'Juegos de Mesa', iconName: 'FaChess', slug: 'juegos-mesa', href: '/productos/juguetes-ninos/juegos-mesa', order: 3, isActive: true, categorySlug: 'juguetes-ninos' },

    // Jardinería
    { id: 's72', nombre: 'Plantas', iconName: 'FaLeaf', slug: 'plantas', href: '/productos/jardineria/plantas', order: 1, isActive: true, categorySlug: 'jardineria' },
    { id: 's73', nombre: 'Herramientas Jardín', iconName: 'FaShovel', slug: 'herramientas-jardin', href: '/productos/jardineria/herramientas-jardin', order: 2, isActive: true, categorySlug: 'jardineria' },
    { id: 's74', nombre: 'Decoración Jardín', iconName: 'FaTree', slug: 'decoracion-jardin', href: '/productos/jardineria/decoracion-jardin', order: 3, isActive: true, categorySlug: 'jardineria' },

    // Viajes y Aventura
    { id: 's75', nombre: 'Equipaje', iconName: 'FaSuitcase', slug: 'equipaje', href: '/productos/viajes/equipaje', order: 1, isActive: true, categorySlug: 'viajes' },
    { id: 's76', nombre: 'Accesorios de Viaje', iconName: 'FaPassport', slug: 'accesorios-viaje', href: '/productos/viajes/accesorios-viaje', order: 2, isActive: true, categorySlug: 'viajes' },
    { id: 's77', nombre: 'Equipo de Camping', iconName: 'FaCampground', slug: 'equipo-camping', href: '/productos/viajes/equipo-camping', order: 3, isActive: true, categorySlug: 'viajes' },
  ],
};