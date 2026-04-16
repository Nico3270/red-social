"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  IconButton,
  Container,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Alert,
} from "@mui/material";
import { ArrowBack, Delete } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useCartNegocioStore } from "@/store/carro-negocio/carro-negocio-store";
import { useAddressStore } from "@/store/address/address-store";
import colombiaData from "@/config/colombia.json";
import { FiMapPin, FiTruck } from "react-icons/fi";

type OrderType = "DELIVERY" | "ON_SITE";

interface Address {
  orderType: OrderType;
  country?: string;
  departamento?: string;
  ciudad?: string;
  clientName: string;
  clientPhone: string;
  deliveryAddress?: string;
  onSiteLocation?: string;
  deliveryDate?: string;
  additionalComments?: string;
}

interface ColombiaDepartment {
  id: number;
  departamento: string;
  ciudades: string[];
}

const ORDER_OPTIONS: {
  value: OrderType;
  label: string;
  icon: React.ReactNode;
  selectedBg: string;
  selectedBorder: string;
  softBg: string;
  softBorder: string;
  shadow: string;
}[] = [
  {
    value: "DELIVERY",
    label: "A domicilio",
    icon: <FiTruck size={20} />,
    selectedBg: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    selectedBorder: "#1d4ed8",
    softBg: "rgba(37, 99, 235, 0.08)",
    softBorder: "rgba(37, 99, 235, 0.18)",
    shadow: "0 14px 30px rgba(37, 99, 235, 0.26)",
  },
  {
    value: "ON_SITE",
    label: "En sitio",
    icon: <FiMapPin size={20} />,
    selectedBg: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
    selectedBorder: "#15803d",
    softBg: "rgba(22, 163, 74, 0.08)",
    softBorder: "rgba(22, 163, 74, 0.18)",
    shadow: "0 14px 30px rgba(22, 163, 74, 0.24)",
  },
];

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

