
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import colombia from "@/config/colombia.json";
import "react-datepicker/dist/react-datepicker.css";
import { initialData } from "@/seed/seed";
import * as FaIcons from "react-icons/fa";
import * as RiIcons from "react-icons/ri";
import { IconType } from "react-icons";
import { Alert, Box, FormControl, FormLabel, Stack, Typography } from "@mui/material";
import Divider from "@/ui/components/divider/Divider";
import { GiColombia } from "react-icons/gi";
import { createNegocio } from "@/actions/auth/createHegocio";


const allCities = colombia.flatMap((d) =>
    d.ciudades.map((ciudad) => `${ciudad} - ${d.departamento}`)
);

const countryCodes = [{ code: "+57", country: "Colombia" }];

const selectedCountryCode = "+57";

function removeAccents(str: string) {
    return str.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

type FormInputs = {
    nombre: string;
    descripcion: string;
    ciudad: string;
    direccion: string;
    telefonoContacto?: string;
    categoriaIds: string[];
};

type IdUsuario = {
    id: string;
};

type IconMap = {
    [key: string]: IconType;
};

const iconMap: IconMap = {
    ...FaIcons,
    ...RiIcons,
};

export const CreateNegocioForm = ({ id }: IdUsuario) => {
    const [isPending, setIsPending] = useState(false);
    const [cityInput, setCityInput] = useState("");
    const [filteredCities, setFilteredCities] = useState<string[]>([]);
    const suggestionsRef = useRef<HTMLUListElement>(null);
    const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<Set<string>>(new Set());
    const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
    const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
    const { update, data: session } = useSession();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        control,
    } = useForm<FormInputs>({
        defaultValues: {
            nombre: "",
            descripcion: "",
            ciudad: "",
            direccion: "",
            telefonoContacto: undefined,
            categoriaIds: [],
        },
    });

    const filteredSections = initialData.secciones.filter((section) =>
        selectedCategorySlugs.has(section.categorySlug)
    );

    useEffect(() => {
        const selectedIds = initialData.categorias
            .filter((cat) => selectedCategorySlugs.has(cat.slug))
            .map((cat) => cat.id);
        setValue("categoriaIds", selectedIds);
    }, [selectedCategorySlugs, setValue]);

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        setIsPending(true);
        setAlert(null);

        try {
            // Validar ciudad
            if (!allCities.includes(data.ciudad)) {
                setAlert({ type: "error", message: "Selecciona una ciudad válida de la lista." });
                setIsPending(false);
                return;
            }

            // Validar categorías
            if (data.categoriaIds.length === 0) {
                setAlert({ type: "error", message: "Debes seleccionar al menos una categoría." });
                setIsPending(false);
                return;
            }

            // Validar secciones
            if (selectedSections.size === 0) {
                setAlert({ type: "error", message: "Debes seleccionar al menos una sección." });
                setIsPending(false);
                return;
            }

            // Validar y normalizar teléfono (opcional)
            let normalizedTelefono = data.telefonoContacto;
            if (normalizedTelefono) {
                const digitsOnly = normalizedTelefono.replace(/\D/g, "");
                normalizedTelefono = `${selectedCountryCode}${digitsOnly}`;
                if (!/^\+57\d{10}$/.test(normalizedTelefono)) {
                    setAlert({
                        type: "error",
                        message: "El teléfono debe tener exactamente 10 dígitos (por ejemplo, +573123456789).",
                    });
                    setIsPending(false);
                    return;
                }
            }

            // Separar ciudad y departamento
            const [ciudadNombre, departamento] = data.ciudad.split(" - ");

            // Preparar datos para la server action
            const formData = new FormData();
            formData.append("nombre", data.nombre);
            formData.append("descripcion", data.descripcion);
            formData.append("ciudad", ciudadNombre);
            formData.append("departamento", departamento);
            formData.append("direccion", data.direccion);
            if (normalizedTelefono) {
                formData.append("telefonoContacto", normalizedTelefono);
            }
            data.categoriaIds.forEach((id) => formData.append("categoriaIds", id));
            selectedSections.forEach((id) => formData.append("seccionIds", id));
            formData.append("usuarioId", id);

            // Log para depuración
            console.log("Enviando datos al servidor:", Object.fromEntries(formData));

            // Llamar a la server action
            const response = await createNegocio(formData);

            if (!response.ok) {
                setAlert({ type: "error", message: response.message || "Error al crear el negocio." });
                setIsPending(false);
                return;
            }

            // ✅ Paso 1: Refrescar la sesión desde el backend
            console.log("Actualizando sesión con role: negocio");
            await update({ role: "negocio" });

            // ✅ Paso 3: Mostrar mensaje de éxito
            setAlert({ type: "success", message: response.message || "Negocio creado exitosamente." });

            // ✅ Paso 4: Redirigir al perfil
            setTimeout(() => {
                window.location.replace("/dashboard/perfil");
            }, 3000);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error desconocido al enviar el formulario";
            setAlert({ type: "error", message: errorMessage });
            console.error("Error al enviar el formulario:", errorMessage);
            setIsPending(false);
        }
    };

    useEffect(() => {
        if (cityInput.length >= 3) {
            const matches = allCities.filter((city) =>
                removeAccents(city.toLowerCase()).includes(removeAccents(cityInput.toLowerCase()))
            );
            setFilteredCities(matches.slice(0, 10));
        } else {
            setFilteredCities([]);
        }
        setValue("ciudad", cityInput);
    }, [cityInput, setValue]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setFilteredCities([]);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleSection = (id: string) => {
        setSelectedSections((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleCategoryChange = (slug: string) => {
        setSelectedCategorySlugs((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(slug)) {
                newSet.delete(slug);
            } else {
                newSet.add(slug);
            }
            if (newSet.size === 0) {
                setSelectedSections(new Set());
            }
            return newSet;
        });
    };

    return (
        <div className="bg-white flex flex-col justify-center p-8">
            <div className="px-2 sm:px-8 w-full mx-auto">
                <h1 className="text-4xl font-bold mb-4 text-center">Crear un negocio</h1>

                {alert && (
                    <Alert severity={alert.type} onClose={() => setAlert(null)}>
                        {alert.message}
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <FormControl fullWidth margin="normal">
                        <Alert severity="info">
                            Por favor selecciona una o varias categorías a las que pertenezca tu negocio
                        </Alert>
                        <FormLabel sx={{ mb: 1, mt: 1, color: "info.main", fontWeight: "bold" }}>
                            Categorías
                        </FormLabel>
                        <Controller
                            name="categoriaIds"
                            control={control}
                            defaultValue={[]}
                            rules={{ required: "Debes seleccionar al menos una categoría" }}
                            render={({ field }) => (
                                <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
                                    {initialData.categorias.map((category) => {
                                        const IconComponent = iconMap[category.iconName] || FaIcons.FaQuestion;
                                        const isSelected = selectedCategorySlugs.has(category.slug);
                                        return (
                                            <Box
                                                key={`${category.id}-${category.slug}`}
                                                onClick={() => handleCategoryChange(category.slug)}
                                                sx={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    px: 2.5,
                                                    py: 1.2,
                                                    borderRadius: "12px",
                                                    backgroundColor: isSelected ? "primary.main" : "#fff",
                                                    boxShadow: isSelected ? 3 : 1,
                                                    border: "1px solid",
                                                    borderColor: isSelected ? "primary.main" : "grey.200",
                                                    color: isSelected ? "#fff" : "text.primary",
                                                    cursor: "pointer",
                                                    transition: "all 0.25s ease-in-out",
                                                    minWidth: "140px",
                                                    "&:hover": {
                                                        boxShadow: 3,
                                                        backgroundColor: isSelected ? "primary.dark" : "grey.100",
                                                        borderColor: "primary.main",
                                                    },
                                                }}
                                            >
                                                <IconComponent size={18} style={{ marginRight: 8 }} />
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                    {category.nombre}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            )}
                        />
                        {errors.categoriaIds && <span className="text-red-500 text-sm">{errors.categoriaIds.message}</span>}
                    </FormControl>
                    <Divider />

                    <FormControl fullWidth margin="normal">
                        <Alert severity="info">
                            Por favor selecciona una o varias de los tipos de productos que ofrece tu negocio
                        </Alert>
                        <FormLabel sx={{ mb: 1, mt: 1, color: "info.main", fontWeight: "bold" }}>
                            Tipos de productos
                        </FormLabel>
                        {selectedCategorySlugs.size === 0 ? (
                            <Typography color="textSecondary">
                                Selecciona al menos una categoría para ver las secciones disponibles.
                            </Typography>
                        ) : filteredSections.length === 0 ? (
                            <Typography color="textSecondary">
                                No hay secciones disponibles para las categorías seleccionadas.
                            </Typography>
                        ) : (
                            <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
                                {filteredSections.map((section) => {
                                    const isActive = selectedSections.has(section.id);
                                    return (
                                        <Box
                                            key={`${section.id}-${section.nombre}`}
                                            onClick={() => toggleSection(section.id)}
                                            sx={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                px: 2.5,
                                                py: 1.2,
                                                borderRadius: "12px",
                                                backgroundColor: isActive ? "primary.main" : "#fff",
                                                boxShadow: isActive ? 3 : 1,
                                                border: "1px solid",
                                                borderColor: isActive ? "primary.main" : "grey.200",
                                                color: isActive ? "#fff" : "text.primary",
                                                cursor: "pointer",
                                                transition: "all 0.2s ease-in-out",
                                                "&:hover": {
                                                    boxShadow: 3,
                                                    backgroundColor: isActive ? "primary.dark" : "grey.100",
                                                    borderColor: "primary.main",
                                                },
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {section.nombre}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        )}
                    </FormControl>
                    <Divider />

                    <div>
                        <label htmlFor="nombre" className="block font-bold">
                            Nombre del negocio
                        </label>
                        <input
                            type="text"
                            {...register("nombre", { required: "El nombre es requerido" })}
                            className={clsx(
                                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                                { "border-red-500": errors.nombre }
                            )}
                            placeholder="Nombre del negocio"
                        />
                        {errors.nombre && <span className="text-red-500 text-sm">{errors.nombre.message}</span>}
                    </div>

                    <div>
                        <label htmlFor="descripcion" className="block font-bold">
                            Descripción del negocio
                        </label>
                        <input
                            type="text"
                            {...register("descripcion", { required: "La descripción es requerida" })}
                            className={clsx(
                                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                                { "border-red-500": errors.descripcion }
                            )}
                            placeholder="Descripción del negocio"
                        />
                        {errors.descripcion && <span className="text-red-500 text-sm">{errors.descripcion.message}</span>}
                    </div>

                    <div className="relative">
                        <label htmlFor="ciudad" className="block font-bold">
                            Ciudad
                        </label>
                        <Alert severity="info">
                            Por favor seleccione una ciudad válida de la lista que aparece al escribir
                        </Alert>
                        <input
                            type="text"
                            {...register("ciudad", { required: "La ciudad es requerida" })}
                            value={cityInput}
                            onChange={(e) => setCityInput(e.target.value)}
                            className={clsx(
                                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                                { "border-red-500": errors.ciudad }
                            )}
                            placeholder="Ej. Medellín - Antioquia"
                            autoComplete="off" // <- más confiable
                            name="fake_ciudad" // <- cambiar el "name" es clave
                            id="ciudad-autocomplete-fix" // <- opcional para identificar
                            spellCheck="false"
                        />
                        {errors.ciudad && <span className="text-red-500 text-sm">{errors.ciudad.message}</span>}
                        {filteredCities.length > 0 && (
                            <ul
                                ref={suggestionsRef}
                                className="absolute z-10 bg-white border rounded-md mt-1 max-h-48 overflow-y-auto shadow-md w-full"
                            >
                                {filteredCities.map((city) => (
                                    <li
                                        key={city}
                                        onClick={() => {
                                            setValue("ciudad", city);
                                            setCityInput(city);
                                            setFilteredCities([]);
                                        }}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                    >
                                        {city}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div>
                        <label htmlFor="direccion" className="block font-bold">
                            Dirección (opcional)
                        </label>
                        <input
                            type="text"
                            {...register("direccion")}
                            className={clsx(
                                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                                { "border-red-500": errors.direccion }
                            )}
                            placeholder="Ej. Calle 123 #45-67"
                        />
                        {errors.direccion && <span className="text-red-500 text-sm">{errors.direccion.message}</span>}
                    </div>

                    <div>
                        <label htmlFor="telefonoContacto" className="block font-bold">
                            Teléfono de contacto (opcional)
                        </label>
                        <div className="flex items-center border rounded-lg mt-2 focus-within:ring-2 focus-within:ring-red-600">
                            <span className="flex items-center bg-gray-100 px-3 py-2 border-r border-gray-300">
                                <GiColombia className="mr-2" />
                                {selectedCountryCode}
                            </span>
                            <input
                                type="text"
                                {...register("telefonoContacto", {
                                    required: false,
                                    pattern: {
                                        value: /^\d{10}$/,
                                        message: "El número debe tener exactamente 10 dígitos (sin el código de país).",
                                    },
                                })}
                                className={clsx(
                                    "w-full border-none p-2 focus:outline-none",
                                    { "border-red-500": errors.telefonoContacto }
                                )}
                                placeholder="Ej. 3123456789"
                            />
                        </div>
                        {errors.telefonoContacto && <span className="text-red-500 text-sm">{errors.telefonoContacto.message}</span>}
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className={clsx(
                            "w-full py-2 rounded-lg transition",
                            isPending ? "bg-gray-400 text-gray-200 cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-700"
                        )}
                    >
                        {isPending ? "Cargando..." : "Crear negocio"}
                    </button>
                </form>

                <div className="flex items-center justify-between mt-6">
                    <div className="border-t w-full border-gray-300"></div>
                    <span className="mx-4">o</span>
                    <div className="border-t w-full border-gray-300"></div>
                </div>
            </div>
        </div>
    );
};


