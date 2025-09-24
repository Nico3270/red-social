import { getOrdersByNegocio } from "@/orders/actions/getOrders";
import ListOrders from "@/orders/componentes/ListOrders";
import { Add } from "@mui/icons-material";
import { Button } from "@mui/material";
import Link from "next/link";

export default async function OrdenesNegocioPage() {
    const ordenes = await getOrdersByNegocio()
    if(!ordenes.ok){
        return (
            <div className="sm:mt-40">
                Se presento un error al obtener las ordenes para este negocio
            </div>
        )
    }
    const listaOrdenes = ordenes.ordenes
    if (!listaOrdenes ){
        return(<div>
            <h1>Lista de ordenes vacías</h1>
        </div>)
    }

  return (
    <div className="w-full mx-auto">
      {/* Botón Crear nuevo pedido */}
      <div className="flex justify-center mb-6">
        <Button
          component={Link}
          href="/dashboard/orders/crear"
          startIcon={<Add />}
          sx={{
            px: 3,
            py: 1.4,
            borderRadius: 3,
            fontWeight: 600,
            fontSize: "0.95rem",
            textTransform: "none",
            bgcolor: "black",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            transition: "all 0.3s ease",
            "&:hover": {
              bgcolor: "#1a1a1a",
              boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
            },
          }}
        >
          Crear nuevo pedido
        </Button>
      </div>

      {/* Lista de órdenes */}
      <ListOrders initialOrders={listaOrdenes} total={ordenes.total ?? 0} />
    </div>
  );
}