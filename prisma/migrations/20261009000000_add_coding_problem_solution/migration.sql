-- Add the teacher-authored `solution` column to CodingProblem.
-- Matches `solution String? @db.Text` in prisma/schema.prisma.
ALTER TABLE "CodingProblem" ADD COLUMN "solution" TEXT;
