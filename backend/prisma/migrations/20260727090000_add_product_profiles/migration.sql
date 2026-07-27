CREATE TABLE "ProductProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "applications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "relatedProducts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "buyerPersona" JSONB NOT NULL,
  "decisionMakerRoles" JSONB NOT NULL,
  "buyerKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "channelKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "targetCountries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "targetLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "recommendedPlatforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "buyingSignals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "painPoints" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "valueAngles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductProfile_userId_productName_key"
ON "ProductProfile"("userId", "productName");

CREATE INDEX "ProductProfile_userId_updatedAt_idx"
ON "ProductProfile"("userId", "updatedAt");

ALTER TABLE "ProductProfile"
ADD CONSTRAINT "ProductProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
