"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FaMapMarkerAlt, FaWhatsapp } from "react-icons/fa";
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
} from "@mui/material";
import colombia from "@/config/colombia.json";
import { updateUserPreferences } from "@/preferences/actions/updateUserPreferences";
import SearchBar from "@/busqueda/componentes/SearchBar";

interface ColombiaDepartment {
  id: number;
  departamento: string;
  ciudades: string[];
}

const UpdateLocationModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { data: session } = useSession();
  const { ciudad, departamento, setUbicacion, setGeo } = usePreferencesStore();
  const [selectedDepartamento, setSelectedDepartamento] = useState(departamento);
  const [selectedCity, setSelectedCity] = useState(ciudad);
  const [cities, setCities] = useState<string[]>([]);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    if (selectedDepartamento) {
      const deptData = (colombia as ColombiaDepartment[]).find(
        (dept) => dept.departamento === selectedDepartamento
      );
      setCities(deptData ? deptData.ciudades : []);
    } else {
      setCities([]);
    }
  }, [selectedDepartamento]);

  const handleSave = async () => {
    if (!selectedCity || !selectedDepartamento) {
      setAlert({ type: "error", message: "Completa todos los campos requeridos." });
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
    setTimeout(onClose, 3000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 400, duration: 0.3 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-lg overflow-hidden p-6 md:p-8 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <AnimatePresence mode="wait">
              {showThankYou ? (
                <motion.div
                  key="thankyou"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-center space-y-4"
                >
                  <Typography variant="h5" sx={{ fontWeight: "medium", color: "text.primary" }}>
                    ¡Gracias!
                  </Typography>
                  <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
                    Tu ubicación ha sido actualizada. ¡Disfruta explorando la plataforma!
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
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: "medium", mb: 2, textAlign: "center", color: "text.primary" }}
                  >
                    Actualizar Ubicación
                  </Typography>

                  {alert && (
                    <Alert severity={alert.type} sx={{ mb: 2, borderRadius: "12px" }}>
                      {alert.message}
                    </Alert>
                  )}

                  <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                    <InputLabel shrink>Departamento</InputLabel>
                    <Select
                      value={selectedDepartamento}
                      onChange={(e) => setSelectedDepartamento(e.target.value as string)}
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
                    <InputLabel shrink>Ciudad</InputLabel>
                    <Select
                      value={selectedCity}
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
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                        Actualizando...
                      </Box>
                    ) : (
                      "Actualizar Ubicación"
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const TopMenuMobile = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const totalItemsInCart = useCartCatalogoStore((state) => state.getTotalItems());
  const totalFavorites = useFavoritesCatalogoStore((state) => state.getTotalItems());
  const { data: session } = useSession();
  const isNegocio = session?.user?.role === "negocio";
  const { ciudad, userLat, userLong } = usePreferencesStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const showGpsIcon = userLat != null && userLong != null;

  const handleAyudaWhatsApp = () => {
    window.open("https://wa.me/573132492256?text=Hola%2C%20necesito%20ayuda", "_blank");
  };

  return (
    <div className="pb-0 sm:pb-10">
      {/* Barra superior fija */}
      <header className="fixed top-0 w-full z-50 bg-white shadow-md border-b">
        <div className="flex items-center justify-between px-4 h-16">
          <Link href="/" className="flex items-center">
            <Image
              src="/imgs/Logo Final (1).png"
              alt="Logo Myckeo"
              width={100}
              height={100}
              className="rounded-xl"
              priority
            />
          </Link>

          <div className="flex items-center flex-1 mx-4 gap-2">
            <div className="flex-1">
              <SearchBar />
            </div>
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center bg-white rounded-full shadow-md border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50 transition"
            >
              <FaMapMarkerAlt className={`mr-1 ${showGpsIcon ? "text-green-600" : "text-gray-500"}`} />
              <span className="truncate max-w-20">{ciudad || "Ciudad"}</span>
              {showGpsIcon && <span className="ml-1 text-xs text-green-600">GPS</span>}
            </button>
          </div>
        </div>
      </header>

      <div className="mt-16">
        <MenuSectionsBar />
      </div>

      {/* Barra inferior fija con botón de Ayuda WhatsApp */}
      <nav className="fixed bottom-0 w-full bg-white border-t shadow-lg z-50">
        <div className="flex justify-around items-center py-2">
          {/* Inicio */}
          <Link href="/" className="flex flex-col items-center">
            <Image
              src="/imgs/iconos/home.png"
              alt="Inicio"
              width={26}
              height={26}
              unoptimized
              className="mb-1"
            />
            <span className="text-xs text-gray-600">Inicio</span>
          </Link>

          {/* Carrito */}
          <Link
            href={mounted && totalItemsInCart > 0 ? "/carro" : "/empty"}
            className="relative flex flex-col items-center"
          >
            <Image
              src="/imgs/iconos/cart.png"
              alt="Carro"
              width={28}
              height={28}
              unoptimized
              className="mb-1"
            />
            {mounted && totalItemsInCart > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {totalItemsInCart}
              </span>
            )}
            <span className="text-xs text-gray-600">Carro</span>
          </Link>

          {/* Favoritos */}
          <Link href="/favoritos" className="relative flex flex-col items-center">
            <Image
              src="/imgs/iconos/heart.png"
              alt="Favoritos"
              width={26}
              height={26}
              unoptimized
              className="mb-1"
            />
            {mounted && totalFavorites > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {totalFavorites}
              </span>
            )}
            <span className="text-xs text-gray-600">Favoritos</span>
          </Link>

          {/* Crear o Mi Negocio */}
          {session ? (
            isNegocio ? (
              <Link href="/dashboard" className="flex flex-col items-center">
                <Image
                  src="/imgs/iconos/shop.png"
                  alt="Mi negocio"
                  width={32}
                  height={32}
                  unoptimized
                  className="mb-1"
                />
                <span className="text-xs text-gray-600 whitespace-nowrap">Mi negocio</span>
              </Link>
            ) : (
              <button onClick={() => setIsCrearModalOpen(true)} className="flex flex-col items-center">
                <Image
                  src="/imgs/iconos/plus.png"
                  alt="Crear"
                  width={28}
                  height={28}
                  unoptimized
                  className="mb-1"
                />
                <span className="text-xs text-gray-600">Crear</span>
              </button>
            )
          ) : null}

          {/* Perfil */}
          <button onClick={() => setIsDrawerOpen(true)} className="flex flex-col items-center">
            <Image
              src="/imgs/iconos/profile.png"
              alt="Perfil"
              width={26}
              height={26}
              unoptimized
              className="mb-1"
            />
            <span className="text-xs text-gray-600">Perfil</span>
          </button>

          {/* Botón de Ayuda WhatsApp */}
          <button
            onClick={handleAyudaWhatsApp}
            className="flex flex-col items-center text-green-600"
            aria-label="Ayuda por WhatsApp"
          >
            <FaWhatsapp className="w-7 h-7 mb-1 drop-shadow-md" />
            <span className="text-xs font-medium">Ayuda</span>
          </button>
        </div>
      </nav>

      {/* Modales */}
      <SideBar open={isDrawerOpen} toggleDrawer={setIsDrawerOpen} />
      <CrearModal isOpen={isCrearModalOpen} onClose={() => setIsCrearModalOpen(false)} />
      <UpdateLocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
    </div>
  );
};