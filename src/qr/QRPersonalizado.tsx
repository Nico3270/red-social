// /qr/QRPersonalizado.tsx
"use client";

import { QRCodeCanvas } from "qrcode.react";
import Image from "next/image";
import { textosFont, titleFont } from "@/config/fonts";

interface QRPersonalizadoProps {
  url: string;
  nombreNegocio: string;
  imagenPerfil: string;
}

export const QRPersonalizado: React.FC<QRPersonalizadoProps> = ({
  url,
  nombreNegocio,
  imagenPerfil,
}) => {
  return (
    <div
      className="
        max-w-sm w-full h-auto
        bg-white
        rounded-2xl border border-gray-300 shadow-md
        p-4 flex flex-col items-center
      "
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header: logo más pequeño + nombre */}
      <div className="flex items-center gap-3 mb-2 w-full">
        <div className="relative w-12 h-12 rounded-full overflow-hidden border border-blue-600 shadow-md ring-1 ring-gray-300/40">
  <Image
    src={imagenPerfil}
    alt={`Perfil de ${nombreNegocio}`}
    fill
    className="object-cover"
  />
</div>
        <h2 className={`text-base sm:text-lg font-semibold text-gray-900 tracking-tight ${titleFont.className}`}>
          {nombreNegocio}
        </h2>
      </div>

      {/* QR con borde de color y sombra */}
      <div className="relative p-2 bg-white rounded-xl shadow-inner border-2 border-blue-500 w-60 h-60 flex items-center justify-center mb-0">
        <QRCodeCanvas
          value={url}
          size={210}
          bgColor="transparent"
          fgColor="#1f2937"
          level="H"
          includeMargin={false}
          className="rounded-lg"
        />
      </div>

      {/* Footer: texto + logo visible */}
      <div className="flex items-center gap-2 mt-0">
        <p className={`text-md text-gray-700 font-bold ${textosFont.className}`}>
          Visita mi negocio en
        </p>
        <div className={`relative w-20 h-20 `}>
          <Image
            src="/imgs/Logo Final.png"
            alt="Logo Myckeo"
            fill
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
};
