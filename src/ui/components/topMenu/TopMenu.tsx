"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import { SideBar } from "../side-bar/SideBar";
import { MenuSectionsBar } from "../menu-section-bar/MenuSectionBar";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { useFavoritesCatalogoStore } from "@/store/favoritos/favoritos-store";
import { CrearModal } from "./Crear";
import { useSession } from "next-auth/react";
import { usePreferencesStore } from "@/store/preferences/preferences-store";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, Box, Button, CircularProgress, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import colombia from "@/config/colombia.json";
import { updateUserPreferences } from "@/preferences/actions/updateUserPreferences";
import { titleFont } from "@/config/fonts";
import SearchBar from "@/busqueda/componentes/SearchBar";

interface ColombiaDepartment {
  id: number;
  departamento: string;
  ciudades: string[];
}

const UpdateLocationModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { data: session } = useSession();
  const { ciudad, departamento, setUbicacion, setGeo } = usePreferencesStore(); // ← setGeo agregado
  const [selectedDepartamento, setSelectedDepartamento] = useState(departamento);
  const [selectedCity, setSelectedCity] = useState(ciudad);
  const [cities, setCities] = useState<string[]>([]);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    if (selectedDepartamento) {
      const deptData = (colombia as ColombiaDepartment[]).find((dept) => dept.departamento === selectedDepartamento);
      setCities(deptData ? deptData.ciudades : []);
    } else {
      setCities([]);
    }
  }, [selectedDepartamento]);

  const handleSave = async () => {
    if (!selectedCity || !selectedDepartamento) {
      setAlert({ type: 'error', message: 'Completa todos los campos requeridos.' });
      return;
    }

    setIsSaving(true);
    setAlert(null);

    // Actualizar store
    setUbicacion(selectedCity, selectedDepartamento);
    setGeo(null, null); // ← Limpia GPS para forzar feed por ciudad (viaje)

    // Si autenticado, guardar en DB
    if (session?.user) {
      const response = await updateUserPreferences({
        ciudad: selectedCity,
        departamento: selectedDepartamento,
        preferencias: [],
      });
      if (!response.ok) {
        setAlert({ type: 'error', message: response.message });
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
            transition={{ type: 'spring', damping: 25, stiffness: 400, duration: 0.3 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                  <Typography variant="h5" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                    ¡Gracias!
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
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
                  <Typography variant="h6" sx={{ fontWeight: 'medium', mb: 2, textAlign: 'center', color: 'text.primary' }}>
                    Actualizar Ubicación
                  </Typography>

                  {alert && <Alert severity={alert.type} sx={{ mb: 2, borderRadius: '12px' }}>{alert.message}</Alert>}

                  <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                    <InputLabel shrink>Departamento</InputLabel>
                    <Select
                      value={selectedDepartamento}
                      onChange={(e) => setSelectedDepartamento(e.target.value as string)}
                      label="Departamento"
                      sx={{ borderRadius: '12px' }}
                    >
                      <MenuItem value="">Selecciona</MenuItem>
                      {(colombia as ColombiaDepartment[]).map((dept) => (
                        <MenuItem key={dept.id} value={dept.departamento}>
                          {dept.departamento}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth variant="outlined" disabled={!selectedDepartamento} sx={{ mb: 2 }}>
                    <InputLabel shrink>Ciudad</InputLabel>
                    <Select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value as string)}
                      label="Ciudad"
                      sx={{ borderRadius: '12px' }}
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
                    sx={{ mt: 4, borderRadius: '12px', py: 1.5, bgcolor: 'primary.main', textTransform: 'none', fontWeight: 'medium' }}
                  >
                    {isSaving ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                        Actualizando...
                      </Box>
                    ) : (
                      'Actualizar Ubicación'
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

export const TopMenu = () => {
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

  // Mostrar ícono GPS si hay coordenadas
  const showGpsIcon = userLat != null && userLong != null;

  return (
    <header className="fixed top-0 w-full z-50 bg-white shadow-md border-b">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-20">
        {/* Logo a la izquierda */}
        <Link href="/" className="flex items-center space-x-1">
          <Image
            src="/imgs/Logo Final (1).png"
            alt="Logo Myckeo"
            width={100}
            height={100}
            className="rounded-full"
            priority
          />
          <span
            className={`text-2xl font-bold text-gray-900 tracking-tight relative ${titleFont.className}`}
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.15)" }}
          >
            Myckeo
          </span>
        </Link>

        {/* Barra de búsqueda centrada con botón de ubicación al lado */}
        <div className="flex items-center w-full max-w-md mx-4">
          <div className="relative flex-1">
            <SearchBar />
          </div>
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="ml-4 flex items-center bg-white rounded-full shadow-md border border-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <FaMapMarkerAlt className={`mr-2 ${showGpsIcon ? 'text-green-600' : 'text-gray-500'}`} />
            <span className="font-medium truncate max-w-[120px]">{ciudad || 'Seleccionar Ciudad'}</span>
            {showGpsIcon && <span className="ml-1 text-xs text-green-600">GPS</span>}
          </button>
        </div>

        {/* Iconos de navegación alineados a la derecha */}
        <nav className="flex items-center space-x-2 md:space-x-4 text-gray-700">
          {/* Inicio */}
          <Link
            href="/"
            className="
              group relative flex flex-col items-center justify-center 
              w-12 h-12 md:w-14 md:h-14 
              rounded-xl border border-gray-200 
              bg-white shadow-md 
              hover:shadow-lg hover:border-blue-200
              transition-all duration-300
            "
          >
            <Image
              src="/imgs/iconos/home.png"
              alt="Inicio"
              width={24}
              height={24}
              unoptimized
              className="
                w-5 h-5 md:w-6 md:h-6 text-gray-600 
                transform transition-all duration-300 
                group-hover:scale-110 group-hover:-translate-y-0.5 
                group-hover:rotate-3
              "
            />
            <span className="text-[10px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-blue-600">
              Inicio
            </span>
          </Link>

          {/* Carrito */}
          <Link
            href={mounted && totalItemsInCart > 0 ? "/carro" : "/empty"}
            className="
              group relative flex flex-col items-center justify-center 
              w-12 h-12 md:w-14 md:h-14 
              rounded-xl border border-gray-200 
              bg-white shadow-md 
              hover:shadow-lg hover:border-blue-200
              transition-all duration-300
            "
          >
            <Image
              src="/imgs/iconos/cart.png"
              alt="Carrito"
              width={24}
              height={24}
              unoptimized
              className="
                w-5 h-5 md:w-6 md:h-6 text-gray-600 
                transform transition-all duration-300 
                group-hover:scale-110 group-hover:-translate-y-0.5 
                group-hover:rotate-3
              "
            />
            {mounted && totalItemsInCart > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white font-bold rounded-full text-[10px] min-w-[18px] h-[18px] flex items-center justify-center shadow-md">
                {totalItemsInCart}
              </span>
            )}
            <span className="text-[10px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-emerald-600">
              Carro
            </span>
          </Link>

          {/* Favoritos */}
          <Link
            href="/favoritos"
            className="
              group relative flex flex-col items-center justify-center 
              w-12 h-12 md:w-14 md:h-14 
              rounded-xl border border-gray-200 
              bg-white shadow-md 
              hover:shadow-lg hover:border-blue-200
              transition-all duration-300
            "
          >
            <Image
              src="/imgs/iconos/heart.png"
              alt="Favoritos"
              width={24}
              height={24}
              unoptimized
              className="
                w-5 h-5 md:w-6 md:h-6 text-gray-600 
                transform transition-all duration-300 
                group-hover:scale-110 group-hover:-translate-y-0.5 
                group-hover:rotate-3
              "
            />
            {mounted && totalFavorites > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold rounded-full text-[10px] min-w-[18px] h-[18px] flex items-center justify-center shadow-md">
                {totalFavorites}
              </span>
            )}
            <span className="text-[10px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-red-500">
              Favoritos
            </span>
          </Link>

          {isNegocio && (
            <button
              onClick={() => setIsCrearModalOpen(true)}
              className="
                group relative flex flex-col items-center justify-center 
                w-12 h-12 md:w-14 md:h-14 
                rounded-xl border border-gray-200 
                bg-white shadow-md 
                hover:shadow-lg hover:border-blue-200
                transition-all duration-300
              "
            >
              <Image
                src="/imgs/iconos/plus.png"
                alt="Crear"
                width={24}
                height={24}
                unoptimized
                className="
                  w-5 h-5 md:w-6 md:h-6 text-gray-600 
                  transform transition-all duration-300 
                  group-hover:scale-110 group-hover:-translate-y-0.5 
                  group-hover:rotate-3
                "
              />
              <span className="text-[10px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-purple-600">
                Crear
              </span>
            </button>
          )}

          {/* Perfil */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="
              group relative flex flex-col items-center justify-center 
              w-12 h-12 md:w-14 md:h-14 
              rounded-xl border border-gray-200 
              bg-white shadow-md 
              hover:shadow-lg hover:border-blue-200
              transition-all duration-300
            "
          >
            <Image
              src="/imgs/iconos/profile.png"
              alt="Perfil"
              width={24}
              height={24}
              unoptimized
              className="
                w-5 h-5 md:w-6 md:h-6 text-gray-600 
                transform transition-all duration-300 
                group-hover:scale-110 group-hover:-translate-y-0.5 
                group-hover:rotate-3
              "
            />
            <span className="text-[10px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-indigo-600">
              Perfil
            </span>
          </button>
        </nav>
      </div>

      {/* Drawer lateral */}
      <SideBar open={isDrawerOpen} toggleDrawer={setIsDrawerOpen} />
      <MenuSectionsBar />
      <CrearModal isOpen={isCrearModalOpen} onClose={() => setIsCrearModalOpen(false)} />
      <UpdateLocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
    </header>
  );
};