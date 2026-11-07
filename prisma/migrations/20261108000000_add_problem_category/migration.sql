-- Chapter coding problems now split into two buckets: the main lesson problems
-- (category = CODING) and the chapter's Extra Practice set (category =
-- PRACTICE). Both reuse the same forms/workspace; the column just tells them
-- apart. Idempotent so a re-run is harmless.
CREATE TYPE "ProblemCategory" AS ENUM ('CODING', 'PRACTICE');

ALTER TABLE "CodingProblem"
    ADD COLUMN IF NOT EXISTS "category" "ProblemCategory" NOT NULL DEFAULT 'CODING';
