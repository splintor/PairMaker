-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT '';

-- Backfill: treat the last whitespace-delimited word as the last name; everything
-- before it as the first name. Single-word names keep the whole as the first name.
UPDATE "Candidate"
SET "firstName" = CASE
      WHEN trim("name") ~ '\s' THEN regexp_replace(trim("name"), '\s+\S+$', '')
      ELSE trim("name")
    END,
    "lastName" = CASE
      WHEN trim("name") ~ '\s' THEN regexp_replace(trim("name"), '^.*\s', '')
      ELSE ''
    END;
