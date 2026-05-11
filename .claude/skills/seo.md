# SEO — 1UP Gaming Tower

## metadataBase

Set once in `src/app/layout.tsx`:
```ts
export const metadata: Metadata = {
  metadataBase: new URL("https://1upesports.org"),
  ...
};
```
All child pages can then use relative paths for OG images (`/1up.png`); Next.js resolves them to absolute URLs automatically.

---

## Page metadata pattern

Every public `(main)` page must export a typed `Metadata` object with all fields:

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Title — 1UP Gaming Tower Colombia",
  description: "160-char max. Specific to the page. Includes key keywords naturally.",
  keywords: ["keyword 1", "keyword 2", "keyword 3"],
  openGraph: {
    title: "OG Title (shorter, ~60 chars)",
    description: "OG description (shorter than meta description)",
    url: "https://1upesports.org/page-slug",
    type: "website",
    images: [{ url: "/1up.png", width: 512, height: 512, alt: "Descriptive alt" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Twitter title",
    description: "Twitter description",
  },
  alternates: { canonical: "https://1upesports.org/page-slug" },
};
```

**Never use the plain object form** (`export const metadata = { title: "..." }`) — always use `Metadata` type.

---

## JSON-LD structured data

Add `<script type="application/ld+json">` at the top of the page's JSX return for pages that benefit from rich results.

```tsx
// Server-controlled static data — safe because JSON.stringify escapes all values
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
```

**Only use server-controlled objects** (hardcoded or fetched from our own Supabase). `JSON.stringify` handles escaping so injection is not possible from DB strings. Never pipe raw user-submitted text into JSON-LD without going through `JSON.stringify`.

### Schema types used

| Page | Schema type |
|------|------------|
| `/` (home) | `SportsActivityLocation` (LocalBusiness) |
| `/torneos` | `SportsEvent` — one object per upcoming/live tournament |

---

## Sitemap — `src/app/sitemap.ts`

Next.js App Router native. Returns `MetadataRoute.Sitemap`. Auto-served at `/sitemap.xml`.

Priority guide:
- `1.0` — home
- `0.9` — primary product pages (gaming-tower, academia, torneos)
- `0.7` — secondary content pages (team, juegos)
- `0.6` — niche sections (recreativo)
- `0.5` — upcoming features (marketplace)
- `0.3` — legal pages (privacidad)

Change frequency: `daily` for torneos (changes often), `weekly` for academia/home, `monthly` for static pages, `yearly` for legal.

---

## Robots — `src/app/robots.ts`

Next.js App Router native. Auto-served at `/robots.txt`.

Always disallow `/admin/`, `/app/`, `/api/` — these are authenticated or internal.

---

## Keywords strategy

Focus on Colombian/Cali-specific terms + esports niche. Target phrases:
- `esports Colombia` / `gaming Cali` / `gaming tower Colombia`
- `cursos esports Colombia` / `academia esports`
- `torneos esports Colombia` / `competencias gaming`
- `1UP` / `1upesports`

Avoid generic global terms with no local modifier — competition is too high.

---

## Checklist for new public pages

- [ ] `export const metadata: Metadata` with title, description, keywords, openGraph, twitter, alternates.canonical
- [ ] Add route to `src/app/sitemap.ts` with appropriate priority and changeFrequency
- [ ] JSON-LD if page has events, products, or organization data
- [ ] OG image: default `/1up.png` — or a page-specific image if one exists in Supabase Storage
