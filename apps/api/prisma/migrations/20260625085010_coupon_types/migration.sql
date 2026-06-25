-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "freeShipping" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
