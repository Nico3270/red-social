"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Paper,
  Divider,
  IconButton,
  Container,
  Autocomplete,
  Fade,
} from "@mui/material";
import { Add, Delete, Remove, ArrowForward } from "@mui/icons-material";
import { CartProduct, useCartNegocioStore } from "@/store/carro-negocio/carro-negocio-store";
import { useRouter } from "next/navigation";

interface ProductVariantOption {
  nombre: string;
  valor: string;
}

interface ProductVariantOptionData {
  id: string;
  nombre: string;
  precio: number | null;
  stock: number | null;
  stockIlimitado: boolean;
  imagenUrl?: string | null;
  options: ProductVariantOption[];
}

interface ProductOption {
  id: string;
  slug: string;
  nombre: string;
  precio: number;
  imagen: string;
  seccionIds: string[];
  descripcionCorta?: string | null;
  stock?: number | null;
  stockIlimitado?: boolean;
  usaVariantes?: boolean;
  variantes: ProductVariantOptionData[];
}

interface AddProductosNegocioProps {
  initialProducts?: CartProduct[];
}

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

const buildVariantLabel = (variant: ProductVariantOptionData) => {
  const parts: string[] = [];

  if (variant.nombre?.trim()) {
    parts.push(variant.nombre.trim());
  }

  const optionLabel = variant.options
    .map((option) => {
      const nombre = option.nombre?.trim();
      const valor = option.valor?.trim();
      if (!nombre && !valor) return "";
      if (!nombre) return valor;
      if (!valor) return nombre;
      return `${nombre}: ${valor}`;
    })
    .filter(Boolean)
    .join(" / ");

  if (optionLabel) {
    parts.push(optionLabel);
  }

  return parts.join(" - ") || "Variante";
};

const clampByStock = (
  desiredQuantity: number,
  stock: number | null | undefined,
  stockIlimitado?: boolean
) => {
  if (stockIlimitado !== false) {
    return Math.max(1, desiredQuantity);
  }

  if (typeof stock !== "number") {
    return Math.max(1, desiredQuantity);
  }

  return Math.max(1, Math.min(desiredQuantity, stock));
};

