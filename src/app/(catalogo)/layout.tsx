import { auth } from "@/auth.config";
import { redirect } from "next/navigation";
import { Inter } from "next/font/google"; // Ejemplo; ajusta a tu font si usas
import { TopMenu, TopMenuMobile } from "@/ui";

const inter = Inter({ subsets: ["latin"] }); // Opcional; quita si no usas

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Chequeo post-login: Redirigir si perfil incompleto (server-side, seamless)
  if (session?.user && !session.user.perfilCompleto) {
    redirect('/completePerfil');
  }

  return (
    <html lang="es">
      <body className={inter.className}>
        <main className="bg-white min-h-screen flex flex-col relative">
          {/* Responsive elegante con CSS media queries (mobile-first) */}
          <div className="block md:hidden"> {/* Visible solo en mobile (<=768px) */}
            <TopMenuMobile />
          </div>
          <div className="hidden md:block"> {/* Visible solo en desktop (>768px) */}
            <TopMenu />
          </div>
          <div className="flex-grow mt-0">{children}</div>
        </main>
      </body>
    </html>
  );
}