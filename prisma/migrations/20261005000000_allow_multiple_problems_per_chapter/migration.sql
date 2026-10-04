-- A chapter can now hold several coding problems, so the unique constraint on
-- CodingProblem.chapterId has to go, and a `position` column is introduced to
-- keep the problems ordered. Every statement is idempotent so this migration is
-- safe to run even if the 20261004000000_add_coding_problems migration was
-- applied to the database earlier by other means.

-- 1. Drop the one-problem-per-chapter limit.
DROP INDEX IF EXISTS "CodingProblem_chapterId_key";

-- 2. Add the ordering column. Existing rows (at most one per chapter) get 0.
ALTER TABLE "CodingProblem"
    ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;

-- 3. Index chapterId; it is now a non-unique foreign key that every list query
--    filters and orders on.
CREATE INDEX IF NOT EXISTS "CodingProblem_chapterId_idx"
    ON "CodingProblem"("chapterId");
