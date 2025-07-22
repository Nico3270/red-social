"use client";

import React, { useState, useMemo } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Chip,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
} from "@mui/material";
import { Search as SearchIcon, Edit as EditIcon, Visibility as VisibilityIcon } from "@mui/icons-material";
import Link from "next/link";
import { ProductStatus } from "@prisma/client";
import { changeStatusProduct } from "@/actions/productos/changeStatusProduct";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import { initialData, Section } from "@/seed/seed";

interface ShowProductsByUserProps {
  products: ProductRedSocial[];
}

export default function ShowProductsByUser({ products }: ShowProductsByUserProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [productStates, setProductStates] = useState<Record<string, ProductStatus>>(
    Object.fromEntries(products.map((p) => [p.id, p.status]))
  );

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarColor, setSnackbarColor] = useState<"success" | "error">("success");

  const handleStatusChange = (productId: string, newStatus: string) => {
    setProductStates((prev) => ({
      ...prev,
      [productId]: newStatus as ProductStatus,
    }));
  };

  const handleSubmitStatusChange = async (productId: string) => {
    const newStatus = productStates[productId];
    if (!newStatus) return;

    try {
      const res = await changeStatusProduct(productId, newStatus);
      if (res.ok) {
        setSnackbarMessage("Estado actualizado correctamente.");
        setSnackbarColor("success");
      } else {
        setSnackbarMessage(res.message || "Error al actualizar el estado.");
        setSnackbarColor("error");
      }
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      setSnackbarMessage("Error inesperado al cambiar el estado.");
      setSnackbarColor("error");
    } finally {
      setSnackbarOpen(true);
    }
  };

  const sections = useMemo(() => {
    const sectionSet = new Set<string>();
    products.forEach((product) => {
      product.sections.forEach((sectionId) => {
        const section = initialData.secciones.find((s) => s.id === sectionId);
        if (section) sectionSet.add(section.nombre);
      });
    });
    return Array.from(sectionSet).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSection = selectedSection
        ? product.sections.some((sectionId) => {
            const section = initialData.secciones.find((s) => s.id === sectionId);
            return section?.nombre === selectedSection;
          })
        : true;
      return matchesSearch && matchesSection;
    });
  }, [products, searchTerm, selectedSection]);

  return (
    <Box className="max-w-7xl mx-auto px-0 py-2">
      {/* Buscador y Filtros */}
      <Box className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Busca productos por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Chip
            label="Todos"
            onClick={() => setSelectedSection(null)}
            color={selectedSection === null ? "primary" : "default"}
          />
          {sections.map((section) => (
            <Chip
              key={section}
              label={section}
              onClick={() => setSelectedSection(section)}
              color={selectedSection === section ? "primary" : "default"}
            />
          ))}
        </div>
      </Box>

      {/* Grid de Productos */}
      {filteredProducts.length === 0 ? (
        <Typography textAlign="center" className="text-gray-500 text-lg">
          No se encontraron productos.
        </Typography>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => {
            const productSections = product.sections
              .map((id) => initialData.secciones.find((s) => s.id === id))
              .filter((s): s is Section => !!s);
            const category = initialData.categorias.find((c) => c.id === product.categoriaId);
            const categorySlug = category?.slug || "categoria";
            const sectionSlug = productSections[0]?.slug || "sin-seccion";

            return (
              <div key={product.id} className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
                <img
                  src={product.imagenes[0] || "/placeholder-image.jpg"}
                  alt={product.nombre}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <h3 className="text-lg font-semibold truncate">{product.nombre}</h3>
                  <p className="text-sm text-gray-700">${product.precio.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Categoría: {category?.nombre || "Sin categoría"}</p>
                  <p className="text-xs text-gray-500 truncate">
                    Sección: {productSections.map((s) => s.nombre).join(", ") || "Sin secciones"}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <Link
                      href={`/${categorySlug}/${sectionSlug}/${product.slug}`}
                      className="flex-1 bg-blue-600 text-white text-center py-1 rounded-md text-sm flex items-center justify-center gap-1"
                    >
                      <VisibilityIcon fontSize="small" />
                      Ver
                    </Link>
                    <Link
                      href={`/dashboard/productos/modificar_producto/${product.id}`}
                      className="flex-1 bg-purple-600 text-white text-center py-1 rounded-md text-sm flex items-center justify-center gap-1"
                    >
                      <EditIcon fontSize="small" />
                      Editar
                    </Link>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <FormControl fullWidth size="small">
                      <InputLabel>Estado</InputLabel>
                      <Select
                        value={productStates[product.id]}
                        label="Estado"
                        onChange={(e) => handleStatusChange(product.id, e.target.value)}
                        className="text-sm"
                      >
                        {Object.values(ProductStatus).map((status) => (
                          <MenuItem key={status} value={status} className="text-sm">
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={() => handleSubmitStatusChange(product.id)}
                      className="text-sm"
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarColor} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
