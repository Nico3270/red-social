"use client";

import React from "react";
import ModifyBlogComponent, { AdaptedArticulo } from "./ModifyBlogComponent";
import { updateBlog } from "@/blog/actions/updateBlog";

// Tipo intermedio que ModifyBlogComponent necesita para el formulario
interface BlogUpdateData
  extends Omit<AdaptedArticulo, "imagenes" | "parrafos" | "subtitulos"> {
  imagenes: string[];
  parrafos: string[];
  subtitulos: string[];
}

interface ModifyBlogClientWrapperProps {
  blog: AdaptedArticulo;
  blogId: string;
}

const ModifyBlogClientWrapper: React.FC<ModifyBlogClientWrapperProps> = ({
  blog,
  blogId,
}) => {
  const handleUpdate = async (data: BlogUpdateData) => {
    try {
      console.log("Datos recibidos en handleUpdate:", data);

      // Enviar al servidor en el formato BlogUpdateData
      await updateBlog(blogId, data);
      
    } catch (error) {
      console.error("Error al actualizar el blog:", error);
      
    }
  };

  // **Transformar AdaptedArticulo a BlogUpdateData**
  const transformToUpdateData = (blog: AdaptedArticulo): BlogUpdateData => ({
    ...blog,
    imagenes: blog.imagenes.map((img) => img.url),
    parrafos: blog.parrafos.map((p) => p.texto),
    subtitulos: blog.subtitulos.map((s) => s.texto),
  });

  // **Transformar BlogUpdateData de vuelta a AdaptedArticulo**
  const transformToAdaptedArticulo = (data: BlogUpdateData): AdaptedArticulo => ({
    ...data,
    imagenes: data.imagenes.map((url) => ({ url })),
    parrafos: data.parrafos.map((texto) => ({ texto })),
    subtitulos: data.subtitulos.map((texto) => ({ texto })),
  });

  const adaptedBlog = transformToAdaptedArticulo(transformToUpdateData(blog));

  return <ModifyBlogComponent blog={adaptedBlog} onSubmit={handleUpdate} />;
};

export default ModifyBlogClientWrapper;
