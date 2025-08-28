import { TransactionType, PaymentMethod, IncomeCategory, ExpenseCategory } from "@prisma/client";

export interface Item {
  id?: string;
  description: string;
  quantity: number;
  price: number;
  subtotal: number;
  productId?: string | null;
  isLocked?: boolean;
}

export interface FormData {
  date: string;
  type: TransactionType;
  category: IncomeCategory | ExpenseCategory; // Enums Prisma para tipado estricto
  paymentMethod: PaymentMethod;
  items: Item[];
  amount: number;
  description?: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  description: string;
  category: IncomeCategory | ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
}