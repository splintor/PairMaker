-- Test data only: give existing rows a random birthdate (ages ~22–41) before removing ageManual.
UPDATE "Candidate"
SET "birthdate" = NOW() - ((floor(random() * 20) + 22) || ' years')::interval
WHERE "birthdate" IS NULL;

-- DropColumn
ALTER TABLE "Candidate" DROP COLUMN "ageManual";
