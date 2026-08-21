-- AlterTable
ALTER TABLE "Product" ADD COLUMN "nameBn" TEXT,
ADD COLUMN "descriptionBn" TEXT,
ADD COLUMN "shortDescriptionBn" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "nameBn" TEXT,
ADD COLUMN "descriptionBn" TEXT;

-- AlterTable
ALTER TABLE "Banner" ADD COLUMN "headingBn" TEXT,
ADD COLUMN "subheadingBn" TEXT;
