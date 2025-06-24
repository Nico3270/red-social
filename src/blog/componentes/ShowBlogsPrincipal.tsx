"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

// Interfaz para los datos del blog
interface Blog {
  slug: string;
  titulo: string;
  imagen: string;
  descripcion?: string; // Opcional para SEO
  fechaPublicacion?: string; // Opcional para SEO
}

// Props del componente
interface ShowBlogsPrincipalProps {
  blogs: Blog[];
}

export default function ShowBlogsPrincipal({ blogs }: ShowBlogsPrincipalProps) {
  // Variantes para las animaciones de Framer Motion
  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1, // Retraso escalonado para cada tarjeta
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  };

  // Estructura de datos JSON-LD para SEO
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.innerHTML = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Blog Principal",
      description: "Explora nuestros artículos destacados",
      mainEntity: blogs.map((blog) => ({
        "@type": "Article",
        headline: blog.titulo,
        image: blog.imagen,
        url: `/blog/${blog.slug}`,
        datePublished: blog.fechaPublicacion || new Date().toISOString(),
        description: blog.descripcion || "Artículo destacado",
      })),
    });
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [blogs]);

  return (
    <section className="w-full bg-gradient-to-b from-gray-900 to-black py-12">
      <div className="container mx-auto px-4">
        {/* Título de la sección */}
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-10 tracking-tight">
          Bienvenidos a nuestros Magic Blogs
        </h1>

        {/* Grid Masonry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 auto-rows-[minmax(200px,_auto)]">
          {blogs.map((blog, index) => {
            // Determinar el tamaño de la tarjeta (algunas más grandes)
            const isLarge = index % 5 === 0 || index % 3 === 0; // Ejemplo: cada 3ra o 5ta tarjeta es más grande
            const heightClass = isLarge ? "row-span-2" : "row-span-1";

            return (
              <motion.article
                key={blog.slug}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                whileHover={{ scale: 1.03, transition: { duration: 0.3 } }}
                className={`relative w-full overflow-hidden ${heightClass} group`}
              >
                <Link href={`/blog/${blog.slug}`} className="block h-full">
                  {/* Imagen */}
                  <div className="relative w-full h-full">
                    <Image
                      src={blog.imagen}
                      alt={blog.titulo}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      priority={index < 3} // Prioridad para las primeras imágenes
                    />
                    {/* Overlay oscuro */}
                    <div className="absolute inset-0 bg-black bg-opacity-40 transition-opacity duration-300 group-hover:bg-opacity-20" />
                  </div>

                  {/* Título */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <h2 className="text-xl md:text-2xl font-semibold text-white tracking-wide drop-shadow-md transition-colors duration-300 group-hover:text-yellow-300">
                      {blog.titulo}
                    </h2>
                  </div>
                </Link>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}