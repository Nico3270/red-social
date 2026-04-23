-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'super_admin';

-- AlterTable
ALTER TABLE "Negocio" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isTestData" BOOLEAN NOT NULL DEFAULT false;
