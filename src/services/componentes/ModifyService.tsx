"use client";

import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { upsertService } from "@/services/actions/service_actions";
import { Switch } from "@mui/material";
import { Service } from "@/interfaces/product.interface";
import Image from "next/image";

interface ModifyServiceForm {
    titulo: string;
    descripcion: string;
    imagen: FileList | null;
    slug: string;
    isActive: boolean;
}

interface ModifyServiceProps {
    service: Service;  // Servicio a modificar
    onUpdateService: (updatedService: Service) => void;  // Actualiza el estado local
}

export function ModifyService({ service, onUpdateService }: ModifyServiceProps) {
    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors },
    } = useForm<ModifyServiceForm>({
        defaultValues: {
            titulo: service.titulo,
            descripcion: service.descripcion,
            slug: service.slug,
            isActive: service.isActive,
        },
    });

    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(service.imagen);
    const [base64Image, setBase64Image] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(service.isActive);

    useEffect(() => {
        reset({
            titulo: service.titulo,
            descripcion: service.descripcion,
            slug: service.slug,
            isActive: service.isActive,
        });
        setPreviewImage(service.imagen);
    }, [service, reset]);

    // Generar slug automáticamente basado en el título
    const generateSlug = (titulo: string) => {
        const slug = titulo
            .toLowerCase()
            .replace(/ /g, "-")
            .replace(/[^\w-]+/g, "");  // Reemplaza caracteres especiales
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
                setBase64Image(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (data: ModifyServiceForm) => {
        setLoading(true);
        setAlert(null);

        const formData = new FormData();
        formData.append("titulo", data.titulo);
        formData.append("descripcion", data.descripcion);
        formData.append("slug", data.slug);
        formData.append("isActive", String(isActive));

        if (base64Image) {
            formData.append("imagen", base64Image);
        }

        const response = await upsertService({
            titulo: data.titulo,
            descripcion: data.descripcion,
            imagen: base64Image || service.imagen,
            slug: data.slug,
            isActive,
        }, service.id);

        if (response.success) {
            setAlert({ type: "success", message: "El servicio ha sido actualizado correctamente." });
            const updatedService: Service = {
                ...service,
                titulo: data.titulo,
                descripcion: data.descripcion,
                slug: data.slug,
                isActive,
                imagen: base64Image || service.imagen,
                updatedAt: new Date().toISOString(),
            };
            onUpdateService(updatedService);
        } else {
            setAlert({ type: "error", message: response.message || "Hubo un error al actualizar el servicio." });
        }
        setLoading(false);
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto space-y-6"
        >
            <h2 className="text-2xl font-bold mb-6 text-center">Modificar Servicio</h2>

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
                />
                {errors.descripcion && <p className="text-red-500 mt-1">{errors.descripcion.message}</p>}
            </div>

            {/* Imagen */}
            <div>
                <label className="block font-medium mb-2">Imagen</label>
                <input
                    type="file"
                    accept="image/*"
                    {...register("imagen")}
                    onChange={handleImagePreview}
                />
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
                className={`w-full p-3 text-white rounded ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
                {loading ? "Guardando..." : "Modificar Servicio"}
            </button>

            {alert && (
                <div className={`p-4 mt-4 text-center rounded ${alert.type === "success" ? "bg-green-500" : "bg-red-500"} text-white`}>
                    {alert.message}
                </div>
            )}
        </form>
    );
}
