-- Add BUSINESS_OWNER role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'BUSINESS_OWNER';

-- Create City table
CREATE TABLE IF NOT EXISTS "City" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "City_code_key" ON "City"("code");
CREATE INDEX IF NOT EXISTS "City_code_idx" ON "City"("code");

-- Create BusinessAccount table
CREATE TABLE IF NOT EXISTS "BusinessAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessAccount_userId_key" ON "BusinessAccount"("userId");
ALTER TABLE "BusinessAccount" ADD CONSTRAINT "BusinessAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Place table
CREATE TABLE IF NOT EXISTS "Place" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Place_businessId_idx" ON "Place"("businessId");
CREATE INDEX IF NOT EXISTS "Place_cityId_idx" ON "Place"("cityId");
ALTER TABLE "Place" ADD CONSTRAINT "Place_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Place" ADD CONSTRAINT "Place_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create ServicePricingUnit enum
DO $$ BEGIN
    CREATE TYPE "ServicePricingUnit" AS ENUM ('PER_SERVICE', 'PER_ITEM', 'PER_HOUR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ServiceCategory table
CREATE TABLE IF NOT EXISTS "ServiceCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceCategory_code_key" ON "ServiceCategory"("code");
CREATE INDEX IF NOT EXISTS "ServiceCategory_code_idx" ON "ServiceCategory"("code");
CREATE INDEX IF NOT EXISTS "ServiceCategory_sortOrder_idx" ON "ServiceCategory"("sortOrder");

-- Create ServiceType table
CREATE TABLE IF NOT EXISTS "ServiceType" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "shortDescription" TEXT,
    "defaultDurationMinutes" INTEGER,
    "pricingUnit" "ServicePricingUnit" NOT NULL DEFAULT 'PER_SERVICE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceType_code_key" ON "ServiceType"("code");
CREATE INDEX IF NOT EXISTS "ServiceType_categoryId_idx" ON "ServiceType"("categoryId");
CREATE INDEX IF NOT EXISTS "ServiceType_code_idx" ON "ServiceType"("code");
CREATE INDEX IF NOT EXISTS "ServiceType_isActive_idx" ON "ServiceType"("isActive");
ALTER TABLE "ServiceType" ADD CONSTRAINT "ServiceType_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create PlaceService table
CREATE TABLE IF NOT EXISTS "PlaceService" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "priceFrom" DECIMAL(10,2),
    "priceTo" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "durationMinutes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSpecialOffer" BOOLEAN NOT NULL DEFAULT false,
    "specialLabel" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaceService_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlaceService_placeId_serviceTypeId_key" ON "PlaceService"("placeId", "serviceTypeId");
CREATE INDEX IF NOT EXISTS "PlaceService_placeId_idx" ON "PlaceService"("placeId");
CREATE INDEX IF NOT EXISTS "PlaceService_serviceTypeId_idx" ON "PlaceService"("serviceTypeId");
CREATE INDEX IF NOT EXISTS "PlaceService_isActive_idx" ON "PlaceService"("isActive");
ALTER TABLE "PlaceService" ADD CONSTRAINT "PlaceService_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaceService" ADD CONSTRAINT "PlaceService_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

