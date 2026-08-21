import localFont from "next/font/local";

export const inter = localFont({
  src: "../assets/fonts/inter-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export const titulosPrincipales = localFont({
  src: "../assets/fonts/domine-latin-variable.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
});

export const titleFont = localFont({
  src: [
    {
      path: "../assets/fonts/montserrat-alternates-latin-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/montserrat-alternates-latin-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
});

export const tituloCard = localFont({
  src: "../assets/fonts/patua-one-latin-400.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const textosFont = localFont({
  src: "../assets/fonts/dm-sans-latin-variable.woff2",
  weight: "400 500",
  style: "normal",
  display: "swap",
});
