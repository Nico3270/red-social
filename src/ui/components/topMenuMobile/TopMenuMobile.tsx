"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  FaSearch,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { SideBar } from "../side-bar/SideBar";
import { MenuSectionsBar } from "../menu-section-bar/MenuSectionBar";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { useFavoritesCatalogoStore } from "@/store/favoritos/favoritos-store";
import { CrearModal } from "../topMenu/Crear";
import { useSession } from "next-auth/react";
import { usePreferencesStore } from "@/store/preferences/preferences-store";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, Box, Button, CircularProgress, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import colombia from "@/config/colombia.json"; // Tu JSON de Colombia
import { updateUserPreferences } from "@/preferences/actions/updateUserPreferences"; // Ajusta la ruta según sea necesario

interface ColombiaDepartment {
  id: number;
  departamento: string;
  ciudades: string[];
}

const UpdateLocationModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { data: session } = useSession();
  const { ciudad, departamento, setUbicacion } = usePreferencesStore();
  const [selectedDepartamento, setSelectedDepartamento] = useState(departamento);
  const [selectedCity, setSelectedCity] = useState(ciudad);
  const [cities, setCities] = useState<string[]>([]);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false); // Estado para mensaje de agradecimiento

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

    // Si autenticado, guardar en DB
    if (session?.user) {
      const response = await updateUserPreferences({
        ciudad: selectedCity,
        departamento: selectedDepartamento,
        preferencias: [], // Pasar array vacío para cumplir con el tipo
      });
      if (!response.ok) {
        setAlert({ type: 'error', message: response.message });
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    setShowThankYou(true); // Mostrar mensaje de agradecimiento
    setTimeout(onClose, 3000); // Cierra modal tras 3 segundos
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
            className="relative w-full max-w-md bg-white rounded-3xl shadow-lg overflow-hidden p-6 md:p-8 max-h-[80vh] overflow-y-auto"
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

                  {/* Selector Ubicación */}
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

export const TopMenuMobile = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const filteredProducts: { id: number; slug: string; nombre: string }[] = []; // Placeholder
  const totalItemsInCart = useCartCatalogoStore((state) => state.getTotalItems());
  const totalFavorites = useFavoritesCatalogoStore((state) => state.getTotalItems());
  const { data: session } = useSession();
  const isNegocio = session?.user.role === "negocio";
  const { ciudad } = usePreferencesStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="sm:pb-16 shadow-lg"> {/* padding inferior para no tapar el contenido con el nav */}
      {/* Barra superior fija */}
      <header className="fixed top-0 w-full z-50 bg-white shadow-md border-b">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Logo a la izquierda */}
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

          {/* Barra de búsqueda en el centro con botón de ubicación al lado */}
          <div className="flex items-center flex-1 mx-4">
            <div className="relative flex-1">
              <div className="flex items-center bg-white rounded-full shadow-md border border-gray-600 px-3 py-1">
                <FaSearch className="text-gray-600" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent outline-none ml-2 text-sm text-gray-800 placeholder-gray-400"
                />
              </div>
              {filteredProducts.length > 0 && (
                <div className="absolute z-10 bg-white shadow-lg rounded-lg w-full mt-2 max-h-60 overflow-auto border border-gray-200">
                  {filteredProducts.map((product) => (
                    <Link key={`${product.id}-${product.slug}`} href={`/producto/${product.slug}`}>
                      <div className="p-3 hover:bg-gray-100 cursor-pointer">{product.nombre}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="ml-2 flex items-center bg-white rounded-full shadow-md border border-gray-300 px-3 py-1 text-gray-800 hover:bg-gray-100 transition-colors text-sm"
            >
              <FaMapMarkerAlt className="text-gray-500 mr-1" />
              <span className="font-medium">{ciudad || 'Ciudad'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Espaciado para evitar que el contenido quede oculto */}
      <div className="mt-16">
        <MenuSectionsBar />
      </div>

      {/* Barra inferior de navegación fija */}
      <nav className="bg-white fixed bottom-0 w-full z-50 border-t shadow-md">
        <div className="flex justify-around items-center py-0">
          <Link
            href="/"
            className="
  group relative flex flex-col items-center justify-center 
  w-14 h-14 
  transition-all duration-300
"
          >
            <Image
              src="/imgs/iconos/home.png"
              alt="Inicio"
              unoptimized
              width={28}
              height={28}
              className="
    w-7 h-7 md:w-8 md:h-8 text-gray-600 
    transform transition-all duration-300 
    group-hover:scale-110 group-hover:-translate-y-0.5 
    group-hover:rotate-3
  "
            />
            <span className="text-[13px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-blue-600">
              Inicio
            </span>
          </Link>

          {/* Carrito */}
          <Link
            href={mounted && totalItemsInCart > 0 ? "/carro" : "/empty"}
            className="
  group relative flex flex-col items-center justify-center 
  w-14 h-14 
  transition-all duration-300
"
          >
            <Image
              src="/imgs/iconos/cart.png"
              alt="Carro"
              unoptimized
              width={28}
              height={28}
              className="
    w-8 h-8 md:w-8 md:h-8 text-gray-600 
    transform transition-all duration-300 
    group-hover:scale-110 group-hover:-translate-y-0.5 
    group-hover:rotate-3
  "
            />

            {/* 👇 Evita mismatch usando mounted */}
            {mounted && totalItemsInCart > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white font-bold rounded-full text-[10px] min-w-[18px] h-[18px] flex items-center justify-center shadow-md">
                {totalItemsInCart}
              </span>
            )}

            <span className="text-[13px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-emerald-600">
              Carro
            </span>
          </Link>

          {/* Favoritos */}
          <Link
            href="/favoritos"
            className="
  group relative flex flex-col items-center justify-center 
  w-14 h-14 
  transition-all duration-300
"
          >
            <Image
              src="/imgs/iconos/heart.png"
              alt="Favoritos"


              unoptimized
              width={28}
              height={28}
              className="
    w-7 h-7 md:w-8 md:h-8 text-gray-600 
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
            <span className="text-[13px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-red-500">
              Favoritos
            </span>
          </Link>

          {/* Crear o Crear Negocio */}
          {isNegocio ? (
            <button
              onClick={() => setIsCrearModalOpen(true)}
              className="
                group relative flex flex-col items-center justify-center 
                w-12 h-12 md:w-14 md:h-14 
                transition-all duration-300
              "
            >
              <Image
                src="/imgs/iconos/plus.png"
                alt="Crear"
                unoptimized
                width={28}
                height={28}
                className="
  group relative flex flex-col items-center justify-center 
  w-14 h-14 
  transition-all duration-300
"
              />
              <span className="text-[13px] md:text-[11px] font-medium mt-1 text-gray-500 group-hover:text-purple-600">
                Crear
              </span>
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="
                group relative flex flex-col items-center justify-center 
                w-16 h-16 md:w-14 md:h-14 
                transition-all duration-300
              "
            >
              <Image
                src="/imgs/iconos/shop.png"
                alt="Crear Negocio"
                unoptimized
                width={28}
                height={28}
                className=" ml-2
    w-9 h-8 md:w-8 md:h-8 text-gray-600 
    transform transition-all duration-300 
    group-hover:scale-110 group-hover:-translate-y-0.5 
    group-hover:rotate-3
  "
              />
              <span className="whitespace-nowrap text-[12px] md:text-[11px] ml-4 font-medium mt-1 text-gray-500 group-hover:text-purple-600">
                Mi Negocio
              </span>
            </Link>
          )}

          {/* Perfil */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="
              group relative flex flex-col items-center justify-center 
              w-16 h-16 md:w-14 md:h-14 
              transition-all duration-300
            "
          >
            <Image
              src="/imgs/iconos/profile.png"
              alt="Perfil"
              unoptimized
              width={28}
              height={28}
              className="
    w-7 h-7 md:w-8 md:h-8 text-gray-600 
    transform transition-all duration-300 
    group-hover:scale-110 group-hover:-translate-y-0.5 
    group-hover:rotate-3
  "
            />
            <span className="text-[13px] md:text-[14px] font-medium mt-0 text-gray-500 group-hover:text-indigo-600">
              Perfil
            </span>
          </button>
        </div>
      </nav>

      {/* Drawer lateral */}
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