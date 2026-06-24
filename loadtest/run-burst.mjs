// Dependency-free burst load driver — hammers a Supabase PostgREST read endpoint
// at ramping concurrency and reports latency percentiles + error rate. Used to
// load-test a STAGING BRANCH database (never prod), which is the realistic
// bottleneck under a registration/launch burst (Vercel functions autoscale; the
// DB is the limit). A full Vercel-path test would need a preview pointed at the
// branch — see loadtest/README.md.
//
// Usage:
//   SUPABASE_URL="https://<branch-ref>.supabase.co" \
//   SUPABASE_ANON_KEY="<branch anon key>" \
//   node loadtest/run-burst.mjs
//
// Tune: PATH (default a tournaments read), WAVES (default "100,500,1000"),
// REQS_PER_VU (default 5), so each wave fires VU*REQS_PER_VU requests.

const BASE = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const KEY  = process.env.SUPABASE_ANON_KEY || "";
const PATH = process.env.LT_PATH || "/rest/v1/tournaments?select=id,name,slug,status&limit=20";
const WAVES = (process.env.WAVES || "100,500,1000").split(",").map((n) => parseInt(n, 10));
const REQS_PER_VU = parseInt(process.env.REQS_PER_VU || "5", 10);

if (!BASE || !KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY (the BRANCH ones — never prod).");
  process.exit(1);
}
if (/kwqfpkvalspuvyiszrfh/.test(BASE)) {
  console.error("Refusing to run against the PRODUCTION project (kwqfpkvalspuvyiszrfh).");
  process.exit(1);
}

const URL = `${BASE}${PATH}`;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

function pct(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

async function oneRequest() {
  const t0 = performance.now();
  try {
    const res = await fetch(URL, { headers });
    await res.text();
    return { ms: performance.now() - t0, ok: res.ok, status: res.status };
  } catch {
    return { ms: performance.now() - t0, ok: false, status: 0 };
  }
}

async function wave(concurrency) {
  const total = concurrency * REQS_PER_VU;
  const lat = [];
  let errors = 0;
  const tStart = performance.now();

  // `concurrency` workers each fire REQS_PER_VU sequential requests → ~concurrency in flight.
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let i = 0; i < REQS_PER_VU; i++) {
        const r = await oneRequest();
        lat.push(r.ms);
        if (!r.ok) errors++;
      }
    }),
  );

  const wallS = (performance.now() - tStart) / 1000;
  lat.sort((a, b) => a - b);
  return {
    concurrency,
    total,
    rps: Math.round(total / wallS),
    errorRate: +((errors / total) * 100).toFixed(2),
    p50: Math.round(pct(lat, 50)),
    p95: Math.round(pct(lat, 95)),
    p99: Math.round(pct(lat, 99)),
    max: Math.round(lat[lat.length - 1] || 0),
  };
}

console.log(`Target: ${URL}`);
console.log(`Waves (concurrency): ${WAVES.join(", ")} · ${REQS_PER_VU} reqs each\n`);
console.log("conc   total   rps    err%   p50    p95    p99    max   (ms)");
const rows = [];
for (const c of WAVES) {
  const r = await wave(c);
  rows.push(r);
  console.log(
    `${String(r.concurrency).padEnd(6)} ${String(r.total).padEnd(7)} ${String(r.rps).padEnd(6)} ` +
    `${String(r.errorRate).padEnd(6)} ${String(r.p50).padEnd(6)} ${String(r.p95).padEnd(6)} ` +
    `${String(r.p99).padEnd(6)} ${r.max}`,
  );
}
console.log("\nJSON:", JSON.stringify(rows));
