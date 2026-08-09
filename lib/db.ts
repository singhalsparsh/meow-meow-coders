import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

declare global {
    var prisma: PrismaClient | undefined
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
    throw new Error(
        "DATABASE_URL is not set. Add your PostgreSQL connection string to .env.local, e.g. DATABASE_URL=\"postgresql://USER:PASSWORD@HOST:5432/course_crafter\""
    )
}

// The DATABASE_URL typically ends with `?sslmode=require`. Recent pg versions
// treat `require` as `verify-full` and reject Aiven's self-signed root CA.
// So strip `sslmode` from the URL (otherwise pg's own parse would override the
// explicit ssl option below) and instead configure TLS explicitly:
// encrypt the connection without pinning the server certificate.
const url = new URL(connectionString)
url.searchParams.delete("sslmode")

const adapter = new PrismaPg({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
})

export const db = globalThis.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;
