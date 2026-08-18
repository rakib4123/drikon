/*
  Warnings:

  - You are about to drop the column `cardBrand` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `cardLast4` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `providerCustomerId` on the `Payment` table. All the data in the column will be lost.
  - Added the required column `method` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BKASH_MANUAL', 'COD');

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "cardBrand",
DROP COLUMN "cardLast4",
DROP COLUMN "provider",
DROP COLUMN "providerCustomerId",
ADD COLUMN     "adminNote" TEXT,
ADD COLUMN     "method" "PaymentMethod" NOT NULL,
ADD COLUMN     "payerReference" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "bkashEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bkashInstructions" TEXT,
ADD COLUMN     "bkashNumber" TEXT,
ADD COLUMN     "codEnabled" BOOLEAN NOT NULL DEFAULT true;
