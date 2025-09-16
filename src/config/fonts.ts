// fonts.ts

import {
  Inter,
  Montserrat_Alternates,
  Merriweather,
  Domine,
  Slabo_27px,
  Patua_One,
} from "next/font/google";

// Fuentes base
export const inter = Inter({ subsets: ["latin"] });
export const merriWeather = Merriweather({ subsets: ["latin"], weight: ["300"] });
export const titulosPrincipales = Domine({ subsets: ["latin"] });
export const titleFont = Montserrat_Alternates({ subsets: ["latin"], weight: ["500", "700"] });
export const tituloCard = Patua_One({ subsets: ["latin"], weight: ["400"] });
export const descripcionCard = Slabo_27px({ subsets: ["latin"], weight: ["400"] });



