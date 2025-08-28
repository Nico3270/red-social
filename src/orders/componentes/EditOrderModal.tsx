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
} from "@mui/material";
import { Add, Delete, Remove, Close } from "@mui/icons-material";
import { AnimatePresence, HTMLMotionProps, motion } from "framer-motion";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { CartProduct } from "@/store/carro-negocio/carro-negocio-store"; // Ajusta según tu interfaz
import colombiaData from "@/config/colombia.json";
import { updateOrder } from "../actions/updateOrder";
import { Orders } from "../actions/getOrders"; // Importa el tipo Orders para usarlo en el callback
import { OrderState } from '@prisma/client'; // Asume que importas el enum desde Prisma

interface Address {
    country: string;
    departamento: string;
    ciudad: string;
    clientName: string;
    clientPhone: string;
    deliveryAddress: string;
    deliveryDate: string;
    additionalComments?: string;
}

interface ColombiaDepartment {
    id: number;
    departamento: string;
    ciudades: string[];
}

interface OrderData {
    products: CartProduct[];
    address: Address;
    status: OrderState; // Cambiado a OrderState
    // Otros campos si es necesario
}

interface EditOrderModalProps {
    orderId: string;
    open: boolean;
    onClose: () => void;
    onUpdateSuccess: (updatedOrder: Partial<Orders> & { id: string }) => void;
}

type AnimatedBackdropProps = HTMLMotionProps<"div">; // 👈 Removido ownerState (no se usa)

const AnimatedBackdrop = React.forwardRef<HTMLDivElement, AnimatedBackdropProps>(
  (props, ref) => ( // 👈 Removido ownerState de los params
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      {...props} // ya no pasa ownerState
    />
  )
);

AnimatedBackdrop.displayName = "AnimatedBackdrop";

