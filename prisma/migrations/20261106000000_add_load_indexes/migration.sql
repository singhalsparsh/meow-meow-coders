-- Hot-path composite indexes to reduce Aiven Postgres load.
-- Idempotent so a re-run (e.g. after a manual index application) is safe.
CREATE INDEX IF NOT EXISTS "Course_isPublished_categoryId_idx" ON "Course" ("isPublished", "categoryId");
CREATE INDEX IF NOT EXISTS "Course_isPublished_createdAt_idx" ON "Course" ("isPublished", "createdAt");
CREATE INDEX IF NOT EXISTS "Chapter_courseId_isPublished_idx" ON "Chapter" ("courseId", "isPublished");
CREATE INDEX IF NOT EXISTS "Test_userId_isPublished_idx" ON "Test" ("userId", "isPublished");
