// Capacity-race + write-throughput burst test. Fires N concurrent
// register_for_tournament RPC calls (distinct users) at ONE capacity-limited
// tournament and checks that EXACTLY max_participants succeed — proving the
// v2.54.1 `FOR UPDATE` fix holds under real concurrency — while measuring write
// latency/throughput. Runs against a STAGING BRANCH only.
//
// Usage:
//   SUPABASE_URL="https://<branch>.supabase.co" SUPABASE_ANON_KEY="<branch anon>" \
//   TOUR_ID=1 N=500 CAP=100 node loadtest/run-capacity.mjs

const BASE = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const KEY  = process.env.SUPABASE_ANON_KEY || "";
const TOUR = parseInt(process.env.TOUR_ID || "1", 10);
const N    = parseInt(process.env.N || "500", 10);
const CAP  = parseInt(process.env.CAP || "100", 10);

if (!BASE || !KEY) { console.error("Set SUPABASE_URL + SUPABASE_ANON_KEY (branch)."); process.exit(1); }
if (/kwqfpkvalspuvyiszrfh/.test(BASE)) { console.error("Refusing to run against PRODUCTION."); process.exit(1); }

const url = `${BASE}/rest/v1/rpc/register_for_tournament`;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function attempt(pid) {
  const t0 = performance.now();
  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ tour_id: TOUR, user_pid: pid, privy_uid: `lt-${pid}` }) });
    const body = await res.json().catch(() => null);
    const reason = res.ok ? (body?.ok ? "ok" : (body?.reason || "rejected")) : `http_${res.status}`;
    return { ms: performance.now() - t0, reason };
  } catch { return { ms: performance.now() - t0, reason: "exception" }; }
}

function pct(s, p) { return s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : 0; }

console.log(`Capacity burst: ${N} concurrent registrations → tournament ${TOUR} (cap ${CAP})\n`);
const t0 = performance.now();
const results = await Promise.all(Array.from({ length: N }, (_, i) => attempt(i + 1)));
const wallS = (performance.now() - t0) / 1000;

const counts = {};
const lat = [];
for (const r of results) { counts[r.reason] = (counts[r.reason] || 0) + 1; lat.push(r.ms); }
lat.sort((a, b) => a - b);

const ok = counts.ok || 0;
console.log(`wall: ${wallS.toFixed(2)}s · throughput: ${Math.round(N / wallS)} req/s`);
console.log(`latency ms — p50 ${Math.round(pct(lat, 50))} · p95 ${Math.round(pct(lat, 95))} · p99 ${Math.round(pct(lat, 99))} · max ${Math.round(lat[lat.length - 1] || 0)}`);
console.log(`outcomes:`, JSON.stringify(counts));
console.log(`\nCAPACITY CHECK: ${ok} succeeded, expected exactly ${CAP} → ${ok === CAP ? "PASS ✅ (no over-fill)" : "FAIL ❌"}`);
console.log("JSON:", JSON.stringify({ N, cap: CAP, ok, wallS: +wallS.toFixed(2), rps: Math.round(N / wallS), p50: Math.round(pct(lat, 50)), p95: Math.round(pct(lat, 95)), p99: Math.round(pct(lat, 99)), counts }));
