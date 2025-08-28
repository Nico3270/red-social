"use client";

import React, { useEffect, useState } from "react";
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
import { useCartNegocioStore } from "@/store/carro-negocio/carro-negocio-store";
import { CartProduct } from "@/store/carro-negocio/carro-negocio-store"; // Ajusta a la interfaz correcta del nuevo store
import { useRouter } from "next/navigation";

interface AddProductosNegocioProps {
    initialProducts?: CartProduct[];
}


const AddProductosNegocio: React.FC<AddProductosNegocioProps> = ({ initialProducts }) => {
    const { cart, addProductToCart, removeProduct, updateProductQuantity, getTotalPrice, clearCart } = useCartNegocioStore();
    const router = useRouter();
    const [products, setProducts] = useState<CartProduct[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<CartProduct | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [quantity, setQuantity] = useState(1);

    // Fetch productos al montar el componente
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch("/api/productosNegocio");
                if (!response.ok) throw new Error("Error al obtener productos");
                const data = await response.json();
                setProducts(data);
            } catch (error) {
                console.error("Error fetching products:", error);
            }
        };
        fetchProducts();
    }, []);

    // Cargar productos iniciales si se proporcionan (para edición)
    useEffect(() => {
        if (initialProducts && initialProducts.length > 0) {
            clearCart();
            initialProducts.forEach((p) => addProductToCart({ ...p, cartItemId: crypto.randomUUID() }));
        }
    }, [initialProducts, clearCart, addProductToCart]);

    const handleAddClick = () => {
        setShowAddForm(true);
        setSelectedProduct(null);
        setQuantity(1);
    };

    const handleAddToCart = () => {
        if (selectedProduct) {
            const cartProduct: CartProduct = {
                cartItemId: crypto.randomUUID(),
                id: selectedProduct.id,
                slug: selectedProduct.slug,
                nombre: selectedProduct.nombre,
                precio: selectedProduct.precio,
                cantidad: quantity,
                imagen: selectedProduct.imagen,
                seccionIds: selectedProduct.seccionIds,
                descripcionCorta: selectedProduct.descripcionCorta,
            };
            addProductToCart(cartProduct);
            setShowAddForm(false);
        }
    };

    const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
        updateProductQuantity(cartItemId, newQuantity);
    };

    const handleIncrement = () => {
        setQuantity((prev) => prev + 1);
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
                        boxShadow:
                            "0 2px 6px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.05)", // sombras suaves elegantes
                    }}
                >


                    {/* Header integrado al Paper */}
                    <Box
                        sx={{
                            px: { xs: 2, sm: 4 },
                            py: { xs: 2, sm: 3 },
                            borderBottom: "1px solid",
                            borderColor: "grey.300",
                            bgcolor: "grey.50", // un gris muy claro para separar visualmente
                            textAlign: "center",
                        }}
                    >
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 400, // un poco más liviano que 700
                                color: "text.primary",
                                letterSpacing: "-0.02em",
                                fontSize: { xs: "1.6rem", sm: "2.1rem", md: "2.4rem" },
                                fontFamily:
                                    "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                lineHeight: 1.25,
                                textRendering: "optimizeLegibility",
                                WebkitFontSmoothing: "antialiased",
                                textAlign: "center",
                                background: "linear-gradient(90deg, #111 0%, #555 100%)", // degradado elegante
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent", // efecto texto degradado estilo Apple
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
                                                "&:hover": { bgcolor: "primary.dark", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
                                                transition: "all 0.2s ease",
                                                width: { xs: "100%", sm: "auto" },
                                            }}
                                        >
                                            Añadir Producto
                                        </Button>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        {/* Barra de búsqueda */}
                                        <Autocomplete
                                            options={products}
                                            getOptionLabel={(option) => option.nombre}
                                            onChange={(event, value) => setSelectedProduct(value)}
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
                                                {/* Precio y Cantidad en la misma fila */}
                                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                        Precio: ${selectedProduct.precio.toFixed(2)}
                                                    </Typography>

                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <IconButton onClick={handleDecrement} disabled={quantity <= 1}>
                                                            <Remove fontSize="small" />
                                                        </IconButton>
                                                        <TextField
                                                            label="Cantidad"
                                                            type="number"
                                                            value={quantity}
                                                            onChange={(e) =>
                                                                setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                                                            }
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
                                                            InputProps={{ inputProps: { min: 1 } }}
                                                        />
                                                        <IconButton onClick={handleIncrement}>
                                                            <Add fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                </Box>

                                                {/* Botones centrados */}
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
                                                        disabled={!selectedProduct || quantity < 1}
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

                                {/* Lista de productos agregados */}
                                {cart.length > 0 && (
                                    <Box sx={{ mt: 4 }}>


                                        {/* Lista de productos agregados */}
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
                                                    {cart.map((item) => (
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
                                                                    "0 2px 6px rgba(0,0,0,0.04), 0 6px 12px rgba(0,0,0,0.03)", // Apple-like
                                                                transition: "all 0.2s ease",
                                                                "&:hover": {
                                                                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                                                                    borderColor: "grey.400",
                                                                },
                                                            }}
                                                        >
                                                            {/* Nombre y precio */}
                                                            <Box>
                                                                <Typography
                                                                    variant="body1"
                                                                    sx={{ fontWeight: 600, color: "text.primary" }}
                                                                >
                                                                    {item.nombre}
                                                                </Typography>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{ color: "text.secondary", mt: 0.5 }}
                                                                >
                                                                    Precio: ${item.precio.toFixed(2)}
                                                                </Typography>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{ color: "text.secondary" }}
                                                                >
                                                                    Subtotal: ${(item.precio * item.cantidad).toFixed(2)}
                                                                </Typography>
                                                            </Box>

                                                            {/* Cantidad y acciones */}
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
                                                                        border: "1.5px solid rgba(0,0,0,0.1)", // borde sutil elegante
                                                                        boxShadow: "0 2px 6px rgba(0,0,0,0.05)", // toque moderno
                                                                        transition: "all 0.25s ease",
                                                                        "&:hover": {
                                                                            bgcolor: "red",
                                                                            color: "white",
                                                                            borderColor: "red", // el borde se integra al hover
                                                                            boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                                                                        },
                                                                    }}
                                                                >
                                                                    <Delete fontSize="small" />
                                                                </IconButton>

                                                            </Box>
                                                        </Paper>
                                                    ))}
                                                </Box>

                                                {/* Total */}
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
                                                        ${getTotalPrice().toFixed(2)}
                                                    </Typography>
                                                </Box>

                                                {/* Botón continuar */}
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