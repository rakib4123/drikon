-- CreateTable
CREATE TABLE "LoginFailure" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "LoginFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginFailure_userId_windowStart_idx" ON "LoginFailure"("userId", "windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "LoginFailure_userId_ipAddress_key" ON "LoginFailure"("userId", "ipAddress");

-- AddForeignKey
ALTER TABLE "LoginFailure" ADD CONSTRAINT "LoginFailure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
