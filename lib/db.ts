import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

declare global {
    var prisma: PrismaClient | undefined
}

// Lazy singleton: the client is only constructed when a query actually runs.
// Constructing at module scope used to make every importing route module throw
// — and `next build` fail while collecting page data — whenever DATABASE_URL
// was absent from the environment. With this, the error surfaces on first use
// instead of at build time (same pattern as lib/stripe.ts and lib/mux.ts).
function createClient(): PrismaClient {
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

    return new PrismaClient({ adapter })
}

// Property-access proxy: defers createClient() until the first `db.*` use.
// Methods are invoked as `db.course.findMany(...)`, so `this` binding is fine.
export const db: PrismaClient = new Proxy({} as PrismaClient, {
    get: (_target, prop, receiver) => {
        const client = (globalThis.prisma ??= createClient())
        if (process.env.NODE_ENV !== "production") globalThis.prisma = client
        return Reflect.get(client, prop, receiver)
    },
})
