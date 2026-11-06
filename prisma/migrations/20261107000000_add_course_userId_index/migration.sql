-- Add index on Course.userId (used heavily for teacher queries, analytics,
-- and isOwner checks) — was previously unindexed.
CREATE INDEX "Course_userId_idx" ON "Course"("userId");
