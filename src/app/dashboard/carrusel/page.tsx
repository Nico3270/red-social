"use client";

import React, { useState } from "react";
import FormCrearCarruselImagenes from "@/publicaciones/componentes/Form_Carrusel_Imagenes";
import { ModalPublicaciones } from "@/publicaciones/componentes/ModalPublicaciones";
import { useSession } from "next-auth/react";

export default function FormCarruselImagenesPage() {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(true);

  return (
    <>
      {showModal && (
        <ModalPublicaciones
        
          userId={session?.user.id}
          onClose={() => setShowModal(false)}
          successMessage="Tu reseña fue enviada con éxito."
        >
          <FormCrearCarruselImagenes />
        </ModalPublicaciones>
      )}
    </>
  );
}
