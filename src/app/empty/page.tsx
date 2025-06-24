// import { FaShoppingCart } from "react-icons/fa";
import Link from "next/link";
import Image from "next/image";
import { InfoEmpresa as empresa } from "@/config/config";


export default function EmptyPage() {
  return (
    <div className="container mx-auto p-6 text-center">
      {/* Título */}
      <h1 className="text-4xl font-bold mb-6">Tu carrito está vacío</h1>
      
      {/* Imagen del carrito vacío */}
      <Image
        src= {empresa.imagenesPlaceholder.imagenCarroVacio} // Ruta de la imagen generada
        alt="Carrito de compras vacío"
        width={300}
        height={300}
        className="mx-auto mb-6"
      />
      
      {/* Icono del carrito */}
      {/* <FaShoppingCart className="text-gray-300 text-6xl mx-auto mb-6" /> */}

      {/* Texto de mensaje */}
      <p className="text-lg text-gray-500 mb-6">
        No has añadido productos a tu carrito todavía.
      </p>

      {/* Botón para explorar productos */}
      <Link href="/">
        <button className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
          Explorar Productos
        </button>
      </Link>
    </div>
  );
}
