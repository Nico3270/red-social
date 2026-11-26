"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { MapPin, Plus, X } from "lucide-react";
import { SideBar } from "../side-bar/SideBar";
import { MenuSectionsBar } from "../menu-section-bar/MenuSectionBar";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { useFavoritesCatalogoStore } from "@/store/favoritos/favoritos-store";
import { CrearModal } from "../topMenu/Crear";
import { useSession } from "next-auth/react";
import { usePreferencesStore } from "@/store/preferences/preferences-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import colombia from "@/config/colombia.json";
import { updateUserPreferences } from "@/preferences/actions/updateUserPreferences";
import SearchBar from "@/busqueda/componentes/SearchBar";

import { titleFont } from "@/config/fonts";
import { BusinessEntryLink } from "../topMenu/BusinessEntryLink";
import styles from "../topMenu/publicNavigation.module.css";
import mobile from "./mobileExperience.module.css";
import { MobileNavigation } from "./MobileNavigation";

interface ColombiaDepartment {
  id: number;
  departamento: string;
  ciudades: string[];
}

const UpdateLocationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { data: session } = useSession();
  const { ciudad, departamento, setUbicacion, setGeo } = usePreferencesStore();
  const [selectedDepartamento, setSelectedDepartamento] =
    useState(departamento);
  const [selectedCity, setSelectedCity] = useState(ciudad);
  const [cities, setCities] = useState<string[]>([]);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const wasOpen = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setSelectedDepartamento(departamento);
      setSelectedCity(ciudad);
      setAlert(null);
      setShowThankYou(false);
    }
    if (!isOpen && closeTimer.current) clearTimeout(closeTimer.current);
    wasOpen.current = isOpen;
  }, [isOpen, ciudad, departamento]);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (selectedDepartamento) {
      const deptData = (colombia as ColombiaDepartment[]).find(
        (dept) => dept.departamento === selectedDepartamento,
      );
      setCities(deptData ? deptData.ciudades : []);
    } else {
      setCities([]);
    }
  }, [selectedDepartamento]);

  const handleSave = async () => {
    if (!selectedCity || !selectedDepartamento) {
      setAlert({
        type: "error",
        message: "Completa todos los campos requeridos.",
      });
      return;
    }

    setIsSaving(true);
    setAlert(null);

    setUbicacion(selectedCity, selectedDepartamento);
    setGeo(null, null);

    if (session?.user) {
      const response = await updateUserPreferences({
        ciudad: selectedCity,
        departamento: selectedDepartamento,
        preferencias: [],
      });
      if (!response.ok) {
        setAlert({ type: "error", message: response.message });
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    setShowThankYou(true);
    closeTimer.current = setTimeout(onClose, 3000);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="mobile-location-title"
      sx={{
        zIndex: 10010,
        top: "var(--myckeo-visual-top, 0px)",
        height: "var(--myckeo-visual-height, 100dvh)",
        bottom: "auto",
        "& .MuiDialog-container": {
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        },
      }}
      PaperProps={{
        sx: {
          m: 1.5,
          width: "calc(100% - 24px)",
          borderRadius: 3,
          maxHeight:
            "calc(var(--myckeo-visual-height, 100dvh) - 24px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
        },
      }}
    >
      <DialogTitle
        id="mobile-location-title"
        sx={{ pr: 8, fontSize: 18, fontWeight: 600 }}
      >
        Actualizar Ubicación
      </DialogTitle>
      <IconButton
        aria-label="Cerrar ubicación"
        onClick={onClose}
        sx={{ position: "absolute", right: 8, top: 8, width: 44, height: 44 }}
      >
        <X size={20} />
      </IconButton>
      <DialogContent sx={{ p: 2, minHeight: 0, overflowY: "auto" }}>
        <AnimatePresence mode="wait">
          {showThankYou ? (
            <motion.div
              key="thankyou"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-4"
            >
              <Typography
                variant="h5"
                sx={{ fontWeight: "medium", color: "text.primary" }}
              >
                ¡Gracias!
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "text.secondary", lineHeight: 1.6 }}
              >
                Tu ubicación ha sido actualizada. ¡Disfruta explorando la
                plataforma!
              </Typography>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {alert && (
                <Alert
                  severity={alert.type}
                  sx={{ mb: 2, borderRadius: "12px" }}
                >
                  {alert.message}
                </Alert>
              )}

              <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                <InputLabel id="mobile-department-label" shrink>
                  Departamento
                </InputLabel>
                <Select
                  value={selectedDepartamento}
                  labelId="mobile-department-label"
                  MenuProps={{ sx: { zIndex: 10020 } }}
                  onChange={(e) =>
                    setSelectedDepartamento(e.target.value as string)
                  }
                  label="Departamento"
                  sx={{ borderRadius: "12px" }}
                >
                  <MenuItem value="">Selecciona</MenuItem>
                  {(colombia as ColombiaDepartment[]).map((dept) => (
                    <MenuItem key={dept.id} value={dept.departamento}>
                      {dept.departamento}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl
                fullWidth
                variant="outlined"
                disabled={!selectedDepartamento}
                sx={{ mb: 2 }}
              >
                <InputLabel id="mobile-city-label" shrink>
                  Ciudad
                </InputLabel>
                <Select
                  value={selectedCity}
                  labelId="mobile-city-label"
                  MenuProps={{ sx: { zIndex: 10020 } }}
                  onChange={(e) => setSelectedCity(e.target.value as string)}
                  label="Ciudad"
                  sx={{ borderRadius: "12px" }}
                >
                  <MenuItem value="">Selecciona</MenuItem>
                  {cities.map((city, idx) => (
                    <MenuItem key={idx} value={city}>
                      {city}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                fullWidth
                onClick={handleSave}
                disabled={isSaving}
                sx={{
                  mt: 4,
                  borderRadius: "12px",
                  py: 1.5,
                  bgcolor: "primary.main",
                  textTransform: "none",
                  fontWeight: "medium",
                }}
              >
                {isSaving ? (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CircularProgress
                      size={24}
                      color="inherit"
                      sx={{ mr: 1 }}
                    />
                    Actualizando...
                  </Box>
                ) : (
                  "Actualizar Ubicación"
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export const TopMenuMobile = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const pathname = usePathname();
  const totalItemsInCart = useCartCatalogoStore((state) =>
    state.getTotalItems(),
  );
  const totalFavorites = useFavoritesCatalogoStore((state) =>
    state.getTotalItems(),
  );
  const { data: session, status } = useSession();
  const isNegocio = session?.user?.role === "negocio";
  const { ciudad, userLat, userLong } = usePreferencesStore();
  const isBusinessProfilePage = pathname?.startsWith("/perfil/");
  const isDiscoveryPage =
    !isBusinessProfilePage &&
    (pathname === "/" || pathname?.startsWith("/category/"));

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const update = () => {
      root.style.setProperty(
        "--myckeo-visual-height",
        `${viewport?.height ?? window.innerHeight}px`,
      );
      root.style.setProperty(
        "--myckeo-visual-top",
        `${viewport?.offsetTop ?? 0}px`,
      );
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      root.style.removeProperty("--myckeo-visual-height");
      root.style.removeProperty("--myckeo-visual-top");
    };
  }, []);

  const showGpsIcon = userLat != null && userLong != null;

  const handleAyudaWhatsApp = () => {
    window.open(
      "https://wa.me/573132492256?text=Hola%2C%20necesito%20ayuda",
      "_blank",
    );
  };

  return (
    <div data-mobile-navigation>
      <header className={mobile.header}>
        <div className={mobile.row}>
          <Link href="/" className={`${styles.brand} ${mobile.brand}`}>
            <Image
              src="/imgs/Logo Final (1).png"
              alt="Logo Myckeo"
              width={32}
              height={32}
              className="rounded-xl"
              priority
            />
            <span className={`font-bold tracking-tight ${titleFont.className}`}>
              Myckeo
            </span>
          </Link>
          <div className={mobile.search}>
            <SearchBar compact={isDiscoveryPage} iconOnly />
          </div>
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className={`${styles.location} ${mobile.cityButton}`}
            aria-label={`Cambiar ubicación: ${ciudad || "Ciudad"}${showGpsIcon ? " (GPS)" : ""}`}
            title={ciudad || "Ciudad"}
            aria-haspopup="dialog"
            aria-expanded={isLocationModalOpen}
          >
            <MapPin
              size={16}
              aria-hidden="true"
              className={showGpsIcon ? "text-green-700" : "text-slate-500"}
            />
            <span className={styles.city}>{ciudad || "Ciudad"}</span>
            {showGpsIcon && (
              <span className="text-[11px] text-green-700">GPS</span>
            )}
          </button>
        </div>
      </header>
      <div className={mobile.headerSpace} aria-hidden="true" />
      <div className={mobile.businessRail}>
        <BusinessEntryLink />
        {isNegocio && (
          <button
            className={mobile.create}
            onClick={() => setIsCrearModalOpen(true)}
            aria-haspopup="dialog"
            aria-label="Crear"
            aria-expanded={isCrearModalOpen}
          >
            <Plus size={18} aria-hidden="true" />
            Crear
          </button>
        )}
      </div>
      {!isBusinessProfilePage && (
        <MenuSectionsBar compact={isDiscoveryPage} presentation="mobile" />
      )}
      <MobileNavigation
        pathname={pathname || "/"}
        cartCount={mounted ? totalItemsInCart : 0}
        favoriteCount={mounted ? totalFavorites : 0}
        context={
          status === "loading"
            ? "loading"
            : !session
              ? "anonymous"
              : isNegocio
                ? "owner"
                : "personal"
        }
        profileOpen={isDrawerOpen}
        createOpen={isCrearModalOpen}
        onProfile={() => setIsDrawerOpen(true)}
        onCreate={() => setIsCrearModalOpen(true)}
        onHelp={handleAyudaWhatsApp}
      />
      <SideBar open={isDrawerOpen} toggleDrawer={setIsDrawerOpen} />
      <CrearModal
        isOpen={isCrearModalOpen}
        onClose={() => setIsCrearModalOpen(false)}
      />
      <UpdateLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
};
