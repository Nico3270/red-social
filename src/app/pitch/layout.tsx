// app/pitch/layout.tsx
'use client';

import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function PitchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-white antialiased`}>
        {/* SIN NAVBAR — se moverá a page.tsx */}
        <main>{children}</main>
      </body>
    </html>
  );
}