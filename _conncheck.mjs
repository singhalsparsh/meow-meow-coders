process.loadEnvFile('.env.local');
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete('sslmode');
const adapter = new PrismaPg({ connectionString: url.toString(), ssl:{rejectUnauthorized:false}, connectionTimeoutMillis:5000, idleTimeoutMillis:5000, maxUses:100, max:1 });
const db = new PrismaClient({ adapter });
let ok = false;
for (let i=1;i<=25;i++) {
  try {
    const rows = await db.$queryRawUnsafe(`SELECT application_name, client_addr, state, count(*) AS n FROM pg_stat_activity GROUP BY 1,2,3 ORDER BY 4 DESC`);
    console.log('CONNECTED on attempt', i, '| total conns =', rows.reduce((a,r)=>a+Number(r.n),0));
    for (const r of rows) console.log('  ', r.application_name ?? '(none)', '|', r.client_addr ?? 'local', '|', r.state ?? '(none)', '|', r.n);
    ok = true; break;
  } catch (e) {
    if (i<25) { await new Promise(r=>setTimeout(r,1500)); continue; }
    console.error('FAILED after 25 attempts:', e.message);
  }
}
await db.$disconnect().catch(()=>{});
console.log('DONE ok='+ok);
