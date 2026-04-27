---
name: cloudflare-stream
description: Implementation plan for Cloudflare Stream video access control — gated course videos for Academia
type: skill
---

# Cloudflare Stream — Academia Video Access Control

This skill activates when working on video content delivery, academia content access, or stream token generation.

---

## Why Cloudflare Stream

| Requirement | Solution |
|---|---|
| Videos only play for enrolled users | Signed JWT tokens (1h expiry) |
| URL cannot be shared or hotlinked | `requireSignedURLs: true` + `allowedOrigins` |
| Adaptive quality (360p–1080p) | Built-in HLS transcoding |
| No heavy infrastructure | Hosted iframe player — no custom player needed |
| Admin uploads from panel | Direct creator upload flow |

**Not R2.** R2 is object storage with no transcoding, no adaptive bitrate, no hosted player. Stream is the right product for gated course videos.

---

## Architecture

```
ADMIN UPLOAD
Admin opens a course in /admin/courses → opens a content item in the inline content sub-modal
  → POST /api/admin/stream-upload-url         (isAdmin)
    → calls CF API: POST /accounts/{id}/stream/direct_upload
    → returns { uploadURL, uid }
  → browser PUT file directly to uploadURL    (never exposes API token)
  → store uid in academia_content.stream_uid

USER PLAYBACK
Enrolled user opens /app/academia/[courseId]
  → POST /api/user/stream-token { contentId }  (Privy Bearer token)
    → verify enrollment: enrollments.status = 'approved' for that course
    → sign RS256 JWT: sub=stream_uid, exp=now+1h, kid=CF_STREAM_KEY_ID
    → return { token }
  → <iframe src="https://customer-{CODE}.cloudflarestream.com/{token}/iframe" />
  → token expires after 1h — page refresh gets a new token automatically
```

---

## DB Change Required

Add `stream_uid` column to `academia_content`:

```sql
-- incremental_stream_uid.sql
ALTER TABLE academia_content
  ADD COLUMN IF NOT EXISTS stream_uid text;
```

`url` column stays for external links (YouTube, docs, quiz links).
`stream_uid` is populated only when content_type = `'video'` and the video is hosted on Stream.
The token endpoint checks: if `stream_uid` is set → issue signed token; if not → return `url` directly.

---

## Environment Variables

Add to `.env.local` and Vercel:

```env
CF_STREAM_ACCOUNT_ID=       # Cloudflare dashboard → Account ID
CF_STREAM_API_TOKEN=        # API token with Stream:Edit + Stream:Read permissions
CF_STREAM_KEY_ID=           # From: POST /accounts/{id}/stream/keys (one-time setup)
CF_STREAM_PEM=              # Base64-encoded RSA private key (from same response)
CF_STREAM_CUSTOMER_CODE=    # From embed URL in Stream dashboard (customer-XXXXX)
```

**One-time signing key setup** (run once, store the response):
```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_STREAM_ACCOUNT_ID}/stream/keys" \
  -H "Authorization: Bearer ${CF_STREAM_API_TOKEN}"
# → save id (= KEY_ID) and pem (= base64 private key)
```

---

## Files to Create / Modify

### New files

| File | Purpose |
|---|---|
| `src/app/api/user/stream-token/route.ts` | POST — verify enrollment → return signed JWT |
| `src/app/api/admin/stream-upload-url/route.ts` | POST — isAdmin → return CF direct upload URL + uid |
| `src/lib/stream.ts` | `signStreamToken(uid)` helper + `createUploadUrl()` helper |

### Modified files

| File | Change |
|---|---|
| `src/db/schema.ts` | Add `streamUid text` to `academiaContent` table |
| `src/types/database.types.ts` | Add `stream_uid: string | null` to AcademiaContent Row/Insert/Update |
| `src/components/admin/AdminAcademiaContentClient.tsx` | Add video upload button alongside URL input; show stream_uid status |
| `src/app/app/(protected)/academia/page.tsx` | Fetch stream token for video content; render Stream iframe |
| `src/app/api/admin/academia-content/route.ts` | Accept + persist `streamUid` on POST/PUT |

---

## Implementation — Key Code

### `src/lib/stream.ts`

```ts
import { SignJWT, importPKCS8 } from "jose";

const ACCOUNT_ID     = process.env.CF_STREAM_ACCOUNT_ID!;
const API_TOKEN      = process.env.CF_STREAM_API_TOKEN!;
const KEY_ID         = process.env.CF_STREAM_KEY_ID!;
const PEM_B64        = process.env.CF_STREAM_PEM!;
const CUSTOMER_CODE  = process.env.CF_STREAM_CUSTOMER_CODE!;

export function streamEmbedUrl(token: string) {
  return `https://customer-${CUSTOMER_CODE}.cloudflarestream.com/${token}/iframe`;
}

