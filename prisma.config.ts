import { defineConfig } from 'prisma/config'

// Prisma 7 no longer loads `.env` files automatically. Load the app's env
// (DATABASE_URL lives in .env.local) so `prisma migrate` / `prisma generate`
// can reach the datasource URL.
try {
  process.loadEnvFile('.env.local')
} catch {
  // .env.local may be absent in CI — the datasource URL then comes from the
  // ambient environment.
}

// `prisma generate` (runs in postinstall, including on Netlify) needs a
// datasource URL to exist even though generate never connects to the DB.
// Fall back to a dummy so the build never fails when DATABASE_URL is absent
// at install time; the real value is supplied at runtime.
const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://dummy:dummy@localhost:5432/dummy'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
})
