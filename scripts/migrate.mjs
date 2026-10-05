// Applies pending Prisma migrations at build time so the deployed app and the
// database schema can never drift out of sync (which previously made every
// /courses page throw). Skips silently when no DATABASE_URL is present, so CI
// builds that only need `next build` never fail on a missing connection string.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

// DATABASE_URL is required to migrate; without it (e.g. a CI that only needs
// `next build`) skip silently rather than fail the build.
const hasUrl = !!process.env.DATABASE_URL;

if (!hasUrl) {
  console.log("[migrate] DATABASE_URL not set — skipping migration step.");
  process.exit(0);
}

// Resolve the Prisma CLI directly. `npx` is not always on PATH when spawned
// from Node on Windows, so prefer the local binary shim and fall back to npx.
// On Windows the extensionless shim is not directly spawnable, so use .cmd.
function resolvePrisma() {
  const binDir = join(process.cwd(), "node_modules", ".bin");
  const candidates = process.platform === "win32"
    ? ["prisma.cmd", "prisma.ps1", "prisma"]
    : ["prisma"];
  for (const name of candidates) {
    const candidate = join(binDir, name);
    if (existsSync(candidate)) return { bin: candidate, args: ["migrate", "deploy"] };
  }
  return { bin: "npx", args: ["prisma", "migrate", "deploy"] };
}

const { bin, args } = resolvePrisma();

try {
  console.log("[migrate] Applying pending migrations...");
  execFileSync(bin, args, { stdio: "inherit", shell: process.platform === "win32" });
  console.log("[migrate] Migrations applied.");
} catch (error) {
  // A failed migration must not break the build: the app degrades via the
  // error boundary, which is far easier to recover from than a failed deploy.
  console.warn("[migrate] Migration step failed, continuing build:", error);
}
