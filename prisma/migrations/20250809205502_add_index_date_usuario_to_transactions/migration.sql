-- CreateIndex
CREATE INDEX "Transaction_usuarioId_date_type_idx" ON "public"."Transaction"("usuarioId", "date", "type");
