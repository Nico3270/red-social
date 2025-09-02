// src/components/preferences/PreferencesSelectorModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Alert, Box, FormControl, FormLabel, Stack, Typography, Select, MenuItem, InputLabel, FormHelperText, Button, CircularProgress } from '@mui/material';
import Divider from '@/ui/components/divider/Divider'; // Asume tu Divider
import colombia from '@/config/colombia.json'; // Tu JSON de Colombia
import { initialData } from '@/seed/seed'; // Tus categorías/secciones
import { usePreferencesStore } from '@/store/preferences/preferences-store';
import { updateUserPreferences } from '../actions/updateUserPreferences';

interface PreferencesSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ColombiaDepartment {
  id: number;
  departamento: string;
  ciudades: string[];
}

const PreferencesSelectorModal: React.FC<PreferencesSelectorModalProps> = ({ isOpen, onClose }) => {
  const { data: session } = useSession();
  const { ciudad, departamento, preferencias, secciones, setUbicacion, setPreferencias, setSecciones } = usePreferencesStore();
  const [selectedDepartamento, setSelectedDepartamento] = useState(departamento);
  const [selectedCity, setSelectedCity] = useState(ciudad);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<Set<string>>(new Set(preferencias));
  const [selectedSectionSlugs, setSelectedSectionSlugs] = useState<Set<string>>(new Set(secciones)); // Cambiado a slugs
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true); // Estado para pantalla de bienvenida
  const [showThankYou, setShowThankYou] = useState(false); // Estado para mensaje de agradecimiento

  const filteredSections = initialData.secciones.filter((section) => selectedCategorySlugs.has(section.categorySlug));

  useEffect(() => {
    if (selectedDepartamento) {
      const deptData = (colombia as ColombiaDepartment[]).find((dept) => dept.departamento === selectedDepartamento);
      setCities(deptData ? deptData.ciudades : []);
    } else {
      setCities([]);
    }
  }, [selectedDepartamento]);

  useEffect(() => {
    // Cargar de DB si autenticado y store vacío
    if (session?.user && !ciudad && !departamento && preferencias.length === 0) {
      // Asume fetch de DB aquí si necesitas, pero por simplicidad usamos store
    }
  }, [session]);

  const handleSave = async () => {
    if (!selectedCity || !selectedDepartamento || selectedCategorySlugs.size === 0) {
      setAlert({ type: 'error', message: 'Completa todos los campos requeridos.' });
      return;
    }

    setIsSaving(true);
    setAlert(null);

    // Actualizar store con slugs de secciones
    setUbicacion(selectedCity, selectedDepartamento);
    setPreferencias(Array.from(selectedCategorySlugs));
    setSecciones(Array.from(selectedSectionSlugs));

    // Si autenticado, guardar en DB
    if (session?.user) {
      const response = await updateUserPreferences({
        ciudad: selectedCity,
        departamento: selectedDepartamento,
        preferencias: Array.from(selectedCategorySlugs),
      });
      if (!response.ok) {
        setAlert({ type: 'error', message: response.message });
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    setShowThankYou(true); // Mostrar mensaje de agradecimiento
    setTimeout(onClose, 3000); // Cierra modal tras 3 segundos para ver el mensaje
  };

  const toggleSection = (slug: string) => {
    setSelectedSectionSlugs((prev) => {
      const newSet = new Set(prev);
      newSet.has(slug) ? newSet.delete(slug) : newSet.add(slug);
      return newSet;
    });
  };

  const handleCategoryChange = (slug: string) => {
    setSelectedCategorySlugs((prev) => {
      const newSet = new Set(prev);
      newSet.has(slug) ? newSet.delete(slug) : newSet.add(slug);
      // Limpiar secciones si categoría se deselecciona
      if (!newSet.has(slug)) {
        filteredSections
          .filter((s) => s.categorySlug === slug)
          .forEach((s) => selectedSectionSlugs.delete(s.slug)); // Usar slug
      }
      return newSet;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" // Backdrop más suave
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400, duration: 0.3 }} // Transición premium
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 max-h-[80vh] overflow-y-auto" // Scroll vertical general
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <AnimatePresence mode="wait">
              {showWelcome ? (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center space-y-4"
                >
                  <Typography variant="h5" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                    ¡Hola!
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    Queremos conocerte mejor para ofrecerte el contenido más relevante y personalizado. Por favor, comparte tus preferencias de ubicación y categorías de interés. ¡Es rápido y nos ayudará a mejorar tu experiencia!
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => setShowWelcome(false)}
                    sx={{ mt: 4, borderRadius: '12px', py: 1.5, bgcolor: 'primary.main', textTransform: 'none', fontWeight: 'medium' }}
                  >
                    Continuar
                  </Button>
                </motion.div>
              ) : showThankYou ? (
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
                    Gracias por compartir tus preferencias. Estamos personalizando tu experiencia para que descubras lo mejor adaptado a ti. ¡Disfruta explorando la plataforma!
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
                    Configura tus Preferencias
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

                  <Divider />

                  {/* Selector Categorías - Vertical con wrap y grid de máximo 2 columnas */}
                  <FormLabel sx={{ mb: 1.5, fontWeight: 'medium', color: 'text.primary' }}>Categorías de Interés</FormLabel>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(2, 1fr)' }, // Máximo 2 columnas
                      gap: 2, // Espaciado mayor para elegancia
                      overflowX: 'hidden', // Explícitamente quita cualquier horizontal
                      pb: 2,
                    }}
                  >
                    {initialData.categorias.map((cat) => {
                      const isSelected = selectedCategorySlugs.has(cat.slug);
                      return (
                        <Box
                          key={cat.id}
                          onClick={() => handleCategoryChange(cat.slug)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            px: 3,
                            py: 2,
                            borderRadius: '16px',
                            bgcolor: isSelected ? 'primary.main' : 'grey.50',
                            color: isSelected ? 'white' : 'text.primary',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                            '&:hover': { bgcolor: isSelected ? 'primary.dark' : 'grey.100', transform: 'translateY(-2px)' },
                          }}
                        >
                          <Image src={`/imgs/iconos/${cat.iconName}`} alt={cat.nombre} width={24} height={24} className='mr-2' />
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {cat.nombre}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>

                  {/* Selector Secciones - Similar, máximo 2 columnas */}
                  {selectedCategorySlugs.size > 0 && (
                    <>
                      <FormLabel sx={{ mb: 1.5, fontWeight: 'medium', color: 'text.primary' }}>Secciones Asociadas</FormLabel>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(2, 1fr)' },
                          gap: 2,
                          overflowX: 'hidden',
                          pb: 2,
                        }}
                      >
                        {filteredSections.map((sec) => {
                          const isSelected = selectedSectionSlugs.has(sec.slug); // Usar slug para chequeo
                          return (
                            <Box
                              key={sec.id}
                              onClick={() => toggleSection(sec.slug)} // Pasar slug
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                px: 3,
                                py: 2,
                                borderRadius: '16px',
                                bgcolor: isSelected ? 'primary.main' : 'grey.50',
                                color: isSelected ? 'white' : 'text.primary',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out',
                                boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                '&:hover': { bgcolor: isSelected ? 'primary.dark' : 'grey.100', transform: 'translateY(-2px)' },
                              }}
                            >
                              <Image src={`/imgs/iconos/${sec.iconName}`} alt={sec.nombre} width={24} height={24} className='mr-2' />
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {sec.nombre}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </>
                  )}

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleSave}
                    disabled={isSaving} // Desactivado durante guardado para evitar clics múltiples
                    sx={{ mt: 4, borderRadius: '12px', py: 1.5, bgcolor: 'primary.main', textTransform: 'none', fontWeight: 'medium' }}
                  >
                    {isSaving ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                        Guardando...
                      </Box>
                    ) : (
                      'Guardar Preferencias'
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

export default PreferencesSelectorModal;