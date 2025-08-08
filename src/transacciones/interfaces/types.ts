export enum TransactionType {
  Ingreso = "ingreso",
  Gasto = "gasto",
}

export enum IncomeCategory {
  Ventas = "ventas",
  Propinas = "propinas",
  Ahorro = "ahorro",
  Otros = "otros",
  Prestamos = "prestamos",
}

export enum ExpenseCategory {
  Implementos = "implementos",
  Materiales = "materiales",
  Arriendo = "arriendo",
  Empleados = "empleados",
  ServiciosPublicos = "servicios_publicos",
  Envios = "envios",
  Deudas = "deudas",
  Mantenimiento = "mantenimiento",
  Impuestos = "impuestos",
  Otros = "otros",
}

export enum PaymentMethod {
  Efectivo = "efectivo",
  Nequi = "nequi",
  Daviplata = "daviplata",
  CuentaPrincipal = "cuenta_principal",
  Transferencias = "transferencias",
}

export interface Transaction {
  id: string;
  date: string; // Fecha en formato ISO para evitar errores de hidratación
  type: TransactionType; // Enum personalizado
  description: string;
  category: IncomeCategory | ExpenseCategory; // Categorías personalizadas
  amount: number; // Convertido explícitamente a número en las acciones
  paymentMethod: PaymentMethod; // Enum personalizado
}