interface Product {
    id: string;
    slug: string;
    nombre: string;
    precio: number;
    imagen: string;
    seccionIds: string[];
    descripcionCorta: string;
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({ orderId, open, onClose, onUpdateSuccess }) => {
    const defaultAddressValues = useMemo<Address>(() => ({
        country: "Colombia",
        departamento: "",
        ciudad: "",
        clientName: "",
        clientPhone: "",
        deliveryAddress: "",
        deliveryDate: new Date().toISOString().substring(0, 10),
        additionalComments: "",
    }), []);

    const [localCart, setLocalCart] = useState<CartProduct[]>([]);
    const [products, setProducts] = useState<Product[]>([]); // Productos disponibles
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [status, setStatus] = useState<OrderState>(OrderState.Recibida); // Cambiado a OrderState, con valor inicial del enum
    const [isFetching, setIsFetching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState<"info" | "success" | "error">("info");

    const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<Address>({
        defaultValues: defaultAddressValues,
    });

    const [cities, setCities] = useState<string[]>([]);
    const selectedDepartamento = watch("departamento");

    // Memoizado con useCallback para referencia estable
    const revertWithFreshData = useCallback(async () => {
        try {
            const response = await fetch(`/api/editarOrder/${orderId}`);
            if (response.ok) {
                const freshData: OrderData = await response.json();
                const freshItems = freshData.products.map((p) => ({
                    id: crypto.randomUUID(),
                    orderId: orderId,
                    productId: p.id,
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

    // Fetch productos disponibles
    useEffect(() => {
        setIsLoadingProducts(true); // Feedback visual
        const fetchProducts = async () => {
            try {
                const response = await fetch("/api/productosNegocio");
                if (!response.ok) throw new Error("Error al obtener productos");
                const data = await response.json();
                setProducts(data);
            } catch (error) {
                console.error(error);
                showSnackbar("Error inesperado al actualizar la orden.", "error");
                await revertWithFreshData();
            } finally {
                setIsLoadingProducts(false); // 👈 Siempre cerrar el loading
            }
        };
        fetchProducts();
    }, [revertWithFreshData]); // 👈 Agregada la dependencia para eliminar el warning (estable, no causa loop)

    // Fetch datos de la orden
    useEffect(() => {
        if (open) {
            const fetchOrder = async () => {
                setIsFetching(true);
                try {
                    const response = await fetch(`/api/editarOrder/${orderId}`);
                    if (!response.ok) throw new Error("Error al obtener la orden");
                    const data: OrderData = await response.json();
                    setLocalCart(data.products.map((p) => ({ ...p, cartItemId: crypto.randomUUID() })));
                    setStatus(data.status ?? OrderState.Recibida); // Fallback si undefined
                    reset({ ...defaultAddressValues, ...data.address });
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

    // Actualizar ciudades y reset ciudad si necesario
    useEffect(() => {
        if (selectedDepartamento) {
            const departmentData = (colombiaData as ColombiaDepartment[]).find(
                (dept) => dept.departamento === selectedDepartamento
            );
            const newCities = departmentData ? departmentData.ciudades : [];
            setCities(newCities);
            const currentCiudad = watch("ciudad");
            if (newCities.length > 0 && currentCiudad && !newCities.includes(currentCiudad)) {
                setValue("ciudad", ""); // Reset si no coincide con nuevas ciudades
            }
        } else {
            setCities([]);
            setValue("ciudad", "");
        }
    }, [selectedDepartamento, setValue, watch]);

    const getTotalPrice = () => localCart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

    const handleAddClick = () => {
        setShowAddForm(true);
        setSelectedProduct(null);
        setQuantity(1);
    };

    const handleAddToCart = () => {
        if (selectedProduct) {
            const existing = localCart.find((item) => item.id === selectedProduct.id);
            if (existing) {
                setLocalCart(
                    localCart.map((item) =>
                        item.id === selectedProduct.id ? { ...item, cantidad: item.cantidad + quantity } : item
                    )
                );
            } else {
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
                setLocalCart([...localCart, cartProduct]);
            }
            setShowAddForm(false);
        }
    };

    const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
        setLocalCart(
            localCart.map((item) =>
                item.cartItemId === cartItemId ? { ...item, cantidad: Math.max(1, newQuantity) } : item
            )
        );
    };

    const handleRemoveProduct = (cartItemId: string) => {
        setLocalCart(localCart.filter((item) => item.cartItemId !== cartItemId));
    };

    const handleIncrement = () => setQuantity((prev) => prev + 1);
    const handleDecrement = () => setQuantity((prev) => Math.max(1, prev - 1));

    const onSubmit: SubmitHandler<Address> = async (deliveryData) => {
        setIsSubmitting(true);
        showSnackbar("Actualizando orden...", "info");

        // Preparar los items actualizados para la actualización optimista
        const newItems = localCart.map((item) => ({
            id: crypto.randomUUID(),
            orderId: orderId,
            productId: item.id,
            quantity: item.cantidad,
            price: item.precio,
            subtotal: item.precio * item.cantidad,
            description: item.nombre,
        }));

        const newTotal = getTotalPrice();

        // Actualización optimista: Llama al callback antes de la llamada al servidor
        onUpdateSuccess({
            id: orderId,
            items: newItems,
            totalAmount: newTotal,
            status, // Incluye el status actualizado, ahora OrderState
        });

        try {
            const response = await updateOrder({
                orderId,
                items: localCart.map((item) => ({
                    productId: item.id,
                    quantity: item.cantidad,
                    price: item.precio,
                    subtotal: item.precio * item.cantidad,
                    description: item.nombre,
                })),
                deliveryData,
                totalAmount: newTotal,
                status, // Asumiendo que updateOrder ahora acepta status; modifícalo en tu acción server si es necesario
            });

            if (response.ok) {
                showSnackbar(response.message || "Orden actualizada exitosamente.", "success");

                setTimeout(() => {
                    onClose();
                }, 3000);
            } else {
                showSnackbar(response.message || "Error al actualizar la orden.", "error");
                // Revertir con fetch fresco
                await revertWithFreshData();
            }
        } catch (error) {
            console.error(error); // Usamos error aquí
            showSnackbar("Error inesperado al actualizar la orden.", "error");
            // Revertir con fetch fresco
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

                            <IconButton onClick={onClose} sx={{ position: "absolute", top: 8, right: 8 }}>
                                <Close />
                            </IconButton>

                            <Typography variant="h4" sx={{ mb: 4, textAlign: "center" }}>
                                Editar Orden #{orderId}
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
                                    {/* Usar valores del enum OrderState */}
                                    <MenuItem value={OrderState.Recibida}>Recibida</MenuItem>
                                    <MenuItem value={OrderState.Preparacion}>Preparacion</MenuItem>
                                    <MenuItem value={OrderState.Entregada}>Entregada</MenuItem>
                                    <MenuItem value={OrderState.Pagada}>Pagada</MenuItem>
                                    <MenuItem value={OrderState.Cancelada}>Cancelada</MenuItem>
                                </Select>
                            </FormControl>

                            {/* Sección de Productos */}
                            <Typography variant="h5" sx={{ mb: 2 }}>
                                Productos
                            </Typography>
                            {isLoadingProducts ? ( // 👈 Uso de isLoadingProducts: CircularProgress responsive y elegante
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
                                            <Button variant="contained" startIcon={<Add />} onClick={handleAddClick}>
                                                Añadir Producto
                                            </Button>
                                        </Box>
                                    ) : (
                                        <Box sx={{ mb: 4 }}>
                                            <Autocomplete
                                                options={products}
                                                getOptionLabel={(option) => option.nombre}
                                                onChange={(event, value) => setSelectedProduct(value)}
                                                renderInput={(params) => <TextField {...params} label="Buscar producto" />}
                                            />
                                            {selectedProduct && (
                                                <>
                                                    <Typography>Precio: ${selectedProduct.precio.toFixed(2)}</Typography>
                                                    <Box sx={{ display: "flex", alignItems: "center" }}>
                                                        <IconButton onClick={handleDecrement} disabled={quantity <= 1}>
                                                            <Remove />
                                                        </IconButton>
                                                        <TextField
                                                            type="number"
                                                            value={quantity}
                                                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                                            sx={{ width: 60, mx: 1 }}
                                                        />
                                                        <IconButton onClick={handleIncrement}>
                                                            <Add />
                                                        </IconButton>
                                                    </Box>
                                                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                                                        <Button onClick={() => setShowAddForm(false)}>Cancelar</Button>
                                                        <Button variant="contained" onClick={handleAddToCart} disabled={quantity < 1}>
                                                            Añadir
                                                        </Button>
                                                    </Box>
                                                </>
                                            )}
                                        </Box>
                                    )}

                                    <List>
                                        {localCart.map((item) => (
                                            <ListItem key={item.cartItemId}>
                                                <ListItemText primary={item.nombre} secondary={`x${item.cantidad} - $${(item.precio * item.cantidad).toFixed(2)}`} />
                                                <IconButton onClick={() => handleQuantityChange(item.cartItemId, item.cantidad - 1)} disabled={item.cantidad <= 1}>
                                                    <Remove />
                                                </IconButton>
                                                <Typography sx={{ mx: 1 }}>{item.cantidad}</Typography>
                                                <IconButton onClick={() => handleQuantityChange(item.cartItemId, item.cantidad + 1)}>
                                                    <Add />
                                                </IconButton>
                                                <IconButton onClick={() => handleRemoveProduct(item.cartItemId)}>
                                                    <Delete />
                                                </IconButton>
                                            </ListItem>
                                        ))}
                                    </List>
                                    <Typography>Total: ${getTotalPrice().toFixed(2)}</Typography>
                                </>
                            )}

                            {/* Sección de Dirección */}
                            <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
                                Información de Entrega
                            </Typography>
                            <form onSubmit={handleSubmit(onSubmit)}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <Controller
                                            name="country"
                                            control={control}
                                            rules={{ required: "País requerido" }}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    label="País"
                                                    fullWidth
                                                    variant="outlined"
                                                    disabled // Fijo en Colombia
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
                                                />
                                            )}
                                        />
                                    </Grid>
                                    {/* ... (el resto del Grid y form permanece igual, sin cambios) */}
                                     <Grid item xs={12} sm={6}>
                                        <Controller
                                            name="departamento"
                                            control={control}
                                            rules={{ required: "Departamento requerido" }}
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
                                            rules={{ required: "Ciudad requerida" }}
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
                                                />
                                            )}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Controller
                                            name="deliveryAddress"
                                            control={control}
                                            rules={{ required: "Dirección de entrega requerida" }}
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
                                                />
                                            )}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Controller
                                            name="deliveryDate"
                                            control={control}
                                            rules={{ required: "Fecha de entrega requerida" }}
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
                                                        min: new Date().toISOString().split("T")[0], // fecha mínima = hoy
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
                                                />
                                            )}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Controller
                                            name="additionalComments"
                                            control={control}
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
                                                />
                                            )}
                                        />
                                    </Grid>
                                </Grid>
                                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                                    <Button type="submit" variant="contained" disabled={isSubmitting}>
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
                <Alert severity={snackbarSeverity} icon={snackbarSeverity === "info" ? <CircularProgress size={20} /> : undefined}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </>
    );
};

export default EditOrderModal;