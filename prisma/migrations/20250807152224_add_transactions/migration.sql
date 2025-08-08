-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('ingreso', 'gasto');

-- CreateEnum
CREATE TYPE "public"."IncomeCategory" AS ENUM ('ventas', 'ahorro', 'otros', 'propinas', 'prestamos');

-- CreateEnum
CREATE TYPE "public"."ExpenseCategory" AS ENUM ('implementos', 'materiales', 'arriendo', 'empleados', 'servicios_publicos', 'envios', 'deudas', 'mantenimiento', 'impuestos', 'otros');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('efectivo', 'nequi', 'daviplata', 'cuenta_principal', 'transferencias');

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentMethod" "public"."PaymentMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_usuarioId_idx" ON "public"."Transaction"("usuarioId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "public"."Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "public"."Transaction"("date");

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
