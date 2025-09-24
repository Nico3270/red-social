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
    { id: '2', nombre: 'Comida', iconName: 'comidas.png', slug: 'comida', isActive: true },
    { id: '11', nombre: 'Bebidas', iconName: 'drinks.png', slug: 'bebidas', isActive: true },
    { id: '1', nombre: 'Moda y Accesorios', iconName: 'moda.png', slug: 'moda', isActive: true },
    { id: '3', nombre: 'Tecnología', iconName: 'tecnologia.png', slug: 'tecnologia', isActive: true },
    { id: '4', nombre: 'Hogar y Decoración', iconName: 'hogar.png', slug: 'hogar', isActive: true },
    { id: '5', nombre: 'Belleza y Cuidado', iconName: 'belleza.png', slug: 'belleza', isActive: true },
    { id: '6', nombre: 'Salud y Bienestar', iconName: 'salud.png', slug: 'salud', isActive: true },
    { id: '7', nombre: 'Deportes y Fitness', iconName: 'deportes.png', slug: 'deportes', isActive: true },
    { id: '8', nombre: 'Mascotas', iconName: 'mascotas.png', slug: 'mascotas', isActive: true },
    { id: '9', nombre: 'Libros y Papelería', iconName: 'libros.png', slug: 'libros', isActive: true },
    { id: '10', nombre: 'Vehículos y Motores', iconName: 'vehiculos.png', slug: 'vehiculos', isActive: true },
    { id: '12', nombre: 'Juguetes y Niños', iconName: 'juguetesNinos.png', slug: 'juguetes-ninos', isActive: true },
    { id: '13', nombre: 'Jardinería', iconName: 'jardineria.png', slug: 'jardineria', isActive: true },
    { id: '14', nombre: 'Viajes y Aventura', iconName: 'viajes.png', slug: 'viajes', isActive: true },
    { id: '15', nombre: 'Inmuebles - Propiedades', iconName: 'inmuebles.png', slug: 'inmuebles', isActive: true },
    { id: '16', nombre: 'Hospedaje y turismo', iconName: 'hospedaje.png', slug: 'hospedaje', isActive: true },
    { id: '17', nombre: 'Servicios profesionales', iconName: 'servicios-profesionales.png', slug: 'servicios', isActive: true },
    { id: '18', nombre: 'Negocios', iconName: 'negocios.png', slug: 'negocios', isActive: true },
  ],
  secciones: [
    // Moda y Accesorios
    { id: 's4', nombre: 'Accesorios', iconName: 'accesorios.png', slug: 'accesorios', href: '/productos/moda/accesorios', order: 4, isActive: true, categorySlug: 'moda' },
    { id: 's122', nombre: 'Billeteras', iconName: 'billeteras.png', slug: 'billeteras', href: '/productos/moda/billeteras', order: 1, isActive: true, categorySlug: 'moda' },
    { id: 's124', nombre: 'Blusas', iconName: 'blusas.png', slug: 'blusas', href: '/productos/moda/blusas', order: 1, isActive: true, categorySlug: 'moda' },
    { id: 's120', nombre: 'Bolsos', iconName: 'bolsos.png', slug: 'bolsos', href: '/productos/moda/bolsos', order: 1, isActive: true, categorySlug: 'moda' },
    { id: 's153', nombre: 'Botas', iconName: 'botas.png', slug: 'botas', href: '/productos/moda/botas', order: 10, isActive: true, categorySlug: 'moda' },
    { id: 's87', nombre: 'Bufandas', iconName: 'bufandas.png', slug: 'bufandas', href: '/productos/moda/bufandas', order: 15, isActive: true, categorySlug: 'moda' },
    { id: 's1', nombre: 'Camisas', iconName: 'camisas.png', slug: 'camisas', href: '/productos/moda/camisas', order: 1, isActive: true, categorySlug: 'moda' },
    { id: 's112', nombre: 'Camisetas', iconName: 't-shirts.png', slug: 'camisetas', href: '/productos/moda/camisetas', order: 1, isActive: true, categorySlug: 'moda' },
    { id: 's5', nombre: 'Chaquetas', iconName: 'jackets.png', slug: 'chaquetas', href: '/productos/moda/chaquetas', order: 5, isActive: true, categorySlug: 'moda' },
    { id: 's82', nombre: 'Corbatas', iconName: 'corbatas.png', slug: 'corbatas', href: '/productos/moda/corbatas', order: 10, isActive: true, categorySlug: 'moda' },
    { id: 's85', nombre: 'Faldas', iconName: 'faldas.png', slug: 'faldas', href: '/productos/moda/faldas', order: 13, isActive: true, categorySlug: 'moda' },
    { id: 's84', nombre: 'Gorras', iconName: 'gorras.png', slug: 'gorras', href: '/productos/moda/gorras', order: 8, isActive: true, categorySlug: 'moda' },
    { id: 's88', nombre: 'Guantes', iconName: 'guantes.png', slug: 'guantes', href: '/productos/moda/guantes', order: 16, isActive: true, categorySlug: 'moda' },
    { id: 's118', nombre: 'Hoodies', iconName: 'hoodies.png', slug: 'hoodies', href: '/productos/moda/hoodies', order: 1, isActive: true, categorySlug: 'moda' },
    { id: 's121', nombre: 'Maletas', iconName: 'maletas.png', slug: 'maletas', href: '/productos/moda/maletas', order: 1, isActive: true, categorySlug: 'moda' },
    { id: 's89', nombre: 'Medias', iconName: 'medias.png', slug: 'medias', href: '/productos/moda/medias', order: 17, isActive: true, categorySlug: 'moda' },
    { id: 's2', nombre: 'Pantalones', iconName: 'pantalones.png', slug: 'pantalones', href: '/productos/moda/pantalones', order: 2, isActive: true, categorySlug: 'moda' },
    { id: 's113', nombre: 'Ropa Deportiva', iconName: 'ropa-deportiva.png', slug: 'ropa-deportiva1', href: '/productos/moda/ropa-deportiva', order: 1, isActive: true, categorySlug: 'moda' },
    { id: 's7', nombre: 'Ropa Interior', iconName: 'ropaInterior.png', slug: 'ropa-interior', href: '/productos/moda/ropa-interior', order: 7, isActive: true, categorySlug: 'moda' },
    { id: 's123', nombre: 'Sacos', iconName: 'sacos.png', slug: 'sacos', href: '/productos/moda/sacos', order: 1, isActive: true, categorySlug: 'moda' },
    { id: 's90', nombre: 'Sandalias', iconName: 'sandalias.png', slug: 'sandalias', href: '/productos/moda/sandalias', order: 18, isActive: true, categorySlug: 'moda' },
    { id: 's119', nombre: 'Shorts', iconName: 'shorts.png', slug: 'shorts', href: '/productos/moda/shorts', order: 1, isActive: true, categorySlug: 'moda' },
    { id: 's86', nombre: 'Sombreros', iconName: 'sombreros.png', slug: 'sombreros', href: '/productos/moda/sombreros', order: 14, isActive: true, categorySlug: 'moda' },
    { id: 's83', nombre: 'Sudaderas', iconName: 'sudaderas.png', slug: 'sudaderas', href: '/productos/moda/sudaderas', order: 11, isActive: true, categorySlug: 'moda' },
    { id: 's81', nombre: 'Vestidos Hombre', iconName: 'vestidoHombre.png', slug: 'vestidos-hombre', href: '/productos/moda/vestidos-hombre', order: 9, isActive: true, categorySlug: 'moda' },
    { id: 's6', nombre: 'Vestidos mujer', iconName: 'vestidos.png', slug: 'vestidosMujer', href: '/productos/moda/vestidosMujer', order: 6, isActive: true, categorySlug: 'moda' },
    { id: 's3', nombre: 'Zapatos', iconName: 'zapatos.png', slug: 'zapatos', href: '/productos/moda/zapatos', order: 3, isActive: true, categorySlug: 'moda' },
    { id: 's152', nombre: 'Zapatos deportivos', iconName: 'zapatos-deportivos.png', slug: 'zapatos-deportivos', href: '/productos/moda/zapatos-deportivos', order: 10, isActive: true, categorySlug: 'moda' },
    { id: 's149', nombre: 'Zapatos de hombre', iconName: 'zapatos-hombre.webp', slug: 'zapatos-hombre', href: '/productos/moda/zapatos-hombre', order: 10, isActive: true, categorySlug: 'moda' },
    { id: 's151', nombre: 'Zapatos de niño', iconName: 'zapatos-nino.png', slug: 'zapatos-nino', href: '/productos/moda/zapatos-nino', order: 10, isActive: true, categorySlug: 'moda' },
    { id: 's150', nombre: 'Zapatos de mujer', iconName: 'zapatos-mujer.png', slug: 'zapatos-mujer', href: '/productos/moda/zapatos-mujer', order: 10, isActive: true, categorySlug: 'moda' },

    // Comida
    { id: 's127', nombre: 'Adicionales', iconName: 'adicionales.webp', slug: 'wraps', href: '/productos/comida/adicionales', order: 30, isActive: true, categorySlug: 'comida' },
    { id: 's21', nombre: 'Almuerzos', iconName: 'almuerzos.png', slug: 'almuerzos', href: '/productos/comida/almuerzos', order: 15, isActive: true, categorySlug: 'comida' },
    { id: 's12', nombre: 'Carnes', iconName: 'carnes.png', slug: 'carnes', href: '/productos/comida/carnes', order: 6, isActive: true, categorySlug: 'comida' },
    { id: 's78', nombre: 'Comida Saludable', iconName: 'salads.png', slug: 'comida-saludable', href: '/productos/comida/comida-saludable', order: 5, isActive: true, categorySlug: 'comida' },
    { id: 's8', nombre: 'Comida Rápida', iconName: 'comidas.png', slug: 'comida-rapida', href: '/productos/comida/comida-rapida', order: 1, isActive: true, categorySlug: 'comida' },
    { id: 's22', nombre: 'Desayunos', iconName: 'desayunos.png', slug: 'desayunos', href: '/productos/comida/desayunos', order: 16, isActive: true, categorySlug: 'comida' },
    { id: 's100', nombre: 'Empanadas', iconName: 'empanadas.png', slug: 'empanadas', href: '/productos/comida/empanadas', order: 28, isActive: true, categorySlug: 'comida' },
    { id: 's91', nombre: 'Ensaladas', iconName: 'ensaladas.png', slug: 'ensaladas', href: '/productos/comida/ensaladas', order: 19, isActive: true, categorySlug: 'comida' },
    { id: 's125', nombre: 'Entradas', iconName: 'entradas.webp', slug: 'entradas', href: '/productos/comida/entradas', order: 30, isActive: true, categorySlug: 'comida' },
    { id: 's79', nombre: 'Especiales', iconName: 'comidaEspecial.png', slug: 'especiales', href: '/productos/comida/desayunos', order: 17, isActive: true, categorySlug: 'comida' },
    { id: 's14', nombre: 'Hamburguesas', iconName: 'hamburguesas.png', slug: 'hamburguesas', href: '/productos/comida/hamburguesas', order: 8, isActive: true, categorySlug: 'comida' },
    { id: 's102', nombre: 'Helados', iconName: 'helados.png', slug: 'helados', href: '/productos/comida/helados', order: 30, isActive: true, categorySlug: 'comida' },
    { id: 's17', nombre: 'Italiana', iconName: 'italiana.png', slug: 'italiana', href: '/productos/comida/italiana', order: 11, isActive: true, categorySlug: 'comida' },
    { id: 's11', nombre: 'Menús del Día', iconName: 'almuerzo-dia.png', slug: 'menus-dia', href: '/productos/comida/menus-dia', order: 4, isActive: true, categorySlug: 'comida' },
    { id: 's16', nombre: 'Mexicana', iconName: 'mexicana.png', slug: 'mexicana', href: '/productos/comida/mexicana', order: 10, isActive: true, categorySlug: 'comida' },
    { id: 's18', nombre: 'Oriental', iconName: 'oriental.png', slug: 'oriental', href: '/productos/comida/oriental', order: 12, isActive: true, categorySlug: 'comida' },
    { id: 's99', nombre: 'Panadería', iconName: 'panaderia.png', slug: 'panaderia', href: '/productos/comida/panaderia', order: 27, isActive: true, categorySlug: 'comida' },
    { id: 's93', nombre: 'Pastas', iconName: 'pastas.png', slug: 'pastas', href: '/productos/comida/pastas', order: 21, isActive: true, categorySlug: 'comida' },
    { id: 's80', nombre: 'Perros calientes', iconName: 'hotDog.png', slug: 'perros-calientes', href: '/productos/comida/perros-calientes', order: 18, isActive: true, categorySlug: 'comida' },
    { id: 's13', nombre: 'Pescados', iconName: 'pescados.png', slug: 'pescados', href: '/productos/comida/pescados', order: 7, isActive: true, categorySlug: 'comida' },
    { id: 's15', nombre: 'Pizzas', iconName: 'pizza.png', slug: 'pizzas', href: '/productos/comida/pizzas', order: 9, isActive: true, categorySlug: 'comida' },
    { id: 's19', nombre: 'Pollo', iconName: 'pollo.png', slug: 'pollo', href: '/productos/comida/pollo', order: 13, isActive: true, categorySlug: 'comida' },
    { id: 's10', nombre: 'Postres', iconName: 'postres.png', slug: 'postres', href: '/productos/comida/postres', order: 3, isActive: true, categorySlug: 'comida' },
    { id: 's92', nombre: 'Sopas', iconName: 'sopas.webp', slug: 'sopas', href: '/productos/comida/sopas', order: 20, isActive: true, categorySlug: 'comida' },
    { id: 's101', nombre: 'Tacos', iconName: 'tacos.png', slug: 'tacos', href: '/productos/comida/tacos', order: 29, isActive: true, categorySlug: 'comida' },
    { id: 's20', nombre: 'Vegetariana', iconName: 'salads.png', slug: 'vegetariana', href: '/productos/comida/vegetariana', order: 14, isActive: true, categorySlug: 'comida' },
    { id: 's126', nombre: 'Wraps', iconName: 'wraps.webp', slug: 'wraps', href: '/productos/comida/wraps', order: 30, isActive: true, categorySlug: 'comida' },

    // Tecnología
    { id: 's26', nombre: 'Accesorios Tech', iconName: 'audifonos.png', slug: 'accesorios-tech', href: '/productos/tecnologia/accesorios-tech', order: 3, isActive: true, categorySlug: 'tecnologia' },
    { id: 's115', nombre: 'Audio', iconName: 'audio.png', slug: 'audio', href: '/productos/tecnologia/audio', order: 8, isActive: true, categorySlug: 'tecnologia' },
    { id: 's29', nombre: 'Cámaras', iconName: 'cameras.png', slug: 'camaras', href: '/productos/tecnologia/camaras', order: 6, isActive: true, categorySlug: 'tecnologia' },
    { id: 's24', nombre: 'Celulares', iconName: 'celulares.png', slug: 'celulares', href: '/productos/tecnologia/celulares', order: 1, isActive: true, categorySlug: 'tecnologia' },
    { id: 's114', nombre: 'Gaming', iconName: 'gaming.png', slug: 'gaming', href: '/productos/tecnologia/gaming', order: 7, isActive: true, categorySlug: 'tecnologia' },
    { id: 's25', nombre: 'Laptops', iconName: 'laptops.png', slug: 'laptops', href: '/productos/tecnologia/laptops', order: 2, isActive: true, categorySlug: 'tecnologia' },
    { id: 's116', nombre: 'Smart Home', iconName: 'appliances.png', slug: 'audio', href: '/productos/tecnologia/smart-home', order: 9, isActive: true, categorySlug: 'tecnologia' },
    { id: 's27', nombre: 'Smartwatches', iconName: 'smartwatch.png', slug: 'smartwatches', href: '/productos/tecnologia/smartwatches', order: 4, isActive: true, categorySlug: 'tecnologia' },
    { id: 's28', nombre: 'Tablets', iconName: 'tablet.png', slug: 'tablets', href: '/productos/tecnologia/tablets', order: 5, isActive: true, categorySlug: 'tecnologia' },

    // Hogar y Decoración
    { id: 's33', nombre: 'Cocina', iconName: 'cocina.png', slug: 'cocina', href: '/productos/hogar/cocina', order: 4, isActive: true, categorySlug: 'hogar' },
    { id: 's30', nombre: 'Decoración', iconName: 'decoracion.png', slug: 'decoracion', href: '/productos/hogar/decoracion', order: 1, isActive: true, categorySlug: 'hogar' },
    { id: 's31', nombre: 'Electrodomésticos', iconName: 'electrodomesticos.png', slug: 'electrodomesticos', href: '/productos/hogar/electrodomesticos', order: 2, isActive: true, categorySlug: 'hogar' },
    { id: 's35', nombre: 'Iluminación', iconName: 'bombillos.png', slug: 'iluminacion', href: '/productos/hogar/iluminacion', order: 6, isActive: true, categorySlug: 'hogar' },
    { id: 's32', nombre: 'Muebles', iconName: 'muebles.png', slug: 'muebles', href: '/productos/hogar/muebles', order: 3, isActive: true, categorySlug: 'hogar' },
    { id: 's34', nombre: 'Ropa de Cama', iconName: 'ropaCama.png', slug: 'ropa-de-cama', href: '/productos/hogar/ropa-de-cama', order: 5, isActive: true, categorySlug: 'hogar' },

    // Belleza y Cuidado
    { id: 's38', nombre: 'Cabello', iconName: 'barber.png', slug: 'cabello', href: '/productos/belleza/cabello', order: 3, isActive: true, categorySlug: 'belleza' },
    { id: 's40', nombre: 'Cuidado Corporal', iconName: 'body-care.png', slug: 'cuidado-corporal', href: '/productos/belleza/cuidado-corporal', order: 5, isActive: true, categorySlug: 'belleza' },
    { id: 's37', nombre: 'Cuidado Facial', iconName: 'skincare.png', slug: 'cuidado-facial', href: '/productos/belleza/cuidado-facial', order: 2, isActive: true, categorySlug: 'belleza' },
    { id: 's36', nombre: 'Maquillaje', iconName: 'maquillaje.png', slug: 'maquillaje', href: '/productos/belleza/maquillaje', order: 1, isActive: true, categorySlug: 'belleza' },
    { id: 's39', nombre: 'Perfumes', iconName: 'perfumes.png', slug: 'perfumes', href: '/productos/belleza/perfumes', order: 4, isActive: true, categorySlug: 'belleza' },
    { id: 's159', nombre: 'Uñas', iconName: 'unas.png', slug: 'unas', href: '/productos/belleza/unas', order: 4, isActive: true, categorySlug: 'belleza' },

    // Salud y Bienestar
    { id: 's43', nombre: 'Botiquín', iconName: 'botiquin.png', slug: 'botiquin', href: '/productos/salud/botiquin', order: 3, isActive: true, categorySlug: 'salud' },
    { id: 's44', nombre: 'Equipo Médico', iconName: 'equipoMedico.png', slug: 'equipo-medico', href: '/productos/salud/equipo-medico', order: 4, isActive: true, categorySlug: 'salud' },
    { id: 's42', nombre: 'Suplementos', iconName: 'suplementos.png', slug: 'suplementos', href: '/productos/salud/suplementos', order: 2, isActive: true, categorySlug: 'salud' },
    { id: 's41', nombre: 'Vitaminas', iconName: 'vitaminas.png', slug: 'vitaminas', href: '/productos/salud/vitaminas', order: 1, isActive: true, categorySlug: 'salud' },

    // Deportes y Fitness
    { id: 's48', nombre: 'Accesorios Deportivos', iconName: 'accesoriosDeportivos.png', slug: 'accesorios-deportivos', href: '/productos/deportes/accesorios-deportivos', order: 4, isActive: true, categorySlug: 'deportes' },
    { id: 's46', nombre: 'Equipos de Ejercicio', iconName: 'equiposEjercicio.png', slug: 'equipos-ejercicio', href: '/productos/deportes/equipos-ejercicio', order: 2, isActive: true, categorySlug: 'deportes' },
    { id: 's45', nombre: 'Ropa Deportiva', iconName: 'ropaDeportiva.png', slug: 'ropa-deportiva', href: '/productos/deportes/ropa-deportiva', order: 1, isActive: true, categorySlug: 'deportes' },
    { id: 's47', nombre: 'Suplementos Deportivos', iconName: 'suplementosDeportivos.png', slug: 'suplementos-deportivos', href: '/productos/deportes/suplementos-deportivos', order: 3, isActive: true, categorySlug: 'deportes' },

    // Mascotas
    { id: 's52', nombre: 'Accesorios Mascotas', iconName: 'accesoriosMascotas.png', slug: 'accesorios-mascotas', href: '/productos/mascotas/accesorios-mascotas', order: 4, isActive: true, categorySlug: 'mascotas' },
    { id: 's49', nombre: 'Alimento', iconName: 'alimentoMascota.png', slug: 'alimento-mascotas', href: '/productos/mascotas/alimento-mascotas', order: 1, isActive: true, categorySlug: 'mascotas' },
    { id: 's51', nombre: 'Higiene', iconName: 'higieneMascotas.png', slug: 'higiene-mascotas', href: '/productos/mascotas/higiene-mascotas', order: 3, isActive: true, categorySlug: 'mascotas' },
    { id: 's50', nombre: 'Juguetes', iconName: 'juguetes.png', slug: 'juguetes-mascotas', href: '/productos/mascotas/juguetes-mascotas', order: 2, isActive: true, categorySlug: 'mascotas' },

    // Libros y Papelería
    { id: 's54', nombre: 'Educativos', iconName: 'study.png', slug: 'educativos', href: '/productos/libros/educativos', order: 2, isActive: true, categorySlug: 'libros' },
    { id: 's71', nombre: 'Juegos de Mesa', iconName: 'juegosMesa.png', slug: 'juegos-mesa', href: '/productos/juguetes-ninos/juegos-mesa', order: 3, isActive: true, categorySlug: 'juguetes-ninos' },
    { id: 's69', nombre: 'Juguetes Educativos', iconName: 'juguetesEducativos.png', slug: 'juguetes-educativos', href: '/productos/juguetes-ninos/juguetes-educativos', order: 1, isActive: true, categorySlug: 'juguetes-ninos' },
    { id: 's56', nombre: 'Libros Infantiles', iconName: 'librosInfantiles.png', slug: 'libros-infantiles', href: '/productos/libros/libros-infantiles', order: 4, isActive: true, categorySlug: 'libros' },
    { id: 's53', nombre: 'Literatura', iconName: 'literatura.png', slug: 'literatura', href: '/productos/libros/literatura', order: 1, isActive: true, categorySlug: 'libros' },
    { id: 's55', nombre: 'Papelería', iconName: 'papeleria.png', slug: 'papeleria', href: '/productos/libros/papeleria', order: 3, isActive: true, categorySlug: 'libros' },
    { id: 's70', nombre: 'Ropa Infantil', iconName: 'ropaBebe.png', slug: 'ropa-infantil', href: '/productos/juguetes-ninos/ropa-infantil', order: 2, isActive: true, categorySlug: 'juguetes-ninos' },

    // Vehículos y Motores
    { id: 's59', nombre: 'Accesorios Auto', iconName: 'accesoriosVehiculos.png', slug: 'accesorios-auto', href: '/productos/vehiculos/accesorios-auto', order: 3, isActive: true, categorySlug: 'vehiculos' },
    { id: 's137', nombre: 'Autos Usados', iconName: 'carro-usado.png', slug: 'autos-usados', href: '/productos/vehiculos/autos-usados', order: 6, isActive: true, categorySlug: 'vehiculos' },
    { id: 's133', nombre: 'Autos Nuevos', iconName: 'auto-nuevo.webp', slug: 'autos-nuevos', href: '/productos/vehiculos/autos-nuevos', order: 5, isActive: true, categorySlug: 'vehiculos' },
    { id: 's60', nombre: 'Bicicletas', iconName: 'bicicletas.png', slug: 'bicicletas', href: '/productos/vehiculos/bicicletas', order: 4, isActive: true, categorySlug: 'vehiculos' },
    { id: 's158', nombre: 'Camionetas', iconName: 'camionetas.png', slug: 'camionetas', href: '/productos/vehiculos/camionetas', order: 12, isActive: true, categorySlug: 'vehiculos' },
    { id: 's138', nombre: 'Camiones y Pesados', iconName: 'camion.png', slug: 'camiones-pesados', href: '/productos/vehiculos/camiones-pesados', order: 7, isActive: true, categorySlug: 'vehiculos' },
    { id: 's57', nombre: 'Motos', iconName: 'bikes.png', slug: 'motos', href: '/productos/vehiculos/motos', order: 1, isActive: true, categorySlug: 'vehiculos' },
    { id: 's139', nombre: 'Repuestos', iconName: 'repuestos.png', slug: 'accesorios-repuestos', href: '/productos/vehiculos/accesorios-repuestos', order: 8, isActive: true, categorySlug: 'vehiculos' },

    // Bebidas
    { id: 's110', nombre: 'Agua', iconName: 'agua.png', slug: 'agua', href: '/productos/bebidas/agua', order: 16, isActive: true, categorySlug: 'bebidas' },
    { id: 's67', nombre: 'Bebidas frías', iconName: 'bebidaFria.png', slug: 'bebidas-frias', href: '/productos/bebidas/bebidas-frias', order: 9, isActive: true, categorySlug: 'bebidas' },
    { id: 's68', nombre: 'Bebidas calientes', iconName: 'bebidascalientes.png', slug: 'benidas-calientes', href: '/productos/bebidas/bebidas-calientes', order: 10, isActive: true, categorySlug: 'bebidas' },
    { id: 's61', nombre: 'Cafés', iconName: 'cafe.png', slug: 'cafes', href: '/productos/bebidas/cafes', order: 1, isActive: true, categorySlug: 'bebidas' },
    { id: 's64', nombre: 'Cervezas', iconName: 'cerveza.png', slug: 'cervezas', href: '/productos/bebidas/cervezas', order: 4, isActive: true, categorySlug: 'bebidas' },
    { id: 's107', nombre: 'Cocteles', iconName: 'cocteles.png', slug: 'cocteles', href: '/productos/bebidas/cocteles', order: 13, isActive: true, categorySlug: 'bebidas' },
    { id: 's63', nombre: 'Gaseosas', iconName: 'gaseosa.png', slug: 'gaseosas', href: '/productos/bebidas/gaseosas', order: 3, isActive: true, categorySlug: 'bebidas' },
    { id: 's66', nombre: 'Granizados', iconName: 'granizados.png', slug: 'granizados', href: '/productos/bebidas/granizados', order: 6, isActive: true, categorySlug: 'bebidas' },
    { id: 's62', nombre: 'Jugos', iconName: 'jugosNaturales.png', slug: 'jugos', href: '/productos/bebidas/jugos', order: 2, isActive: true, categorySlug: 'bebidas' },
    { id: 's105', nombre: 'Limonadas', iconName: 'limonadas.png', slug: 'limonadas', href: '/productos/bebidas/limonadas', order: 11, isActive: true, categorySlug: 'bebidas' },
    { id: 's106', nombre: 'Malteadas', iconName: 'malteadas.png', slug: 'malteadas', href: '/productos/bebidas/malteadas', order: 12, isActive: true, categorySlug: 'bebidas' },
    { id: 's111', nombre: 'Otras bebidas ', iconName: 'otrasBebidas.png', slug: 'ron', href: '/productos/bebidas/ron', order: 17, isActive: true, categorySlug: 'bebidas' },
    { id: 's128', nombre: 'Smothies', iconName: 'postres.png', slug: 'smothies', href: '/productos/bebidas/smothies', order: 18, isActive: true, categorySlug: 'bebidas' },
    { id: 's103', nombre: 'Té', iconName: 'tes.png', slug: 'tes', href: '/productos/bebidas/tes', order: 7, isActive: true, categorySlug: 'bebidas' },
    { id: 's104', nombre: 'Vinos', iconName: 'vinos.png', slug: 'vinos', href: '/productos/bebidas/vinos', order: 8, isActive: true, categorySlug: 'bebidas' },
    { id: 's65', nombre: 'Whiskies', iconName: 'whisky.png', slug: 'whiskies', href: '/productos/bebidas/whiskies', order: 5, isActive: true, categorySlug: 'bebidas' },

    // Juguetes y Niños
    { id: 's74', nombre: 'Decoración Jardín', iconName: 'decoracionJardin.png', slug: 'decoracion-jardin', href: '/productos/jardineria/decoracion-jardin', order: 3, isActive: true, categorySlug: 'jardineria' },
    { id: 's73', nombre: 'Herramientas Jardín', iconName: 'gardenKit.png', slug: 'herramientas-jardin', href: '/productos/jardineria/herramientas-jardin', order: 2, isActive: true, categorySlug: 'jardineria' },
    { id: 's72', nombre: 'Plantas', iconName: 'plantas.png', slug: 'plantas', href: '/productos/jardineria/plantas', order: 1, isActive: true, categorySlug: 'jardineria' },

    // Viajes y Aventura
    { id: 's76', nombre: 'Accesorios de Viaje', iconName: 'accesoriosViaje.png', slug: 'accesorios-viaje', href: '/productos/viajes/accesorios-viaje', order: 2, isActive: true, categorySlug: 'viajes' },
    { id: 's77', nombre: 'Equipo de Camping', iconName: 'camping.png', slug: 'equipo-camping', href: '/productos/viajes/equipo-camping', order: 3, isActive: true, categorySlug: 'viajes' },
    { id: 's75', nombre: 'Equipaje', iconName: 'equipaje.png', slug: 'equipaje', href: '/productos/viajes/equipaje', order: 1, isActive: true, categorySlug: 'viajes' },

    // Inmuebles - Propiedades
    { id: 's136', nombre: 'Apartamentos', iconName: 'apartamentos.png', slug: 'apartamentos', href: '/productos/inmuebles/apartamentos', order: 8, isActive: true, categorySlug: 'inmuebles' },
    { id: 's135', nombre: 'Casas', iconName: 'casas.png', slug: 'casas', href: '/productos/inmuebles/casas', order: 7, isActive: true, categorySlug: 'inmuebles' },
    { id: 's130', nombre: 'En Alquiler', iconName: 'alquiler.png', slug: 'en-alquiler', href: '/productos/inmuebles/en-alquiler', order: 2, isActive: true, categorySlug: 'inmuebles' },
    { id: 's129', nombre: 'En Venta', iconName: 'ventas.webp', slug: 'en-venta', href: '/productos/inmuebles/en-venta', order: 1, isActive: true, categorySlug: 'inmuebles' },
    { id: 's154', nombre: 'Fincas y Cabañas', iconName: 'fincas.png', slug: 'fincas-cabanas', href: '/productos/inmuebles/fincas-cabanas', order: 5, isActive: true, categorySlug: 'inmuebles' },
    { id: 's157', nombre: 'Habitaciones', iconName: 'habitaciones.png', slug: 'habitaciones1', href: '/productos/inmuebles/habitaciones', order: 6, isActive: true, categorySlug: 'inmuebles' },
    { id: 's132', nombre: 'Oficinas y Comerciales', iconName: 'oficinas.png', slug: 'oficinas-comerciales', href: '/productos/inmuebles/oficinas-comerciales', order: 4, isActive: true, categorySlug: 'inmuebles' },
    { id: 's131', nombre: 'Terrenos y Lotes', iconName: 'lote.png', slug: 'terrenos-lotes', href: '/productos/inmuebles/terrenos-lotes', order: 3, isActive: true, categorySlug: 'inmuebles' },

    // Hospedaje y turismo
    { id: 's140', nombre: 'Habitaciones', iconName: 'habitaciones.png', slug: 'habitaciones', href: '/productos/hospedaje/habitaciones', order: 1, isActive: true, categorySlug: 'hospedaje' },
    { id: 's141', nombre: 'Paquetes Vacacionales', iconName: 'vacaciones.png', slug: 'paquetes-vacacionales', href: '/productos/hospedaje/paquetes-vacacionales', order: 2, isActive: true, categorySlug: 'hospedaje' },
    { id: 's142', nombre: 'Propiedades enteras', iconName: 'propiedades.png', slug: 'propiedades-enteras', href: '/productos/hospedaje/propiedades-enteras', order: 2, isActive: true, categorySlug: 'hospedaje' },
    { id: 's143', nombre: 'Servicios Adicionales', iconName: 'hotel.png', slug: 'servicios-adicionales', href: '/productos/hospedaje/servicios-adicionales', order: 4, isActive: true, categorySlug: 'hospedaje' },
    { id: 's155', nombre: 'Suites y Premium', iconName: 'suit.png', slug: 'suites-premium', href: '/productos/hospedaje/suites-premium', order: 3, isActive: true, categorySlug: 'hospedaje' },
    { id: 's144', nombre: 'Turismo y Experiencias', iconName: 'paisajes.png', slug: 'turismo-experiencias', href: '/productos/hospedaje/turismo-experiencias', order: 5, isActive: true, categorySlug: 'hospedaje' },

    // Servicios profesionales
    { id: 's145', nombre: 'Consultorías', iconName: 'consultorias.png', slug: 'consultorias', href: '/productos/servicios/consultorias', order: 1, isActive: true, categorySlug: 'servicios' },
    { id: 's147', nombre: 'Eventos y Organización', iconName: 'eventos.png', slug: 'eventos-organizacion', href: '/productos/servicios/eventos-organizacion', order: 3, isActive: true, categorySlug: 'servicios' },
    { id: 's148', nombre: 'Otros Servicios', iconName: 'servicios.png', slug: 'otros-servicios', href: '/productos/servicios/otros-servicios', order: 4, isActive: true, categorySlug: 'servicios' },
    { id: 's146', nombre: 'Reparaciones y Mantenimiento', iconName: 'reparaciones.png', slug: 'reparaciones-mantenimiento', href: '/productos/servicios/reparaciones-mantenimiento', order: 2, isActive: true, categorySlug: 'servicios' },

    // Negocios
    { id: 's160', nombre: 'Alimentos', iconName: 'alimentos.png', slug: 'alimentos', href: '/productos/negocios/alimentos', order: 1, isActive: true, categorySlug: 'negocios' },
    { id: 's172', nombre: 'Bebidas Alcohólicas', iconName: 'bebidas.png', slug: 'bebidas-alcoholicas', href: '/productos/negocios/bebidas', order: 15, isActive: true, categorySlug: 'negocios' },
    { id: 's170', nombre: 'Carnes y Embutidos', iconName: 'carnes-embutidos.png', slug: 'carnes-embutidos', href: '/productos/negocios/carnes-embutidos', order: 11, isActive: true, categorySlug: 'negocios' },
    { id: 's162', nombre: 'Cuidado Personal', iconName: 'cuidado-personal.png', slug: 'cuidado-personal', href: '/productos/negocios/cuidado-personal', order: 3, isActive: true, categorySlug: 'negocios' },
    { id: 's163', nombre: 'Frutas y Verduras', iconName: 'frutas-verduras.png', slug: 'frutas-verduras', href: '/productos/negocios/frutas-verduras', order: 4, isActive: true, categorySlug: 'negocios' },
    { id: 's164', nombre: 'Hogar Básico', iconName: 'hogar-basico.png', slug: 'hogar-basico', href: '/productos/negocios/hogar-basico', order: 5, isActive: true, categorySlug: 'negocios' },
    { id: 's165', nombre: 'Lácteos', iconName: 'lacteos.png', slug: 'lacteos', href: '/productos/negocios/lacteos', order: 6, isActive: true, categorySlug: 'negocios' },
    { id: 's166', nombre: 'Limpieza', iconName: 'limpieza.png', slug: 'limpieza', href: '/productos/negocios/limpieza', order: 7, isActive: true, categorySlug: 'negocios' },
    { id: 's171', nombre: 'Panadería y Pastelería', iconName: 'panaderia-pasteleria.png', slug: 'panaderia-pasteleria', href: '/productos/negocios/panaderia-pasteleria', order: 14, isActive: true, categorySlug: 'negocios' },
    { id: 's167', nombre: 'Papelería y Miscelaneas', iconName: 'papeleria.png', slug: 'papeleria-miscelaneas', href: '/productos/negocios/papeleria', order: 8, isActive: true, categorySlug: 'negocios' },
    { id: 's168', nombre: 'Regalos y detalles', iconName: 'regalos.png', slug: 'regalos', href: '/productos/negocios/regalos', order: 9, isActive: true, categorySlug: 'negocios' },
    { id: 's169', nombre: 'Snacks y Dulces', iconName: 'snacks.png', slug: 'snacks-dulces', href: '/productos/negocios/snacks-dulces', order: 10, isActive: true, categorySlug: 'negocios' },
    { id: 's173', nombre: 'Herramientas', iconName: 'herramientas.png', slug: 'herramientas', href: '/productos/negocios/snacks-dulces', order: 10, isActive: true, categorySlug: 'negocios' },
    
  ],
};