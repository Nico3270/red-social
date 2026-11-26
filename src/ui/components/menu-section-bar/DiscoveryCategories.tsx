"use client";

import { createContext, useContext, useMemo, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { MenuSectionsBar } from "./MenuSectionBar";
import styles from "../topMenu/publicNavigation.module.css";

const CategoriesContext = createContext<{
  slot: HTMLElement | null;
  setSlot: Dispatch<SetStateAction<HTMLElement | null>>;
}>({ slot: null, setSlot: () => {} });

/** Presentation only: one category navigation, mounted in its current destination. */
export function DiscoveryCategoriesProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ slot, setSlot }), [slot]);
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useDiscoveryCategorySlot() {
  return useContext(CategoriesContext).setSlot;
}

export function DiscoveryCategories({ compact }: { compact: boolean }) {
  const { slot } = useContext(CategoriesContext);
  return slot
    ? createPortal(<MenuSectionsBar compact={compact} presentation="rail" />, slot)
    : <div className={styles.prototypeCategories}><MenuSectionsBar compact={compact} /></div>;
}
