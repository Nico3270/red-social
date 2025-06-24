"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { FaEdit } from "react-icons/fa";
import { updateBlogsOrder } from "@/blog/actions/updateBlogsOrder";
import { SortableItem } from "@/seccion/componentes/SortableItem";

interface Blog {
  id: string;
  titulo: string;
  orden: number;
}

const BlogList = ({ blogs: initialBlogs }: { blogs: Blog[] }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [blogs, setBlogs] = useState<Blog[]>(initialBlogs);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = blogs.findIndex((blog) => blog.id === active.id);
      const newIndex = blogs.findIndex((blog) => blog.id === over.id);

      const reorderedBlogs = arrayMove(blogs, oldIndex, newIndex).map(
        (blog, index) => ({
          ...blog,
          orden: index + 1,
        })
      );

      setBlogs(reorderedBlogs);
    }
  };

  const saveOrder = async () => {
    setIsSaving(true);
    try {
      const blogsToUpdate = blogs.map(({ id, orden }) => ({ id, orden }));
      const result = await updateBlogsOrder(blogsToUpdate);

      if (result.success) {
        alert("Orden actualizado con éxito");
      } else {
        alert("Error al actualizar el orden");
      }
    } catch (error) {
      console.error("Error al guardar el orden:", error);
      alert("Ocurrió un error al guardar el orden.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isHydrated) {
    return null; // Evita renderizar hasta que esté hidratado
  }

  return (
    <div className="container mx-auto p-4 bg-white rounded-md shadow-md">
      <h2 className="text-2xl font-bold mb-4">Lista de Blogs</h2>
      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blogs.map((blog) => blog.id)}
            strategy={verticalListSortingStrategy}
          >
            <table className="table-auto w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">ID</th>
                  <th className="border p-2">Título</th>
                  <th className="border p-2">Orden</th>
                  <th className="border p-2">Modificar</th>
                </tr>
              </thead>
              <tbody>
                {blogs.map((blog) => (
                  <SortableItem key={blog.id} id={blog.id}>
                    <td className="border p-2">{blog.id}</td>
                    <td className="border p-2">{blog.titulo}</td>
                    <td className="border p-2 text-center">{blog.orden}</td>
                    <td className="border p-2 text-center">
                      <a
                        href={`/dashboard/blog/${blog.id}`}
                        className="text-blue-600 hover:underline flex items-center justify-center gap-1"
                      >
                        <FaEdit />
                        Modificar
                      </a>
                    </td>
                  </SortableItem>
                ))}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      </div>
      <div className="mt-4 text-right">
        <button
          onClick={saveOrder}
          disabled={isSaving}
          className={`px-4 py-2 rounded-md ${
            isSaving
              ? "bg-gray-400 text-gray-800 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isSaving ? "Guardando..." : "Actualizar Orden"}
        </button>
      </div>
    </div>
  );
};

export default BlogList;
