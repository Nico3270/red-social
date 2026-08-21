// app/pitch/layout.tsx
"use client";

import { inter } from "@/config/fonts";

export default function PitchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-white antialiased`}>
      {/* SIN NAVBAR — se moverá a page.tsx */}
      <main>{children}</main>
    </div>
  );
}
