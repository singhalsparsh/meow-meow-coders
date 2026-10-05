-- Sub-lessons: a chapter can now nest one level under another chapter via
-- parentId. NULL parentId = top-level topic; a set parentId = sub-lesson.
-- Idempotent so re-running is harmless.

ALTER TABLE "Chapter" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- Chapter already has @@index([parentId]) in the schema; make sure it exists.
CREATE INDEX IF NOT EXISTS "Chapter_parentId_idx" ON "Chapter"("parentId");

-- Self foreign key. ON DELETE CASCADE so deleting a topic takes its
-- sub-lessons with it (matches the schema's onDelete: Cascade).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Chapter_parentId_fkey'
      AND table_name = 'Chapter'
  ) THEN
    ALTER TABLE "Chapter"
      ADD CONSTRAINT "Chapter_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "Chapter"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
