"use client";

import { useState } from "react";
import Link from "next/link";
import Pagination from "@mui/material/Pagination";
import { Menu, Transition } from "@headlessui/react";
import { FaBoxOpen, FaCheck, FaDollarSign, FaTimes, FaTools, FaFilter } from "react-icons/fa";
import { OrderState } from "@prisma/client";
import { changeStatusOrder } from "@/orders/actions/changeStatusOrder";

interface OrderItem {
  id: string;
  cantidad: number;
  comentario?: string | null;
  producto?: {
    id: string;
    nombre: string;
    descripcion: string;
    descripcionCorta?: string | null;
    precio: number;
    slug: string;
    prioridad?: number | null;
    status: string;
    tags: string[];
  } | null; // Permitir que producto sea null
}

interface Order {
  id: string;
  estado: OrderState;
  createdAt: string;
  datosDeEntrega?: {
    deliveryAddress: string;
  } | null;
  items: OrderItem[];
}

interface ShowOrdersProps {
  orders: Order[];
  totalOrders: number;
  ordersPerPage: number;
}

const statusOptions: OrderState[] = [
  OrderState.RECIBIDA,
  OrderState.ENTREGADA,
  OrderState.PAGADA,
  OrderState.CANCELADA,
  OrderState.PREPARACION,
];

const statusColors: Record<OrderState, string> = {
  [OrderState.RECIBIDA]: "bg-blue-500 text-white",
  [OrderState.ENTREGADA]: "bg-green-500 text-white",
  [OrderState.PAGADA]: "bg-yellow-500 text-white",
  [OrderState.CANCELADA]: "bg-red-500 text-white",
  [OrderState.PREPARACION]: "bg-orange-500 text-white",
};

const statusIcons: Record<OrderState, JSX.Element> = {
  [OrderState.RECIBIDA]: <FaBoxOpen />,
  [OrderState.ENTREGADA]: <FaCheck />,
  [OrderState.PAGADA]: <FaDollarSign />,
  [OrderState.CANCELADA]: <FaTimes />,
  [OrderState.PREPARACION]: <FaTools />,
};

export const ShowOrders = ({ orders, totalOrders, ordersPerPage }: ShowOrdersProps) => {
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [filter, setFilter] = useState<OrderState | null>(null);
  const [page, setPage] = useState(1);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [newState, setNewState] = useState<OrderState | "">("");
  const [comment, setComment] = useState<string>("");

  const filteredOrders = filter
    ? localOrders.filter((order) => order.estado === filter)
    : localOrders;

  const paginatedOrders = filteredOrders.slice(
    (page - 1) * ordersPerPage,
    page * ordersPerPage
  );

  const handleChangeStatus = async (orderId: string) => {
    if (!newState) {
      alert("Selecciona un estado válido.");
      return;
    }

    try {
      const result = await changeStatusOrder({ orderId, newState, comment });

      if (result.success) {
        alert("Estado actualizado correctamente.");
        setLocalOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId ? { ...order, estado: newState as OrderState } : order
          )
        );
      } else {
        alert("Error al cambiar el estado: " + result.error);
      }
    } catch (error) {
      console.error("Error al cambiar el estado:", error);
      alert("Ocurrió un error inesperado.");
    } finally {
      setEditingOrderId(null);
      setComment("");
    }
  };

  return (
    <div className="container mx-auto p-4 bg-white rounded-md shadow-md">

      {/* Encabezado con total de órdenes */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Órdenes de Compra</h1>
        <p className="text-gray-600">
          Mostrando {filteredOrders.length} de {totalOrders} órdenes
        </p>
      </div>
      {/* Filtros */}
      <div className="mb-6">
        <div className="hidden md:flex flex-wrap justify-around gap-4">
          {["Todos", ...statusOptions].map((state) => (
            <button
              key={state}
              onClick={() =>
                setFilter(state === "Todos" ? null : (state as OrderState))
              }
              className={`flex items-center px-4 py-2 rounded-lg shadow-md font-medium gap-2 ${filter === state ? "bg-gray-800 text-white" : "bg-[#bf4342] text-white hover:bg-[#8c1c13]"
                }`}
            >
              {state !== "Todos" && statusIcons[state as OrderState]}
              {state === "Todos"
                ? "Todos"
                : (state as OrderState).charAt(0).toUpperCase() +
                (state as OrderState).slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Pantallas pequeñas: menú desplegable */}
        <div className="md:hidden flex justify-center">
          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="inline-flex w-full justify-center rounded-md bg-[#bf4342] px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-[#8c1c13]">
              <FaFilter className="mr-2" />
              Filtros
            </Menu.Button>
            <Transition
              as="div"
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute left-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                {["Todos", ...statusOptions].map((state) => (
                  <Menu.Item key={state}>
                    {({ active }) => (
                      <button
                        onClick={() =>
                          setFilter(state === "Todos" ? null : (state as OrderState))
                        }
                        className={`${active ? "bg-gray-100" : ""
                          } group flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                      >
                        {state !== "Todos" && (
                          <span className="mr-2">
                            {statusIcons[state as OrderState]}
                          </span>
                        )}
                        {state === "Todos"
                          ? "Todos"
                          : (state as OrderState).charAt(0).toUpperCase() +
                          (state as OrderState).slice(1).toLowerCase()}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>

      {/* Tabla de órdenes */}
      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-[#e5989b] text-[#edf2f4]">
              <th className="border p-2">ID</th>
              <th className="border p-2">Número de Productos</th>
              <th className="border p-2">Resumen de la Orden</th>
              <th className="border p-2">Dirección de Entrega</th>
              <th className="border p-2">Fecha</th>
              <th className="border p-2">Estado</th>
              <th className="border p-2">Orden</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-100">
                <td className="border p-2">
                  <Link href={`/dashboard/order/${order.id}`} className="text-blue-600 hover:underline">
                    {order.id.slice(-8)}
                  </Link>
                </td>
                <td className="border p-2 text-center">{order.items.length}</td>
                <td className="border p-2">
                  <ul>
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.cantidad} x {item.producto?.nombre ?? "Producto eliminado"}

                        {item.comentario && ` (${item.comentario})`}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="border p-2">{order.datosDeEntrega?.deliveryAddress || "N/A"}</td>
                <td className="border p-2">{new Date(order.createdAt).toLocaleString("es-CO")}</td>
                <td className="border p-2 text-center">
                  {editingOrderId === order.id ? (
                    <div className="flex flex-col items-center">
                      <select
                        value={newState}
                        onChange={(e) => setNewState(e.target.value as OrderState)}
                        className="mb-2 px-2 py-1 border rounded-md"
                      >
                        <option value="">Seleccionar estado</option>
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Comentario opcional"
                        className="mb-2 p-2 border rounded-md w-full"
                      />
                      <button
                        onClick={() => handleChangeStatus(order.id)}
                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                      >
                        Cambiar Estado
                      </button>
                      <button
                        onClick={() => setEditingOrderId(null)}
                        className="mt-2 text-red-500 hover:underline"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingOrderId(order.id)}
                      className={`px-2 py-1 rounded-md ${statusColors[order.estado]}`}
                    >
                      {order.estado.charAt(0).toUpperCase() + order.estado.slice(1).toLowerCase()}
                    </button>
                  )}
                </td>
                <td className="border p-2 text-center">
                  <Link href={`/dashboard/order/${order.id}`} className="text-blue-600 hover:underline">
                    Ver Orden
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-4 flex justify-center">
        <Pagination
          count={Math.ceil(filteredOrders.length / ordersPerPage)}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="secondary"
        />
      </div>
    </div>
  );
};