const AddProductosNegocio: React.FC<AddProductosNegocioProps> = ({ initialProducts }) => {
  const {
    cart,
    addProductToCart,
    removeProduct,
    updateProductQuantity,
    getTotalPrice,
    clearCart,
  } = useCartNegocioStore();
  const router = useRouter();

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/productosNegocio");
        if (!response.ok) throw new Error("Error al obtener productos");
        const data = await response.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      clearCart();
      initialProducts.forEach((p) =>
        addProductToCart({ ...p, cartItemId: crypto.randomUUID() })
      );
    }
  }, [initialProducts, clearCart, addProductToCart]);

  const selectedVariant = useMemo(() => {
    if (!selectedProduct?.usaVariantes) return null;
    return (
      selectedProduct.variantes.find((variant) => variant.id === selectedVariantId) ?? null
    );
  }, [selectedProduct, selectedVariantId]);

  const effectivePrice = useMemo(() => {
    if (selectedProduct?.usaVariantes) {
      return selectedVariant?.precio ?? selectedProduct.precio ?? 0;
    }

    return selectedProduct?.precio ?? 0;
  }, [selectedProduct, selectedVariant]);

  const effectiveStock = useMemo(() => {
    if (selectedProduct?.usaVariantes) {
      return selectedVariant?.stock ?? null;
    }

    return selectedProduct?.stock ?? null;
  }, [selectedProduct, selectedVariant]);

  const effectiveStockIlimitado = useMemo(() => {
    if (selectedProduct?.usaVariantes) {
      return selectedVariant?.stockIlimitado ?? true;
    }

    return selectedProduct?.stockIlimitado ?? true;
  }, [selectedProduct, selectedVariant]);

  const hasLimitedSelectionStock =
    effectiveStockIlimitado === false && typeof effectiveStock === "number";
  const quantityReachedLimit =
    hasLimitedSelectionStock && quantity >= (effectiveStock ?? 0);

  const handleAddClick = () => {
    setShowAddForm(true);
    setSelectedProduct(null);
    setSelectedVariantId("");
    setQuantity(1);
  };

  const handleProductChange = (value: ProductOption | null) => {
    setSelectedProduct(value);
    setQuantity(1);

    if (value?.usaVariantes && value.variantes.length > 0) {
      setSelectedVariantId(value.variantes[0].id);
      return;
    }

    setSelectedVariantId("");
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    if (selectedProduct.usaVariantes && !selectedVariant) return;

    const variantLabel = selectedVariant ? buildVariantLabel(selectedVariant) : null;

    const cartProduct: CartProduct = {
      cartItemId: crypto.randomUUID(),
      id: selectedProduct.id,
      slug: selectedProduct.slug,
      nombre: selectedProduct.nombre,
      precio: effectivePrice,
      cantidad: quantity,
      imagen: selectedVariant?.imagenUrl || selectedProduct.imagen,
      seccionIds: selectedProduct.seccionIds,
      descripcionCorta: selectedProduct.descripcionCorta ?? "",
      usaVariantes: selectedProduct.usaVariantes ?? false,
      productVariantId: selectedVariant?.id ?? null,
      variantLabel,
      stock: effectiveStock,
      stockIlimitado: effectiveStockIlimitado,
    };

    addProductToCart(cartProduct);
    setShowAddForm(false);
    setSelectedProduct(null);
    setSelectedVariantId("");
    setQuantity(1);
  };

  const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
    updateProductQuantity(cartItemId, newQuantity);
  };

  const handleIncrement = () => {
    setQuantity((prev) => clampByStock(prev + 1, effectiveStock, effectiveStockIlimitado));
  };

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleContinue = () => {
    router.push("/dashboard/orders/address");
  };

  return (
    <Fade in timeout={600}>
      <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "grey.400",
            borderRadius: 4,
            overflow: "hidden",
            bgcolor: "background.paper",
            boxShadow: "0 2px 6px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.05)",
          }}
        >
          <Box
            sx={{
              px: { xs: 2, sm: 4 },
              py: { xs: 2, sm: 3 },
              borderBottom: "1px solid",
              borderColor: "grey.300",
              bgcolor: "grey.50",
              textAlign: "center",
            }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 400,
                color: "text.primary",
                letterSpacing: "-0.02em",
                fontSize: { xs: "1.6rem", sm: "2.1rem", md: "2.4rem" },
                fontFamily:
                  "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                lineHeight: 1.25,
                textRendering: "optimizeLegibility",
                WebkitFontSmoothing: "antialiased",
                textAlign: "center",
                background: "linear-gradient(90deg, #111 0%, #555 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Agregar productos a la orden
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Paper
                elevation={3}
                sx={{
                  p: { xs: 2, sm: 4 },
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "grey.300",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
                  bgcolor: "background.paper",
                }}
              >
                {!showAddForm ? (
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={handleAddClick}
                      sx={{
                        px: 6,
                        py: 1.5,
                        borderRadius: 3,
                        textTransform: "none",
                        fontWeight: 600,
                        bgcolor: "primary.main",
                        "&:hover": {
                          bgcolor: "primary.dark",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        },
                        transition: "all 0.2s ease",
                        width: { xs: "100%", sm: "auto" },
                      }}
                    >
                      Añadir Producto
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <Autocomplete
                      options={products}
                      getOptionLabel={(option) => option.nombre}
                      onChange={(_, value) => handleProductChange(value)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Buscar producto"
                          variant="outlined"
                          fullWidth
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 3,
                              bgcolor: "background.default",
                              "& fieldset": { borderColor: "divider" },
                              "&:hover fieldset": { borderColor: "primary.light" },
                            },
                            "& .MuiInputLabel-root": { color: "text.secondary" },
                          }}
                        />
                      )}
                    />

                    {selectedProduct && (
                      <>
                        {selectedProduct.usaVariantes && (
                          <Autocomplete
                            options={selectedProduct.variantes}
                            value={selectedVariant}
                            getOptionLabel={(option) => buildVariantLabel(option)}
                            onChange={(_, value) => {
                              setSelectedVariantId(value?.id ?? "");
                              setQuantity(1);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Selecciona una variante"
                                variant="outlined"
                                fullWidth
                                sx={{
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: 3,
                                    bgcolor: "background.default",
                                    "& fieldset": { borderColor: "divider" },
                                    "&:hover fieldset": { borderColor: "primary.light" },
                                  },
                                  "& .MuiInputLabel-root": { color: "text.secondary" },
                                }}
                              />
                            )}
                          />
                        )}

                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              Precio: {formatCurrency(effectivePrice)}
                            </Typography>
                            {selectedProduct.usaVariantes && selectedVariant && (
                              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                                Variante: {buildVariantLabel(selectedVariant)}
                              </Typography>
                            )}
                            {hasLimitedSelectionStock && (
                              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                                Stock disponible: {effectiveStock}
                              </Typography>
                            )}
                          </Box>

                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <IconButton onClick={handleDecrement} disabled={quantity <= 1}>
                              <Remove fontSize="small" />
                            </IconButton>
                            <TextField
                              label="Cantidad"
                              type="number"
                              value={quantity}
                              onChange={(e) => {
                                const nextValue = Math.max(1, parseInt(e.target.value, 10) || 1);
                                setQuantity(clampByStock(nextValue, effectiveStock, effectiveStockIlimitado));
                              }}
                              variant="outlined"
                              sx={{
                                width: 100,
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: 3,
                                  bgcolor: "background.default",
                                  "& fieldset": { borderColor: "divider" },
                                  "&:hover fieldset": { borderColor: "primary.light" },
                                },
                                "& .MuiInputLabel-root": { color: "text.secondary" },
                              }}
                              InputProps={{
                                inputProps: {
                                  min: 1,
                                  max: hasLimitedSelectionStock ? effectiveStock ?? undefined : undefined,
                                },
                              }}
                            />
                            <IconButton onClick={handleIncrement} disabled={quantityReachedLimit}>
                              <Add fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>

                        {selectedProduct.usaVariantes && selectedProduct.variantes.length === 0 && (
                          <Typography variant="body2" sx={{ color: "error.main" }}>
                            Este producto tiene variantes activadas, pero no hay variantes disponibles.
                          </Typography>
                        )}

                        <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mt: 2 }}>
                          <Button
                            onClick={() => setShowAddForm(false)}
                            sx={{
                              px: 4,
                              py: 1.2,
                              borderRadius: 3,
                              textTransform: "none",
                              fontWeight: 600,
                              color: "text.primary",
                              bgcolor: "grey.200",
                              "&:hover": { bgcolor: "grey.300" },
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="contained"
                            onClick={handleAddToCart}
                            disabled={
                              !selectedProduct ||
                              quantity < 1 ||
                              (selectedProduct.usaVariantes && !selectedVariant)
                            }
                            sx={{
                              px: 4,
                              py: 1.2,
                              borderRadius: 3,
                              textTransform: "none",
                              fontWeight: 600,
                              bgcolor: "primary.main",
                              "&:hover": {
                                bgcolor: "primary.dark",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                              },
                            }}
                          >
                            Añadir
                          </Button>
                        </Box>
                      </>
                    )}
                  </Box>
                )}

                {cart.length > 0 && (
                  <Box sx={{ mt: 5 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        mb: 3,
                        fontWeight: 700,
                        textAlign: "center",
                        letterSpacing: "-0.015em",
                        color: "text.primary",
                        fontSize: { xs: "1.3rem", md: "1.5rem" },
                      }}
                    >
                      Productos en la orden
                    </Typography>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {cart.map((item) => {
                        const hasLimitedStock =
                          item.stockIlimitado === false && typeof item.stock === "number";
                        const reachedStockLimit =
                          hasLimitedStock && item.cantidad >= (item.stock ?? 0);

                        return (
                          <Paper
                            key={item.cartItemId}
                            elevation={0}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              p: 2,
                              borderRadius: 3,
                              border: "1px solid",
                              borderColor: "grey.300",
                              bgcolor: "background.paper",
                              boxShadow:
                                "0 2px 6px rgba(0,0,0,0.04), 0 6px 12px rgba(0,0,0,0.03)",
                              transition: "all 0.2s ease",
                              "&:hover": {
                                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                                borderColor: "grey.400",
                              },
                            }}
                          >
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600, color: "text.primary" }}>
                                {item.nombre}
                              </Typography>
                              {item.variantLabel && (
                                <Typography variant="body2" sx={{ color: "primary.main", mt: 0.5 }}>
                                  Variante: {item.variantLabel}
                                </Typography>
                              )}
                              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                                Precio: {formatCurrency(item.precio)}
                              </Typography>
                              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                Subtotal: {formatCurrency(item.precio * item.cantidad)}
                              </Typography>
                              {hasLimitedStock && (
                                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                  Stock disponible: {item.stock}
                                </Typography>
                              )}
                            </Box>

                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <IconButton
                                onClick={() =>
                                  handleQuantityChange(item.cartItemId, item.cantidad - 1)
                                }
                                disabled={item.cantidad <= 1}
                                sx={{
                                  bgcolor: "grey.700",
                                  color: "white",
                                  borderRadius: "50%",
                                  "&:hover": { bgcolor: "grey.200", color: "black" },
                                }}
                              >
                                <Remove fontSize="small" />
                              </IconButton>

                              <Typography
                                sx={{
                                  minWidth: 30,
                                  textAlign: "center",
                                  fontWeight: 600,
                                  color: "text.primary",
                                }}
                              >
                                {item.cantidad}
                              </Typography>

                              <IconButton
                                onClick={() =>
                                  handleQuantityChange(item.cartItemId, item.cantidad + 1)
                                }
                                disabled={reachedStockLimit}
                                sx={{
                                  bgcolor: "grey.700",
                                  color: "white",
                                  borderRadius: "50%",
                                  "&:hover": { bgcolor: "grey.200", color: "black" },
                                }}
                              >
                                <Add fontSize="small" />
                              </IconButton>

                              <IconButton
                                edge="end"
                                aria-label="delete"
                                onClick={() => removeProduct(item.cartItemId)}
                                sx={{
                                  ml: 2,
                                  bgcolor: "white",
                                  color: "red",
                                  borderRadius: "50%",
                                  border: "1.5px solid rgba(0,0,0,0.1)",
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                                  transition: "all 0.25s ease",
                                  "&:hover": {
                                    bgcolor: "red",
                                    color: "white",
                                    borderColor: "red",
                                    boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                                  },
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          </Paper>
                        );
                      })}
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-around",
                        alignItems: "center",
                        px: 1,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: "text.secondary",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        Total
                      </Typography>

                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          fontSize: "1.4rem",
                          color: "grey.800",
                          letterSpacing: "-0.015em",
                        }}
                      >
                        {formatCurrency(getTotalPrice())}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                      <Button
                        variant="contained"
                        endIcon={<ArrowForward />}
                        onClick={handleContinue}
                        sx={{
                          px: 2,
                          py: 0.5,
                          borderRadius: "12px",
                          textTransform: "none",
                          fontWeight: 600,
                          fontSize: "1.05rem",
                          bgcolor: "primary.main",
                          backgroundImage:
                            "linear-gradient(135deg, rgba(0,122,255,1) 0%, rgba(10,132,255,1) 100%)",
                          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                          "&:hover": {
                            bgcolor: "primary.dark",
                            backgroundImage:
                              "linear-gradient(135deg, rgba(10,132,255,1) 0%, rgba(0,122,255,1) 100%)",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                            transform: "translateY(-1px)",
                          },
                          transition: "all 0.25s ease",
                        }}
                      >
                        Continuar
                      </Button>
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Fade>
  );
};

export default AddProductosNegocio;
