"use client";

import { EstadoNegocio } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect,  useState, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Stack,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Typography,
  Box,
  Select,
  MenuItem,
  InputLabel,
  FormHelperText,
} from "@mui/material";
import colombia from "@/config/colombia.json";
import clsx from "clsx";
import { GiColombia } from "react-icons/gi";
import Divider from "../../divider/Divider";
import { initialData } from "@/seed/seed";
import { MapPicker } from "../../map-picker/MapPicker";
import { actualizarPerfilNegocio } from "@/actions/perfil/actualizarPerfil";
import AutoUploadMedia from "../../autoUpload/AutoUploadMedia";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheckCircle, FaTimesCircle, FaTimes } from "react-icons/fa";
import Image from "next/image";

interface InformacionInicialNegocio {
  nombreNegocio: string;
  slugNegocio: string;
  descripcionNegocio: string;
  telefonoNegocio: string;
  ciudadNegocio: string;
  departamentoNegocio: string;
  direccionNegocio?: string;
  telefonoContacto?: string;
  imagenPerfil?: string;
  imagenPortada?: string;
  sitioWeb?: string;
  urlGoogleMaps?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  latitudNegocio: number;
  longitudNegocio: number;
  categoriaIds: string[];
  seccionesIds: string[];
  estadoNegocio: EstadoNegocio;
}

interface Props {
  informacionNegocio?: InformacionInicialNegocio;
}



type SocialMediaKeys = "facebook" | "instagram" | "twitter" | "tiktok" | "youtube";

const socialMediaFields: { name: SocialMediaKeys; placeholder: string; pattern: RegExp; message: string }[] = [
  {
    name: "facebook",
    placeholder: "https://www.facebook.com/tu-negocio",
    pattern: /^https:\/\/(www\.)?facebook\.com\/.+/,
    message: "Ingresa una URL válida de Facebook",
  },
  {
    name: "instagram",
    placeholder: "https://www.instagram.com/tu-negocio",
    pattern: /^https:\/\/(www\.)?instagram\.com\/.+/,
    message: "Ingresa una URL válida de Instagram",
  },
  {
    name: "twitter",
    placeholder: "https://www.twitter.com/tu-negocio",
    pattern: /^https:\/\/(www\.)?twitter\.com\/.+/,
    message: "Ingresa una URL válida de Twitter",
  },
  {
    name: "tiktok",
    placeholder: "https://www.tiktok.com/@tu-negocio",
    pattern: /^https:\/\/(www\.)?tiktok\.com\/.+/,
    message: "Ingresa una URL válida de TikTok",
  },
  {
    name: "youtube",
    placeholder: "https://www.youtube.com/c/tu-negocio",
    pattern: /^https:\/\/(www\.)?youtube\.com\/.+/,
    message: "Ingresa una URL válida de YouTube",
  },
];

