"use client";

import Link from "next/link";
import {
  House,
  ShoppingCart,
  Heart,
  Plus,
  Store,
  UserRound,
  CircleHelp,
} from "lucide-react";
import { BUSINESS_ENTRY_PATH } from "@/lib/business/businessEntry";
import styles from "./mobileExperience.module.css";

interface Props {
  pathname: string;
  cartCount: number;
  favoriteCount: number;
  context: "loading" | "anonymous" | "personal" | "owner";
  profileOpen: boolean;
  createOpen: boolean;
  onProfile: () => void;
  onCreate: () => void;
  onHelp: () => void;
}

const countLabel = (count: number) => (count > 99 ? "99+" : count);

export function MobileNavigation({
  pathname,
  cartCount,
  favoriteCount,
  context,
  profileOpen,
  createOpen,
  onProfile,
  onCreate,
  onHelp,
}: Props) {
  return (
    <nav
      className={styles.bottom}
      aria-label="Navegación principal"
      aria-busy={context === "loading"}
      data-mobile-bottom
    >
      <div className={styles.destinations}>
        <Link
          href="/"
          data-nav="home"
          className={styles.destination}
          aria-current={pathname === "/" ? "page" : undefined}
        >
          <House aria-hidden="true" />
          <span>Inicio</span>
        </Link>
        <Link
          data-nav="cart"
          href={cartCount > 0 ? "/carro" : "/empty"}
          className={styles.destination}
          aria-label={`Carro${cartCount ? `, ${cartCount} productos` : ""}`}
          aria-current={
            ["/carro", "/empty"].includes(pathname) ? "page" : undefined
          }
        >
          <ShoppingCart aria-hidden="true" />
          <span>Carro</span>
          {cartCount > 0 && (
            <span className={styles.badge} aria-hidden="true">
              {countLabel(cartCount)}
            </span>
          )}
        </Link>
        <Link
          href="/favoritos"
          data-nav="favorites"
          className={styles.destination}
          aria-label={`Favoritos${favoriteCount ? `, ${favoriteCount} guardados` : ""}`}
          aria-current={pathname.startsWith("/favoritos") ? "page" : undefined}
        >
          <Heart aria-hidden="true" />
          <span>Favoritos</span>
          {favoriteCount > 0 && (
            <span className={styles.badge} aria-hidden="true">
              {countLabel(favoriteCount)}
            </span>
          )}
        </Link>
        {context === "loading" ? (
          <button
            className={styles.destination}
            disabled
            data-nav="business"
            aria-label="Cargando opciones de cuenta"
          >
            <Store aria-hidden="true" />
            <span>Negocio</span>
          </button>
        ) : context === "personal" ? (
          <button
            className={styles.destination}
            data-nav="create"
            onClick={onCreate}
            aria-haspopup="dialog"
            aria-expanded={createOpen}
            aria-label="Crear"
          >
            <Plus aria-hidden="true" />
            <span>Crear</span>
          </button>
        ) : (
          <Link
            data-nav="business"
            href={context === "owner" ? "/dashboard" : BUSINESS_ENTRY_PATH}
            prefetch={false}
            className={styles.destination}
            aria-label={context === "owner" ? "Mi negocio" : "Tengo un negocio"}
          >
            <Store aria-hidden="true" />
            <span>Negocio</span>
          </Link>
        )}
        <button
          className={styles.destination}
          data-nav="profile"
          onClick={onProfile}
          aria-label="Perfil"
          aria-haspopup="dialog"
          aria-expanded={profileOpen}
          disabled={context === "loading"}
        >
          <UserRound aria-hidden="true" />
          <span>Perfil</span>
        </button>
        <button
          className={styles.destination}
          data-nav="help"
          onClick={onHelp}
          aria-label="Ayuda por WhatsApp"
        >
          <CircleHelp aria-hidden="true" />
          <span>Ayuda</span>
        </button>
      </div>
    </nav>
  );
}
