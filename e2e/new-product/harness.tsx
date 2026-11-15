import React from "react";
import { createRoot } from "react-dom/client";
import LayoutDashboardComponent from "@/ui/components/dashboard/perfil/LayoutDashboardComponent";
import Form from "@/ui/components/productos/CreateNewProduct";
import Header from "@/ui/components/productos/newProduct/NewProductHeader";
import styles from "@/ui/components/productos/newProduct/newProduct.module.css";
import { inter } from "@/config/fonts";

window.productTest = Object.assign(
  { submissions: [], navigations: [], aiCalls: 0 },
  window.productTest,
);
const params = new URLSearchParams(location.search);
const baseline = params.has("before");
const palette = params.get("palette") === "ocean" ? "ocean" : "ruby";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LayoutDashboardComponent>
      <div className="fixture-label">
        VISTA SIMULADA · Sin sesión ni datos productivos
      </div>
      {baseline ? (
        <div className="w-full sm:p-6 bg-white flex flex-col items-center justify-center gap-4">
          <h1 className="fixture-title text-3xl sm:text-4xl text-gray-800 shadow-lg rounded-xl p-2 text-center">
            Crear Nuevo Producto
          </h1>
          <button
            type="button"
            className="px-6 py-3 text-lg rounded-lg bg-red-600 text-white"
          >
            Mira este video de ayuda y crea tus productos
          </button>
          <Form />
        </div>
      ) : (
        <div className={`${styles.shell} ${inter.className}`}>
          <Header palette={palette} />
          <Form palette={palette} />
        </div>
      )}
    </LayoutDashboardComponent>
  </React.StrictMode>,
);
