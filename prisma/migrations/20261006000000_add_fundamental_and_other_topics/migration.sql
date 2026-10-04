-- Two new DSA topic options for the coding-problem category dropdown:
-- FUNDAMENTAL (basic DSA questions) and OTHER (anything that does not fit a
-- named topic). Idempotent so re-running is harmless.

ALTER TYPE "DsaTopic" ADD VALUE IF NOT EXISTS 'FUNDAMENTAL';
ALTER TYPE "DsaTopic" ADD VALUE IF NOT EXISTS 'OTHER';
