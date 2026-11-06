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

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Prisma errors that mean "the connection slot/socket was momentarily gone",
// which is safe to retry after a short backoff:
//   - P2024 / P2034: pool timeout / transaction already closed
//   - 53300: Postgres "remaining connection slots are reserved" (Aiven hits its
//     max_connections ceiling under bursts)
//   - ECONNRESET / "connection terminated": Aiven dropped the socket
const RETRYABLE_CODES = new Set<string>(["P2024", "P2034"]);

function isRetryable(err: unknown): boolean {
    if (!err) return false;
    const e = err as { code?: string; message?: string };
    if (typeof e.code === "string" && RETRYABLE_CODES.has(e.code)) return true;
    const msg = e.message ?? "";
    return /53300|too many connections|remaining connection slots|ECONNRESET|connection terminated|idle .*expired/i.test(
        msg
    );
}

const MAX_RETRIES = 3;

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

    // Why so aggressive? This app runs on Vercel, where every warm serverless
    // instance builds its own pool. Aiven free-tier Postgres caps
    // max_connections very low (~20), so the app's worst case is
    // (instances × pool max) + Aiven's internal scheduler. A handful of warm
    // instances at pool max 5 can already exhaust the server and throw 53300
    // ("too many connections"), which made /courses/... pages intermittently
    // 500. So we:
    //   - shrink the per-pool max to 2 (shared across requests, still plenty),
    //   - expire idle connections quickly so sockets return to the server,
    //   - recycle sockets before Aiven can drop them (maxUses),
    //   - fail slot acquisition fast instead of hanging (connectionTimeoutMillis),
    //   - surface pool/connection errors instead of crashing the process.
    const adapter = new PrismaPg(
        {
            connectionString: url.toString(),
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 7_000,
            idleTimeoutMillis: 10_000,
            maxUses: 150,
            max: 2,
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

    const base = new PrismaClient({ adapter })

    // Transparently retry operations that fail only because the database's
    // connection slots were momentarily exhausted (53300) or a socket died —
    // the root cause of the intermittent 500s on /courses/.../chapters/....
    // These are transient; a short exponential backoff usually lets a slot free
    // up and the page renders normally instead of erroring.
    return base.$extends({
        query: {
            $allModels: {
                async $allOperations({ args, query }) {
                    let attempt = 0;
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        try {
                            return await query(args);
                        } catch (err) {
                            attempt += 1;
                            if (!isRetryable(err) || attempt >= MAX_RETRIES) throw err;
                            await sleep(Math.min(50 * 2 ** (attempt - 1), 400));
                        }
                    }
                },
            },
        },
    }) as unknown as PrismaClient
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
