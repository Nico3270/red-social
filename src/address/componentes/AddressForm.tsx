// /components/dashboard/reservas/AddressNegocio.tsx
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
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  InputAdornment,
} from "@mui/material";
import { ArrowBack, Delete } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { useAddressStore } from "@/store/address/address-store";
import { fetchNegocioName } from "@/carro/componentes/ProductsInCart";
import colombiaData from "@/config/colombia.json";
import { FiMapPin, FiTruck } from "react-icons/fi";
import { FaFlag } from "react-icons/fa"; // Icono de bandera

type OrderType = "DELIVERY" | "ON_SITE";

interface Address {
  orderType: OrderType;
  country?: string;
  departamento?: string;
  ciudad?: string;
  clientName: string;
  clientPhone: string; // Número local (10 dígitos)
  deliveryAddress?: string;
  onSiteLocation?: string;
  deliveryDate?: string;
  additionalComments?: string;
}

interface AddressNegocioProps {
  slug: string;
}

interface ColombiaDepartment {
  id: number;
  departamento: string;
  ciudades: string[];
}

const AddressNegocio: React.FC<AddressNegocioProps> = ({ slug }) => {
  const router = useRouter();
  const { removeProduct, getCartForNegocio } = useCartCatalogoStore();
  const { address, setAddress } = useAddressStore();

  const { control, handleSubmit, reset, watch, trigger, formState: { errors }, setValue } = useForm<Address>({
    defaultValues: {
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
    },
  });

  const [negocioName, setNegocioName] = useState<string>("Cargando...");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);

  const selectedDepartamento = watch("departamento");
  const orderType = watch("orderType");


  // Fetch negocio y prellenar
  useEffect(() => {
    const loadData = async () => {
      const name = await fetchNegocioName(slug);
      setNegocioName(name);
      setIsLoading(false);
    };
    loadData();

    if (address && address.orderType) {
      // Si el teléfono viene con +57, removerlo para mostrar solo el número local
      const localPhone = address.clientPhone?.startsWith("+57") ? address.clientPhone.slice(3) : address.clientPhone;
      reset({ ...address, clientPhone: localPhone });
    }
  }, [slug, reset, address]);

  // Actualizar ciudades
  useEffect(() => {
    if (selectedDepartamento && orderType === "DELIVERY") {
      const departmentData = (colombiaData as ColombiaDepartment[]).find(
        (dept) => dept.departamento === selectedDepartamento
      );
      setCities(departmentData ? departmentData.ciudades : []);
    } else {
      setCities([]);
    }
  }, [selectedDepartamento, orderType]);

  // Revalidar al cambiar tipo de pedido
  useEffect(() => {
    trigger();
  }, [orderType, trigger]);

  const cartItems = getCartForNegocio(slug) || [];
  const total = cartItems.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  const onSubmit = (data: Address) => {
    try {
      setErrorMessage(null);
      // Concatenar +57 al teléfono antes de guardar
      const formattedData = {
        ...data,
        clientPhone: `+57${data.clientPhone}`,
      };
      setAddress(formattedData);
      router.push(`/checkout/${slug}`);
    } catch (error) {
      setErrorMessage("Error al guardar los datos. Por favor, intenta de nuevo.");
      console.error("Error al guardar la dirección:", error);
    }
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

  const CartSummary = () => (
    <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: "background.paper" }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: "text.primary" }}>
        Resumen de tu pedido
      </Typography>
      <List disablePadding>
        {cartItems.map((item) => (
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
          Volver al carrito
        </Button>
      </Box>
    </Paper>
  );

  return (
    <Fade in timeout={600}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Typography
          variant="h3"
          sx={{
            mb: 2,
            fontWeight: 700,
            textAlign: "center",
            color: "text.primary",
            letterSpacing: "-0.02em",
            fontSize: { xs: "2rem", sm: "2.75rem", md: "3.25rem" },
            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            lineHeight: 1.2,
            textRendering: "optimizeLegibility",
            WebkitFontSmoothing: "antialiased",
          }}
        >
          {orderType === "DELIVERY" ? "Envío" : "Pedido en sitio"} para{" "}
          <Box component="span" sx={{ color: "primary.main" }}>
            {negocioName}
          </Box>
        </Typography>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <Grid container spacing={4}>
          <Grid item xs={12} md={7}>
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
              <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
                <ToggleButtonGroup
                  value={orderType}
                  exclusive
                  onChange={(e, newType) => {
                    if (newType) {
                      reset({ ...watch(), orderType: newType, ciudad: "", departamento: "", deliveryAddress: "", onSiteLocation: "" });
                    }
                  }}
                  aria-label="tipo de pedido"
                  sx={{ gap: 2 }}
                >
                  <ToggleButton value="DELIVERY" sx={toggleButtonStyle}>
                    <FiTruck size={20} />
                    A domicilio
                  </ToggleButton>
                  <ToggleButton value="ON_SITE" sx={toggleButtonStyle}>
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
                              sx={textFieldStyle}
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
                                sx={selectStyle}
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
                                sx={selectStyle}
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
                              sx={textFieldStyle}
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
                            sx={textFieldStyle}
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
                          sx={textFieldStyle}
                        />
                      )}
                    />
                  </Grid>

                  {/* Campo de Teléfono con +57 y bandera */}
                  <Grid item xs={12}>
                    <Controller
                      name="clientPhone"
                      control={control}
                      rules={{
                        required: "Teléfono requerido",
                        pattern: {
                          value: /^\d{10}$/,
                          message: "El número debe tener exactamente 10 dígitos",
                        },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Teléfono del cliente"
                          fullWidth
                          variant="outlined"
                          placeholder="3182258523"
                          error={!!errors.clientPhone}
                          helperText={errors.clientPhone?.message}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <FaFlag className="text-gray-500" size={16} />
                                <span className="ml-2 text-gray-600 text-sm">+57</span>
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            ...textFieldStyle,
                            "& .MuiOutlinedInput-root": {
                              pl: 1.5,
                              "& .MuiInputAdornment-root": {
                                pointerEvents: "none",
                              },
                            },
                          }}
                          inputProps={{
                            maxLength: 10,
                          }}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            setValue("clientPhone", value);
                          }}
                          aria-label="Teléfono del cliente (10 dígitos)"
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sx={{ display: "none" }}>
                    <Controller
                      name="deliveryDate"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="date"
                          label="Fecha de entrega"
                          fullWidth
                          variant="outlined"
                          InputLabelProps={{ shrink: true }}
                          inputProps={{
                            min: new Date().toISOString().split("T")[0],
                          }}
                          sx={textFieldStyle}
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
                          sx={textFieldStyle}
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
                    Continuar con el pedido
                  </Button>
                </Box>
              </form>
            </Paper>
          </Grid>

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

// Estilos reutilizables
const textFieldStyle = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 3,
    bgcolor: "background.default",
    "& fieldset": { borderColor: "divider" },
    "&:hover fieldset": { borderColor: "primary.light" },
  },
  "& .MuiInputLabel-root": { color: "text.secondary" },
};

const selectStyle = {
  borderRadius: 3,
  bgcolor: "background.default",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "primary.light" },
};

const toggleButtonStyle = {
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
};

export default AddressNegocio;