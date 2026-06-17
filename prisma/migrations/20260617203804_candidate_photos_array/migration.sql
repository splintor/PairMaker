-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill: seed the array with the existing single photo (if any).
UPDATE "Candidate" SET "photos" = ARRAY["photoUrl"] WHERE "photoUrl" IS NOT NULL;
