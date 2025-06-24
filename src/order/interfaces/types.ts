import { OrderState } from "@prisma/client";

export interface Product {
  id: string;
  createdAt: string;
  updatedAt: string;
  precio: number;
  nombre: string;
  descripcion: string;
  descripcionCorta?: string | null;
  slug: string;
  prioridad?: number | null;
  status: string;
  tags: string[];
}

export interface OrderItem {
  id: string;
  cantidad: number;
  comentario?: string | null;
  producto: Product | null; // Permitir `null`
  orderId: string;
}

export interface DeliveryData {
  deliveryAddress: string;
  senderName: string;
  senderPhone:string;
  recipientName?: string | null; // Permitir `null` o `undefined`
  recipientPhone: string;
  additionalComments?: string | null; // Permitir `null` o `undefined`
}

export interface StatusHistory {
  id: string;
  createdAt: string;
  previousState: string | null; // Puede ser `null`
  newState: string;
  comment?: string | null; // Permitir `null` o `undefined`
  orderId: string;
}

export interface Order {
  id: string;
  estado: OrderState;
  createdAt: string; // Convertido a string en la acción
  datosDeEntrega?: DeliveryData | null;
  items: OrderItem[];
}
