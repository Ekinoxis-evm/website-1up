# Load & concurrency testing — "what happens with a burst of users"

The realistic risk for 1UP isn't a single 1000-player tournament bracket (brackets
that size aren't real, and bracket resolution is sequential/admin-driven). It's a
**burst of registrations/subscriptions at the same time** — a launch or campaign.
This folder answers "will that hold?" two ways.

> ⚠️ **Never run load tests against production (`1upesports.org`) or with real Stripe/
> MercadoPago.** Use a **preview deploy** + Stripe **test mode** + throwaway data, and
> clean it up. A load test can also exhaust Supabase free-tier limits — watch the dashboard.

---

## 1. Read-path burst — `k6-burst.js`

What a crowd actually hammers first: the public pages + the bracket API. No auth needed.

**Install k6:** `brew install k6` (macOS) — see <https://k6.io/docs/get-started/installation/>.

**Run (against a preview):**
```bash
BASE_URL="https://website-1up-git-<branch>-ekinoxis-team.vercel.app" \
  SLUG="<a-real-tournament-slug>" \
  k6 run loadtest/k6-burst.js
```

Tune the peak / ramp with env vars: `VUS_LOW` (default 100), `VUS_MID` (500),
`VUS_HIGH` (1000). For 1000+ VUs from one machine, prefer a beefy box or k6 Cloud.

**Pass/fail thresholds** (in the script): `http_req_failed` < 1% and `p95` < 1.5s.
If those hold at `VUS_HIGH`, the read surface is fine for that crowd size. If p95
climbs or errors spike, note the VU level where it broke and which `path` tag (k6
breaks metrics down by path) — that's your bottleneck.

**Why reads are the right first test:** Vercel functions auto-scale and the app talks
to Supabase over **PostgREST (HTTP, pooled)** — so a spike of serverless invocations
does *not* exhaust a Postgres connection pool the way raw `pg` connections would.

---

## 2. Write-path concurrency — the capacity race (DB-level)

The write paths (`/api/user/tournament-registrations`, `…/tournament-entry-orders`,
`…/pass-orders`) need a **Privy session token**, so they can't be driven from k6
without a test-auth path (same blocker as E2E — see
`.claude/rules/testing-practices.md`, Tier 3). But the real write-side risk —
**over-filling a capacity-limited tournament under concurrent signups** — lives in the
`register_for_tournament` RPC and is testable at the DB layer.

It's already hardened (v2.54.1): the RPC does `SELECT … FOR UPDATE` on the tournament
row, so concurrent registrations serialize through the capacity check.

**Verify it holds** (against a non-prod Supabase / a throwaway tournament with a small
`max_participants`): fire N concurrent `register_for_tournament` calls for distinct test
users and assert exactly `max_participants` return `{"ok":true}` and the rest
`{"ok":false,"reason":"full"}`. A quick Node harness with the service-role client
(`Promise.all` of N `.rpc("register_for_tournament", …)` calls) does it. Keep it off
production data.

---

## 3. Rate-limiter status (checked 2026-06-24)

`src/lib/rateLimit.ts` implements Upstash sliding-window limits (safe-by-default:
pass-through when the env vars are absent). Limiters: `anonStrict` 5/min/IP,
`anonRead` 30/min/IP, `authMutate` 20/min/user. Applied on the order/registration/
token/stream/referral/bank endpoints.

**Finding: Upstash is NOT provisioned in production** (no `UPSTASH_REDIS_REST_*` /
`…_KV_REST_API_*` vars on Vercel). So **every limiter is currently pass-through** — no
throttling at all.

Implications for a launch burst:
- ✅ **No risk of throttling legitimate users** — the burst won't be rate-limited.
- ⚠️ **No abuse protection** (audit H-4 is built but inert). Spam/abuse of the
  recruitment form, referral-validate, and the on-chain-RPC mutations is unbounded.

**Recommendation:** provision Upstash (Vercel → Marketplace → Upstash → "Add to
Project" — auto-adds the env vars, **no redeploy** needed; the next request activates
limiting). Then mind one thing for venue WiFi: `anonStrict` is **5/min per IP**, so many
people behind one NAT could hit it on *anon* endpoints — but registration is **per-user**
(`authMutate` 20/min), which is plenty for a real signup, so the signup path is unaffected.

---

## 4. Dependency-free branch DB test (the one we actually ran)

No k6 install needed — two Node drivers hit a **Supabase branch's** REST API directly (the DB
layer is the real bottleneck under a burst; Vercel functions autoscale):

- **`run-burst.mjs`** — read burst (`GET /rest/v1/tournaments`) at ramping concurrency.
- **`run-capacity.mjs`** — fires N concurrent `register_for_tournament` RPC calls at a
  capacity-limited tournament and asserts **exactly `max_participants` succeed** (proves the
  v2.54.1 `FOR UPDATE` capacity fix under real concurrency).

```bash
# Create a branch (mcp/dashboard), apply a minimal schema + seed, then:
SUPABASE_URL="https://<branch-ref>.supabase.co" SUPABASE_ANON_KEY="<branch anon key>" \
  node loadtest/run-burst.mjs        # reads: WAVES="100,500,1000"
SUPABASE_URL=... SUPABASE_ANON_KEY=... TOUR_ID=1 N=500 CAP=100 \
  node loadtest/run-capacity.mjs     # writes: capacity race
```

**Results (2026-06-24, on a small branch instance → conservative floor):** read burst held
**0% errors at 1000 concurrent** (p95 ~2.9s); capacity burst = **exactly 100/500 succeeded
(PASS, no over-fill)**. Full numbers + verdict on the Notion **Pruebas & Auditorías (QA)** page.
Branch deleted after the run. Caveat: tests the DB layer, not the full Vercel→app path (that
needs a preview pointed at the branch — §1).
