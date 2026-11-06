// Exports the published course catalog + categories from the Aiven Postgres
// into static JSON files under content/, so the student-facing read path can
// be served entirely from the repo (no database) at build time.
//
// Run: node scripts/export-content.mjs
// Re-run whenever a course is published/edited — the output is committed so a
// Vercel deploy serves the fresh static content.

import { loadEnvFile } from "node:process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

try {
  loadEnvFile(".env.local");
} catch {
  /* CI or no env file */
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "content");
mkdirSync(outDir, { recursive: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[export-content] DATABASE_URL not set — nothing to do.");
  process.exit(0);
}

const url = new URL(databaseUrl);
url.searchParams.delete("sslmode");
const adapter = new PrismaPg({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 7000,
  idleTimeoutMillis: 10000,
  maxUses: 150,
  max: 2,
});
const db = new PrismaClient({ adapter });

// Stringify dates as ISO so JSON.parse can revive them with a reviver.
const iso = (d) => (d ? new Date(d).toISOString() : d);
function reviveDates(key, value) {
  if (typeof value === "string" && /^(createdAt|updatedAt)$/.test(key)) {
    return new Date(value);
  }
  return value;
}

async function main() {
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  const catalog = await db.course.findMany({
    where: { isPublished: true },
    include: {
      category: true,
      attachments: true,
      chapters: {
        where: { isPublished: true },
        orderBy: { position: "asc" },
        include: {
          muxData: true,
          videoSources: { orderBy: { position: "asc" } },
          pdfNotes: { orderBy: { position: "asc" } },
          leetcodeQuestions: { orderBy: { position: "asc" } },
          codingProblems: {
            orderBy: { position: "asc" },
            include: { testCases: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });

  // JSON.stringify drops Date to ISO automatically; keep a stable shape.
  const cats = JSON.parse(JSON.stringify(categories));
  const courses = JSON.parse(JSON.stringify(catalog));

  // Snapshot version metadata: for each course, the newest updatedAt across
  // the course and all of its nested content. The student-facing pages compare
  // this against the live DB at request time — if the DB is newer (a teacher
  // edited something), they fall back to the database so the edit propagates
  // to everyone without a redeploy. Otherwise they serve the static snapshot.
  const toTime = (d) => (d ? new Date(d).getTime() : 0);
  const meta = {};
  for (const c of courses) {
    let max = toTime(c.updatedAt);
    for (const a of c.attachments || []) max = Math.max(max, toTime(a.updatedAt));
    for (const ch of c.chapters || []) {
      max = Math.max(max, toTime(ch.updatedAt));
      for (const v of ch.videoSources || []) max = Math.max(max, toTime(v.updatedAt));
      for (const p of ch.pdfNotes || []) max = Math.max(max, toTime(p.updatedAt));
      for (const q of ch.leetcodeQuestions || []) max = Math.max(max, toTime(q.updatedAt));
      for (const cp of ch.codingProblems || []) max = Math.max(max, toTime(cp.updatedAt));
    }
    meta[c.id] = new Date(max).toISOString();
  }

  writeFileSync(join(outDir, "categories.json"), JSON.stringify(cats, null, 2));
  writeFileSync(join(outDir, "courses.json"), JSON.stringify(courses, null, 2));
  writeFileSync(join(outDir, "snapshot-meta.json"), JSON.stringify(meta, null, 2));

  console.log(
    `[export-content] wrote content/categories.json (${cats.length}), content/courses.json (${courses.length} published courses), content/snapshot-meta.json (${Object.keys(meta).length} courses)`
  );
}

main()
  .catch((e) => {
    console.error("[export-content] failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect().catch(() => {});
  });
