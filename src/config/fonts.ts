// fonts.ts

import {
  Inter,
  Montserrat_Alternates,
  Nunito,
  Protest_Guerrilla,
  Playfair_Display,
  Merriweather,
  Oldenburg,
  Roboto,
  Lato,
  Work_Sans,
  Domine,
  Slabo_27px,
  Patua_One,
  DM_Sans,
} from "next/font/google";

// Fuentes base
export const inter = Inter({ subsets: ["latin"] });
export const interFont = Inter({ subsets: ["latin"], weight: ["400"] }); // Duplicado si necesitas variante específica

export const topMeuItems = Nunito({ subsets: ["latin"] });
export const tituloLogo = Protest_Guerrilla({ subsets: ["latin"], weight: ["400"] });
export const titulosElegantes = Playfair_Display({ subsets: ["latin"] });
export const merriWeather = Merriweather({ subsets: ["latin"], weight: ["300"] });

// Fuentes específicas
export const RobotoFont = Roboto({ subsets: ["latin"], weight: ["400"] });
export const LatoFont = Lato({ subsets: ["latin"], weight: ["400"] });
export const TextosFont = Work_Sans({ subsets: ["latin"], weight: ["400"] });
export const titulosCarrusel = Work_Sans({ subsets: ["latin"], weight: ["400"] });

// Fuentes personalizadas por secciones
export const textmenuSections = Patua_One({ subsets: ["latin"], weight: ["400"] });
export const SeccionesFont = Domine({ subsets: ["latin"] });
export const LogoFont = Domine({ subsets: ["latin"] });
export const titulosPrincipales = Domine({ subsets: ["latin"] });

export const titleFont = Montserrat_Alternates({ subsets: ["latin"], weight: ["500", "700"] });
export const tituloCard = Patua_One({ subsets: ["latin"], weight: ["400"] });
export const descripcionCard = Slabo_27px({ subsets: ["latin"], weight: ["400"] });

export const OldenburgFont = Oldenburg({ subsets: ["latin"], weight: ["400"] });

export const titulo1 = Patua_One({ subsets: ["latin"], weight: ["400"] });
export const titulo2 = Patua_One({ subsets: ["latin"], weight: ["400"] });

export const sansFont = DM_Sans({ subsets: ["latin"], weight: ["400"] });

