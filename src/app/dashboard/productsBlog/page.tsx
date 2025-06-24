"use client";

import React, { useEffect, useState } from "react";
import {
  Avatar,
  CircularProgress,
  IconButton,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Button,
} from "@mui/material";
import { AiOutlineSearch, AiOutlinePlus, AiOutlineCopy } from "react-icons/ai";
import { MdExpandMore } from "react-icons/md";

import {
  getProductsFromDB,
  saveProducts,
  shouldUpdateProducts,
  saveLastUpdate,
} from "@/lib/indexedDB";
import { useRouter } from "next/navigation";
import { useSelectedProductsMagicSurprise } from "@/store/productsBlog/productsBlogStore";
import { getProductsToBlog } from "@/blog/actions/getProductsToBlog";


interface Product {
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
  status: "available" | "out_of_stock" | "discontinued"; // Hacer obligatorio
  enlace?: string;
}

export default function ProductsBlogsPage() {
  const [search, setSearch] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState(""); // Estado para el tema

  const { selectedProducts, addProduct, removeProduct } = useSelectedProductsMagicSurprise();
  const router = useRouter();

  const promptGPT = `MagiSurprise es un negocio especializado en la venta de **desayunos sorpresa, detalles personalizados y regalos para ocasiones especiales**. Su público objetivo incluye personas que buscan sorprender a sus seres queridos con un regalo original, ya sea en fechas importantes como **cumpleaños, aniversarios, Día del Padre, Día de la Madre, San Valentín**, o simplemente para expresar cariño sin motivo especial.

El objetivo del blog es atraer tráfico **orgánico** mediante contenido de valor, **posicionar palabras clave estratégicas en Google** y, sutilmente, **dirigir a los lectores a considerar MagiSurprise como una opción para sus regalos**.

Eres un experto en **marketing de contenidos, SEO y copywriting persuasivo**. Vas a escribir un blog **bien estructurado, optimizado para SEO y que conecte con la audiencia de MagiSurprise**. Quiero que escribas un blog optimizado para SEO sobre el siguiente tema: **${topic}**.

📌 **Antes de empezar, analiza estos puntos clave:**

1. **Identifica palabras clave principales y secundarias**, incluyendo palabras long-tail relevantes al tema. Asegúrate de que se incluyan en títulos y descripciones de manera natural.
2. **Define un público objetivo ideal** para este tema, pensando en personas que buscan hacer un regalo o detalle especial.
3. **Adopta un tono cercano y persuasivo, pero sin ser demasiado promocional.** Haz que la lectura sea atractiva, con un toque de suspenso y emoción.

📌 **Estructura del Blog:**

1. **Título principal:** Un título atractivo, llamativo y optimizado para SEO.
2. **Introducción:** Un párrafo introductorio que explique de manera envolvente por qué este tema es relevante. Debe incluir palabras clave importantes y una mención sutil a **MagiSurprise**, indicando que ofrece detalles y regalos para ocasiones especiales.
3. **Secciones del blog:** Divide el contenido en **3 a 5 secciones**, cada una con:
    - **Un título llamativo y optimizado para SEO.**
    - **Uno o más párrafos bien estructurados, con información valiosa y bien desarrollada.** Puedes incluir datos históricos, tendencias, razones psicológicas detrás del tema, curiosidades y elementos emocionales que mantengan al lector interesado.
    - **Un prompt para generar una imagen adecuada**. La imagen debe reflejar un ambiente cotidiano, con personas reales disfrutando el momento, evitando que se vea demasiado lujoso o artificial. Debe conectar con la audiencia y transmitir la emoción del regalo o detalle. Asegúrate de describir el entorno, los personajes, la iluminación y los elementos clave para una imagen profesional.

📌 **Ejemplo de Sección Generada:**
**Título:** 🎉 "El Secreto de un Desayuno Sorpresa Perfecto: Más que Comida, una Experiencia"  

**Descripción:**  
Un desayuno sorpresa no es solo una bandeja con comida, es una forma de decir “te quiero” sin palabras. El impacto de recibir un regalo inesperado por la mañana va más allá del gusto: **activa emociones positivas**, refuerza lazos y crea recuerdos duraderos.  

De hecho, estudios en psicología han demostrado que las sorpresas generan **descargas de dopamina**, la hormona de la felicidad, haciendo que el momento sea aún más especial. Es por eso que los desayunos sorpresa se han convertido en un regalo cada vez más popular para aniversarios, cumpleaños y celebraciones inesperadas.  

Para que un desayuno sorpresa sea perfecto, no basta con incluir café y croissants; **la clave está en los detalles**. Agregar un mensaje personalizado, un elemento decorativo que refleje la personalidad del destinatario y una presentación cuidada puede transformar una simple comida en un regalo inolvidable.  

💡 **Consejo:** Considera los gustos y preferencias de la persona. Si es amante del café, un buen espresso puede ser el centro del desayuno. Si prefiere lo saludable, una selección de frutas frescas puede marcar la diferencia.  

**Prompt para la imagen:**  
*"Una mujer con expresión de sorpresa y felicidad recibe un desayuno sorpresa en la puerta de su casa. La bandeja incluye una taza de café humeante, jugo natural y una selección de croissants y frutas. El ambiente es cálido, con luz natural entrando por la ventana, decoraciones sutiles en tonos pastel y una tarjeta con un mensaje especial sobre la bandeja."*

📌 **Cierre del Blog:**  
Finaliza con una conclusión breve que refuerce la idea central y motive a los lectores a sorprender a alguien especial con un detalle único. No hagas un llamado a la compra directo, pero sí menciona sutilmente que MagiSurprise ofrece opciones para hacerlo realidad.

🎯 **Objetivo Final:**  
Crear un artículo atractivo, informativo y persuasivo que genere tráfico orgánico y ayude a captar clientes sin necesidad de una venta forzada.`;

useEffect(() => {
  const fetchProducts = async () => {
    setLoading(true);
    const localProducts = await getProductsFromDB();
    if (localProducts.length > 0) {
      setAllProducts(localProducts);
    }
    const needsUpdate = await shouldUpdateProducts();
    if (needsUpdate) {
      try {
        const freshProducts = await getProductsToBlog("");
        if (freshProducts.length > 0) {
          const normalizedProducts: Product[] = freshProducts.map((product) => ({
            id: product.id,
            nombre: product.nombre,
            precio: product.precio ?? 0,
            prioridad: product.prioridad ?? 0,
            seccionIds: product.seccionIds ?? [], // ✅ Asegurar que siempre sea un array
            createdAt: product.createdAt ? new Date(product.createdAt) : undefined,
            updatedAt: product.updatedAt ? new Date(product.updatedAt) : undefined,
            descripcion: product.descripcion,
            descripcionCorta: product.descripcionCorta ?? "",
            slug: product.slug,
            tags: product.tags ?? [],
            imagenes: product.imagenes ?? [],
            status: product.status ?? "available", // Asegurar que nunca sea undefined
            sectionPriorities: product.sectionPriorities ?? {}, // ✅ Asegurar que siempre sea un objeto
          }));

          await saveProducts(normalizedProducts);
          await saveLastUpdate("productos", new Date());
          setAllProducts(normalizedProducts);
        }
      } catch (error) {
        console.error("Error al obtener productos:", error);
      }
    }
    setLoading(false);
  };
  fetchProducts();
}, []);





  useEffect(() => {
    if (search.length < 2) {
      setFilteredProducts([]);
      return;
    }
    const filtered = allProducts.filter((product) =>
      product.nombre.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [search, allProducts]);

  const handleAddProduct = (product: Product) => {
    const selectedProduct = {
      id: product.id,
      nombre: product.nombre,
      slug: product.slug,
      imagenes: product.imagenes, // Asegúrate de que aquí se recibe el array completo
      enlace: product.enlace,
    };
    addProduct(selectedProduct);
    // Comentamos las siguientes líneas para que la búsqueda no se borre
    // setSearch("");
    // setFilteredProducts([]);
  };

  const handleRemoveProduct = (id: string) => {
    removeProduct(id);
  };

  const handleCopyPrompt = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(promptGPT);
    } catch (error) {
      console.error("❌ Error al copiar el prompt:", error);
    }
  };

  const handleCreateBlog = () => {
    if (selectedProducts.length > 0) {
      router.push("/dashboard/blog/newBlog");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Buscar Productos</h1>

      {/* Barra de búsqueda estilo Google */}
      <div className="relative w-full max-w-lg mx-auto">
        <Paper
          component="div"
          className="flex items-center w-full bg-white rounded-full shadow-[0_1px_6px_rgba(0,0,0,0.1)] border-none p-2.5 transition-shadow hover:shadow-[0_1px_10px_rgba(0,0,0,0.15)]"
        >
          <AiOutlineSearch className="text-gray-500 ml-3" size={20} />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none ml-3 text-gray-700 font-sans text-base placeholder-gray-500"
          />
        </Paper>
        {filteredProducts.length > 0 && (
          <div className="absolute z-10 bg-white shadow-lg rounded-lg w-full mt-2 max-h-60 overflow-auto border border-gray-200">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleAddProduct(product)}
                className="flex items-center p-3 hover:bg-gray-100 cursor-pointer"
              >
                <Avatar src={product.imagenes.length > 0 ? product.imagenes[0] : "/placeholder.png"} className="mr-2" />
                <span>{product.nombre}</span>
                <IconButton onClick={() => handleAddProduct(product)} color="primary" className="ml-auto">
                  <AiOutlinePlus />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center mt-2">
          <CircularProgress />
        </div>
      )}

      {selectedProducts.length > 0 && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg shadow-md">
          <h3 className="font-bold text-lg mb-2">Productos Agregados</h3>
          <div className="flex flex-wrap gap-2">
            {selectedProducts.map((product) => (
              <Chip
                key={product.id}
                label={product.nombre}
                avatar={<Avatar src={product.imagenes.length > 0 ? product.imagenes[0] : "/placeholder.png"} />}
                onDelete={() => handleRemoveProduct(product.id)}
                className="bg-white shadow"
              />
            ))}
          </div>
        </div>
      )}

      {/* Input para el tema del blog */}
      <Paper component="div" className="p-3 mb-4 rounded-lg shadow-md">
        <input
          type="text"
          placeholder="Ingrese el tema del blog..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full p-2 border rounded-md"
        />
      </Paper>

      <Accordion className="mt-4">
        <AccordionSummary expandIcon={<MdExpandMore />}>
          <h3 className="font-bold">Prompt ChatGPT</h3>
          <Tooltip title="Copiar Prompt">
            <IconButton onClick={handleCopyPrompt} color="primary">
              <AiOutlineCopy />
            </IconButton>
          </Tooltip>
        </AccordionSummary>
        <AccordionDetails>
          <p className="mb-2">{promptGPT}</p>
        </AccordionDetails>
      </Accordion>

      {/* Botón Crear Blog movido aquí */}
      {selectedProducts.length > 0 && (
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateBlog}
          className="mt-4 w-full max-w-lg"
          disabled={selectedProducts.length === 0}
        >
          Crear Blog con Productos
        </Button>
      )}
    </div>
  );
}