export const CompletePerfil = ({ informacionNegocio }: Props) => {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InformacionInicialNegocio>({
    defaultValues: {
      nombreNegocio: "",
      slugNegocio: "",
      descripcionNegocio: "",
      telefonoNegocio: "",
      ciudadNegocio: "",
      departamentoNegocio: "",
      direccionNegocio: "",
      telefonoContacto: "",
      imagenPerfil: "",
      imagenPortada: "",
      sitioWeb: "",
      urlGoogleMaps: "",
      facebook: "",
      instagram: "",
      twitter: "",
      tiktok: "",
      youtube: "",
      latitudNegocio: 4.710989, // Bogotá por defecto
      longitudNegocio: -74.07209, // Bogotá por defecto
      categoriaIds: [],
      seccionesIds: [],
      estadoNegocio: EstadoNegocio.activo,
    },
  });

  // 🔴 NUEVO: Estado para manejar alertas (soluciona el error de 'setAlert')
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [responseType, setResponseType] = useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [selectedDepartamento, setSelectedDepartamento] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<Set<string>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, update } = useSession();

  const allCities = useMemo(
    () => colombia.flatMap((d) => d.ciudades.map((ciudad) => `${ciudad} - ${d.departamento}`)),
    []
  );

  const selectedCountryCode = "+57";

  const filteredSections = initialData.secciones.filter((section) =>
    selectedCategorySlugs.has(section.categorySlug)
  );

  const removeAccents = (str: string) => str.normalize("NFD").replace(/\p{Diacritic}/gu, "");

  const generateSlug = (name: string) =>
    removeAccents(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const toggleSection = (id: string) => {
    setSelectedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setValue("seccionesIds", Array.from(newSet));
      return newSet;
    });
  };

  const handleCategoryChange = (slug: string) => {
    setSelectedCategorySlugs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(slug)) newSet.delete(slug);
      else newSet.add(slug);
      if (newSet.size === 0) setSelectedSections(new Set());
      return newSet;
    });
  };

  const handleNombreNegocioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nombre = e.target.value;
    setValue("nombreNegocio", nombre);
    setValue("slugNegocio", generateSlug(nombre), { shouldValidate: true });
  };

  useEffect(() => {
    if (selectedDepartamento) {
      const departmentData = colombia.find((dept) => dept.departamento === selectedDepartamento);
      setCities(departmentData ? departmentData.ciudades : []);
    } else {
      setCities([]);
    }
  }, [selectedDepartamento]);

  useEffect(() => {
    if (selectedCity && selectedDepartamento) {
      setValue("ciudadNegocio", selectedCity, { shouldValidate: true });
      setValue("departamentoNegocio", selectedDepartamento, { shouldValidate: true });
    } else {
      setValue("ciudadNegocio", "", { shouldValidate: true });
      setValue("departamentoNegocio", "", { shouldValidate: true });
    }
  }, [selectedCity, selectedDepartamento, setValue]);

  useEffect(() => {
    register("ciudadNegocio", {
      required: "La ciudad es obligatoria",
    });
    register("departamentoNegocio", {
      required: "El departamento es obligatorio",
    });
  }, [register]);

  useEffect(() => {
    const selectedIds = initialData.categorias
      .filter((cat) => selectedCategorySlugs.has(cat.slug))
      .map((cat) => cat.id);
    setValue("categoriaIds", selectedIds, { shouldValidate: true });
  }, [selectedCategorySlugs, setValue]);

  useEffect(() => {
    register("slugNegocio", {
      required: "El slug del negocio es obligatorio",
      pattern: {
        value: /^[a-z0-9-]+$/,
        message: "El slug solo puede contener letras minúsculas, números y guiones",
      },
    });
  }, [register]);

  useEffect(() => {
    if (informacionNegocio) {
      reset({
        ...informacionNegocio,
        estadoNegocio: informacionNegocio.estadoNegocio || EstadoNegocio.activo,
        telefonoContacto: informacionNegocio.telefonoNegocio.substring(3), // Asumiendo que el teléfono ya incluye el código de país
      });
      setSelectedDepartamento(informacionNegocio.departamentoNegocio || "");
      setSelectedCity(informacionNegocio.ciudadNegocio || "");
      setSelectedCategorySlugs(
        new Set(
          informacionNegocio.categoriaIds
            .map((id) => {
              const category = initialData.categorias.find((cat) => cat.id === id);
              return category ? category.slug : "";
            })
            .filter((slug) => slug)
        )
      );
      setSelectedSections(new Set(informacionNegocio.seccionesIds));
    }
  }, [informacionNegocio, reset]);

  // 🔴 NUEVO: Limpieza automática de alertas después de 5 segundos
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const onSubmit = async (data: InformacionInicialNegocio) => {
    setLoading(true);
    setIsModalOpen(true);
    setResponseType("loading");
    setMessage("Estamos actualizando el negocio...");
    setNewSlug(data.slugNegocio);

    try {
      // Verificar que la sesión y el ID del usuario existan
      if (!session || !session.user?.id) {
        // console.log("Sesión no válida:", session);
        setResponseType("error");
        setMessage("No estás autenticado. Por favor, inicia sesión.");
        setLoading(false);
        return;
      }

      // Validar ciudad
      if (!allCities.includes(`${data.ciudadNegocio} - ${data.departamentoNegocio}`)) {
        setResponseType("error");
        setMessage("Selecciona una ciudad válida de la lista.");
        setLoading(false);
        return;
      }

      // Validar categorías
      if (data.categoriaIds.length === 0) {
        setResponseType("error");
        setMessage("Debes seleccionar al menos una categoría.");
        setLoading(false);
        return;
      }

      // Validar secciones
      if (selectedSections.size === 0) {
        setResponseType("error");
        setMessage("Debes seleccionar al menos una sección.");
        setLoading(false);
        return;
      }

      // Normalizar teléfono de contacto
      let normalizedTelefono = data.telefonoContacto;
      if (normalizedTelefono) {
        const digitsOnly = normalizedTelefono.replace(/\D/g, "");
        normalizedTelefono = `${selectedCountryCode}${digitsOnly}`;
        if (!/^\+57\d{10}$/.test(normalizedTelefono)) {
          setResponseType("error");
          setMessage("El teléfono debe tener exactamente 10 dígitos (por ejemplo, +573123456789).");
          setLoading(false);
          return;
        }
      }

      // Normalizar imagenPerfil e imagenPortada si vienen como array
      const imagenPerfilNormalizada: string | undefined = Array.isArray(data.imagenPerfil)
        ? data.imagenPerfil[0]
        : data.imagenPerfil;

      const imagenPortadaNormalizada: string | undefined = Array.isArray(data.imagenPortada)
        ? data.imagenPortada[0]
        : data.imagenPortada;

      // Preparar datos para enviar
      const submitData: InformacionInicialNegocio = {
        nombreNegocio: data.nombreNegocio,
        slugNegocio: data.slugNegocio,
        descripcionNegocio: data.descripcionNegocio,
        telefonoNegocio: data.telefonoNegocio,
        ciudadNegocio: data.ciudadNegocio,
        departamentoNegocio: data.departamentoNegocio,
        direccionNegocio: data.direccionNegocio || undefined,
        telefonoContacto: normalizedTelefono || undefined,
        imagenPerfil: imagenPerfilNormalizada || undefined,
        imagenPortada: imagenPortadaNormalizada || undefined,
        sitioWeb: data.sitioWeb || undefined,
        urlGoogleMaps: data.urlGoogleMaps || undefined,
        facebook: data.facebook || undefined,
        instagram: data.instagram || undefined,
        twitter: data.twitter || undefined,
        tiktok: data.tiktok || undefined,
        youtube: data.youtube || undefined,
        latitudNegocio: data.latitudNegocio,
        longitudNegocio: data.longitudNegocio,
        categoriaIds: data.categoriaIds,
        seccionesIds: Array.from(selectedSections),
        estadoNegocio: data.estadoNegocio || EstadoNegocio.activo,
      };

      // console.log("Enviando datos a actualizarPerfilNegocio:", submitData);
      // Llamar a la server action
      const response = await actualizarPerfilNegocio(session.user.id, submitData);

      if (!response.ok) {
        // console.log("Error en la server action:", response.message);
        setResponseType("error");
        setMessage(response.message || "Error al guardar la información.");
        setLoading(false);
        return;
      }

      // Actualizar el rol si es un nuevo negocio
      if (!informacionNegocio) {
        // console.log("Actualizando rol a 'negocio'");
        await update({ role: "negocio" });
      }

      if (!informacionNegocio) {
        // console.log("Actualizando rol y datos de negocio en sesión");
        await update({
          role: "negocio",
          negocioId: response.negocio?.idNegocio,
          negocioSlug: response.negocio?.slugNegocio,
          negocioNombre: response.negocio?.nombreNegocio,
        });
      }

      // Mostrar mensaje de éxito
      setResponseType("success");
      setMessage(response.message);

      // Redirigir después de 4000ms si no se cierra manualmente
      const timeoutId = setTimeout(() => {
        router.push(`/perfil/${data.slugNegocio}`);
      }, 4000);

      // Limpieza del timeout si se cierra manualmente
      return () => clearTimeout(timeoutId);
    } catch (error) {
      setResponseType("error");
      setMessage(`Error: ${error instanceof Error ? error.message : "No se pudo guardar la información."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    if (responseType === "success") {
      router.push(`/perfil/${newSlug}`);
    } else {
      setIsModalOpen(false);
      setResponseType(null);
      setMessage("");
    }
  };

  // Variables para almacenar datos de entrada de foto de perfil y foto de portada. Como solo se permite una imagen se deja mixto en false
  const multiple = false;
  // Información de entrada para la imagen de perfil
  const dataEntrada = informacionNegocio?.imagenPerfil;
  // Información de entrada para la imagen de portada
  const dataEntrada2 = informacionNegocio?.imagenPortada;

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-3xl mx-auto p-4 bg-white rounded-lg shadow-md"
      >
        {/* 🔴 NUEVO: Renderizado de la alerta si existe */}
        {alert && (
          <Alert severity={alert.type} onClose={() => setAlert(null)} sx={{ mb: 2 }}>
            {alert.message}
          </Alert>
        )}

        <Typography
  variant="h5"
  sx={{
    mb: 2,
    fontWeight: "bold",
    color: "#000" // ← Fuerza el color negro
  }}
>
  {informacionNegocio ? "Editar Información de usuario" : "Crear Nuevo Usuario"}
</Typography>


        <FormControl fullWidth sx={{ mb: 2 }}>
          <FormLabel sx={{ mb: 1, fontWeight: "bold" }}>Nombre del Negocio</FormLabel>
          <TextField
            {...register("nombreNegocio", { required: "El nombre del negocio es obligatorio" })}
            onChange={handleNombreNegocioChange}
            error={!!errors.nombreNegocio}
            helperText={errors.nombreNegocio?.message}
          />
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <FormLabel sx={{ mb: 1, fontWeight: "bold" }}>Slug del Negocio</FormLabel>
          <TextField
            {...register("slugNegocio")}
            error={!!errors.slugNegocio}
            helperText={errors.slugNegocio?.message || "Se genera automáticamente a partir del nombre"}
            InputProps={{ readOnly: true }}
          />
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <FormLabel sx={{ mb: 1, fontWeight: "bold" }}>Descripción del Negocio</FormLabel>
          <TextField
            {...register("descripcionNegocio", { required: "La descripción del negocio es obligatoria" })}
            multiline
            rows={4}
            placeholder="Escribe una breve descripción del negocio"
            error={!!errors.descripcionNegocio}
            helperText={errors.descripcionNegocio?.message}
          />
        </FormControl>

        <FormControl fullWidth margin="normal">
          <Alert severity="info" sx={{ mb: 1 }}>
            Por favor selecciona una o varias categorías a las que pertenezca tu negocio
          </Alert>
          <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>Categorías</FormLabel>
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
                      key={category.id}
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
            <span className="text-red-500 text-sm">{errors.categoriaIds.message}</span>
          )}
        </FormControl>
        <Divider />

        <FormControl fullWidth margin="normal">
          <Alert severity="info" sx={{ mb: 1 }}>
            Por favor selecciona una o varias de los tipos de productos que ofrece tu negocio
          </Alert>
          <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>Secciones</FormLabel>
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
                    key={section.id}
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
        </FormControl>
        <Divider />

        {/* <FormControl fullWidth sx={{ mb: 2 }}>
          <FormLabel sx={{ mb: 1, fontWeight: "bold" }}>Teléfono del Negocio</FormLabel>
          <TextField
            {...register("telefonoNegocio", {
              required: "El teléfono del negocio es obligatorio",
              pattern: {
                value: /^\d{10}$/,
                message: "El número debe tener exactamente 10 dígitos",
              },
            })}
            type="tel"
            placeholder="Ej. 3123456789"
            error={!!errors.telefonoNegocio}
            helperText={errors.telefonoNegocio?.message}
          />
        </FormControl> */}

        <FormControl fullWidth sx={{ mb: 2 }}>
          <FormLabel sx={{ mb: 1, fontWeight: "bold" }}>Ciudad</FormLabel>
          <Alert severity="info" sx={{ mb: 1 }}>
            Por favor seleccione una ciudad válida de la lista que aparece al escribir
          </Alert>
        </FormControl>

        <FormControl fullWidth variant="outlined" error={!!errors.departamentoNegocio && !selectedDepartamento} sx={{ mb: 2 }} >
          <InputLabel id="departamento-label">Departamento</InputLabel>
          <Select
            value={selectedDepartamento}
            onChange={(e) => {
              setSelectedDepartamento(e.target.value as string);
              setSelectedCity("");
            }}
            labelId="departamento-label"
            label="Departamento"
          >
            <MenuItem value="">Selecciona un departamento</MenuItem>
            {colombia.map((dept) => (
              <MenuItem key={dept.id} value={dept.departamento}>
                {dept.departamento}
              </MenuItem>
            ))}
          </Select>
          {errors.departamentoNegocio && !selectedDepartamento && <FormHelperText>Departamento requerido</FormHelperText>}
        </FormControl>

        <FormControl fullWidth variant="outlined" error={!!errors.ciudadNegocio} disabled={!selectedDepartamento} sx={{ mb: 2 }}>
          <InputLabel id="ciudad-label">Ciudad</InputLabel>
          <Select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value as string)}
            labelId="ciudad-label"
            label="Ciudad"
          >
            <MenuItem value="">Selecciona una ciudad</MenuItem>
            {cities.map((city, index) => (
              <MenuItem key={index} value={city}>
                {city}
              </MenuItem>
            ))}
          </Select>
          {errors.ciudadNegocio && <FormHelperText>{errors.ciudadNegocio.message}</FormHelperText>}
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <FormLabel sx={{ mb: 1, fontWeight: "bold" }}>Dirección del Negocio (Opcional)</FormLabel>
          <TextField
            {...register("direccionNegocio")}
            placeholder="Ingresa la dirección del negocio"
            error={!!errors.direccionNegocio}
            helperText={errors.direccionNegocio?.message}
          />
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
  <FormLabel sx={{ mb: 1, fontWeight: "bold", color: "#000" }}>Teléfono de Contacto (Opcional)</FormLabel>

  <div className="flex items-center border rounded-lg focus-within:ring-2 focus-within:ring-red-600">
    {/* Contenedor del ícono y código de país */}
    <span className="flex items-center bg-gray-100 px-3 py-2 border-r border-gray-300 text-black">
      <GiColombia className="mr-2 text-black" /> 
      {selectedCountryCode}
    </span>

    {/* INPUT */}
    <input
      type="text"
      {...register("telefonoContacto", {
        pattern: {
          value: /^\d{10}$/,
          message: "El número debe tener exactamente 10 dígitos (sin el código de país).",
        },
      })}
      className={clsx(
        "w-full border-none p-2 focus:outline-none text-black placeholder-gray-500",
        { "border-red-500": errors.telefonoContacto }
      )}
      placeholder="Ej. 3123456789"
    />
  </div>

  {errors.telefonoContacto && (
    <span className="text-red-500 text-sm">{errors.telefonoContacto.message}</span>
  )}
</FormControl>


        <Divider/>

        <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={3}>
    <FormControl>
      <FormLabel sx={{ mb: 1, fontWeight: "bold", textAlign: "center" }}>
        Imagen de Perfil
      </FormLabel>
      <AutoUploadMedia
        initialData={
          multiple
            ? Array.isArray(dataEntrada)
              ? dataEntrada
              : dataEntrada
              ? [dataEntrada]
              : []
            : Array.isArray(dataEntrada)
            ? dataEntrada[0]
            : dataEntrada
        }
        multiple={multiple}
        onChange={(urls) =>
          setValue("imagenPerfil", Array.isArray(urls) ? urls[0] : urls)
        }
        onError={(message) => setAlert({ type: "error", message })} // 🔴 Ahora usa el nuevo setAlert
        onLoading={setLoading}
        mediaType="image"
      />
    </FormControl>

    <FormControl>
      <FormLabel sx={{ mb: 1, fontWeight: "bold", textAlign: "center" }}>
        Imagen de Portada
      </FormLabel>
      <AutoUploadMedia
        initialData={
          multiple
            ? Array.isArray(dataEntrada2)
              ? dataEntrada2
              : dataEntrada2
              ? [dataEntrada2]
              : []
            : Array.isArray(dataEntrada2)
            ? dataEntrada2[0]
            : dataEntrada2
        }
        multiple={multiple}
        onChange={(urls) =>
          setValue("imagenPortada", Array.isArray(urls) ? urls[0] : urls)
        }
        onError={(message) => setAlert({ type: "error", message })} // 🔴 Ahora usa el nuevo setAlert
        onLoading={setLoading}
        mediaType="image"
      />
    </FormControl>
  </Box>


        <Divider />
        <Alert severity="info" sx={{ mb: 1 }}>
          Por favor desplace el marcador en el mapa para seleccionar la ubicación exacta de tu negocio.
        </Alert>
        <Divider />
        <MapPicker
          onLocationSelect={(lat, lng) => {
            setValue("latitudNegocio", lat, { shouldValidate: true });
            setValue("longitudNegocio", lng, { shouldValidate: true });
          }}
          initialLocation={
            informacionNegocio?.latitudNegocio && informacionNegocio?.longitudNegocio
              ? { lat: informacionNegocio.latitudNegocio, lng: informacionNegocio.longitudNegocio }
              : { lat: 4.710989, lng: -74.07209 }
          }
        />
        <input
          type="hidden"
          {...register("latitudNegocio", {
            required: "La latitud es requerida",
            validate: (value) =>
              value !== undefined && value >= -90 && value <= 90
                ? true
                : "La latitud debe estar entre -90 y 90",
          })}
        />
        <input
          type="hidden"
          {...register("longitudNegocio", {
            required: "La longitud es requerida",
            validate: (value) =>
              value !== undefined && value >= -180 && value <= 180
                ? true
                : "La longitud debe estar entre -180 y 180",
          })}
        />
        {errors.latitudNegocio && (
          <span className="text-red-500 text-sm">{errors.latitudNegocio.message}</span>
        )}
        {errors.longitudNegocio && (
          <span className="text-red-500 text-sm">{errors.longitudNegocio.message}</span>
        )}
        <Divider />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <FormLabel sx={{ mb: 1, fontWeight: "bold" }}>Sitio Web (Opcional)</FormLabel>
          <TextField
            {...register("sitioWeb", {
              pattern: {
                value: /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?$/,
                message: "Ingresa una URL válida (ej. https://www.ejemplo.com)",
              },
            })}
            placeholder="https://www.ejemplo.com"
            error={!!errors.sitioWeb}
            helperText={errors.sitioWeb?.message}
          />
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <FormLabel sx={{ mb: 1, fontWeight: "bold" }}>URL de Google Maps (Opcional)</FormLabel>
          <TextField
            {...register("urlGoogleMaps", {
              pattern: {
                value: /^https:\/\/(www\.)?google\.com\/maps(\?|\/).+/,
                message: "Ingresa una URL válida de Google Maps",
              },
            })}
            placeholder="https://www.google.com/maps/place/..."
            error={!!errors.urlGoogleMaps}
            helperText={errors.urlGoogleMaps?.message}
          />

        </FormControl>

        <h1 className="text-2xl font-bold mb-4 text-blue-500">Redes Sociales</h1>
        {socialMediaFields.map((social) => (
          <FormControl fullWidth sx={{ mb: 2 }} key={social.name}>
            <FormLabel sx={{ mb: 1, fontWeight: "bold" }}>
              {social.name.charAt(0).toUpperCase() + social.name.slice(1)}
            </FormLabel>
            <TextField
              {...register(social.name, {
                pattern: {
                  value: social.pattern,
                  message: social.message,
                },
              })}
              placeholder={social.placeholder}
              error={!!errors[social.name]}
              helperText={errors[social.name]?.message}
            />
          </FormControl>
        ))}

        <FormControl component="fieldset" sx={{ mt: 4 }}>
  <FormLabel component="legend" sx={{ fontWeight: "bold", color: "#000" }}>
    Estado del Negocio
  </FormLabel>

  <Controller
    name="estadoNegocio"
    control={control}
    rules={{ required: "El estado del negocio es obligatorio" }}
    render={({ field }) => (
      <RadioGroup {...field} row>

        <FormControlLabel
          value={EstadoNegocio.activo}
          control={<Radio sx={{ color: "#000" }} />}
          label="Activo"
          sx={{ color: "#000" }} // ← color del texto
        />

        <FormControlLabel
          value={EstadoNegocio.suspendido}
          control={<Radio sx={{ color: "#000" }} />}
          label="Inactivo"
          sx={{ color: "#000" }} // ← color del texto
        />

      </RadioGroup>
    )}
  />

  {errors.estadoNegocio && (
    <span className="text-red-500 text-sm">{errors.estadoNegocio.message}</span>
  )}
</FormControl>


        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading}
          sx={{ mt: 4 }}
        >
          {loading ? <CircularProgress size={24} /> : informacionNegocio ? "Actualizar" : "Crear"}
        </Button>
      </form>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
            >
              <button
                onClick={handleCloseModal}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                aria-label="Cerrar modal"
              >
                <FaTimes size={20} />
              </button>
              <div className="flex flex-col items-center text-center">
                {responseType === "loading" && (
                  <>
                    <CircularProgress size={40} className="mb-4" />
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {message}
                    </Typography>
                  </>
                )}
                {responseType === "success" && (
                  <>
                    <FaCheckCircle size={40} className="text-green-500 mb-4" />
                    <Typography variant="h6" sx={{ mb: 2, color: "green" }}>
                      {message}
                    </Typography>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleCloseModal}
                    >
                      Cerrar
                    </Button>
                  </>
                )}
                {responseType === "error" && (
                  <>
                    <FaTimesCircle size={40} className="text-red-500 mb-4" />
                    <Typography variant="h6" sx={{ mb: 2, color: "red" }}>
                      {message}
                    </Typography>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={handleCloseModal}
                    >
                      Cerrar
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};