export async function signStreamToken(videoUid: string): Promise<string> {
  const pem = Buffer.from(PEM_B64, "base64").toString("utf-8");
  const privateKey = await importPKCS8(pem, "RS256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: KEY_ID })
    .setSubject(videoUid)
    .setExpirationTime("1h")
    .setNotBefore("-5s")
    .sign(privateKey);
}

export async function createUploadUrl(filename: string): Promise<{ uid: string; uploadURL: string }> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/direct_upload`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ maxDurationSeconds: 7200, meta: { name: filename } }),
    }
  );
  const json = await res.json();
  return { uid: json.result.uid, uploadURL: json.result.uploadURL };
}
```

### `src/app/api/user/stream-token/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";
import { signStreamToken } from "@/lib/stream";

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentId } = await req.json();

  // Load content + verify it has a stream_uid
  const { data: content } = await supabaseAdmin
    .from("academia_content")
    .select("stream_uid, course_id")
    .eq("id", contentId)
    .eq("is_published", true)
    .single();

  if (!content?.stream_uid) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify user has an approved enrollment for this course
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("privy_user_id", claims.userId)
    .single();

  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 403 });

  const { data: enrollment } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("user_profile_id", profile.id)
    .eq("course_id", content.course_id)
    .eq("payment_status", "approved")
    .single();

  if (!enrollment) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });

  const token = await signStreamToken(content.stream_uid);
  return NextResponse.json({ token });
}
```

### `src/app/api/admin/stream-upload-url/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { createUploadUrl } from "@/lib/stream";

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims || !await isAdmin(await resolveUserEmail(claims.userId)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename } = await req.json();
  const result = await createUploadUrl(filename ?? "video");
  return NextResponse.json(result);
  // result = { uid, uploadURL }
  // Admin browser PUTs the file to uploadURL
  // Admin saves uid to academia_content.stream_uid
}
```

---

## Admin UX — Upload Flow

In `AdminAcademiaContentClient`:

1. When `content_type === "video"`, show two options:
   - **URL externa** — plain text input (YouTube, existing)
   - **Subir a Stream** — file input button
2. On file select:
   - Call `POST /api/admin/stream-upload-url { filename }` → get `{ uid, uploadURL }`
   - `PUT` the file directly to `uploadURL` (show progress bar)
   - On success: set `streamUid = uid`, show "✓ Video subido" badge
3. On save: persist `stream_uid` to DB via `POST/PUT /api/admin/academia-content`

---

## User UX — Playback Flow

In `/app/academia/[courseId]`:

For each published content item:
- If `stream_uid` is set: call `POST /api/user/stream-token { contentId }` → render `<iframe>` with token URL
- If `url` is set (YouTube/doc/quiz): render as before (embed or link)
- Token expires after 1h — on expiry the iframe shows a playback error → user refreshes page to get new token (or implement a 55min auto-refresh with `setTimeout`)

---

## Package Required

```bash
npm install jose
```

`jose` is isomorphic — works in Node.js (Vercel Functions) and Edge runtimes. No Node.js crypto builtins needed.

---

## Cloudflare Dashboard Setup Checklist

```
[ ] Create Cloudflare account (if not already)
[ ] Enable Stream product
[ ] Create API token: Permissions → Stream:Edit + Stream:Read
[ ] Note Account ID (top-right of dashboard)
[ ] Run one-time signing key creation curl command → save KEY_ID + PEM
[ ] Note Customer Code from any test video embed URL
[ ] Set allowedOrigins on each video (or globally) → ["app.1upesports.org"]
[ ] Set requireSignedURLs: true on each video (or via API on upload)
```

---

## Pricing Estimate (1UP Gaming Tower)

Assumptions: 20 courses × avg 2h each = 2,400 min stored. 100 enrolled users × avg 30 min/month = 3,000 min delivered/month.

| Plan | Price | Stored | Delivered | Fits? |
|---|---|---|---|---|
| Starter | $5/mo | 1,000 min | 5,000 min | ❌ storage too small |
| Creator | $50/mo | 10,000 min | 50,000 min | ✅ comfortable headroom |

**Recommendation:** Start on Creator ($50/mo). Re-evaluate when the catalog or user base grows significantly.

---

## Rollout Order

1. Run `incremental_stream_uid.sql` in Supabase SQL Editor
2. Update `schema.ts` + `database.types.ts`
3. Add 5 env vars to `.env.local` + Vercel
4. Create `src/lib/stream.ts`
5. Create `/api/user/stream-token` route
6. Create `/api/admin/stream-upload-url` route
7. Update `AdminAcademiaContentClient` — upload button + stream_uid persistence
8. Update `/api/admin/academia-content` route — accept stream_uid
9. Update `/app/academia` page — fetch token + render iframe
10. Test end-to-end: upload → enroll → watch → verify non-enrolled user gets 403
11. Deploy → add to CHANGELOG as v1.4.0 (MINOR — new integration)
