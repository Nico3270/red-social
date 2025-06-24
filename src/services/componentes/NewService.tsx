"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { createService } from "@/services/actions/service_actions";
import { Switch } from "@mui/material";
import { Service } from "@/interfaces/product.interface";
import Image from "next/image";

interface NewServiceForm {
    titulo: string;
    descripcion: string;
    imagen: FileList;
    slug: string;
    isActive: boolean;
}

interface NewServiceProps {
    onAddService: (newService: Service) => void;  // Mejor tipado
}

export function NewService({ onAddService }: NewServiceProps) {
    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors },
        
    } = useForm<NewServiceForm>();

    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [base64Image, setBase64Image] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(true);

    // Generar slug automáticamente basado en el título
    const generateSlug = (titulo: string) => {
        const slug = titulo
            .toLowerCase()
            .replace(/ /g, "-")
            .replace(/[^\w-]+/g, ""); // Reemplaza caracteres especiales
        setValue("slug", slug);
    };

    // Previsualizar imagen seleccionada y convertir a base64
    const handleImagePreview = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setPreviewImage(base64);
                setBase64Image(base64);  // Guardar imagen en base64
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (data: NewServiceForm) => {
        setLoading(true);
        setAlert(null);
    
        const formData = new FormData();
        formData.append("titulo", data.titulo);
        formData.append("descripcion", data.descripcion);
        formData.append("slug", data.slug);
        formData.append("isActive", String(isActive));
    
        if (base64Image) {
            formData.append("imagen", base64Image);
        } else {
            setAlert({ type: "error", message: "Debes seleccionar una imagen." });
            setLoading(false);
            return;
        }
    
        const response = await createService(formData);
    
        if (response.ok && response.service) {
            const newService: Service = {
                ...response.service,
                createdAt: new Date(response.service.createdAt).toISOString(),
                updatedAt: new Date(response.service.updatedAt).toISOString(),
            };
    
            setAlert({ type: "success", message: "El servicio ha sido creado exitosamente." });
            reset();
            setPreviewImage(null);
            setBase64Image(null);
            setIsActive(true);
            onAddService(newService);  // Convertimos `createdAt` y `updatedAt` a `string`
        } else {
            setAlert({ type: "error", message: response.message || "Hubo un error al crear el servicio." });
        }
        setLoading(false);
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto space-y-6"
        >
            <h2 className="text-2xl font-bold mb-6 text-center">Crear Nuevo Servicio</h2>

            {/* Título */}
            <div>
                <label className="block font-medium mb-2">Título</label>
                <input
                    type="text"
                    {...register("titulo", {
                        required: "El título es obligatorio",
                        onChange: (e) => generateSlug(e.target.value),
                    })}
                    className="w-full border p-3 rounded"
                />
                {errors.titulo && <p className="text-red-500 mt-1">{errors.titulo.message}</p>}
            </div>

            {/* Slug */}
            <div>
                <label className="block font-medium mb-2">Slug (se genera automáticamente)</label>
                <input
                    type="text"
                    {...register("slug", { required: "El slug es obligatorio" })}
                    className="w-full border p-3 rounded bg-gray-100"
                    readOnly
                />
            </div>

            {/* Descripción */}
            <div>
                <label className="block font-medium mb-2">Descripción</label>
                <textarea
                    {...register("descripcion", { required: "La descripción es obligatoria" })}
                    rows={6}
                    className="w-full border p-3 rounded resize-y focus:ring-2 focus:ring-blue-400"
                    placeholder="Escribe una descripción detallada..."
                />
                {errors.descripcion && <p className="text-red-500 mt-1">{errors.descripcion.message}</p>}
            </div>

            {/* Imagen */}
            <div>
                <label className="block font-medium mb-2">Imagen</label>
                <input
                    type="file"
                    accept="image/*"
                    {...register("imagen", { required: "Se requiere una imagen" })}
                    onChange={handleImagePreview}
                />
                {errors.imagen && <p className="text-red-500 mt-1">{errors.imagen.message}</p>}

                {/* Vista Previa */}
                {previewImage && (
                    <div className="mt-4">
                        <Image src={previewImage} alt="Vista previa" className="max-w-xs rounded-md shadow" />
                    </div>
                )}
            </div>

            {/* Estado */}
            <div className="flex items-center space-x-3">
                <Switch
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                />
                <label>{isActive ? "Activo" : "Inactivo"}</label>
            </div>

            {/* Botón de Enviar */}
            <button
                type="submit"
                disabled={loading}
                className={`w-full p-3 text-white rounded ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                    }`}
            >
                {loading ? "Guardando..." : "Crear Servicio"}
            </button>
             {/* Alerta */}
             {alert && (
                <div
                    className={`p-3 mt-4 text-center rounded-lg ${alert.type === "error"
                        ? "bg-red-100 text-red-600"
                        : "bg-green-100 text-green-600"
                        }`}
                >
                    {alert.message}
                </div>
            )}
        </form>
    );
}
