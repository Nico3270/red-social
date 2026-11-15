"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleHelp, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import { inter, titleFont } from "@/config/fonts";
import styles from "./newProduct.module.css";
import {
  DEFAULT_NEW_PRODUCT_PALETTE,
  newProductPaletteStyle,
  type NewProductPalette,
} from "./newProductPalette";

export default function NewProductHeader({
  palette = DEFAULT_NEW_PRODUCT_PALETTE,
}: { palette?: NewProductPalette } = {}) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <header className={styles.header} style={newProductPaletteStyle(palette)}>
      <div className={styles.headerNav}>
        <Link href="/dashboard/productos" className={styles.back}>
          <ArrowLeft size={16} aria-hidden="true" /> Volver a productos
        </Link>
        <button
          type="button"
          className={styles.help}
          onClick={() => setHelpOpen(true)}
        >
          <CircleHelp size={17} aria-hidden="true" /> Ayuda
        </button>
      </div>
      <p className={styles.eyebrow}>TU CATÁLOGO</p>
      <h1 className={`${styles.title} ${titleFont.className}`}>
        Nuevo producto
      </h1>
      <p className={styles.subtitle}>
        Dale un lugar en tu catálogo. Empieza por sus fotografías y los detalles
        que lo hacen especial.
      </p>
      <Dialog
        open={helpOpen}
        transitionDuration={reducedMotion ? 0 : 180}
        onClose={() => setHelpOpen(false)}
        fullWidth
        maxWidth="md"
        aria-labelledby="new-product-help-title"
        PaperProps={{
          style: newProductPaletteStyle(palette),
          sx: {
            borderRadius: 3,
            m: 2,
            width: "calc(100% - 32px)",
            maxHeight: "calc(100dvh - 32px)",
            fontFamily: inter.style.fontFamily,
            "& .MuiTypography-root, & .MuiButton-root": {
              fontFamily: "inherit",
            },
          },
        }}
      >
        <DialogTitle id="new-product-help-title" sx={{ pr: 8 }}>
          Cómo crear un producto
        </DialogTitle>
        <IconButton
          aria-label="Cerrar ayuda"
          onClick={() => setHelpOpen(false)}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 44,
            height: 44,
            color: "var(--product-accent)",
          }}
        >
          <X size={20} />
        </IconButton>
        <DialogContent>
          {helpOpen && (
            <iframe
              className={styles.helpVideo}
              src="https://www.youtube.com/embed/c5CsO8t4aBQ?rel=0&playsinline=1"
              title="Video de ayuda para crear productos"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </DialogContent>
      </Dialog>
    </header>
  );
}
