"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Switch,
  useMediaQuery,
} from "@mui/material";
import {
  Camera,
  Check,
  CheckCircle2,
  ImagePlus,
  Layers3,
  Package,
  Plus,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createProduct,
  generateDescriptionFromText,
} from "@/ui/actions/productos/createNewProduct";
import { inter } from "@/config/fonts";
import { initialData } from "@/seed/seed";
import type { ProductStatus } from "@prisma/client";
import AutoUploadMedia from "../autoUpload/AutoUploadMedia";
import { useProductosTransaccionesStore } from "@/store/productosTransacciones/productosTransaccionesStore";
import styles from "./newProduct/newProduct.module.css";
import NewProductField from "./newProduct/NewProductField";
import {
  DEFAULT_NEW_PRODUCT_PALETTE,
  newProductPaletteStyle,
  type NewProductPalette,
} from "./newProduct/newProductPalette";

const menuPaper = (palette: NewProductPalette) => ({
  style: newProductPaletteStyle(palette),
  sx: {
    fontFamily: inter.style.fontFamily,
    borderRadius: "12px",
    boxShadow: "0 8px 32px #11182718",
    "& .MuiAutocomplete-option": {
      minHeight: "44px !important",
      alignItems: "center",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      fontSize: 14,
    },
    "&& .MuiAutocomplete-option[aria-selected=true]": {
      backgroundColor: "var(--product-soft)",
      color: "var(--product-ink)",
    },
    "&& .MuiAutocomplete-option.Mui-focused, && .MuiAutocomplete-option[aria-selected=true].Mui-focused":
      {
        backgroundColor: "var(--product-soft)",
        outline: "1px solid var(--product-accent-border)",
        outlineOffset: -1,
      },
    "& .MuiAutocomplete-listbox": {
      maxHeight: "min(280px, 40dvh)",
      padding: "4px",
    },
  },
});
const fieldError = (message?: string) => ({
  error: Boolean(message),
  helperText: message,
});

interface ProductFormData {
  nombre: string;
  precio: number;
  descripcion: string;
  descripcionCorta: string;
  slug: string;
  prioridad: number;
  status: ProductStatus;
  tags: string;
  categoriaId: string;
  stock: number | null;
  stockIlimitado: boolean;
  usaVariantes: boolean;
}

interface ProductAttributeInput {
  id: string;
  nombre: string;
  valor: string;
}

interface ProductVariantOptionInput {
  id: string;
  nombre: string;
  valor: string;
}

interface ProductVariantInput {
  id: string;
  nombre: string;
  sku: string;
  precio: string;
  stock: string;
  stockIlimitado: boolean;
  imagenUrl: string;
  isActive: boolean;
  options: ProductVariantOptionInput[];
}

const createId = () => Math.random().toString(36).slice(2, 10);

