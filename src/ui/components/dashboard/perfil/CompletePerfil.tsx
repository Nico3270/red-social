"use client";

import { EstadoNegocio } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import React, { useEffect, useRef, useState, useMemo } from "react";
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
  IconButton,
  CircularProgress,
  Typography,
  Box,
} from "@mui/material";
import colombia from "@/config/colombia.json";
import clsx from "clsx";
import { GiColombia } from "react-icons/gi";
import * as RiIcons from "react-icons/ri";
import { IconType } from "react-icons";
import Divider from "../../divider/Divider";
import { initialData } from "@/seed/seed";
import { MapPicker } from "../../map-picker/MapPicker";
import { actualizarPerfilNegocio } from "@/actions/perfil/actualizarPerfil";
import AutoUploadMedia from "../../autoUpload/AutoUploadMedia";


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

type IconMap = { [key: string]: IconType };

const iconMap: IconMap = {
  ...RiIcons,
};



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

  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const [cityInput, setCityInput] = useState("");
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<Set<string>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, update } = useSession();
  const id = session?.user?.id;

  const allCities = useMemo(
    () => colombia.flatMap((d) => d.ciudades.map((ciudad) => `${ciudad} - ${d.departamento}`)),
    []
  );

  const countryCodes = [{ code: "+57", country: "Colombia" }];
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
    if (cityInput.length >= 3) {
      const matches = allCities.filter((city) =>
        removeAccents(city.toLowerCase()).includes(removeAccents(cityInput.toLowerCase()))
      );
      setFilteredCities(matches.slice(0, 10));
    } else {
      setFilteredCities([]);
    }
    setValue("ciudadNegocio", cityInput, { shouldValidate: true }); // Sincronizar ciudadNegocio con cityInput
  }, [cityInput, setValue]);

  useEffect(() => {
    register("ciudadNegocio", {
      required: "La ciudad es obligatoria",
    });
    register("departamentoNegocio", {
      required: "El departamento es obligatorio",
    });
  }, [register]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setFilteredCities([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (informacionNegocio) {
      const ciudad = `${informacionNegocio.ciudadNegocio} - ${informacionNegocio.departamentoNegocio}`;
      reset({
        ...informacionNegocio,
        estadoNegocio: informacionNegocio.estadoNegocio || EstadoNegocio.activo,
        telefonoContacto: informacionNegocio.telefonoNegocio.substring(3), // Asumiendo que el teléfono ya incluye el código de país
      });
      setCityInput(ciudad);
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

  const onSubmit = async (data: InformacionInicialNegocio) => {
    setLoading(true);
    setAlert(null);
    try {
      // Verificar que la sesión y el ID del usuario existan
      if (!session || !session.user?.id) {
        console.log("Sesión no válida:", session);
        setAlert({ type: "error", message: "No estás autenticado. Por favor, inicia sesión." });
        setLoading(false);
        return;
      }

      // Validar ciudad
      if (!allCities.includes(data.ciudadNegocio)) {
        setAlert({ type: "error", message: "Selecciona una ciudad válida de la lista." });
        setLoading(false);
        return;
      }

      // Validar formato de ciudad
      const [ciudadNombre, departamento] = data.ciudadNegocio.split(" - ");
      if (!ciudadNombre || !departamento) {
        setAlert({ type: "error", message: "El formato de la ciudad no es válido." });
        setLoading(false);
        return;
      }

      // Validar categorías
      if (data.categoriaIds.length === 0) {
        setAlert({ type: "error", message: "Debes seleccionar al menos una categoría." });
        setLoading(false);
        return;
      }

      // Validar secciones
      if (selectedSections.size === 0) {
        setAlert({ type: "error", message: "Debes seleccionar al menos una sección." });
        setLoading(false);
        return;
      }

      // Normalizar teléfono de contacto
      let normalizedTelefono = data.telefonoContacto;
      if (normalizedTelefono) {
        const digitsOnly = normalizedTelefono.replace(/\D/g, "");
        normalizedTelefono = `${selectedCountryCode}${digitsOnly}`;
        if (!/^\+57\d{10}$/.test(normalizedTelefono)) {
          setAlert({
            type: "error",
            message: "El teléfono debe tener exactamente 10 dígitos (por ejemplo, +573123456789).",
          });
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
        ciudadNegocio: ciudadNombre,
        departamentoNegocio: departamento,
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

      console.log("Enviando datos a actualizarPerfilNegocio:", submitData);
      // Llamar a la server action
      const response = await actualizarPerfilNegocio(session.user.id, submitData);

      if (!response.ok) {
        console.log("Error en la server action:", response.message);
        setAlert({
          type: "error",
          message: response.message || "Error al guardar la información.",
        });
        setLoading(false);
        return;
      }

      // Actualizar el rol si es un nuevo negocio
      if (!informacionNegocio) {
        console.log("Actualizando rol a 'negocio'");
        await update({ role: "negocio" });
      }

      const NewSlug = response.negocio?.slugNegocio || data.slugNegocio;


      // Mostrar mensaje de éxito y redirigir
      setAlert({ type: "success", message: response.message });
      setTimeout(() => {
        router.push(`/perfil/${NewSlug}`);
      }, 4000);
    } catch (error) {

      setAlert({
        type: "error",
        message: `Error: ${error instanceof Error ? error.message : "No se pudo guardar la información."}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Variables para almacenar datos de entrada de foto de perfil y foto de portada. Como solo se permite una imagen se deja mixto en false
  const multiple = false;
  // Información de entrada para la imagen de perfil
  const dataEntrada = informacionNegocio?.imagenPerfil;
  // Información de entrada para la imagen de portada
  const dataEntrada2 = informacionNegocio?.imagenPortada;



  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-3xl mx-auto p-4 bg-white rounded-lg shadow-md"
    >
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        {informacionNegocio ? "Editar Información de usuario" : "Crear Nuevo Usuario"}
      </Typography>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

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
          render={({ field }) => (
            <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
              {initialData.categorias.map((category) => {
                const IconComponent = iconMap[category.iconName] || RiIcons.RiQuestionLine;
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
        <input
          type="text"
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          className={clsx(
            "w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-red-600",
            { "border-red-500": errors.ciudadNegocio }
          )}
          placeholder="Ej. Medellín - Antioquia"
          autoComplete="off"
          name="fake_ciudad"
          id="ciudad-autocomplete-fix"
          spellCheck="false"
        />
        {errors.ciudadNegocio && (
          <span className="text-red-500 text-sm">{errors.ciudadNegocio.message}</span>
        )}
        {filteredCities.length > 0 && (
          <ul
            ref={suggestionsRef}
            className="absolute z-10 bg-white border rounded-md mt-1 max-h-48 overflow-y-auto shadow-md w-full"
          >
            {filteredCities.map((city) => (
              <li
                key={city}
                onClick={() => {
                  const [ciudad, departamento] = city.split(" - ");
                  setValue("ciudadNegocio", city, { shouldValidate: true }); // Usar el valor completo
                  setValue("departamentoNegocio", departamento, { shouldValidate: true });
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
        <FormLabel sx={{ mb: 1, fontWeight: "bold" }}>Teléfono de Contacto (Opcional)</FormLabel>
        <div className="flex items-center border rounded-lg focus-within:ring-2 focus-within:ring-red-600">
          <span className="flex items-center bg-gray-100 px-3 py-2 border-r border-gray-300">
            <GiColombia className="mr-2" />
            {selectedCountryCode}
          </span>
          <input
            type="text"
            {...register("telefonoContacto", {
              pattern: {
                value: /^\d{10}$/,
                message: "El número debe tener exactamente 10 dígitos (sin el código de país).",
              },
            })}
            className={clsx("w-full border-none p-2 focus:outline-none", {
              "border-red-500": errors.telefonoContacto,
            })}
            placeholder="Ej. 3123456789"
          />
        </div>
        {errors.telefonoContacto && (
          <span className="text-red-500 text-sm">{errors.telefonoContacto.message}</span>
        )}
      </FormControl>

      <FormControl>
        <FormLabel sx={{ mb: 1, fontWeight: "bold" }}>Imagen de Perfil</FormLabel>
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
          onChange={(urls) => setValue("imagenPerfil", Array.isArray(urls) ? urls[0] : urls)}
          onError={(message) => setAlert({ type: "error", message })}
          onLoading={setLoading}
          mediaType="image"
        />

      </FormControl>


      <Divider />
      <FormControl>
        <FormLabel sx={{ mb: 1, fontWeight: "bold" }}>Imagen de Portada</FormLabel>
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
          onChange={(urls) => setValue("imagenPortada", Array.isArray(urls) ? urls[0] : urls)}
          onError={(message) => setAlert({ type: "error", message })}
          onLoading={setLoading}
          mediaType="image"
        />
      </FormControl>


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
        <FormLabel component="legend" sx={{ fontWeight: "bold" }}>
          Estado del Negocio
        </FormLabel>
        <Controller
          name="estadoNegocio"
          control={control}
          rules={{ required: "El estado del negocio es obligatorio" }}
          render={({ field }) => (
            <RadioGroup {...field} row>
              <FormControlLabel value={EstadoNegocio.activo} control={<Radio />} label="Activo" />
              <FormControlLabel value={EstadoNegocio.suspendido} control={<Radio />} label="Inactivo" />
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
  );
};