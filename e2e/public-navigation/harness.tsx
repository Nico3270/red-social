import React from "react";
import { createRoot } from "react-dom/client";
import CatalogoLayout from "../../src/app/(catalogo)/layout";
import { usePreferencesStore } from "@/store/preferences/preferences-store";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { useFavoritesCatalogoStore } from "@/store/favoritos/favoritos-store";

usePreferencesStore.setState({
  ciudad: "San Andrés de Tumaco",
  departamento: "Nariño",
  userLat: 1.8,
  userLong: -78.8,
});
useCartCatalogoStore.setState({
  getTotalItems: () => window.navigationTest.cartCount,
});
useFavoritesCatalogoStore.setState({ getTotalItems: () => 2 });
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CatalogoLayout>
      <section className="fixture-page">
        <p>VISTA SIMULADA · Sin sesión ni datos productivos</p>
        <h1>Descubre Myckeo</h1>
        <p>Negocios, productos y servicios de tu ciudad.</p>
        <div className="fixture-cards">
          <article>Café de origen</article>
          <article>Negocios cercanos</article>
          <article>Servicios para ti</article>
        </div>
      </section>
    </CatalogoLayout>
  </React.StrictMode>,
);
