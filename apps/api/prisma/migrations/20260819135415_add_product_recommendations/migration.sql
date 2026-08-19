-- CreateTable
CREATE TABLE "ProductAssociationRule" (
    "id" TEXT NOT NULL,
    "antecedentIds" TEXT[],
    "antecedentSize" INTEGER NOT NULL,
    "consequentId" TEXT NOT NULL,
    "support" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "lift" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAssociationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationRun" (
    "id" TEXT NOT NULL,
    "ordersAnalyzed" INTEGER NOT NULL,
    "rulesGenerated" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductAssociationRule_antecedentIds_idx" ON "ProductAssociationRule" USING GIN ("antecedentIds");

-- CreateIndex
CREATE INDEX "ProductAssociationRule_consequentId_idx" ON "ProductAssociationRule"("consequentId");

-- AddForeignKey
ALTER TABLE "ProductAssociationRule" ADD CONSTRAINT "ProductAssociationRule_consequentId_fkey" FOREIGN KEY ("consequentId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
