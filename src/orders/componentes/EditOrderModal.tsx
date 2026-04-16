"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    Box,
    Grid,
    TextField,
    Button,
    Typography,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Autocomplete,
    Modal,
    Snackbar,
    Alert,
    CircularProgress,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormHelperText,
    ToggleButtonGroup,
    ToggleButton,
} from "@mui/material";
import { Add, Delete, Remove, Close } from "@mui/icons-material";
import { AnimatePresence, HTMLMotionProps, motion } from "framer-motion";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { CartProduct } from "@/store/carro-negocio/carro-negocio-store";
import colombiaData from "@/config/colombia.json";
import { updateOrder } from "../actions/updateOrder";
import { Orders } from "../actions/getOrders";
import { OrderState } from "@prisma/client";
import { FiMapPin, FiTruck } from "react-icons/fi";

type OrderType = "DELIVERY" | "ON_SITE";

interface Address {
    orderType: OrderType;
    country?: string | null;
    departamento?: string | null;
    ciudad?: string | null;
    clientName: string;
    clientPhone: string;
    deliveryAddress?: string | null;
    onSiteLocation?: string | null;
    deliveryDate?: string | null;
    additionalComments?: string | null;
}

interface ColombiaDepartment {
    id: number;
    departamento: string;
    ciudades: string[];
}

interface OrderData {
    products: CartProduct[];
    address: Address;
    status: OrderState;
}

interface EditOrderModalProps {
    orderId: string;
    open: boolean;
    onClose: () => void;
    onUpdateSuccess: (updatedOrder: Partial<Orders> & { id: string }) => void;
}

interface Product {
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
interface BackdropProps extends HTMLMotionProps<"div"> {
    ownerState?: unknown;
}

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

const AnimatedBackdrop = React.forwardRef<HTMLDivElement, BackdropProps>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ ownerState, ...motionProps }, ref) => {
        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                {...motionProps}
            />
        );
    }
);

AnimatedBackdrop.displayName = "AnimatedBackdrop";

