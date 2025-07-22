import { titulo1 } from "@/config/fonts";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export const TituloPrincipal = ({ children }: Props) => {
  return (
    <h1 className={`${titulo1.className} text-3xl sm:text-4xl text-gray-800 shadow-lg border-gray-800 rounded-xl p-2 antialiased text-center mb-2`}>
      {children}
    </h1>
  );
};