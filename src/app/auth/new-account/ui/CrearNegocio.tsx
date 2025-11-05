"use client";

import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import colombia from "@/config/colombia.json";
import "react-datepicker/dist/react-datepicker.css";
import { initialData } from "@/seed/seed";
import {
  Alert,
  Box,
  FormControl,
  FormLabel,
  Stack,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormHelperText,
  CircularProgress,
} from "@mui/material";
import Divider from "@/ui/components/divider/Divider";
import { GiColombia } from "react-icons/gi";
import { createNegocio } from "@/actions/auth/createHegocio";
import Image from "next/image";

const allCities = colombia.flatMap((d) =>
  d.ciudades.map((ciudad) => `${ciudad} - ${d.departamento}`)
);

const selectedCountryCode = "+57";

type FormInputs = {
  nombre: string;
  descripcion: string;
  ciudad: string;
  direccion?: string;
  telefonoContacto?: string;
  categoriaIds: string[];
  seccionIds: string[];
};

type IdUsuario = {
  id: string;
};

interface ColombiaDepartment {
  id: number;
  departamento: string;
  ciudades: string[];
}

export const CreateNegocioForm = ({ id }: IdUsuario) => {
  const [isPending, setIsPending] = useState(false);
  const [selectedDepartamento, setSelectedDepartamento] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<Set<string>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const { update } = useSession();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    control,
    trigger,
  } = useForm<FormInputs>({
    mode: "onChange",
    defaultValues: {
      nombre: "",
      descripcion: "",
      ciudad: "",
      direccion: "",
      telefonoContacto: "",
      categoriaIds: [],
      seccionIds: [],
    },
  });

  const filteredSections = initialData.secciones.filter((section) =>
    selectedCategorySlugs.has(section.categorySlug)
  );

  // Sincronizar categorías
  useEffect(() => {
    const selectedIds = initialData.categorias
      .filter((cat) => selectedCategorySlugs.has(cat.slug))
      .map((cat) => cat.id);
    setValue("categoriaIds", selectedIds, { shouldValidate: true });
    trigger("categoriaIds");
  }, [selectedCategorySlugs, setValue, trigger]);

  // Sincronizar secciones
  useEffect(() => {
    setValue("seccionIds", Array.from(selectedSections), { shouldValidate: true });
    trigger("seccionIds");
  }, [selectedSections, setValue, trigger]);

  // Actualizar ciudades
  useEffect(() => {
    if (selectedDepartamento) {
      const departmentData = (colombia as ColombiaDepartment[]).find(
        (dept) => dept.departamento === selectedDepartamento
      );
      setCities(departmentData ? departmentData.ciudades : []);
      setSelectedCity("");
      setValue("ciudad", "", { shouldValidate: true });
      trigger("ciudad");
    } else {
      setCities([]);
      setSelectedCity("");
      setValue("ciudad", "", { shouldValidate: true });
      trigger("ciudad");
    }
  }, [selectedDepartamento, setValue, trigger]);

  // Actualizar ciudad
  useEffect(() => {
    if (selectedCity && selectedDepartamento) {
      const fullCity = `${selectedCity} - ${selectedDepartamento}`;
      setValue("ciudad", fullCity, { shouldValidate: true });
      trigger("ciudad");
    } else {
      setValue("ciudad", "", { shouldValidate: true });
      trigger("ciudad");
    }
  }, [selectedCity, selectedDepartamento, setValue, trigger]);

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setIsPending(true);
    setAlert(null);

    try {
      // Validaciones previas
      if (!allCities.includes(data.ciudad)) {
        setAlert({ type: "error", message: "Selecciona una ciudad válida de la lista." });
        setIsPending(false);
        return;
      }

      if (data.categoriaIds.length === 0) {
        setAlert({ type: "error", message: "Debes seleccionar al menos una categoría." });
        setIsPending(false);
        return;
      }

      if (data.seccionIds.length === 0) {
        setAlert({ type: "error", message: "Debes seleccionar al menos una sección." });
        setIsPending(false);
        return;
      }

      // Normalizar teléfono
      let normalizedTelefono = data.telefonoContacto?.trim();
      if (normalizedTelefono) {
        const digitsOnly = normalizedTelefono.replace(/\D/g, "");
        normalizedTelefono = `${selectedCountryCode}${digitsOnly}`;
        if (!/^\+57\d{10}$/.test(normalizedTelefono)) {
          setAlert({
            type: "error",
            message: "El teléfono debe tener exactamente 10 dígitos (ej. +573123456789).",
          });
          setIsPending(false);
          return;
        }
      }

      const [ciudadNombre, departamento] = data.ciudad.split(" - ");

      // Preparar FormData
      const formData = new FormData();
      formData.append("nombre", data.nombre);
      formData.append("descripcion", data.descripcion);
      formData.append("ciudad", ciudadNombre);
      formData.append("departamento", departamento);
      formData.append("direccion", data.direccion || "");
      if (normalizedTelefono) formData.append("telefonoContacto", normalizedTelefono);
      data.categoriaIds.forEach((id) => formData.append("categoriaIds", id));
      data.seccionIds.forEach((id) => formData.append("seccionIds", id));
      formData.append("usuarioId", id);

      const response = await createNegocio(formData);

      if (!response.ok) {
        setAlert({ type: "error", message: response.message || "Error al crear el negocio." });
        setIsPending(false);
        return;
      }

      // Actualizar sesión
      await update({ role: "negocio" });
      await update({ negocioNombre: data.nombre });
      await update({ negocioSlug: response.slugNegocio });
      await update({ negocioId: response.negocioId });

      // Mostrar éxito
      setAlert({ type: "success", message: "Negocio creado. Redirigiendo..." });

      // Redirección inmediata
      router.push("/dashboard/editar-perfil");
      router.refresh();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al enviar el formulario";
      setAlert({ type: "error", message: errorMessage });
      console.error("Error al enviar el formulario:", errorMessage);
      setIsPending(false);
    }
  };

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

  const seccionError = selectedSections.size === 0 ? "Debes seleccionar al menos una sección" : undefined;

  return (
    <div className="bg-white flex flex-col justify-center p-8">
      <div className="px-2 sm:px-8 w-full mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">Crear un negocio</h1>

        {alert && (
          <Alert
            severity={alert.type}
            onClose={() => setAlert(null)}
            className="mb-6"
            sx={{ borderRadius: "12px" }}
          >
            {alert.message}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Categorías */}
          <FormControl fullWidth error={!!errors.categoriaIds}>
            <Alert severity="info" className="mb-2">
              Por favor selecciona una o varias categorías a las que pertenezca tu negocio
            </Alert>
            <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>
              Categorías
            </FormLabel>
            <Controller
              name="categoriaIds"
              control={control}
              rules={{ required: "Debes seleccionar al menos una categoría" }}
              render={() => (
                <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
                  {initialData.categorias.map((category) => {
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
                        <Image
                          src={`/imgs/iconos/${category.iconName}`}
                          alt={category.nombre}
                          width={18}
                          height={18}
                          style={{ marginRight: 8 }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {category.nombre}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            />
            {errors.categoriaIds && (
              <FormHelperText>{errors.categoriaIds.message}</FormHelperText>
            )}
          </FormControl>
          <Divider />

          {/* Secciones */}
          <FormControl fullWidth error={!!seccionError}>
            <Alert severity="info" className="mb-2">
              Por favor selecciona una o varias de los tipos de productos que ofrece tu negocio
            </Alert>
            <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>
              Tipos de productos
            </FormLabel>
            {selectedCategorySlugs.size === 0 ? (
              <Typography color="textSecondary" fontStyle="italic">
                Selecciona al menos una categoría para ver las secciones disponibles.
              </Typography>
            ) : filteredSections.length === 0 ? (
              <Typography color="textSecondary" fontStyle="italic">
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
                      <Image
                        src={`/imgs/iconos/${section.iconName}`}
                        alt={section.nombre}
                        width={18}
                        height={18}
                        style={{ marginRight: 8 }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {section.nombre}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            )}
            {seccionError && <FormHelperText>{seccionError}</FormHelperText>}
          </FormControl>
          <Divider />

          {/* Nombre */}
          <div>
            <label htmlFor="nombre" className="block font-bold text-gray-800">
              Nombre del negocio
            </label>
            <input
              type="text"
              {...register("nombre", { required: "El nombre es requerido" })}
              className={clsx(
                "w-full border rounded-lg p-3 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600 text-gray-800",
                { "border-red-500": errors.nombre }
              )}
              placeholder="Ej. Café Aroma"
            />
            {errors.nombre && <span className="text-red-500 text-sm">{errors.nombre.message}</span>}
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="descripcion" className="block font-bold text-gray-800">
              Descripción del negocio
            </label>
            <textarea
              {...register("descripcion", { required: "La descripción es requerida" })}
              rows={4}
              className={clsx(
                "w-full border rounded-lg p-3 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600 text-gray-800 resize-none",
                { "border-red-500": errors.descripcion }
              )}
              placeholder="Describe tu negocio en pocas palabras..."
            />
            {errors.descripcion && <span className="text-red-500 text-sm">{errors.descripcion.message}</span>}
          </div>

          {/* Ciudad y Departamento */}
          <input type="hidden" {...register("ciudad", { required: "La ciudad es requerida" })} />

          <FormControl fullWidth variant="outlined" error={!!errors.ciudad && !selectedDepartamento}>
            <InputLabel id="departamento-label">Departamento</InputLabel>
            <Select
              value={selectedDepartamento}
              onChange={(e) => {
                setSelectedDepartamento(e.target.value as string);
                setSelectedCity("");
              }}
              label="Departamento"
            >
              <MenuItem value="">Selecciona un departamento</MenuItem>
              {(colombia as ColombiaDepartment[]).map((dept) => (
                <MenuItem key={dept.id} value={dept.departamento}>
                  {dept.departamento}
                </MenuItem>
              ))}
            </Select>
            {errors.ciudad && !selectedDepartamento && <FormHelperText>Selecciona un departamento</FormHelperText>}
          </FormControl>

          <FormControl fullWidth variant="outlined" error={!!errors.ciudad} disabled={!selectedDepartamento}>
            <InputLabel id="ciudad-label">Ciudad</InputLabel>
            <Select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value as string)}
              label="Ciudad"
            >
              <MenuItem value="">Selecciona una ciudad</MenuItem>
              {cities.map((city, index) => (
                <MenuItem key={index} value={city}>
                  {city}
                </MenuItem>
              ))}
            </Select>
            {errors.ciudad && <FormHelperText>{errors.ciudad.message}</FormHelperText>}
          </FormControl>

          {/* Dirección */}
          <div>
            <label htmlFor="direccion" className="block font-bold text-gray-800">
              Dirección (opcional)
            </label>
            <input
              type="text"
              {...register("direccion")}
              className="w-full border rounded-lg p-3 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600 text-gray-800"
              placeholder="Ej. Calle 123 #45-67"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="telefonoContacto" className="block font-bold text-gray-800">
              Teléfono de contacto (opcional)
            </label>
            <div className="flex items-center border rounded-lg mt-2 focus-within:ring-2 focus-within:ring-red-600">
              <span className="flex items-center bg-gray-100 px-3 py-3 border-r border-gray-300 text-gray-800 font-medium">
                <GiColombia className="mr-2 text-lg" />
                {selectedCountryCode}
              </span>
              <input
                type="text"
                {...register("telefonoContacto", {
                  pattern: {
                    value: /^\d{0,10}$/,
                    message: "Máximo 10 dígitos",
                  },
                })}
                className={clsx(
                  "w-full border-none p-3 focus:outline-none text-gray-800",
                  { "border-red-500": errors.telefonoContacto }
                )}
                placeholder="3123456789"
                maxLength={10}
              />
            </div>
            {errors.telefonoContacto && (
              <span className="text-red-500 text-sm">{errors.telefonoContacto.message}</span>
            )}
          </div>

          {/* Botón con CircularProgress */}
          <button
            type="submit"
            disabled={isPending || !isValid || selectedSections.size === 0}
            className={clsx(
              "w-full py-3 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3",
              isPending || !isValid || selectedSections.size === 0
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl"
            )}
          >
            {isPending ? (
              <>
                <CircularProgress size={24} color="inherit" />
                <span>Creando negocio...</span>
              </>
            ) : (
              "Crear negocio"
            )}
          </button>
        </form>

        <div className="flex items-center justify-between mt-8">
          <div className="border-t w-full border-gray-300"></div>
          <span className="mx-4 text-gray-500">o</span>
          <div className="border-t w-full border-gray-300"></div>
        </div>
      </div>
    </div>
  );
};