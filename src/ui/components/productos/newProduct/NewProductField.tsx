"use client";

import { forwardRef, useId } from "react";
import { TextField, type TextFieldProps } from "@mui/material";
import styles from "./newProduct.module.css";

/** Etiquetas externas: permanecen completas incluso con zoom y pantallas pequeñas. */
const NewProductField = forwardRef<HTMLDivElement, TextFieldProps>(
  function NewProductField({ label, id, ...props }, ref) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    if (!label) return <TextField {...props} id={fieldId} ref={ref} />;
    return (
      <div className={styles.field}>
        <label className={styles.label} htmlFor={fieldId}>
          {label}
        </label>
        <TextField {...props} id={fieldId} ref={ref} />
      </div>
    );
  },
);

export default NewProductField;
