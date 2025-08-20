import { TipoPregunta } from "@prisma/client";

export interface Pregunta {
  id?: string
  texto: string;
  tipo: TipoPregunta;
  creador: "ADMIN";
  requerida: true;
  categoria: string;
}

export const preguntasCalificables: Pregunta[] = [
  // Categoría: Calidad del Producto/Servicio
  { texto: "¿Cómo calificarías la calidad general del producto o servicio recibido?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Calidad del Producto/Servicio" },
  { texto: "¿Cómo evalúas la durabilidad y resistencia del producto?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Calidad del Producto/Servicio" },
  { texto: "¿La funcionalidad del servicio cumplió con tus expectativas?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Calidad del Producto/Servicio" },
  { texto: "¿Cómo calificarías la frescura o estado del producto al recibirlo?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Calidad del Producto/Servicio" },
  { texto: "¿El producto o servicio resolvió efectivamente tu necesidad?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Calidad del Producto/Servicio" },
  { texto: "¿Cómo evalúas la precisión en la descripción del producto o servicio?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Calidad del Producto/Servicio" },
  { texto: "¿La calidad de los materiales utilizados fue satisfactoria?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Calidad del Producto/Servicio" },

  // Categoría: Atención al Cliente
  { texto: "¿Cómo calificarías la amabilidad y cortesía del personal?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Atención al Cliente" },
  { texto: "¿La respuesta a tus consultas fue rápida y efectiva?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Atención al Cliente" },
  { texto: "¿Cómo evalúas el conocimiento y expertise del equipo de atención?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Atención al Cliente" },
  { texto: "¿El proceso de resolución de problemas fue eficiente?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Atención al Cliente" },
  { texto: "¿Cómo calificarías la disponibilidad del soporte al cliente?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Atención al Cliente" },
  { texto: "¿La comunicación durante la transacción fue clara y oportuna?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Atención al Cliente" },
  { texto: "¿Cómo evalúas la empatía mostrada por el personal ante tus necesidades?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Atención al Cliente" },

  // Categoría: Limpieza y Ambiente
  { texto: "¿Cómo calificarías la limpieza general del establecimiento o producto?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Limpieza y Ambiente" },
  { texto: "¿El ambiente fue acogedor y bien mantenido?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Limpieza y Ambiente" },
  { texto: "¿Cómo evalúas la higiene en las áreas de servicio o empaque?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Limpieza y Ambiente" },
  { texto: "¿La presentación del producto o local fue impecable?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Limpieza y Ambiente" },
  { texto: "¿Cómo calificarías el orden y organización del espacio?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Limpieza y Ambiente" },
  { texto: "¿El entorno transmitió una sensación de seguridad y pulcritud?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Limpieza y Ambiente" },

  // Categoría: Rapidez y Eficiencia
  { texto: "¿Cómo calificarías la rapidez en la entrega o prestación del servicio?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Rapidez y Eficiencia" },
  { texto: "¿El proceso de compra o atención fue eficiente y sin demoras?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Rapidez y Eficiencia" },
  { texto: "¿Cómo evalúas el tiempo de respuesta a tus solicitudes?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Rapidez y Eficiencia" },
  { texto: "¿La logística de envío o ejecución fue puntual?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Rapidez y Eficiencia" },
  { texto: "¿Cómo calificarías la agilidad en el manejo de tu pedido?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Rapidez y Eficiencia" },

  // Categoría: Relación Calidad-Precio
  { texto: "¿Cómo evalúas la relación calidad-precio del producto o servicio?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Relación Calidad-Precio" },
  { texto: "¿El costo fue justificado por el valor recibido?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Relación Calidad-Precio" },
  { texto: "¿Cómo calificarías el equilibrio entre precio y beneficios?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Relación Calidad-Precio" },
  { texto: "¿El servicio ofreció un buen retorno por tu inversión?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Relación Calidad-Precio" },

  // Categoría: Recomendación y Satisfacción General
  { texto: "¿Recomendarías este negocio o profesional a otros?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Recomendación y Satisfacción General" },
  { texto: "¿Cómo calificarías tu satisfacción overall con la experiencia?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Recomendación y Satisfacción General" },
  { texto: "¿Volverías a utilizar este servicio o comprar este producto?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Recomendación y Satisfacción General" },
  { texto: "¿La experiencia superó tus expectativas iniciales?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Recomendación y Satisfacción General" },

  // Categoría: Innovación y Personalización
  { texto: "¿Cómo evalúas la innovación en el producto o servicio ofrecido?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Innovación y Personalización" },
  { texto: "¿El servicio se adaptó bien a tus necesidades específicas?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Innovación y Personalización" },
  { texto: "¿Cómo calificarías la variedad de opciones disponibles?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Innovación y Personalización" },

  // Categoría: Sostenibilidad y Ética
  { texto: "¿Cómo evalúas las prácticas sostenibles del negocio?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Sostenibilidad y Ética" },
  { texto: "¿El negocio demostró responsabilidad ética en su operación?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Sostenibilidad y Ética" },
  { texto: "¿Cómo calificarías el impacto ambiental del producto o servicio?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Sostenibilidad y Ética" },

  // Categoría: Accesibilidad y Ubicación
  { texto: "¿La ubicación o accesibilidad del negocio fue conveniente?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Accesibilidad y Ubicación" },
  { texto: "¿Cómo evalúas la facilidad de navegación en el sitio o app?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Accesibilidad y Ubicación" },
  { texto: "¿El negocio ofreció opciones inclusivas para todos los clientes?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Accesibilidad y Ubicación" },

  // Categoría: Seguridad y Confianza
  { texto: "¿Cómo calificarías la seguridad en las transacciones?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Seguridad y Confianza" },
  { texto: "¿El negocio generó confianza desde el primer contacto?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Seguridad y Confianza" },
  { texto: "¿Cómo evalúas la protección de tus datos personales?", tipo: "CALIFICABLE", creador: "ADMIN", requerida: true, categoria: "Seguridad y Confianza" },

  {
    texto: "¿Qué fue lo que más le gustó de nuestro producto o servicio?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Experiencia General"
  },
  {
    texto: "¿Qué aspectos cree que podríamos mejorar en nuestro servicio?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Experiencia General"
  },
  {
    texto: "¿Hubo algo que no cumplió con sus expectativas? Si es así, ¿qué fue?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Expectativas"
  },
  {
    texto: "¿Cómo describiría la calidad de nuestro servicio en sus propias palabras?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Calidad"
  },
  {
    texto: "¿Qué tan fácil fue para usted acceder o utilizar nuestro servicio?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Accesibilidad"
  },
  {
    texto: "¿Qué le motivó a elegirnos frente a otras opciones disponibles?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Decisión de Compra"
  },
  {
    texto: "¿Cómo se sintió con la atención recibida por parte de nuestro personal?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Atención al Cliente"
  },
  {
    texto: "¿Qué tan claras y útiles le parecieron nuestras explicaciones o información?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Comunicación"
  },
  {
    texto: "¿Hubo algún obstáculo o dificultad durante su experiencia con nosotros?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Dificultades"
  },
  {
    texto: "¿Qué podríamos hacer para que su experiencia fuera aún mejor?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Mejora Continua"
  },
  {
    texto: "¿Cómo se sintió en términos de confianza y seguridad al usar nuestro servicio?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Confianza"
  },
  {
    texto: "¿Qué tan satisfecho quedó con los tiempos de respuesta y entrega?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Tiempo y Eficiencia"
  },
  {
    texto: "¿Qué le sorprendió positivamente de nuestra atención o servicio?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Experiencia Positiva"
  },
  {
    texto: "¿Cómo describiría la relación entre la calidad y el precio de lo recibido?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Valor Percibido"
  },
  {
    texto: "¿Qué tan probable es que nos recomiende a otras personas? ¿Por qué?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Recomendación"
  },
  {
    texto: "¿Hay algún servicio o producto adicional que le gustaría que ofreciéramos?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Innovación"
  },
  {
    texto: "¿Cómo compara nuestra atención con la de otros negocios similares?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Comparación"
  },
  {
    texto: "¿Qué tan bien resolvimos sus necesidades específicas?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Resolución de Necesidades"
  },
  {
    texto: "¿Qué sugerencia concreta nos daría para mejorar nuestro servicio?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Sugerencias"
  },
  {
    texto: "¿Qué tan satisfecho se sintió con la relación y trato recibido por parte de nuestro equipo?",
    tipo: "TEXTO",
    creador: "ADMIN",
    requerida: true,
    categoria: "Relación Humana"
  }


];