-- ProductProfile is optional because searches may still be created from an
-- ad-hoc product description. The copied context remains in SearchTask.parameters.
ALTER TABLE "SearchTask"
ADD COLUMN "productProfileId" TEXT;

CREATE INDEX "SearchTask_productProfileId_createdAt_idx"
ON "SearchTask"("productProfileId", "createdAt");

ALTER TABLE "SearchTask"
ADD CONSTRAINT "SearchTask_productProfileId_fkey"
FOREIGN KEY ("productProfileId") REFERENCES "ProductProfile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
