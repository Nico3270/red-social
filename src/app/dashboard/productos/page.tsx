import { redirect } from "next/navigation";
import { Box } from "@mui/material";
import { getProductsByUser } from "@/actions/productos/getProductsFromUser";
import ShowProductsByUser from "@/ui/components/productos/ShowProductsByUser";
import { ProductStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";



export default async function ProductosDashboard() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/auth/login");
  }

  const negocio = await prisma.negocio.findUnique({
    where: { usuarioId: session.user.id },
    select: { id: true },
  });

  if (!negocio) {
    return (
      <Box p={4} textAlign="center">
        No se encontró un negocio asociado a este usuario.
      </Box>
    );
  }

  const result = await getProductsByUser(session.user.id);

  if (!result.ok || !result.products) {
    return (
      <Box p={4} textAlign="center">
        {result.message || "Error al cargar los productos."}
      </Box>
    );
  }

  return (
    <Box p={4}>
      <ShowProductsByUser products={result.products} />
    </Box>
  );
}
