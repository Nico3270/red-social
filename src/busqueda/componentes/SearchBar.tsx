"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { FaSearch } from "react-icons/fa";
import { X } from "lucide-react";
import {
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { inter } from "@/config/fonts";
import { getCloudinaryImageUrl } from "@/lib/cloudinary/buildCloudinaryDeliveryUrl";
import styles from "./searchBar.module.css";

interface SearchResult {
  id: string;
  name: string;
  type: "negocio" | "usuario" | "producto" | "servicio" | "category";
  slug: string;
  thumbnail?: string;
  tab?: string;
}
interface SearchBarProps {
  compact?: boolean;
  iconOnly?: boolean;
}

export default function SearchBar({ compact = false, iconOnly = false }: SearchBarProps) {
  const router = useRouter();
  const needsLayer = useMediaQuery("(max-width:1199px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [focused, setFocused] = useState(false);
  const [layerOpen, setLayerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [layerViewport, setLayerViewport] = useState<{ height: number; top: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const showResults = focused && Boolean(searchTerm.trim());

  useEffect(() => {
    if (!iconOnly || !layerOpen || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const update = () => setLayerViewport({ height: viewport.height, top: viewport.offsetTop });
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [iconOnly, layerOpen]);

  useEffect(() => {
    const controller = new AbortController();
    setResults([]);
    setActiveIndex(-1);
    setError(false);
    setIsLoading(Boolean(searchTerm.trim()));
    if (!searchTerm.trim()) return () => controller.abort();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search?query=${encodeURIComponent(searchTerm)}&limit=10`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Search failed");
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error("Invalid search response");
        if (!controller.signal.aborted) setResults(data);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm]);

  useEffect(() => {
    const onOutside = (event: PointerEvent) => {
      if (!layerOpen && !rootRef.current?.contains(event.target as Node))
        setFocused(false);
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [layerOpen]);

  useEffect(() => {
    if (activeIndex >= 0)
      document
        .getElementById(`${id}-option-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, id]);

  const closeLayer = () => {
    setLayerOpen(false);
    setFocused(false);
    setLayerViewport(null);
  };
  const navigate = (result: SearchResult) => {
    let url = "";
    if (result.type === "negocio" || result.type === "usuario")
      url = `/perfil/${result.slug}`;
    else if (result.type === "producto") url = `/producto/${result.slug}`;
    else if (result.type === "servicio")
      url = `/perfil/${result.slug}?tab=${result.tab || "Negocio"}`;
    else if (result.type === "category") url = `/category/${result.slug}`;
    inputRef.current?.blur();
    router.push(url);
    setSearchTerm("");
    setResults([]);
    closeLayer();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setFocused(false);
      if (layerOpen) closeLayer();
    }
    if (
      (event.key === "ArrowDown" || event.key === "ArrowUp") &&
      results.length
    ) {
      event.preventDefault();
      setFocused(true);
      setActiveIndex((index) =>
        event.key === "ArrowDown"
          ? (index + 1) % results.length
          : index <= 0
            ? results.length - 1
            : index - 1,
      );
    }
    if (
      event.key === "Enter" &&
      showResults &&
      activeIndex >= 0 &&
      results[activeIndex]
    ) {
      event.preventDefault();
      navigate(results[activeIndex]);
    }
  };

  const field = (
    <div
      className={`${styles.root} ${compact && !layerOpen ? styles.compact : ""} ${iconOnly && layerOpen ? styles.mobileLayer : ""}`}
    >
      <div className={iconOnly && layerOpen ? styles.mobileFieldRow : styles.fieldSlot}>
      <div className={styles.field}>
        <FaSearch aria-hidden="true" />
        <input
          ref={inputRef}
          autoFocus={layerOpen}
          type="search"
          enterKeyHint={iconOnly ? "search" : undefined}
          role="combobox"
          aria-label="Buscar productos, negocios o categorías"
          aria-autocomplete="list"
          aria-expanded={showResults && results.length > 0}
          aria-controls={
            showResults && results.length ? `${id}-results` : undefined
          }
          aria-activedescendant={
            showResults && activeIndex >= 0
              ? `${id}-option-${activeIndex}`
              : undefined
          }
          placeholder="Buscar productos, negocios o categorías"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setFocused(true);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            if (!layerOpen) setFocused(false);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      </div>
      {iconOnly && layerOpen && !searchTerm.trim() && (
        <p className={styles.feedback}>Escribe para buscar en Myckeo.</p>
      )}
      {showResults && (
        <div
          className={`${styles.results} ${layerOpen ? styles.inDialog : ""}`}
        >
          {isLoading ? (
            <p className={styles.feedback} role="status">
              <CircularProgress size={18} sx={{ color: "#C93545" }} /> Buscando…
            </p>
          ) : error ? (
            <p className={styles.feedback} role="status">
              No pudimos buscar. Intenta nuevamente.
            </p>
          ) : results.length ? (
            <ul
              id={`${id}-results`}
              role="listbox"
              aria-label="Resultados de búsqueda"
            >
              {results.map((result, index) => (
                <li
                  key={`${result.type}-${result.id}`}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={styles.option}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => navigate(result)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") navigate(result);
                  }}
                >
                  {result.thumbnail && (
                    <Image
                      src={getCloudinaryImageUrl(result.thumbnail, "thumbnail")}
                      alt=""
                      width={40}
                      height={40}
                    />
                  )}
                  <span>
                    <strong>{result.name}</strong>
                    <small>
                      {result.type.charAt(0).toUpperCase() +
                        result.type.slice(1)}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.feedback} role="status">
              No encontramos resultados.
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className={`${styles.root} ${iconOnly ? styles.iconRoot : ""}`}>
      {iconOnly || needsLayer || layerOpen ? (
        <button
          type="button"
          className={`${styles.trigger} ${iconOnly ? styles.iconTrigger : ""}`}
          aria-label="Abrir búsqueda"
          aria-haspopup="dialog"
          aria-expanded={layerOpen}
          aria-controls={layerOpen ? `${id}-dialog` : undefined}
          onClick={() => {
            setLayerOpen(true);
            setFocused(true);
          }}
        >
          <FaSearch aria-hidden="true" />
          <span>Buscar productos, negocios o categorías</span>
        </button>
      ) : (
        field
      )}
      <Dialog
        open={layerOpen}
        onClose={closeLayer}
        fullWidth
        fullScreen={iconOnly}
        maxWidth="sm"
        transitionDuration={reducedMotion ? 0 : 180}
        slotProps={{
          transition: {
            onEntered: () => {
              // The dialog's focus trap mounts after the input. Focus once it
              // is active, without moving the feed behind the mobile layer.
              if (iconOnly) inputRef.current?.focus({ preventScroll: true });
            },
            onExited: () => {
              // If resizing removed the launcher, restore focus to the inline field.
              if (!needsLayer && !iconOnly) {
                inputRef.current?.focus();
                setFocused(false);
              }
            },
          },
        }}
        aria-labelledby={`${id}-title`}
        sx={{
          zIndex: 10010,
          ...(iconOnly ? { top: layerViewport?.top ?? 0, height: layerViewport?.height ?? "100dvh", bottom: "auto" } : {}),
        }}
        PaperProps={{
          id: `${id}-dialog`,
          sx: {
            m: 1.5,
            width: "calc(100% - 24px)",
            maxHeight: "calc(100dvh - 24px)",
            borderRadius: 3,
            overflow: "visible",
            fontFamily: inter.style.fontFamily,
            ...(iconOnly ? { m: 0, width: "100%", maxWidth: "100%", height: "100%", maxHeight: "100%", borderRadius: 0, overflow: "hidden" } : {}),
          },
        }}
      >
        <DialogTitle
          id={`${id}-title`}
          sx={{ pr: 8, fontFamily: "inherit", fontSize: 20, ...(iconOnly ? { fontSize: 18, fontWeight: 600, pt: "calc(12px + env(safe-area-inset-top, 0px))", borderBottom: "1px solid #f3e4e8" } : {}) }}
        >
          Buscar en Myckeo
        </DialogTitle>
        <IconButton
          aria-label="Cerrar búsqueda"
          onClick={closeLayer}
          sx={{ position: "absolute", right: 8, top: iconOnly ? "calc(8px + env(safe-area-inset-top, 0px))" : 8, width: 44, height: 44 }}
        >
          <X size={20} />
        </IconButton>
        <DialogContent sx={{ p: 2, pt: 1, minHeight: 0, overflowY: "auto", ...(iconOnly ? { pt: 0, pb: "calc(16px + env(safe-area-inset-bottom, 0px))", overscrollBehavior: "contain" } : {}) }}>
          {field}
        </DialogContent>
      </Dialog>
    </div>
  );
}