const EditOrderModal: React.FC<EditOrderModalProps> = ({ orderId, open, onClose, onUpdateSuccess }) => {
    const defaultAddressValues = useMemo<Address>(
        () => ({
            orderType: "DELIVERY",
            country: "Colombia",
            departamento: "",
            ciudad: "",
            clientName: "",
            clientPhone: "",
            deliveryAddress: "",
            onSiteLocation: "",
            deliveryDate: "",
            additionalComments: "",
        }),
        []
    );

    const [localCart, setLocalCart] = useState<CartProduct[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariantId, setSelectedVariantId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [status, setStatus] = useState<OrderState>(OrderState.Recibida);
    const [isFetching, setIsFetching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState<"info" | "success" | "error">("info");

    const { control, handleSubmit, reset, watch, setValue, trigger, formState: { errors } } = useForm<Address>({
        defaultValues: defaultAddressValues,
    });

    const [cities, setCities] = useState<string[]>([]);
    const selectedDepartamento = watch("departamento");
    const orderType = watch("orderType");

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

    const revertWithFreshData = useCallback(async () => {
        try {
            const response = await fetch(`/api/editarOrder/${orderId}`);
            if (response.ok) {
                const freshData: OrderData = await response.json();
                const freshItems = freshData.products.map((p) => ({
                    id: crypto.randomUUID(),
                    orderId: orderId,
                    productId: p.id,
                    productVariantId: p.productVariantId ?? null,
                    variantLabel: p.variantLabel ?? null,
                    quantity: p.cantidad,
                    price: p.precio,
                    subtotal: p.precio * p.cantidad,
                    description: p.nombre,
                }));
                const freshTotal = freshData.products.reduce((sum, p) => sum + p.precio * p.cantidad, 0);
                onUpdateSuccess({
                    id: orderId,
                    items: freshItems,
                    totalAmount: freshTotal,
                    status: freshData.status ?? OrderState.Recibida,
                });
            }
        } catch (error) {
            console.error("Error fetching fresh order data:", error);
        }
    }, [orderId, onUpdateSuccess]);

    useEffect(() => {
        setIsLoadingProducts(true);
        const fetchProducts = async () => {
            try {
                const response = await fetch("/api/productosNegocio");
                if (!response.ok) throw new Error("Error al obtener productos");
                const data = await response.json();
                setProducts(data);
            } catch (error) {
                console.error(error);
                showSnackbar("Error inesperado al cargar productos.", "error");
                await revertWithFreshData();
            } finally {
                setIsLoadingProducts(false);
            }
        };
        fetchProducts();
    }, [revertWithFreshData]);

    useEffect(() => {
        if (open) {
            const fetchOrder = async () => {
                setIsFetching(true);
                try {
                    const response = await fetch(`/api/editarOrder/${orderId}`);
                    if (!response.ok) throw new Error("Error al obtener la orden");
                    const data: OrderData = await response.json();
                    setLocalCart(data.products.map((p) => ({ ...p, cartItemId: crypto.randomUUID() })));
                    setStatus(data.status ?? OrderState.Recibida);
                    // Ensure null values are converted to empty strings for form compatibility
                    reset({
                        ...defaultAddressValues,
                        ...data.address,
                        country: data.address.country ?? "Colombia",
                        departamento: data.address.departamento ?? "",
                        ciudad: data.address.ciudad ?? "",
                        deliveryAddress: data.address.deliveryAddress ?? "",
                        onSiteLocation: data.address.onSiteLocation ?? "",
                        deliveryDate: data.address.deliveryDate ?? "",
                        additionalComments: data.address.additionalComments ?? "",
                    });
                } catch (error) {
                    console.error("Error fetching order:", error);
                    showSnackbar("Error al cargar la orden", "error");
                } finally {
                    setIsFetching(false);
                }
            };
            fetchOrder();
        }
    }, [open, orderId, reset, defaultAddressValues]);

    useEffect(() => {
        if (selectedDepartamento && orderType === "DELIVERY") {
            const departmentData = (colombiaData as ColombiaDepartment[]).find(
                (dept) => dept.departamento === selectedDepartamento
            );
            const newCities = departmentData ? departmentData.ciudades : [];
            setCities(newCities);
            const currentCiudad = watch("ciudad");
            if (newCities.length > 0 && currentCiudad && !newCities.includes(currentCiudad)) {
                setValue("ciudad", "");
            }
        } else {
            setCities([]);
            setValue("ciudad", "");
        }
    }, [selectedDepartamento, orderType, setValue, watch]);

    useEffect(() => {
        trigger();
    }, [orderType, trigger]);

    const getTotalPrice = () => localCart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

    const handleAddClick = () => {
        setShowAddForm(true);
        setSelectedProduct(null);
        setSelectedVariantId("");
        setQuantity(1);
    };

    const handleProductChange = (value: Product | null) => {
        setSelectedProduct(value);
        setQuantity(1);

        if (value?.usaVariantes && value.variantes.length > 0) {
            setSelectedVariantId(value.variantes[0].id);
            return;
        }

        setSelectedVariantId("");
    };

    const handleAddToCart = () => {
        if (selectedProduct) {
            if (selectedProduct.usaVariantes && !selectedVariant) {
                return;
            }

            const variantLabel = selectedVariant ? buildVariantLabel(selectedVariant) : null;
            const existing = localCart.find(
                (item) =>
                    item.id === selectedProduct.id &&
                    (item.productVariantId ?? null) === (selectedVariant?.id ?? null)
            );

            if (existing) {
                setLocalCart(
                    localCart.map((item) =>
                        item.cartItemId === existing.cartItemId
                            ? {
                                ...item,
                                cantidad: clampByStock(
                                    item.cantidad + quantity,
                                    item.stock,
                                    item.stockIlimitado
                                ),
                            }
                            : item
                    )
                );
            } else {
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
                setLocalCart([...localCart, cartProduct]);
            }
            setShowAddForm(false);
            setSelectedProduct(null);
            setSelectedVariantId("");
            setQuantity(1);
        }
    };

    const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
        setLocalCart(
            localCart.map((item) =>
                item.cartItemId === cartItemId
                    ? {
                        ...item,
                        cantidad: clampByStock(newQuantity, item.stock, item.stockIlimitado),
                    }
                    : item
            )
        );
    };

    const handleRemoveProduct = (cartItemId: string) => {
        setLocalCart(localCart.filter((item) => item.cartItemId !== cartItemId));
    };

    const handleIncrement = () => {
        setQuantity((prev) => clampByStock(prev + 1, effectiveStock, effectiveStockIlimitado));
    };
    const handleDecrement = () => setQuantity((prev) => Math.max(1, prev - 1));

    const onSubmit: SubmitHandler<Address> = async (deliveryData) => {
        setIsSubmitting(true);
        showSnackbar("Actualizando orden...", "info");

        const newItems = localCart.map((item) => ({
            id: crypto.randomUUID(),
            orderId: orderId,
            productId: item.id,
            productVariantId: item.productVariantId ?? null,
            variantLabel: item.variantLabel ?? null,
            quantity: item.cantidad,
            price: item.precio,
            subtotal: item.precio * item.cantidad,
            description: item.nombre,
        }));

        const newTotal = getTotalPrice();

        onUpdateSuccess({
            id: orderId,
            items: newItems,
            totalAmount: newTotal,
            status,
        });

        try {
            const response = await updateOrder({
                orderId,
                items: localCart.map((item) => ({
                    productId: item.id,
                    productVariantId: item.productVariantId ?? null,
                    variantLabel: item.variantLabel ?? null,
                    quantity: item.cantidad,
                    price: item.precio,
                    subtotal: item.precio * item.cantidad,
                    description: item.nombre,
                })),
                deliveryData,
                totalAmount: newTotal,
                status,
            });

            if (response.ok) {
                showSnackbar(response.message || "Orden actualizada exitosamente.", "success");
                setTimeout(() => {
                    onClose();
                }, 3000);
            } else {
                showSnackbar(response.message || "Error al actualizar la orden.", "error");
                await revertWithFreshData();
            }
        } catch (error) {
            console.error(error);
            showSnackbar("Error inesperado al actualizar la orden.", "error");
            await revertWithFreshData();
        } finally {
            setIsSubmitting(false);
        }
    };

    const showSnackbar = (message: string, severity: "info" | "success" | "error") => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const handleSnackbarClose = () => setSnackbarOpen(false);

    if (isFetching) {
        return (
            <Modal open={open} onClose={onClose}>
                <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                    <CircularProgress />
                </Box>
            </Modal>
        );
    }

    return (
        <>
            <AnimatePresence>
                {open && (
                    <Modal
                        open={open}
                        onClose={onClose}
                        closeAfterTransition
                        slots={{ backdrop: AnimatedBackdrop }}
                    >
                        <motion.div
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                width: "90%",
                                maxWidth: "lg",
                                backgroundColor: "white",
                                borderRadius: "12px",
                                boxShadow: "0px 4px 20px rgba(0,0,0,0.1)",
                                padding: "32px",
                                overflowY: "auto",
                                maxHeight: "90vh",
                            }}
                        >
                            <IconButton
                                onClick={onClose}
                                sx={{
                                    position: "absolute",
                                    top: 8,
                                    right: 8,
                                    bgcolor: "#333",      // fondo gris oscuro
                                    color: "#f5f5f5",     // ícono gris claro/blanco
                                    "&:hover": {
                                        bgcolor: "#d32f2f", // fondo rojo al pasar
                                        color: "#fff",      // ícono blanco en hover
                                    },
                                }}
                            >
                                <Close />
                            </IconButton>


                            <Typography variant="h4" sx={{ mb: 4, textAlign: "center" }}>
                                Editar Orden
                            </Typography>

                            {/* Sección de Estado */}
                            <Typography variant="h5" sx={{ mb: 2 }}>
                                Estado de la Orden
                            </Typography>
                            <FormControl fullWidth variant="outlined" sx={{ mb: 4 }}>
                                <InputLabel id="status-label">Estado</InputLabel>
                                <Select
                                    labelId="status-label"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as OrderState)}
                                    label="Estado"
                                    sx={{
                                        borderRadius: 3,
                                        bgcolor: "background.default",
                                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
                                        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "primary.light" },
                                    }}
                                >
                                    <MenuItem value={OrderState.Recibida}>Recibida</MenuItem>
                                    <MenuItem value={OrderState.Preparacion}>Preparación</MenuItem>
                                    <MenuItem value={OrderState.Entregada}>Entregada</MenuItem>
                                    <MenuItem value={OrderState.Pagada}>Pagada</MenuItem>
                                    <MenuItem value={OrderState.Cancelada}>Cancelada</MenuItem>
                                </Select>
                            </FormControl>

                            {/* Sección de Productos */}
                            <Typography variant="h5" sx={{ mb: 2 }}>
                                Productos
                            </Typography>
                            {isLoadingProducts ? (
                                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 4, height: 100 }}>
                                    <CircularProgress size={24} color="primary" />
                                    <Typography variant="body2" sx={{ ml: 2, color: "text.secondary" }}>
                                        Cargando productos disponibles...
                                    </Typography>
                                </Box>
                            ) : (
                                <>
                                    {!showAddForm ? (
                                        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                                            <Button variant="contained" sx={{ textTransform: "none" }} startIcon={<Add />} onClick={handleAddClick}>
                                                Añadir Producto
                                            </Button>
                                        </Box>
                                    ) : (
                                        <Box sx={{ mb: 4 }}>
                                            <Autocomplete
                                                options={products}
                                                getOptionLabel={(option) => option.nombre}
                                                onChange={(_, value) => handleProductChange(value)}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Buscar producto"
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
                                                                    fullWidth
                                                                    sx={{
                                                                        mt: 2,
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

                                                    <Typography sx={{ mt: 2 }}>Precio: ${effectivePrice.toFixed(2)}</Typography>
                                                    {selectedProduct.usaVariantes && selectedVariant && (
                                                        <Typography sx={{ mt: 1, color: "text.secondary" }}>
                                                            Variante: {buildVariantLabel(selectedVariant)}
                                                        </Typography>
                                                    )}
                                                    {hasLimitedSelectionStock && (
                                                        <Typography sx={{ mt: 1, color: "text.secondary" }}>
                                                            Stock disponible: {effectiveStock}
                                                        </Typography>
                                                    )}
                                                    <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
                                                        <IconButton onClick={handleDecrement} disabled={quantity <= 1}>
                                                            <Remove />
                                                        </IconButton>
                                                        <TextField
                                                            type="number"
                                                            value={quantity}
                                                            onChange={(e) => {
                                                                const nextValue = Math.max(1, parseInt(e.target.value, 10) || 1);
                                                                setQuantity(
                                                                    clampByStock(
                                                                        nextValue,
                                                                        effectiveStock,
                                                                        effectiveStockIlimitado
                                                                    )
                                                                );
                                                            }}
                                                            sx={{ width: 60, mx: 1 }}
                                                            inputProps={{
                                                                min: 1,
                                                                max: hasLimitedSelectionStock
                                                                    ? effectiveStock ?? undefined
                                                                    : undefined,
                                                            }}
                                                        />
                                                        <IconButton onClick={handleIncrement} disabled={quantityReachedLimit}>
                                                            <Add />
                                                        </IconButton>
                                                    </Box>
                                                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                                                        <Button
                                                            onClick={() => {
                                                                setShowAddForm(false);
                                                                setSelectedProduct(null);
                                                                setSelectedVariantId("");
                                                                setQuantity(1);
                                                            }}
                                                        >
                                                            Cancelar
                                                        </Button>
                                                        <Button
                                                            variant="contained"
                                                            onClick={handleAddToCart}
                                                            disabled={
                                                                quantity < 1 ||
                                                                (selectedProduct.usaVariantes && !selectedVariant)
                                                            }
                                                        >
                                                            Añadir
                                                        </Button>
                                                    </Box>
                                                </>
                                            )}
                                        </Box>
                                    )}

                                    <List>
                                        {localCart.map((item) => {
                                            const hasLimitedStock =
                                                item.stockIlimitado === false && typeof item.stock === "number";
                                            const reachedStockLimit =
                                                hasLimitedStock && item.cantidad >= (item.stock ?? 0);

                                            return (
                                            <ListItem key={item.cartItemId}>
                                                <ListItemText
                                                    primary={item.nombre}
                                                    secondary={`x${item.cantidad} - $${(item.precio * item.cantidad).toFixed(2)}${item.variantLabel ? ` • Variante: ${item.variantLabel}` : ""}`}
                                                />
                                                <IconButton onClick={() => handleQuantityChange(item.cartItemId, item.cantidad - 1)} disabled={item.cantidad <= 1}>
                                                    <Remove />
                                                </IconButton>
                                                <Typography sx={{ mx: 1 }}>{item.cantidad}</Typography>
                                                <IconButton onClick={() => handleQuantityChange(item.cartItemId, item.cantidad + 1)} disabled={reachedStockLimit}>
                                                    <Add />
                                                </IconButton>
                                                <IconButton onClick={() => handleRemoveProduct(item.cartItemId)}>
                                                    <Delete />
                                                </IconButton>
                                            </ListItem>
                                        )})}
                                    </List>
                                    <Typography>Total: ${getTotalPrice().toFixed(2)}</Typography>
                                </>
                            )}

                            {/* Sección de Dirección */}
                            <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
                                {orderType === "DELIVERY" ? "Información de Entrega" : "Información del Pedido en Sitio"}
                            </Typography>
                            <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
                                <ToggleButtonGroup
                                    value={orderType}
                                    exclusive
                                    onChange={(e, newType) => {
                                        if (newType) {
                                            reset({
                                                ...watch(),
                                                orderType: newType,
                                                ciudad: "",
                                                departamento: "",
                                                deliveryAddress: "",
                                                onSiteLocation: "",
                                            });
                                        }
                                    }}
                                    aria-label="tipo de pedido"
                                    sx={{
                                        gap: 2,
                                    }}
                                >
                                    <ToggleButton
                                        value="DELIVERY"
                                        sx={{
                                            px: 4,
                                            py: 2,
                                            textTransform: "none",
                                            fontWeight: 600,
                                            borderRadius: 3,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                            bgcolor: "background.paper",
                                            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                                            transition: "all 0.25s ease",
                                            "&:hover": {
                                                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                                                transform: "translateY(-1px)",
                                            },
                                            "&.Mui-selected": {
                                                bgcolor: "primary.main",
                                                color: "#fff",
                                                boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
                                            },
                                        }}
                                    >
                                        <FiTruck size={20} />
                                        A domicilio
                                    </ToggleButton>
                                    <ToggleButton
                                        value="ON_SITE"
                                        sx={{
                                            px: 4,
                                            py: 2,
                                            textTransform: "none",
                                            fontWeight: 600,
                                            borderRadius: 3,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                            bgcolor: "background.paper",
                                            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                                            transition: "all 0.25s ease",
                                            "&:hover": {
                                                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                                                transform: "translateY(-1px)",
                                            },
                                            "&.Mui-selected": {
                                                bgcolor: "primary.main",
                                                color: "#fff",
                                                boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
                                            },
                                        }}
                                    >
                                        <FiMapPin size={20} />
                                        En sitio
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Box>

                            <form onSubmit={handleSubmit(onSubmit)}>
                                <Grid container spacing={3}>
                                    {orderType === "DELIVERY" && (
                                        <>
                                            <Grid item xs={12}>
                                                <Controller
                                                    name="country"
                                                    control={control}
                                                    rules={{ required: orderType === "DELIVERY" ? "País requerido" : false }}
                                                    render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            label="País"
                                                            fullWidth
                                                            variant="outlined"
                                                            disabled
                                                            error={!!errors.country}
                                                            helperText={errors.country?.message}
                                                            sx={{
                                                                "& .MuiOutlinedInput-root": {
                                                                    borderRadius: 3,
                                                                    bgcolor: "background.default",
                                                                    "& fieldset": { borderColor: "divider" },
                                                                    "&:hover fieldset": { borderColor: "primary.light" },
                                                                },
                                                                "& .MuiInputLabel-root": { color: "text.secondary" },
                                                            }}
                                                            value={field.value ?? "Colombia"}
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Controller
                                                    name="departamento"
                                                    control={control}
                                                    rules={{ required: orderType === "DELIVERY" ? "Departamento requerido" : false }}
                                                    render={({ field }) => (
                                                        <FormControl fullWidth variant="outlined" error={!!errors.departamento}>
                                                            <InputLabel id="departamento-label">Departamento</InputLabel>
                                                            <Select
                                                                {...field}
                                                                labelId="departamento-label"
                                                                label="Departamento"
                                                                sx={{
                                                                    borderRadius: 3,
                                                                    bgcolor: "background.default",
                                                                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
                                                                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "primary.light" },
                                                                }}
                                                                value={field.value ?? ""}
                                                            >
                                                                {(colombiaData as ColombiaDepartment[]).map((dept) => (
                                                                    <MenuItem key={dept.id} value={dept.departamento}>
                                                                        {dept.departamento}
                                                                    </MenuItem>
                                                                ))}
                                                            </Select>
                                                            {errors.departamento && <FormHelperText>{errors.departamento.message}</FormHelperText>}
                                                        </FormControl>
                                                    )}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Controller
                                                    name="ciudad"
                                                    control={control}
                                                    rules={{ required: orderType === "DELIVERY" ? "Ciudad requerida" : false }}
                                                    render={({ field }) => (
                                                        <FormControl fullWidth variant="outlined" error={!!errors.ciudad} disabled={!selectedDepartamento}>
                                                            <InputLabel id="ciudad-label">Ciudad</InputLabel>
                                                            <Select
                                                                {...field}
                                                                labelId="ciudad-label"
                                                                label="Ciudad"
                                                                sx={{
                                                                    borderRadius: 3,
                                                                    bgcolor: "background.default",
                                                                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
                                                                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "primary.light" },
                                                                }}
                                                                value={field.value ?? ""}
                                                            >
                                                                {cities.map((city, index) => (
                                                                    <MenuItem key={index} value={city}>
                                                                        {city}
                                                                    </MenuItem>
                                                                ))}
                                                            </Select>
                                                            {errors.ciudad && <FormHelperText>{errors.ciudad.message}</FormHelperText>}
                                                        </FormControl>
                                                    )}
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Controller
                                                    name="deliveryAddress"
                                                    control={control}
                                                    rules={{ required: orderType === "DELIVERY" ? "Dirección de entrega requerida" : false }}
                                                    render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            label="Dirección de entrega"
                                                            fullWidth
                                                            variant="outlined"
                                                            multiline
                                                            rows={2}
                                                            error={!!errors.deliveryAddress}
                                                            helperText={errors.deliveryAddress?.message}
                                                            sx={{
                                                                "& .MuiOutlinedInput-root": {
                                                                    borderRadius: 3,
                                                                    bgcolor: "background.default",
                                                                    "& fieldset": { borderColor: "divider" },
                                                                    "&:hover fieldset": { borderColor: "primary.light" },
                                                                },
                                                                "& .MuiInputLabel-root": { color: "text.secondary" },
                                                            }}
                                                            value={field.value ?? ""}
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                        </>
                                    )}
                                    {orderType === "ON_SITE" && (
                                        <Grid item xs={12}>
                                            <Controller
                                                name="onSiteLocation"
                                                control={control}
                                                rules={{ required: orderType === "ON_SITE" ? "Referencia de ubicación requerida" : false }}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        label="Referencia de ubicación (e.g., Mesa 4)"
                                                        fullWidth
                                                        variant="outlined"
                                                        error={!!errors.onSiteLocation}
                                                        helperText={errors.onSiteLocation?.message}
                                                        sx={{
                                                            "& .MuiOutlinedInput-root": {
                                                                borderRadius: 3,
                                                                bgcolor: "background.default",
                                                                "& fieldset": { borderColor: "divider" },
                                                                "&:hover fieldset": { borderColor: "primary.light" },
                                                                "& .MuiInputBase-input": {
                                                                    fontSize: "1rem",
                                                                },
                                                            },
                                                            "& .MuiInputLabel-root": { color: "text.secondary" },
                                                        }}
                                                        value={field.value ?? ""}
                                                    />
                                                )}
                                            />
                                        </Grid>
                                    )}
                                    <Grid item xs={12}>
                                        <Controller
                                            name="clientName"
                                            control={control}
                                            rules={{ required: "Nombre requerido" }}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    label="Nombre del cliente"
                                                    fullWidth
                                                    variant="outlined"
                                                    error={!!errors.clientName}
                                                    helperText={errors.clientName?.message}
                                                    sx={{
                                                        "& .MuiOutlinedInput-root": {
                                                            borderRadius: 3,
                                                            bgcolor: "background.default",
                                                            "& fieldset": { borderColor: "divider" },
                                                            "&:hover fieldset": { borderColor: "primary.light" },
                                                        },
                                                        "& .MuiInputLabel-root": { color: "text.secondary" },
                                                    }}
                                                    value={field.value ?? ""}
                                                />
                                            )}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Controller
                                            name="clientPhone"
                                            control={control}
                                            rules={{ required: "Teléfono requerido" }}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    label="Teléfono del cliente"
                                                    fullWidth
                                                    variant="outlined"
                                                    error={!!errors.clientPhone}
                                                    helperText={errors.clientPhone?.message}
                                                    sx={{
                                                        "& .MuiOutlinedInput-root": {
                                                            borderRadius: 3,
                                                            bgcolor: "background.default",
                                                            "& fieldset": { borderColor: "divider" },
                                                            "&:hover fieldset": { borderColor: "primary.light" },
                                                        },
                                                        "& .MuiInputLabel-root": { color: "text.secondary" },
                                                    }}
                                                    value={field.value ?? ""}
                                                />
                                            )}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sx={{ display: "none" }}>
                                        <Controller
                                            name="deliveryDate"
                                            control={control}
                                            rules={{ required: false }}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    type="date"
                                                    label="Fecha de entrega"
                                                    fullWidth
                                                    variant="outlined"
                                                    InputLabelProps={{ shrink: true }}
                                                    error={!!errors.deliveryDate}
                                                    helperText={errors.deliveryDate?.message}
                                                    inputProps={{
                                                        min: new Date().toISOString().split("T")[0],
                                                    }}
                                                    sx={{
                                                        "& .MuiOutlinedInput-root": {
                                                            borderRadius: 3,
                                                            bgcolor: "background.default",
                                                            "& fieldset": { borderColor: "divider" },
                                                            "&:hover fieldset": { borderColor: "primary.light" },
                                                        },
                                                        "& .MuiInputLabel-root": { color: "text.secondary" },
                                                    }}
                                                    value={field.value ?? ""}
                                                />
                                            )}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Controller
                                            name="additionalComments"
                                            control={control}
                                            rules={{ required: false }}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    label="Comentarios adicionales (opcional)"
                                                    fullWidth
                                                    variant="outlined"
                                                    multiline
                                                    rows={3}
                                                    sx={{
                                                        "& .MuiOutlinedInput-root": {
                                                            borderRadius: 3,
                                                            bgcolor: "background.default",
                                                            "& fieldset": { borderColor: "divider" },
                                                            "&:hover fieldset": { borderColor: "primary.light" },
                                                        },
                                                        "& .MuiInputLabel-root": { color: "text.secondary" },
                                                    }}
                                                    value={field.value ?? ""}
                                                />
                                            )}
                                        />
                                    </Grid>
                                </Grid>
                                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={isSubmitting}
                                        sx={{ textTransform: "none" }}
                                    >
                                        Actualizar Orden
                                    </Button>
                                </Box>
                            </form>
                        </motion.div>
                    </Modal>
                )}
            </AnimatePresence>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={snackbarSeverity === "info" ? null : 3000}
                onClose={handleSnackbarClose}
                action={snackbarSeverity !== "info" && <IconButton onClick={handleSnackbarClose}><Close /></IconButton>}
            >
                <Alert
                    severity={snackbarSeverity}
                    icon={snackbarSeverity === "info" ? <CircularProgress size={20} /> : undefined}
                    sx={{ width: "100%", borderRadius: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </>
    );
};

export default EditOrderModal;
