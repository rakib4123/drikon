-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "siteName" TEXT NOT NULL DEFAULT 'Drikon',
    "tagline" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "accentColor" TEXT,
    "accentColor2" TEXT,
    "supportEmail" TEXT,
    "socialFacebook" TEXT,
    "socialInstagram" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