const AddresOrdenNegocio: React.FC = () => {
  const router = useRouter();
  const { removeProduct, cart, getTotalPrice } = useCartNegocioStore();
  const { address, setAddress } = useAddressStore();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<Address>({
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

  const [cities, setCities] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedDepartamento = watch("departamento");
  const orderType = watch("orderType");

  useEffect(() => {
    if (address && address.orderType) {
      reset(address);
    }
  }, [reset, address]);

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

  useEffect(() => {
    trigger();
  }, [orderType, trigger]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0),
    [cart]
  );

  const handleOrderTypeChange = (newType: OrderType) => {
    if (newType === orderType) return;

    setValue("orderType", newType, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (newType === "DELIVERY") {
      setValue("onSiteLocation", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else {
      setValue("departamento", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("ciudad", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("deliveryAddress", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    trigger();
  };

  const onSubmit = (data: Address) => {
    try {
      setErrorMessage(null);
      setAddress(data);
      router.push("/dashboard/orders/checkout");
    } catch (error) {
      setErrorMessage("Error al guardar los datos. Por favor, intenta de nuevo.");
      console.error("Error al guardar la dirección:", error);
    }
  };

  const handleBackToCart = () => {
    router.push("/dashboard/orders/crear");
  };

  const CartSummary = () => (
    <Paper
      elevation={1}
      sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: "background.paper" }}
    >
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
              secondary={`$${item.precio.toFixed(2)} cada uno${item.variantLabel ? ` • Variante: ${item.variantLabel}` : ""}`}
              primaryTypographyProps={{ variant: "body1", fontWeight: 500 }}
              secondaryTypographyProps={{
                variant: "body2",
                color: "text.secondary",
              }}
            />
            <Typography
              variant="body1"
              sx={{ fontWeight: 600, mr: 2, flexShrink: 0 }}
            >
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
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      <Box
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
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
            letterSpacing: "-0.02em",
            fontSize: { xs: "2rem", sm: "1.75rem", md: "2.25rem" },
            fontFamily:
              "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            lineHeight: 1.2,
            textRendering: "optimizeLegibility",
            WebkitFontSmoothing: "antialiased",
          }}
        >
          {orderType === "DELIVERY" ? "Envío" : "Pedido en sitio"} para la orden
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
              <Box sx={{ mb: 4 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 4,
                    bgcolor: "#f3f4f6",
                    border: "1px solid #e5e7eb",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                      gap: 1.25,
                    }}
                  >
                    {ORDER_OPTIONS.map((option) => {
                      const selected = orderType === option.value;

                      return (
                        <Box
                          key={option.value}
                          component="button"
                          type="button"
                          onClick={() => handleOrderTypeChange(option.value)}
                          aria-pressed={selected}
                          sx={{
                            appearance: "none",
                            border: selected
                              ? `1px solid ${option.selectedBorder}`
                              : `1px solid ${option.softBorder}`,
                            outline: "none",
                            cursor: "pointer",
                            width: "100%",
                            minHeight: 58,
                            px: 2,
                            py: 1.5,
                            borderRadius: 3,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1.25,
                            fontSize: "0.98rem",
                            fontWeight: 700,
                            lineHeight: 1,
                            transition: "all 0.24s ease",
                            color: selected ? "#ffffff" : "#111827",
                            bgcolor: selected ? "transparent" : "#ffffff",
                            background: selected ? option.selectedBg : option.softBg,
                            boxShadow: selected
                              ? option.shadow
                              : "0 1px 2px rgba(15,23,42,0.06)",
                            transform: selected ? "translateY(-1px)" : "none",
                            "& svg": {
                              color: "inherit",
                              flexShrink: 0,
                            },
                            "&:hover": {
                              transform: "translateY(-1px)",
                              boxShadow: selected
                                ? option.shadow
                                : "0 8px 18px rgba(15,23,42,0.08)",
                              filter: selected ? "saturate(1.04)" : "none",
                            },
                          }}
                        >
                          {option.icon}
                          <Box component="span">{option.label}</Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>

              <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                  {orderType === "DELIVERY" && (
                    <>
                      <Grid item xs={12}>
                        <Controller
                          name="country"
                          control={control}
                          rules={{
                            required: orderType === "DELIVERY" ? "País requerido" : false,
                          }}
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
                          rules={{
                            required:
                              orderType === "DELIVERY" ? "Departamento requerido" : false,
                          }}
                          render={({ field }) => (
                            <FormControl
                              fullWidth
                              variant="outlined"
                              error={!!errors.departamento}
                            >
                              <InputLabel id="departamento-label">
                                Departamento
                              </InputLabel>
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
                              {errors.departamento && (
                                <FormHelperText>
                                  {errors.departamento.message}
                                </FormHelperText>
                              )}
                            </FormControl>
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="ciudad"
                          control={control}
                          rules={{
                            required: orderType === "DELIVERY" ? "Ciudad requerida" : false,
                          }}
                          render={({ field }) => (
                            <FormControl
                              fullWidth
                              variant="outlined"
                              error={!!errors.ciudad}
                              disabled={!selectedDepartamento}
                            >
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
                              {errors.ciudad && (
                                <FormHelperText>{errors.ciudad.message}</FormHelperText>
                              )}
                            </FormControl>
                          )}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Controller
                          name="deliveryAddress"
                          control={control}
                          rules={{
                            required:
                              orderType === "DELIVERY"
                                ? "Dirección de entrega requerida"
                                : false,
                          }}
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
                        rules={{
                          required:
                            orderType === "ON_SITE"
                              ? "Referencia de ubicación requerida"
                              : false,
                        }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Referencia de ubicación (e.g., Mesa 4)"
                            fullWidth
                            variant="outlined"
                            error={!!errors.onSiteLocation}
                            helperText={errors.onSiteLocation?.message}
                            sx={{
                              ...textFieldStyle,
                              "& .MuiOutlinedInput-root": {
                                ...textFieldStyle["& .MuiOutlinedInput-root"],
                                "& .MuiInputBase-input": {
                                  fontSize: "1rem",
                                },
                              },
                            }}
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
                          sx={textFieldStyle}
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
                          sx={textFieldStyle}
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
                      "&:hover": {
                        bgcolor: "primary.dark",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    Continuar al pago
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

export default AddresOrdenNegocio;
