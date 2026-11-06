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

    // Aiven sometimes drops idle or long-lived connections, which leaves stale
    // sockets in the pool and causes transient "connection terminated" failures.
    // Configure the pool to be resilient: keep a modest size, fail connection
    // attempts quickly instead of hanging, recycle connections before the server
    // can close them, and surface pool errors instead of crashing the process.
    const adapter = new PrismaPg(
        {
            connectionString: url.toString(),
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10_000,
            idleTimeoutMillis: 30_000,
            maxUses: 500,
            // Keep the pool well under the Aiven instance's max_connections so
            // the app can never exhaust the server's connection slots (which
            // made queries throw 53300 "TooManyConnections" and pages render
            // empty/error states). Connections are shared across requests, so
            // a small pool is plenty.
            max: 5,
        },
        {
            onPoolError: (err) => {
                console.warn("[db] pg pool error:", err.message)
            },
            onConnectionError: (err) => {
                console.warn("[db] pg connection error:", err.message)
            },
        }
    )

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
