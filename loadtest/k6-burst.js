// k6 burst load test — the "many people at once" scenario.
//
// Simulates a launch/campaign spike where lots of people load the public
// tournament surface at the same time. It hits the READ paths only (home,
// tournament list, a tournament detail, the public bracket API) because those
// are what a crowd actually hammers first and they need no auth.
//
// WRITE paths (register / pay / buy pass) require a Privy session token, so they
// can't be driven from k6 without a test-auth path (same blocker as E2E — see
// .claude/rules/testing-practices.md, Tier 3). The write-side concurrency risk
// (over-filling a capacity-limited tournament) is covered separately by the
// v2.54.1 `FOR UPDATE` fix in register_for_tournament — verify that with the DB
// concurrency check in loadtest/README.md, not here.
//
// RUN (always against a PREVIEW deploy — never production):
//   BASE_URL="https://<branch>-<hash>.vercel.app" SLUG="<real-tournament-slug>" \
//     k6 run loadtest/k6-burst.js
//
// Tune the peak with VUS_HIGH (default 1000). See loadtest/README.md.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errors = new Rate("errors");

const BASE = (__ENV.BASE_URL || "").replace(/\/$/, "");
const SLUG = __ENV.SLUG || "";

// Safety rail: refuse to load-test production.
if (!BASE || /1upesports\.org/.test(BASE)) {
  throw new Error(
    "Set BASE_URL to a PREVIEW deploy (e.g. https://website-1up-git-<branch>.vercel.app). " +
    "Never load-test production (1upesports.org).",
  );
}

export const options = {
  stages: [
    { duration: "30s", target: Number(__ENV.VUS_LOW  || 100)  }, // warm up
    { duration: "1m",  target: Number(__ENV.VUS_MID  || 500)  }, // climb
    { duration: "1m",  target: Number(__ENV.VUS_HIGH || 1000) }, // peak
    { duration: "30s", target: 0 },                              // ramp down
  ],
  thresholds: {
    http_req_failed:   ["rate<0.01"],    // <1% failed requests
    http_req_duration: ["p(95)<1500"],   // 95th percentile under 1.5s
    errors:            ["rate<0.01"],
  },
};

export default function () {
  // The crowd's read surface.
  const paths = ["/", "/torneos"];
  if (SLUG) paths.push(`/torneos/${SLUG}`);

  for (const p of paths) {
    const res = http.get(`${BASE}${p}`, { tags: { path: p } });
    const ok = check(res, { "status 200": (r) => r.status === 200 });
    errors.add(!ok);
  }

  // The bracket API the TV view polls — the read most likely to spike during a live event.
  if (SLUG) {
    const b = http.get(`${BASE}/api/tournaments/${SLUG}/bracket`, { tags: { path: "bracket" } });
    const ok = check(b, { "bracket ok/empty": (r) => r.status === 200 || r.status === 404 });
    errors.add(!ok);
  }

  sleep(1); // each VU ~ a user reading the page for a second between actions
}
