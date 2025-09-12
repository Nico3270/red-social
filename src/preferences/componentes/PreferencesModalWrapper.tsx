// src/components/layout/PreferencesModalWrapper.tsx
'use client';

import React, { useState, useEffect } from 'react';
import PreferencesSelectorModal from './PreferencesSelectorModal';
import { usePreferencesStore } from '@/store/preferences/preferences-store';

// Hook para saber si zustand ya cargó desde localStorage
const useHasHydrated = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
};

const PreferencesModalWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ciudad, departamento} = usePreferencesStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasHydrated = useHasHydrated();

  useEffect(() => {
    if (!hasHydrated) return; // ⬅️ espera a que cargue del localStorage
    // if (!ciudad || !departamento || preferencias.length === 0) { // Comentado: ya no requerimos preferencias
    if (!ciudad || !departamento) {
      setIsModalOpen(true);
    }
  }, [ciudad, departamento, /* preferencias, */ hasHydrated]); // Comentado: ya no requerimos preferencias

  // ⬅️ aquí va la opción B
  if (!hasHydrated) return <>{children}</>; 

  return (
    <>
      {children}
      <PreferencesSelectorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default PreferencesModalWrapper;