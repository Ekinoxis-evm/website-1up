---
name: release-management
description: Version control, client delivery tracking, and maintenance protocol for the 1UP Gaming Tower website
type: skill
filePattern: CHANGELOG.md
---

# Release Management — 1UP Gaming Tower

This skill activates whenever you work on versioning, changelogs, client deliveries, or maintenance tasks.
Follow this protocol exactly. This is a **client delivery project** — every change must be traceable.

---

## Versioning Scheme

```
MAJOR.MINOR.PATCH
```

| Level | When to increment | Examples |
|-------|------------------|---------|
| PATCH | Bug fixes, copy/style tweaks, no schema changes | `1.2.1` |
| MINOR | New feature, new admin section, new integration | `1.3.0` |
| MAJOR | Breaking schema changes, redesign, platform migration | `2.0.0` |

**Current version is always the last entry in `CHANGELOG.md`.**

---

## Changelog Format

Every release entry in `CHANGELOG.md` follows this structure:

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Added
- Short description of new feature or page

### Changed
- What was modified (mention specific files/routes if helpful)

### Fixed
- Bug or issue resolved

### Removed
- What was deleted (e.g., deprecated fields, old flows)

### DB Migration
- SQL file applied: `src/db/migrations/<filename>.sql`
- Tables affected: list them

### Environment Variables
- New vars required: list them with source

### Delivered by
- Ekinoxis / developer name

### Client notes
- Any notes for the client (non-technical language)
```

Omit sections that don't apply. Always include **Delivered by** and **DB Migration** if schema changed.

---

## Release Checklist

Before marking a version as delivered, verify all steps:

```
CODE
[ ] npm run build — zero errors
[ ] npx tsc --noEmit — zero TypeScript errors
[ ] npm run lint — zero ESLint errors

DATABASE
[ ] Incremental SQL migration written and tested
[ ] src/db/schema.ts updated
[ ] src/types/database.types.ts updated to match schema
[ ] Both files in sync (same columns, same types, same FK names)

ENVIRONMENT
[ ] All new env vars documented in CLAUDE.md + README.md
[ ] .env.local.example updated if it exists

DOCUMENTATION
[ ] CHANGELOG.md entry written for this version
[ ] README.md updated if routes/tables/stack changed
[ ] CLAUDE.md updated if rules/routes/env vars changed

DELIVERY
[ ] Git commit with version tag: git tag v<X.Y.Z>
[ ] Client notified of what changed (plain language)
[ ] Pending items listed (e.g., "Comfenalco API pending credentials")
```

---

## DB Migration Protocol

Every schema change follows this order:

1. Edit `src/db/schema.ts` (Drizzle — source of truth)
2. Run `npx drizzle-kit generate --name=<descriptive_name>` to produce the snapshot SQL
3. Write a **separate incremental SQL file** for changes only (not full snapshot) — named `incremental_<feature>.sql`
4. Run the incremental file in **Supabase SQL Editor** (not drizzle-kit push in production)
5. Update `src/types/database.types.ts` manually to match
6. Run `npx tsc --noEmit` to confirm types are clean
7. Document the migration file name in `CHANGELOG.md`

> **Why not `drizzle-kit push` in production?** Supabase has its own migration history. Pushing directly bypasses audit trails. Always use the SQL Editor with the incremental file.

---

## Maintenance Tasks

When a client reports an issue or requests a change:

### Bug fix flow
1. Reproduce the bug locally
2. Fix it — keep the change minimal, don't refactor surrounding code
3. Run build + type check
4. Create a PATCH version entry in CHANGELOG.md
5. Deploy

### Feature request flow
1. Understand the full scope before writing code
2. Check if it requires schema changes — if yes, start with DB migration protocol above
3. Implement following the established patterns (see admin-crud.md, database.md)
4. Run full release checklist
5. Create a MINOR version entry in CHANGELOG.md
6. Deploy and notify client

### Comfenalco integration (pending)
When Comfenalco provides API documentation:
1. Open `src/lib/comfenalco.ts`
2. Replace the `// TODO` block with the real HTTP call
3. Adjust request shape (endpoint, headers, body) and response parsing
4. Test with sandbox credentials first
5. Add `COMFENALCO_API_URL` and `COMFENALCO_API_KEY` to production env vars
6. Create a MINOR version entry: "Comfenalco API integration activated"

### MercadoPago webhook registration
The webhook URL must be registered in the MercadoPago dashboard:
- URL: `https://1upesports.org/api/webhooks/mercadopago`
- Events: `payment` (payment.created, payment.updated)
- Copy the signing secret → set `MERCADOPAGO_WEBHOOK_SECRET`

---

## Version History Reference

Read `CHANGELOG.md` for the full version history. When a user asks "what was delivered in version X" or "what changed recently", read CHANGELOG.md directly — do not rely on memory.

---

## Git Tagging Convention

```bash
# After merging to main and deploying:
git tag v1.2.0 -m "v1.2.0 — MercadoPago + Comfenalco integration"
git push origin v1.2.0
```

Tags make it trivial to roll back: `git checkout v1.1.0`

---

## Client Communication Template

When delivering a new version, communicate in plain non-technical language:

```
Versión X.Y.Z entregada — [fecha]

Novedades:
• [Feature 1 en español simple]
• [Feature 2 en español simple]

Requisitos por su parte:
• [Acción requerida, ej: "Ejecutar el SQL adjunto en Supabase"]
• [Acción requerida, ej: "Agregar MERCADOPAGO_ACCESS_TOKEN en Vercel"]

Pendiente (próxima versión):
• [Lo que queda por hacer]
```