export default function CreateNewProduct({
  palette = DEFAULT_NEW_PRODUCT_PALETTE,
}: { palette?: NewProductPalette } = {}) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: {
      nombre: "",
      precio: 0,
      descripcion: "",
      descripcionCorta: "",
      slug: "",
      prioridad: 1,
      status: "disponible",
      tags: "",
      categoriaId: "",
      stock: null,
      stockIlimitado: true,
      usaVariantes: false,
    },
  });

  const [alert, setAlert] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(),
  );
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [caracteristicas, setCaracteristicas] = useState("");
  const [componentesInput, setComponentesInput] = useState("");
  const [componentes, setComponentes] = useState<string[]>([]);

  const [atributos, setAtributos] = useState<ProductAttributeInput[]>([]);
  const [variantes, setVariantes] = useState<ProductVariantInput[]>([]);

  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [variantErrors, setVariantErrors] = useState<Record<string, string>>(
    {},
  );
  const [proposal, setProposal] = useState<{
    description: string;
    shortDescription: string;
    tags: string;
  } | null>(null);
  const sending = useRef(false);
  const mediaBusy = useRef(false);
  const completed = useRef(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleMediaLoading = useCallback((busy: boolean) => {
    mediaBusy.current = busy;
    setMediaLoading(busy);
  }, []);
  const handleMediaError = useCallback(
    (message: string) => setMediaError(message),
    [],
  );
  useEffect(
    () => () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    },
    [],
  );

  const router = useRouter();
  const addProducto = useProductosTransaccionesStore(
    (state) => state.addProducto,
  );

  const [modalState, setModalState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [modalMessage, setModalMessage] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");

  const selectedCategoryId = watch("categoriaId");
  const nombreProducto = watch("nombre");
  const usaVariantes = watch("usaVariantes");
  const stockIlimitado = watch("stockIlimitado");

  const filteredSections = useMemo(
    () =>
      initialData.secciones.filter(
        (section) => section.categorySlug === selectedCategorySlug,
      ),
    [selectedCategorySlug],
  );

  const isModalOpen = modalState !== "idle";

  const generateSlug = (title: string) => {
    const randomId = Math.random().toString(36).substring(2, 6);
    const slug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    return `${slug}-${randomId}`;
  };

  useEffect(() => {
    if (nombreProducto) {
      const nuevoSlug = generateSlug(nombreProducto);
      setValue("slug", nuevoSlug, { shouldValidate: true });
    }
  }, [nombreProducto, setValue]);

  useEffect(() => {
    if (usaVariantes) {
      setValue("stockIlimitado", true);
      setValue("stock", null);
    }
  }, [usaVariantes, setValue]);

  const handleMediaChange = useCallback(
    (urls: string[] | string | undefined) => {
      const images = Array.isArray(urls) ? urls : urls ? [urls] : [];
      setUploadedImages(images);
      if (images.length) setMediaError("");
    },
    [],
  );

  const handleCategoryChange = (slug: string, categoryId: string) => {
    if (slug !== selectedCategorySlug) setSelectedSections(new Set());
    setSelectedCategorySlug(slug);
    setValue("categoriaId", categoryId, { shouldValidate: true });
  };

  const handleGenerateDescription = async () => {
    const nombre = watch("nombre").trim();

    if (!nombre) {
      setAlert({
        type: "error",
        message:
          "Debes ingresar un nombre para el producto antes de generar la descripción.",
      });
      return;
    }

    if (!caracteristicas.trim()) {
      setAlert({
        type: "error",
        message:
          "Ingresa las características del producto antes de generar la descripción.",
      });
      return;
    }

    setGenerating(true);
    setProposal(null);
    setAlert(null);

    try {
      const result = await generateDescriptionFromText(
        nombre,
        caracteristicas,
        componentes,
      );

      if (result.ok) {
        setProposal({
          description: result.description || "",
          shortDescription: result.shortDescription || "",
          tags: result.tags ? result.tags.join(", ") : "",
        });
      } else {
        setAlert({
          type: "error",
          message: result.message || "Error al generar la descripción.",
        });
      }
    } catch (error) {
      console.error("Error al generar la descripción:", error);
      setAlert({
        type: "error",
        message: "Hubo un error al generar la descripción con IA.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateComponentes = () => {
    if (!componentesInput.trim()) return;

    const nuevosComponentes = componentesInput
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    setComponentes((prev) => [...prev, ...nuevosComponentes]);
    setComponentesInput("");
  };

  const handleRemoveComponente = (index: number) => {
    setComponentes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCloseModal = () => {
    if (sending.current) return;
    setModalState("idle");
    if (modalState === "success" && redirectUrl) {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      router.push(redirectUrl);
    }
  };

  const addAtributo = () => {
    setAtributos((prev) => [
      ...prev,
      { id: createId(), nombre: "", valor: "" },
    ]);
  };

  const updateAtributo = (
    id: string,
    field: keyof Omit<ProductAttributeInput, "id">,
    value: string,
  ) => {
    setAtributos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removeAtributo = (id: string) => {
    setAtributos((prev) => prev.filter((item) => item.id !== id));
  };

  const addVariant = () => {
    setVariantes((prev) => [
      ...prev,
      {
        id: createId(),
        nombre: "",
        sku: "",
        precio: "",
        stock: "",
        stockIlimitado: true,
        imagenUrl: "",
        isActive: true,
        options: [],
      },
    ]);
  };

  const updateVariant = (
    id: string,
    field: keyof Omit<ProductVariantInput, "id" | "options">,
    value: string | boolean,
  ) => {
    setVariantes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removeVariant = (id: string) => {
    setVariantes((prev) => prev.filter((item) => item.id !== id));
  };

  const addVariantOption = (variantId: string) => {
    setVariantes((prev) =>
      prev.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              options: [
                ...variant.options,
                { id: createId(), nombre: "", valor: "" },
              ],
            }
          : variant,
      ),
    );
  };

  const updateVariantOption = (
    variantId: string,
    optionId: string,
    field: keyof Omit<ProductVariantOptionInput, "id">,
    value: string,
  ) => {
    setVariantes((prev) =>
      prev.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              options: variant.options.map((option) =>
                option.id === optionId ? { ...option, [field]: value } : option,
              ),
            }
          : variant,
      ),
    );
  };

  const removeVariantOption = (variantId: string, optionId: string) => {
    setVariantes((prev) =>
      prev.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              options: variant.options.filter(
                (option) => option.id !== optionId,
              ),
            }
          : variant,
      ),
    );
  };

  const onSubmit = async (data: ProductFormData) => {
    if (sending.current || completed.current || mediaBusy.current) return;
    setAttempted(true);
    const nextVariantErrors: Record<string, string> = {};
    if (usaVariantes) {
      variantes.forEach((variant) => {
        if (
          !variant.stockIlimitado &&
          (!variant.stock.trim() ||
            !Number.isFinite(Number(variant.stock)) ||
            Number(variant.stock) < 0)
        )
          nextVariantErrors[`${variant.id}-stock`] =
            "Indica un stock válido, igual o mayor a cero.";
        if (
          variant.imagenUrl.trim() &&
          !/^https:\/\/res\.cloudinary\.com\//.test(variant.imagenUrl.trim())
        )
          nextVariantErrors[`${variant.id}-imagen`] =
            "Usa una URL HTTPS de Cloudinary.";
      });
    }
    setVariantErrors(nextVariantErrors);
    if (
      !selectedCategorySlug ||
      !selectedCategoryId ||
      !uploadedImages.length ||
      !selectedSections.size ||
      (usaVariantes && !variantes.length) ||
      Object.keys(nextVariantErrors).length
    ) {
      const target = !uploadedImages.length
        ? "product-photos"
        : !selectedSections.size
          ? "product-sections"
          : "product-variants";
      document.getElementById(target)?.focus();
      return;
    }
    sending.current = true;
    setLoading(true);
    setModalState("loading");
    setModalMessage("Estamos preparando su lugar en tu catálogo.");

    try {
      const atributosValidos = atributos
        .map((item) => ({
          nombre: item.nombre.trim(),
          valor: item.valor.trim(),
        }))
        .filter((item) => item.nombre && item.valor);

      const variantesValidas = variantes
        .map((variant) => ({
          nombre: variant.nombre.trim() || null,
          sku: variant.sku.trim() || null,
          precio:
            variant.precio.trim() !== "" &&
            !Number.isNaN(Number(variant.precio))
              ? Number(variant.precio)
              : null,
          stock:
            variant.stock.trim() !== "" && !Number.isNaN(Number(variant.stock))
              ? Number(variant.stock)
              : null,
          stockIlimitado: variant.stockIlimitado,
          imagenUrl: variant.imagenUrl.trim() || null,
          isActive: variant.isActive,
          options: variant.options
            .map((option) => ({
              nombre: option.nombre.trim(),
              valor: option.valor.trim(),
            }))
            .filter((option) => option.nombre && option.valor),
        }))
        .filter((variant) => {
          if (!usaVariantes) return false;
          return (
            variant.nombre ||
            variant.sku ||
            variant.precio !== null ||
            variant.stock !== null ||
            variant.options.length > 0
          );
        });

      if (usaVariantes && variantesValidas.length === 0) {
        setModalState("idle");
        setVariantErrors({
          empty:
            "Completa el nombre, SKU, precio, stock o una opción de al menos una variante.",
        });
        document.getElementById("product-variants")?.focus();
        return;
      }

      const formData = new FormData();
      formData.append("nombre", data.nombre.trim());
      formData.append("precio", String(Number(data.precio) || 0));
      formData.append("descripcion", data.descripcion);
      formData.append("descripcionCorta", data.descripcionCorta || "");
      formData.append("slug", data.slug);
      formData.append("prioridad", String(data.prioridad || 1));
      formData.append("status", data.status);
      formData.append("tags", data.tags);

      formData.append("categoriaId", selectedCategoryId);

      formData.append("stockIlimitado", String(data.stockIlimitado));
      formData.append("usaVariantes", String(data.usaVariantes));

      if (
        !data.usaVariantes &&
        data.stockIlimitado === false &&
        data.stock !== null
      ) {
        formData.append("stock", String(data.stock));
      }

      selectedSections.forEach((id) => formData.append("seccionIds", id));
      uploadedImages.forEach((url) => formData.append("imageUrls", url));
      componentes.forEach((componente) =>
        formData.append("componentes", componente),
      );

      if (atributosValidos.length > 0) {
        formData.append("atributos", JSON.stringify(atributosValidos));
      }

      if (variantesValidas.length > 0) {
        formData.append("variantes", JSON.stringify(variantesValidas));
      }

      const result = await createProduct(formData);

      if (result.ok) {
        const firstSectionId = Array.from(selectedSections)[0];
        const section = initialData.secciones.find(
          (sec) => sec.id === firstSectionId,
        );

        if (!section) {
          setModalState("error");
          setModalMessage("La sección seleccionada no existe.");
          return;
        }

        if (result.product) {
          addProducto({
            id: result.product.id,
            nombre: result.product.nombre,
            precio: result.product.precio,
          });
        }

        const url = `/${selectedCategorySlug}/${section.slug}/${result.product?.slug}`;
        setRedirectUrl(url);
        completed.current = true;
        setSubmitted(true);
        setModalState("success");
        setModalMessage("Producto creado exitosamente.");

        redirectTimer.current = setTimeout(() => {
          router.push(url);
        }, 2000);
      } else {
        setModalState("error");
        setModalMessage(
          result.message || "Ocurrió un error al crear el producto.",
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error desconocido al enviar el formulario";

      setModalState("error");
      setModalMessage(errorMessage);
      console.error("Error al enviar el formulario:", errorMessage);
    } finally {
      sending.current = false;
      setLoading(false);
    }
  };

  return (
    <>
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit, () => setAttempted(true))}
        className={styles.form}
        style={newProductPaletteStyle(palette)}
        data-product-palette={palette}
        aria-label="Nuevo producto"
        aria-busy={loading}
      >
        <fieldset
          disabled={loading || submitted}
          style={{ minWidth: 0, padding: 0, margin: 0, border: 0 }}
        >
          <section
            id="product-photos"
            className={styles.section}
            aria-labelledby="photos-title"
            tabIndex={-1}
          >
            <div className={styles.sectionHead}>
              <span className={styles.sectionIcon}>
                <Camera size={18} aria-hidden="true" />
              </span>
              <div>
                <h2 id="photos-title" className={styles.sectionTitle}>
                  Fotografías
                </h2>
                <p className={styles.sectionHint}>
                  El primer vistazo a lo que ofreces. Agrega al menos una
                  fotografía.
                </p>
              </div>
            </div>
            <AutoUploadMedia
              presentation="productGallery"
              multiple
              onChange={handleMediaChange}
              onError={handleMediaError}
              onLoading={handleMediaLoading}
              mediaType="image"
            />
            {(mediaError || (attempted && !uploadedImages.length)) && (
              <p role="alert" className={styles.error}>
                {mediaError ||
                  "Agrega al menos una fotografía y espera a que termine de subir."}
              </p>
            )}
          </section>

          <section
            className={styles.section}
            aria-labelledby="information-title"
          >
            <div className={styles.sectionHead}>
              <span className={styles.sectionIcon}>
                <Package size={18} aria-hidden="true" />
              </span>
              <div>
                <h2 id="information-title" className={styles.sectionTitle}>
                  Información del producto
                </h2>
                <p className={styles.sectionHint}>
                  Cuéntales a tus clientes qué lo hace especial. * Obligatorio
                </p>
              </div>
            </div>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="product-name" className={styles.label}>
                  Nombre del producto *
                </label>
                <NewProductField
                  id="product-name"
                  placeholder="Ej. Café de origen, 250 g"
                  autoComplete="off"
                  fullWidth
                  {...register("nombre", {
                    required: "Escribe el nombre del producto.",
                    validate: (value) =>
                      Boolean(value.trim()) ||
                      "Escribe el nombre del producto.",
                  })}
                  {...fieldError(errors.nombre?.message)}
                  inputProps={{ "aria-required": true }}
                />
              </div>
              <section
                className={styles.componentBlock}
                aria-labelledby="components-title"
              >
                <div className={styles.sectionHead}>
                  <span className={styles.sectionIcon}>
                    <Layers3 size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="components-title" className={styles.sectionTitle}>
                      Componentes del producto
                    </h2>
                    <p className={styles.sectionHint}>
                      Agrega los ingredientes, materiales o elementos que
                      componen tu producto
                    </p>
                  </div>
                </div>
                <div className={styles.fields}>
                  <NewProductField
                    id="product-components-input"
                    inputProps={{ "aria-labelledby": "components-title" }}
                    value={componentesInput}
                    onChange={(e) => setComponentesInput(e.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                    placeholder={"Ej. Bandeja decorada\nMix de frutas"}
                    helperText="Uno por línea. Se guardan en el producto sin necesidad de usar IA."
                  />
                  <div>
                    <Button
                      type="button"
                      variant="outlined"
                      startIcon={<Plus size={16} />}
                      onClick={handleGenerateComponentes}
                    >
                      Agregar
                    </Button>
                  </div>
                  {componentesInput.trim() && (
                    <p className={styles.hint}>
                      Tienes componentes sin agregar. El texto de arriba todavía
                      no se guardará.
                    </p>
                  )}
                  {componentes.length > 0 && (
                    <div
                      className={styles.chips}
                      role="group"
                      aria-label="Componentes agregados"
                    >
                      {componentes.map((componente, index) => (
                        <Chip
                          key={`componente-${index}`}
                          label={componente}
                          onDelete={() => handleRemoveComponente(index)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <div className={styles.field}>
                <label htmlFor="product-description" className={styles.label}>
                  Descripción *
                </label>
                <NewProductField
                  id="product-description"
                  placeholder="Describe sus características, materiales o lo que incluye…"
                  multiline
                  minRows={4}
                  fullWidth
                  {...register("descripcion", {
                    required: "Escribe una descripción para el producto.",
                    validate: (value) =>
                      Boolean(value.trim()) ||
                      "Escribe una descripción para el producto.",
                  })}
                  {...fieldError(errors.descripcion?.message)}
                  inputProps={{ "aria-required": true }}
                />
              </div>
              <details className={`${styles.disclosure} ${styles.assistant}`}>
                <summary>
                  <Sparkles size={17} aria-hidden="true" /> Ayúdame a escribir
                  la descripción
                </summary>
                <div className={styles.disclosureBody}>
                  <p className={styles.hint}>
                    Obtén una propuesta de descripción, descripción corta y
                    palabras clave. Tu texto se conserva hasta que elijas usar
                    la propuesta. Las características y los componentes ayudan a
                    la IA a describir exactamente lo que ofreces.
                  </p>
                  <NewProductField
                    label="Características principales"
                    value={caracteristicas}
                    onChange={(e) => setCaracteristicas(e.target.value)}
                    multiline
                    minRows={3}
                    fullWidth
                    helperText="Ej. Origen, materiales, beneficios, presentación o contenido."
                  />
                  <p
                    className={styles.hint}
                    role="note"
                    aria-label="Componentes usados por la IA"
                  >
                    {componentes.length > 0
                      ? `La IA usará los componentes agregados: ${componentes.join(" · ")}.`
                      : "La IA también usará los componentes que agregues en su sección del formulario."}
                  </p>
                  <div>
                    <Button
                      type="button"
                      variant="outlined"
                      startIcon={
                        generating ? (
                          <CircularProgress size={17} color="inherit" />
                        ) : (
                          <Sparkles size={17} />
                        )
                      }
                      onClick={handleGenerateDescription}
                      disabled={generating}
                    >
                      {generating
                        ? "Preparando propuesta…"
                        : "Generar descripción con IA"}
                    </Button>
                  </div>
                  {alert && (
                    <Alert severity={alert.type} onClose={() => setAlert(null)}>
                      {alert.message}
                    </Alert>
                  )}
                  {proposal && (
                    <div
                      className={styles.aiPreview}
                      role="region"
                      aria-label="Propuesta de IA"
                    >
                      <h3 className={styles.rowTitle}>
                        Tu propuesta, lista para revisar
                      </h3>
                      <p>{proposal.description}</p>
                      <div>
                        <span className={styles.label}>Descripción corta</span>
                        <p>{proposal.shortDescription}</p>
                      </div>
                      <div>
                        <span className={styles.label}>Palabras clave</span>
                        <p>{proposal.tags}</p>
                      </div>
                      <p className={styles.hint}>
                        Al usarla, se reemplazan los tres campos actuales.
                        Después puedes editarlos.
                      </p>
                      <div className={styles.row}>
                        <Button
                          type="button"
                          variant="outlined"
                          startIcon={<Check size={16} />}
                          onClick={() => {
                            setValue("descripcion", proposal.description, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                            setValue(
                              "descripcionCorta",
                              proposal.shortDescription,
                              { shouldDirty: true },
                            );
                            setValue("tags", proposal.tags, {
                              shouldDirty: true,
                            });
                            setProposal(null);
                            setAlert({
                              type: "success",
                              message:
                                "Propuesta aplicada. Puedes seguir editando el texto.",
                            });
                          }}
                        >
                          Usar propuesta
                        </Button>
                        <Button type="button" onClick={() => setProposal(null)}>
                          Descartar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </details>
              <div className={styles.field}>
                <label
                  htmlFor="product-short-description"
                  className={styles.label}
                >
                  Descripción corta{" "}
                  <span className={styles.optional}>Opcional</span>
                </label>
                <NewProductField
                  id="product-short-description"
                  placeholder="Una frase para presentar tu producto"
                  multiline
                  minRows={2}
                  fullWidth
                  {...register("descripcionCorta")}
                  helperText="Se muestra en las tarjetas del catálogo."
                />
              </div>
              <Controller
                name="categoriaId"
                control={control}
                rules={{ required: "Selecciona una categoría." }}
                render={({ field }) => (
                  <div className={styles.field}>
                    <label htmlFor="product-category" className={styles.label}>
                      Categoría *
                    </label>
                    <Autocomplete
                      id="product-category"
                      options={initialData.categorias}
                      getOptionLabel={(option) => option.nombre}
                      value={
                        initialData.categorias.find(
                          (category) => category.id === field.value,
                        ) ?? null
                      }
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      onChange={(_, value) =>
                        handleCategoryChange(value?.slug ?? "", value?.id ?? "")
                      }
                      onBlur={field.onBlur}
                      noOptionsText="No encontramos esa categoría"
                      openText="Ver categorías"
                      closeText="Cerrar categorías"
                      clearText="Quitar categoría"
                      slotProps={{ paper: menuPaper(palette) }}
                      renderInput={(params) => (
                        <NewProductField
                          {...params}
                          inputRef={field.ref}
                          name={field.name}
                          placeholder="Busca una categoría"
                          {...fieldError(errors.categoriaId?.message)}
                          inputProps={{
                            ...params.inputProps,
                            "aria-required": true,
                          }}
                        />
                      )}
                    />
                  </div>
                )}
              />
              <div className={styles.field} id="product-sections" tabIndex={-1}>
                <label
                  htmlFor="product-section-select"
                  className={styles.label}
                >
                  Secciones *
                </label>
                <Autocomplete
                  id="product-section-select"
                  multiple
                  disableCloseOnSelect
                  disabled={!selectedCategorySlug}
                  options={filteredSections}
                  getOptionLabel={(option) => option.nombre}
                  value={Array.from(selectedSections)
                    .map((id) =>
                      filteredSections.find((section) => section.id === id),
                    )
                    .filter(
                      (section): section is (typeof filteredSections)[number] =>
                        Boolean(section),
                    )}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  onChange={(_, values) =>
                    setSelectedSections(
                      new Set(values.map((section) => section.id)),
                    )
                  }
                  noOptionsText="No encontramos esa sección"
                  openText="Ver secciones"
                  closeText="Cerrar secciones"
                  clearText="Quitar secciones"
                  slotProps={{ paper: menuPaper(palette) }}
                  renderOption={(props, option, { selected }) => {
                    const { key, ...optionProps } = props;
                    return (
                      <li key={key} {...optionProps}>
                        <Checkbox
                          checked={selected}
                          tabIndex={-1}
                          disableRipple
                          sx={{
                            color: "#9ca3af",
                            "&.Mui-checked": { color: "var(--product-accent)" },
                            pointerEvents: "none",
                          }}
                        />
                        <span>{option.nombre}</span>
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <NewProductField
                      {...params}
                      placeholder={
                        selectedSections.size
                          ? "Añadir sección"
                          : "Selecciona una o más"
                      }
                      error={
                        attempted &&
                        Boolean(selectedCategorySlug) &&
                        !selectedSections.size
                      }
                      helperText={
                        attempted &&
                        selectedCategorySlug &&
                        !selectedSections.size
                          ? "Selecciona al menos una sección."
                          : selectedCategorySlug
                            ? "Puedes elegir varias. Al cambiar la categoría, se restablecen las secciones."
                            : "Primero selecciona una categoría."
                      }
                      inputProps={{
                        ...params.inputProps,
                        "aria-required": true,
                      }}
                    />
                  )}
                />
              </div>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="pricing-title">
            <div className={styles.sectionHead}>
              <span className={styles.sectionIcon}>
                <Tag size={18} aria-hidden="true" />
              </span>
              <div>
                <h2 id="pricing-title" className={styles.sectionTitle}>
                  Precio e inventario
                </h2>
                <p className={styles.sectionHint}>
                  Define su precio y disponibilidad.
                </p>
              </div>
            </div>
            <div className={styles.fields}>
              <div className={styles.twoColumns}>
                <div className={styles.field}>
                  <label htmlFor="product-price" className={styles.label}>
                    Precio base *
                  </label>
                  <NewProductField
                    id="product-price"
                    type="number"
                    fullWidth
                    {...register("precio", {
                      required: "Indica el precio base. Puede ser cero.",
                      valueAsNumber: true,
                      min: {
                        value: 0,
                        message: "El precio no puede ser negativo.",
                      },
                    })}
                    {...fieldError(errors.precio?.message)}
                    inputProps={{
                      step: "any",
                      min: 0,
                      inputMode: "decimal",
                      "aria-required": true,
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">COP</InputAdornment>
                      ),
                    }}
                  />
                </div>
                <div className={styles.field}>
                  <label
                    id="product-status-label"
                    htmlFor="product-status"
                    className={styles.label}
                  >
                    Estado del producto
                  </label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <NewProductField
                        {...field}
                        id="product-status"
                        select
                        fullWidth
                        SelectProps={{
                          labelId: "product-status-label",
                          MenuProps: {
                            transitionDuration: reducedMotion ? 0 : 180,
                            PaperProps: {
                              style: newProductPaletteStyle(palette),
                              sx: {
                                maxHeight: "40dvh",
                                "& .MuiMenuItem-root": { minHeight: 44 },
                                "& .MuiMenuItem-root.Mui-selected, & .MuiMenuItem-root.Mui-selected:hover":
                                  {
                                    backgroundColor: "var(--product-soft)",
                                    color: "var(--product-ink)",
                                  },
                              },
                            },
                          },
                        }}
                      >
                        <MenuItem value="disponible">Disponible</MenuItem>
                        <MenuItem value="descontinuado">Descontinuado</MenuItem>
                        <MenuItem value="agotado">Agotado</MenuItem>
                        <MenuItem value="oculto">Oculto</MenuItem>
                      </NewProductField>
                    )}
                  />
                </div>
              </div>
              {usaVariantes ? (
                <p className={styles.hint}>
                  El inventario se gestiona en cada variante. El precio base se
                  usa cuando una variante no tiene precio propio.
                </p>
              ) : (
                <>
                  <Controller
                    name="stockIlimitado"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={field.value}
                            onChange={(_, checked) => field.onChange(checked)}
                          />
                        }
                        label="Stock ilimitado"
                      />
                    )}
                  />
                  {!stockIlimitado && (
                    <div className={styles.field}>
                      <label htmlFor="product-stock" className={styles.label}>
                        Stock disponible *
                      </label>
                      <NewProductField
                        id="product-stock"
                        type="number"
                        fullWidth
                        {...register("stock", {
                          setValueAs: (value) =>
                            value === "" || value === null
                              ? null
                              : Number(value),
                          validate: (value) =>
                            getValues("usaVariantes") ||
                            getValues("stockIlimitado") ||
                            (value !== null &&
                              Number.isFinite(value) &&
                              value >= 0) ||
                            "Indica un stock válido, igual o mayor a cero.",
                        })}
                        {...fieldError(errors.stock?.message)}
                        inputProps={{ inputMode: "numeric", step: 1, min: 0 }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <section
            id="product-variants"
            tabIndex={-1}
            className={styles.section}
            aria-labelledby="variants-title"
          >
            <div className={styles.sectionHead}>
              <span className={styles.sectionIcon}>
                <Layers3 size={18} aria-hidden="true" />
              </span>
              <div>
                <h2 id="variants-title" className={styles.sectionTitle}>
                  Variantes
                </h2>
                <p className={styles.sectionHint}>
                  Para productos con distintas tallas, colores o presentaciones.
                </p>
              </div>
            </div>
            <div className={styles.fields}>
              <Controller
                name="usaVariantes"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(_, checked) => field.onChange(checked)}
                      />
                    }
                    label="Este producto tiene variantes"
                  />
                )}
              />
              {usaVariantes && (
                <>
                  <p className={styles.hint}>
                    Cada variante es una opción que tu cliente puede comprar.
                    Para «Grande» y «Extra grande», agrega dos variantes. Sus
                    detalles describen esa opción; no crean combinaciones
                    nuevas.
                  </p>
                  {attempted && !variantes.length && (
                    <p role="alert" className={styles.error}>
                      Agrega al menos una variante.
                    </p>
                  )}
                  {variantErrors.empty && (
                    <p role="alert" className={styles.error}>
                      {variantErrors.empty}
                    </p>
                  )}
                  {variantes.map((variant, index) => (
                    <div
                      className={styles.variant}
                      key={variant.id}
                      role="group"
                      aria-label={`Variante ${index + 1}`}
                    >
                      <div className={styles.row}>
                        <h3 className={styles.variantTitle}>
                          Variante {index + 1}
                        </h3>
                        <IconButton
                          type="button"
                          aria-label={`Eliminar variante ${index + 1}`}
                          onClick={() => removeVariant(variant.id)}
                        >
                          <Trash2 size={17} />
                        </IconButton>
                      </div>
                      <NewProductField
                        label="Nombre que verá el cliente"
                        value={variant.nombre}
                        onChange={(e) =>
                          updateVariant(variant.id, "nombre", e.target.value)
                        }
                        fullWidth
                        helperText="Ej. Grande, Roja o 1 kg."
                      />
                      <NewProductField
                        label="Precio de la variante"
                        type="number"
                        value={variant.precio}
                        onChange={(e) =>
                          updateVariant(variant.id, "precio", e.target.value)
                        }
                        fullWidth
                        inputProps={{ step: "any", inputMode: "decimal" }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              COP
                            </InputAdornment>
                          ),
                        }}
                        helperText="Vacío: utiliza el precio base. Si lo completas, es el precio final."
                      />
                      <div className={styles.row}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={variant.stockIlimitado}
                              onChange={(_, checked) =>
                                updateVariant(
                                  variant.id,
                                  "stockIlimitado",
                                  checked,
                                )
                              }
                            />
                          }
                          label="Stock ilimitado"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={variant.isActive}
                              onChange={(_, checked) =>
                                updateVariant(variant.id, "isActive", checked)
                              }
                            />
                          }
                          label="Activa"
                        />
                      </div>
                      {!variant.stockIlimitado && (
                        <NewProductField
                          label="Stock de la variante"
                          type="number"
                          value={variant.stock}
                          onChange={(e) =>
                            updateVariant(variant.id, "stock", e.target.value)
                          }
                          fullWidth
                          {...fieldError(variantErrors[`${variant.id}-stock`])}
                          inputProps={{ inputMode: "numeric", step: 1, min: 0 }}
                        />
                      )}
                      <details
                        className={styles.disclosure}
                        open={
                          variantErrors[`${variant.id}-imagen`]
                            ? true
                            : undefined
                        }
                      >
                        <summary>
                          SKU, imagen y detalles
                          {variant.options.length
                            ? ` (${variant.options.length})`
                            : ""}
                        </summary>
                        <div className={styles.disclosureBody}>
                          <NewProductField
                            label="SKU interno (opcional)"
                            value={variant.sku}
                            onChange={(e) =>
                              updateVariant(variant.id, "sku", e.target.value)
                            }
                            fullWidth
                            helperText="Código para tu inventario. No es el nombre visible."
                          />
                          <NewProductField
                            label="URL de imagen específica (opcional)"
                            value={variant.imagenUrl}
                            onChange={(e) =>
                              updateVariant(
                                variant.id,
                                "imagenUrl",
                                e.target.value,
                              )
                            }
                            fullWidth
                            {...fieldError(
                              variantErrors[`${variant.id}-imagen`],
                            )}
                            helperText={
                              variantErrors[`${variant.id}-imagen`] ||
                              "URL HTTPS de Cloudinary si esta variante tiene una foto distinta."
                            }
                          />
                          <div className={styles.row}>
                            <span className={styles.rowTitle}>
                              Detalles de esta variante
                            </span>
                            <Button
                              type="button"
                              variant="outlined"
                              startIcon={<Plus size={16} />}
                              onClick={() => addVariantOption(variant.id)}
                            >
                              Añadir opción
                            </Button>
                          </div>
                          {variant.options.map((option, optionIndex) => (
                            <div className={styles.option} key={option.id}>
                              <div className={styles.row}>
                                <span className={styles.hint}>
                                  Opción {optionIndex + 1}
                                </span>
                                <IconButton
                                  type="button"
                                  aria-label={`Eliminar opción ${optionIndex + 1} de variante ${index + 1}`}
                                  onClick={() =>
                                    removeVariantOption(variant.id, option.id)
                                  }
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              </div>
                              <div className={styles.twoColumns}>
                                <NewProductField
                                  label="Atributo"
                                  value={option.nombre}
                                  onChange={(e) =>
                                    updateVariantOption(
                                      variant.id,
                                      option.id,
                                      "nombre",
                                      e.target.value,
                                    )
                                  }
                                  fullWidth
                                  helperText="Ej. Tamaño, color o sabor."
                                />
                                <NewProductField
                                  label="Valor visible"
                                  value={option.valor}
                                  onChange={(e) =>
                                    updateVariantOption(
                                      variant.id,
                                      option.id,
                                      "valor",
                                      e.target.value,
                                    )
                                  }
                                  fullWidth
                                  helperText="Ej. Grande, negro o vainilla."
                                />
                              </div>
                            </div>
                          ))}
                          <p className={styles.hint}>
                            Solo se guardan los detalles con atributo y valor
                            completos.
                          </p>
                        </div>
                      </details>
                    </div>
                  ))}
                  <div>
                    <Button
                      type="button"
                      variant="outlined"
                      startIcon={<Plus size={17} />}
                      onClick={addVariant}
                    >
                      Agregar variante
                    </Button>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className={styles.section} aria-label="Detalles adicionales">
            <details className={styles.disclosure}>
              <summary>
                Detalles adicionales
                {atributos.length > 0
                  ? ` · ${atributos.length} ${atributos.length === 1 ? "atributo" : "atributos"}`
                  : ""}
              </summary>
              <div className={styles.disclosureBody}>
                <p className={styles.hint}>
                  Completa solo lo que tu producto necesita. Puedes volver a
                  estos detalles cuando quieras.
                </p>
                <div className={styles.row}>
                  <h3 className={styles.rowTitle}>Atributos adicionales</h3>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<Plus size={16} />}
                    onClick={addAtributo}
                  >
                    Agregar atributo
                  </Button>
                </div>
                <p className={styles.hint}>
                  Ej. Material: algodón. Solo se guardan los pares con nombre y
                  valor completos.
                </p>
                {atributos.map((atributo, index) => (
                  <div
                    className={styles.option}
                    key={atributo.id}
                    role="group"
                    aria-label={`Atributo ${index + 1}`}
                  >
                    <div className={styles.row}>
                      <span className={styles.rowTitle}>
                        Atributo {index + 1}
                      </span>
                      <IconButton
                        type="button"
                        aria-label={`Eliminar atributo ${index + 1}`}
                        onClick={() => removeAtributo(atributo.id)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                    <div className={styles.twoColumns}>
                      <NewProductField
                        label="Nombre del atributo"
                        value={atributo.nombre}
                        onChange={(e) =>
                          updateAtributo(atributo.id, "nombre", e.target.value)
                        }
                        fullWidth
                      />
                      <NewProductField
                        label="Valor del atributo"
                        value={atributo.valor}
                        onChange={(e) =>
                          updateAtributo(atributo.id, "valor", e.target.value)
                        }
                        fullWidth
                      />
                    </div>
                  </div>
                ))}
                <NewProductField
                  label="Palabras clave (opcional)"
                  {...register("tags")}
                  fullWidth
                  multiline
                  minRows={2}
                  helperText="Separadas por comas. Ayudan a encontrar tu producto."
                />
                <NewProductField
                  label="Slug del producto"
                  {...register("slug")}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  helperText="Se genera con el nombre. La URL definitiva se confirma al crear el producto."
                />
              </div>
            </details>
          </section>
          <footer className={styles.footer}>
            <p>
              {submitted
                ? "Tu producto ya está creado."
                : mediaLoading
                  ? "Espera a que terminen de subir las fotografías."
                  : "Revisa los detalles. Podrás editarlos después desde Productos."}
            </p>
            <Button
              type="submit"
              variant="contained"
              disabled={loading || mediaLoading || submitted}
              startIcon={
                loading ? (
                  <CircularProgress size={17} color="inherit" />
                ) : (
                  <Plus size={17} />
                )
              }
              sx={{ flexShrink: 0, minWidth: { sm: 200 } }}
            >
              {loading ? "Creando producto…" : "Crear producto"}
            </Button>
          </footer>
        </fieldset>
      </form>
      <Dialog
        open={isModalOpen}
        transitionDuration={reducedMotion ? 0 : 180}
        onClose={handleCloseModal}
        disableEscapeKeyDown={loading}
        fullWidth
        maxWidth="xs"
        aria-labelledby="product-result-title"
        aria-describedby="product-result-description"
        PaperProps={{
          style: newProductPaletteStyle(palette),
          sx: {
            borderRadius: 3,
            m: 2,
            width: "calc(100% - 32px)",
            maxHeight: "calc(100dvh - 32px)",
            fontFamily: inter.style.fontFamily,
            "& .MuiTypography-root, & .MuiButton-root": {
              fontFamily: "inherit",
            },
          },
        }}
      >
        <DialogTitle
          id="product-result-title"
          sx={{ fontSize: 22, fontWeight: 650, pt: 3 }}
        >
          {modalState === "loading"
            ? "Creando producto…"
            : modalState === "success"
              ? "Tu producto está listo"
              : "No pudimos crear el producto"}
        </DialogTitle>
        <DialogContent>
          <Box
            role="status"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              color: "#4b5563",
              fontSize: 15,
              lineHeight: 1.7,
            }}
          >
            {modalState === "loading" ? (
              <CircularProgress
                size={24}
                sx={{
                  color: "var(--product-accent)",
                  flexShrink: 0,
                  ...(reducedMotion
                    ? { animation: "none", "& circle": { animation: "none" } }
                    : {}),
                }}
              />
            ) : modalState === "success" ? (
              <CheckCircle2
                size={24}
                color="#15803d"
                style={{ flexShrink: 0 }}
              />
            ) : (
              <ImagePlus size={24} color="#b91c1c" style={{ flexShrink: 0 }} />
            )}
            <p
              id="product-result-description"
              style={{ overflowWrap: "anywhere" }}
            >
              {modalMessage}
            </p>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {modalState !== "loading" && (
            <Button
              onClick={handleCloseModal}
              autoFocus
              sx={{
                minHeight: 44,
                textTransform: "none",
                color: "var(--product-accent)",
              }}
            >
              {modalState === "success"
                ? "Ver producto"
                : "Volver al formulario"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
