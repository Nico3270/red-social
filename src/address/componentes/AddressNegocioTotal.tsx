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
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { useAddressStore } from "@/store/address/address-store";
import { fetchNegocioName } from "@/carro/componentes/ProductsInCart";
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

const AddressNegocioTotal: React.FC = () => {
  const router = useRouter();
  const {
    carts,
    removeProduct,
    getTotalPrice,
  } = useCartCatalogoStore();
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

  const [negocioNames, setNegocioNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Estado para las ciudades basadas en el departamento seleccionado
  const [cities, setCities] = useState<string[]>([]);

  // Observar el valor del departamento
  const selectedDepartamento = watch("departamento");

  // Fetch nombres de todos los negocios en carts y prellenar form si hay datos en store
  useEffect(() => {
    const loadData = async () => {
      const slugs = Object.keys(carts);
      const names: Record<string, string> = {};
      for (const slug of slugs) {
        const name = await fetchNegocioName(slug);
        names[slug] = name;
      }
      setNegocioNames(names);
      setIsLoading(false);
    };
    loadData();

    // Prellenar form con datos del store si existen
    if (address && address.country) {
      reset(address);
    }
  }, [carts, reset, address]);

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

  const totalGlobal = getTotalPrice();

  const onSubmit = (data: Address) => {
    setAddress(data); // Guardar en el store
    router.push("/checkout"); // Redirigir a checkout total
  };

  const handleBackToCart = () => {
    router.push("/carro");
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Componente de resumen de carritos por negocio
  const CartSummary = () => (
    <>
      {Object.entries(carts).map(([slug, items]) => {
        const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
        return (
          <Paper key={slug} elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: "background.paper", mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              {negocioNames[slug] || "Negocio Desconocido"}
            </Typography>
            <List disablePadding>
              {items.map((item) => (
                <ListItem key={item.id} sx={{ py: 1, px: 0 }}>
                  <ListItemText
                    primary={`${item.nombre} x ${item.cantidad}`}
                    secondary={`$${item.precio.toFixed(2)} cada uno`}
                    primaryTypographyProps={{ variant: "body1", fontWeight: 500 }}
                    secondaryTypographyProps={{ variant: "body2", color: "text.secondary" }}
                  />
                  <Typography variant="body1" sx={{ fontWeight: 600, ml: 2, flexShrink: 0 }}>
                    ${(item.precio * item.cantidad).toFixed(2)}
                  </Typography>
                  <IconButton edge="end" aria-label="delete" onClick={() => removeProduct(slug, item.id)} sx={{ ml: 1 }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Subtotal:
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                ${subtotal.toFixed(2)}
              </Typography>
            </Box>
          </Paper>
        );
      })}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, p: 2, bgcolor: "background.paper", borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Total Global:
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          ${totalGlobal.toFixed(2)}
        </Typography>
      </Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={handleBackToCart}
        sx={{
          mt: 2,
          textTransform: "none",
          fontWeight: 500,
          color: "primary.main",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        Volver al carrito
      </Button>
    </>
  );

  return (
    <Fade in timeout={600}>
      <Container maxWidth="lg" sx={{ mt: 6, mb: 8 }}>
        <Typography
          variant="h3"
          sx={{
            mb: 6,
            fontWeight: 600,
            textAlign: "center",
            color: "text.primary",
            letterSpacing: "-0.5px",
            fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          Envío para todos los negocios
        </Typography>

        <Grid container spacing={4}>
          {/* Formulario a la izquierda (en desktop), full width en mobile */}
          <Grid item xs={12} md={7}>
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
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
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

export default AddressNegocioTotal;