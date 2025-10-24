// /components/dashboard/reservas/AddressNegocioTotal.tsx
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
  InputAdornment,
} from "@mui/material";
import { ArrowBack, Delete } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { useAddressStore } from "@/store/address/address-store";
import { fetchNegocioName } from "@/carro/componentes/ProductsInCart";
import colombiaData from "@/config/colombia.json";
import { FaFlag } from "react-icons/fa";

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
  const { carts, removeProduct, getTotalPrice } = useCartCatalogoStore();
  const { address, setAddress } = useAddressStore();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<Address>({
    mode: "onChange", // Validar en tiempo real
    defaultValues: {
      country: "Colombia",
      departamento: "",
      ciudad: "",
      clientName: "",
      clientPhone: "",
      deliveryAddress: "",
      deliveryDate: new Date().toISOString().substring(0, 10),
      additionalComments: "",
    },
  });

  const [negocioNames, setNegocioNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [cities, setCities] = useState<string[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false); // Para forzar mostrar errores

  const selectedDepartamento = watch("departamento");

  // -------------------------------------------------
  // Carga inicial
  // -------------------------------------------------
  useEffect(() => {
    console.log("[AddressNegocioTotal] Iniciando carga...");
    const load = async () => {
      const slugs = Object.keys(carts);
      const names: Record<string, string> = {};
      for (const s of slugs) {
        names[s] = await fetchNegocioName(s);
      }
      setNegocioNames(names);
      setIsLoading(false);
    };
    load();

    if (address?.country) {
      const localPhone = address.clientPhone?.startsWith("+57")
        ? address.clientPhone.slice(3)
        : address.clientPhone;
      reset({ ...address, clientPhone: localPhone });
    }
  }, [carts, reset, address]);

  // -------------------------------------------------
  // Ciudades
  // -------------------------------------------------
  useEffect(() => {
    if (selectedDepartamento) {
      const dept = (colombiaData as ColombiaDepartment[]).find(
        (d) => d.departamento === selectedDepartamento
      );
      setCities(dept ? dept.ciudades : []);
    } else {
      setCities([]);
    }
  }, [selectedDepartamento]);

  const totalGlobal = getTotalPrice();

  // -------------------------------------------------
  // Submit con validación forzada
  // -------------------------------------------------
  const onSubmit = async (data: Address) => {
    console.log("[onSubmit] Datos recibidos:", data);

    // Forzar validación completa
    const isValid = await trigger();
    if (!isValid) {
      console.error("[onSubmit] Validación fallida:", errors);
      setSubmitAttempted(true);
      return;
    }

    const formatted: Address = {
      ...data,
      clientPhone: `+57${data.clientPhone}`,
    };

    console.log("[onSubmit] Guardando en store:", formatted);
    setAddress(formatted);

    console.log("[onSubmit] Redirigiendo a /checkout...");
    router.push("/checkout");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[FORM] Submit intentado");
    setSubmitAttempted(true);
    await trigger(); // Forzar validación
    handleSubmit(onSubmit)(e);
  };

  const handleBackToCart = () => router.push("/carro");

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const CartSummary = () => (
    <>
      {Object.entries(carts).map(([slug, items]) => {
        const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
        return (
          <Paper
            key={slug}
            elevation={1}
            sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: "background.paper", mb: 3 }}
          >
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
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => removeProduct(slug, item.id)}
                    sx={{ ml: 1 }}
                  >
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

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 2,
          p: 2,
          bgcolor: "background.paper",
          borderRadius: 3,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>
          Total Global:
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "grey.900" }}>
          ${totalGlobal.toFixed(2)}
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
            fontFamily:
              "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          Envío para todos los negocios
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={7}>
            <form onSubmit={handleFormSubmit} noValidate>
              <Grid container spacing={3}>
                {/* País */}
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
                        disabled
                        error={submitAttempted && !!errors.country}
                        helperText={submitAttempted && errors.country?.message}
                        sx={textFieldStyle}
                      />
                    )}
                  />
                </Grid>

                {/* Departamento */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="departamento"
                    control={control}
                    rules={{ required: "Departamento requerido" }}
                    render={({ field }) => (
                      <FormControl fullWidth variant="outlined" error={submitAttempted && !!errors.departamento}>
                        <InputLabel id="departamento-label">Departamento</InputLabel>
                        <Select
                          {...field}
                          labelId="departamento-label"
                          label="Departamento"
                          sx={selectStyle}
                        >
                          {(colombiaData as ColombiaDepartment[]).map((d) => (
                            <MenuItem key={d.id} value={d.departamento}>
                              {d.departamento}
                            </MenuItem>
                          ))}
                        </Select>
                        {submitAttempted && errors.departamento && (
                          <FormHelperText>{errors.departamento.message}</FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>

                {/* Ciudad */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="ciudad"
                    control={control}
                    rules={{ required: "Ciudad requerida" }}
                    render={({ field }) => (
                      <FormControl
                        fullWidth
                        variant="outlined"
                        error={submitAttempted && !!errors.ciudad}
                        disabled={!selectedDepartamento}
                      >
                        <InputLabel id="ciudad-label">Ciudad</InputLabel>
                        <Select
                          {...field}
                          labelId="ciudad-label"
                          label="Ciudad"
                          sx={selectStyle}
                        >
                          {cities.map((c, i) => (
                            <MenuItem key={i} value={c}>
                              {c}
                            </MenuItem>
                          ))}
                        </Select>
                        {submitAttempted && errors.ciudad && <FormHelperText>{errors.ciudad.message}</FormHelperText>}
                      </FormControl>
                    )}
                  />
                </Grid>

                {/* Nombre */}
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
                        error={submitAttempted && !!errors.clientName}
                        helperText={submitAttempted && errors.clientName?.message}
                        sx={textFieldStyle}
                      />
                    )}
                  />
                </Grid>

                {/* Teléfono */}
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
                        error={submitAttempted && !!errors.clientPhone}
                        helperText={submitAttempted && errors.clientPhone?.message}
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
                            "& .MuiInputAdornment-root": { pointerEvents: "none" },
                          },
                        }}
                        inputProps={{ maxLength: 10 }}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "");
                          setValue("clientPhone", v);
                        }}
                      />
                    )}
                  />
                </Grid>

                {/* Dirección */}
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
                        error={submitAttempted && !!errors.deliveryAddress}
                        helperText={submitAttempted && errors.deliveryAddress?.message}
                        sx={textFieldStyle}
                      />
                    )}
                  />
                </Grid>

                {/* Fecha (oculta) */}
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
                        sx={textFieldStyle}
                      />
                    )}
                  />
                </Grid>

                {/* Comentarios */}
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

              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isSubmitting}
                  sx={{
                    px: 6,
                    py: 1.5,
                    borderRadius: 3,
                    textTransform: "none",
                    fontWeight: 600,
                    bgcolor: "primary.main",
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                >
                  {isSubmitting ? "Procesando…" : "Continuar al pago"}
                </Button>
              </Box>
            </form>
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

export default AddressNegocioTotal;