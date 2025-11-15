// components/pitch/SolucionMyckeo.tsx
'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { titleFont } from '@/config/fonts';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { ArrowLeft, ArrowRight, QrCode, Store, Link, Calendar, Star, User, 
  DollarSign, ShoppingCart, MessageCircle, Globe, MapPin, Camera, Palette } from 'lucide-react';

export default function SolucionMyckeo() {
  const slides = [
    {
      title: "Registra tu negocio en minutos",
      desc: "Elige categoría → perfil + productos. Sin código. Sin complicaciones.",
      img: "/imgs/mockups/Crea perfil.png",
    },
    {
      title: "Sube productos con un clic",
      desc: "Imágenes desde Cloudinary, precios, secciones automáticas. Todo listo para vender.",
      img: "/imgs/mockups/Productos.png",
    },
    {
      title: "Interactúa con tu comunidad",
      desc: "Publicaciones, reseñas con video, likes y mensajes directos. Engagement real.",
      img: "/imgs/mockups/interacciones.png",
    },
    {
      title: "Comparte tu vitrina digital",
      desc: "QR, URL pública, Google Maps. Tus clientes llegan fácil — desde la mesa o la calle.",
      img: "/imgs/mockups/catalogo.png",
    },
  ];

  const features = [
    { icon: Store, title: "Catálogo completo", desc: "Todos tus productos organizados por sección", color: "text-indigo-600" },
    { icon: Link, title: "Redes sociales", desc: "Conecta Instagram, Facebook, TikTok", color: "text-blue-600" },
    { icon: Calendar, title: "Gestión de reservas", desc: "Agenda citas y turnos en tiempo real", color: "text-emerald-600" },
    { icon: Star, title: "Reseñas multimedia", desc: "Clientes dejan video, foto y texto", color: "text-amber-600" },
    { icon: User, title: "Perfil profesional", desc: "Para negocios y expertos independientes", color: "text-purple-600" },
    { icon: DollarSign, title: "Control financiero", desc: "Ingresos, gastos y reportes automáticos", color: "text-green-600" },
    { icon: ShoppingCart, title: "Recibe pedidos", desc: "Directo por WhatsApp o formulario", color: "text-orange-600" },
    { icon: MessageCircle, title: "Chat integrado", desc: "Responde al instante desde la app", color: "text-cyan-600" },
    { icon: Globe, title: "URL pública", desc: "Comparte tu tienda como web real", color: "text-indigo-600" },
    { icon: MapPin, title: "Ubicación real", desc: "Google Maps con ruta directa", color: "text-red-600" },
    { icon: Camera, title: "Galería dinámica", desc: "Carruseles y videos de productos", color: "text-pink-600" },
    { icon: Palette, title: "Personalización", desc: "Colores, logo y estilo propio", color: "text-teal-600" },
  ];

  return (
    <section
      id="solucion"
      className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 pt-12 md:pt-8 pb-4"
    >
      <div className="w-full max-w-7xl mx-auto space-y-2 md:space-y-2">

        {/* Título principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className={`text-4xl md:text-6xl font-bold text-white tracking-tight ${titleFont.className} mb-2`}>
            Myckeo en Acción
          </h2>
          <p className="text-xl md:text-2xl font-medium text-slate-300 max-w-4xl mx-auto">
            De cero a tienda digital en minutos — con comunidad incluida
          </p>
        </motion.div>

        {/* Swiper grande con navegación correcta */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full"
        >
          <div className="relative w-full">

            <Swiper
              modules={[Navigation, Pagination]}
              navigation={{
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
              }}
              pagination={{
                clickable: true,
                bulletClass: 'swiper-pagination-bullet !bg-slate-500 !opacity-70',
                bulletActiveClass: 'swiper-pagination-bullet-active !bg-white !opacity-100',
              }}
              loop
              className="w-full"
            >
              {slides.map((slide, idx) => (
                <SwiperSlide key={idx}>
                  <div className="flex flex-col items-center space-y-6">
                    {/* Imagen */}
                    <div className="w-full max-w-4xl mx-auto">
                      <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-slate-300 p-6 md:p-8">
                        <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl overflow-hidden">
                          <Image
                            src={slide.img}
                            alt={slide.title}
                            width={1200}
                            height={675}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Descripción */}
                    <div className="w-full max-w-4xl mx-auto text-center">
                      <h3 className="text-3xl md:text-4xl font-bold text-yellow-500 mb-3">
                        {slide.title}
                      </h3>
                      <p className="text-lg md:text-2xl text-gray-100 leading-relaxed">
                        {slide.desc}
                      </p>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Botón Previous */}
            <button
              className="
                swiper-button-prev 
                absolute left-2 top-1/2 -translate-y-1/2 z-10
                bg-white/80 backdrop-blur-md 
                rounded-full p-2.5 shadow-lg 
                ring-1 ring-white/40 
                hover:bg-white hover:shadow-xl
                transition-all
              "
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>

            {/* Botón Next */}
            <button
              className="
                swiper-button-next
                absolute right-2 top-1/2 -translate-y-1/2 z-10
                bg-white/80 backdrop-blur-md 
                rounded-full p-2.5 shadow-lg 
                ring-1 ring-white/40
                hover:bg-white hover:shadow-xl
                transition-all
              "
            >
              <ArrowRight className="w-5 h-5 text-slate-600" />
            </button>

            {/* Paginación */}
            <div className="swiper-pagination !static mt-6" />
          </div>
        </motion.div>

        {/* Cinta horizontal con tarjetas blancas, texto negro, íconos de color */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full overflow-hidden pt-6"
        >
          <div className="relative">
            <Swiper
              modules={[Autoplay]}
              autoplay={{
                delay: 0,
                disableOnInteraction: false,
              }}
              speed={8000}
              loop
              slidesPerView={3}
              spaceBetween={20}
              breakpoints={{
                640: { slidesPerView: 4 },
                768: { slidesPerView: 5 },
                1024: { slidesPerView: 6 },
              }}
              className="w-full"
            >
              {[...features, ...features].map((item, idx) => (
                <SwiperSlide key={idx}>
                  <div className="bg-white rounded-2xl p-5 shadow-lg ring-1 ring-slate-200 flex flex-col items-center text-center hover:shadow-xl hover:scale-105 transition-all duration-300">
                    <item.icon className={`w-10 h-10 ${item.color} mb-3`} />
                    <h4 className="text-lg font-bold text-red-600">{item.title}</h4>
                    <p className="text-md text-gray-800 mt-1">{item.desc}</p>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </motion.div>

        {/* CTA final */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full px-8 py-4 mt-4 shadow-xl">
            <QrCode className="w-6 h-6" />
            <p className="text-lg font-bold">Prueba Myckeo hoy → crea tu perfil en 5 minutos</p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}