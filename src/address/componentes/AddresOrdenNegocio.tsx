"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
    Box,
    Grid,
    TextField,
    Button,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    Divider,
    Fade,
    CircularProgress,
    IconButton,
    Container,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormHelperText,
} from "@mui/material";
import { ArrowBack, Delete } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useCartNegocioStore } from "@/store/carro-negocio/carro-negocio-store";
import { useAddressStore } from "@/store/address/address-store";
import colombiaData from "@/config/colombia.json";

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

const AddresOrdenNegocio: React.FC = () => {
    const router = useRouter();
    const { removeProduct, cart, getTotalPrice } = useCartNegocioStore();
    const { address, setAddress } = useAddressStore();

    const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<Address>({
        defaultValues: {
            country: "Colombia", // Default fijo para Colombia
            departamento: "",
            ciudad: "",
            clientName: "",
            clientPhone: "",
            deliveryAddress: "",
            deliveryDate: new Date().toISOString().substring(0, 10), // Fecha actual por default
            additionalComments: "",
        },
    });

    const [isLoading, setIsLoading] = React.useState(false);

    // Estado para las ciudades basadas en el departamento seleccionado
    const [cities, setCities] = useState<string[]>([]);

    // Observar el valor del departamento
    const selectedDepartamento = watch("departamento");

    // Prellenar form con datos del store si existen
    useEffect(() => {
        // Prellenar form con datos del store si existen
        if (address && address.country) {
            reset(address);
        }
    }, [reset, address]);

    // Actualizar las ciudades cuando cambie el departamento
    useEffect(() => {
        if (selectedDepartamento) {
            const departmentData = (colombiaData as ColombiaDepartment[]).find(
                (dept) => dept.departamento === selectedDepartamento
            );
            setCities(departmentData ? departmentData.ciudades : []);
        } else {
            setCities([]);
        }
    }, [selectedDepartamento]);

    const total = getTotalPrice();

    const onSubmit = (data: Address) => {
        setAddress(data); // Guardar en el store
        router.push(`/dashboard/orders/checkout`); // Redirigir a checkout
    };

    const handleBackToCart = () => {
        router.push("/dashboard/orders/crear");
    };

    if (isLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    // Componente de resumen del carrito (para reutilizar en mobile y desktop)
    const CartSummary = () => (
        <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: "background.paper" }}>
            <Typography
  variant="h6"
  sx={{
    mb: 2,
    fontWeight: 600,
    color: "text.primary",
    textAlign: "center",
  }}
>
  Resumen de tu pedido
</Typography>

            <List disablePadding>
                {cart.map((item) => (
                    <ListItem key={item.cartItemId} sx={{ py: 1, px: 0 }}>
                        <ListItemText
                            primary={`${item.nombre} x ${item.cantidad}`}
                            secondary={`$${item.precio.toFixed(2)} cada uno`}
                            primaryTypographyProps={{ variant: "body1", fontWeight: 500 }}
                            secondaryTypographyProps={{ variant: "body2", color: "text.secondary" }}
                        />
                        <Typography variant="body1" sx={{ fontWeight: 600, mr: 2, flexShrink: 0 }}>
                            ${(item.precio * item.cantidad).toFixed(2)}
                        </Typography>
                        <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => removeProduct(item.cartItemId)}
                            sx={{
                                ml: 1,
                                bgcolor: "white",
                                color: "red",
                                borderRadius: "50%",
                                border: "1.5px solid rgba(0,0,0,0.1)", // borde sutil
                                boxShadow: "0 2px 6px rgba(0,0,0,0.05)", // sombra ligera
                                transition: "all 0.25s ease",
                                "&:hover": {
                                    bgcolor: "red",
                                    color: "white",
                                    borderColor: "red", // borde se integra al hover
                                    boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                                },
                            }}
                        >
                            <Delete fontSize="small" />
                        </IconButton>

                    </ListItem>
                ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
                    Total:
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
                    ${total.toFixed(2)}
                </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "center" }}>
  <Button
    startIcon={<ArrowBack />}
    onClick={handleBackToCart}
    sx={{
      mt: 2,
      px: 3,
      py: 1.2,
      textTransform: "none",
      fontWeight: 600,
      fontSize: "0.95rem",
      borderRadius: 3,
      bgcolor: "grey.900",
      color: "#fff",
      transition: "all 0.3s ease",
      "&:hover": {
        bgcolor: "grey.800",
        boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
      },
      "& .MuiButton-startIcon": {
        mr: 1,
        fontSize: "1.1rem",
        color: "#fff",
      },
    }}
  >
    Volver a agregar productos
  </Button>
</Box>

        </Paper>
    );

    return (
        <Fade in timeout={600}>
            <Container maxWidth="lg" sx={{ mt: 6, mb: 8 }}>
                <Typography
                    variant="h3"
                    sx={{
                        mb: 6,
                        fontWeight: 700,
                        textAlign: "center",
                        color: "text.primary",
                        letterSpacing: "-0.02em", // Ajuste fino en lugar de negativo exagerado
                        fontSize: { xs: "2rem", sm: "1.75rem", md: "2.25rem" }, // Un poco más grande en desktop
                        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        lineHeight: 1.2,
                        textRendering: "optimizeLegibility",
                        WebkitFontSmoothing: "antialiased",
                    }}
                >
                    Información de Entrega para la Orden
                </Typography>

                <Grid container spacing={4}>
                    {/* Formulario a la izquierda (en desktop), full width en mobile */}
                    <Grid item xs={12} md={7}>
                        <Paper
                            elevation={3} // Controla la intensidad de la sombra
                            sx={{
                                p: { xs: 2, sm: 4 },
                                borderRadius: 3,
                                border: "1px solid",
                                borderColor: "grey.300", // Borde gris premium
                                boxShadow: "0 8px 24px rgba(0,0,0,0.05)", // sombra suave elegante
                                bgcolor: "background.paper",
                            }}
                        >
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
                                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="large"
                                        sx={{
                                            px: 6,
                                            py: 1.5,
                                            borderRadius: 3,
                                            textTransform: "none",
                                            fontWeight: 600,
                                            bgcolor: "primary.main",
                                            "&:hover": { bgcolor: "primary.dark", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
                                            transition: "all 0.2s ease",
                                        }}
                                    >
                                        Continuar al pago
                                    </Button>
                                </Box>
                            </form>
                        </Paper>
                    </Grid>

                    {/* Resumen a la derecha (en desktop), debajo en mobile */}
                    <Grid item xs={12} md={5}>
                        <Box sx={{ position: { md: "sticky" }, top: { md: 100 } }}>
                            {CartSummary()}
                        </Box>
                    </Grid>
                </Grid>
            </Container>
        </Fade>
    );
};

export default AddresOrdenNegocio;