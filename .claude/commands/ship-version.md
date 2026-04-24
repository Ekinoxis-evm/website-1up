Run the full release checklist for the 1UP Gaming Tower website before marking a version as delivered.

Follow this checklist sequentially. Do not skip steps. Stop and report any failures.

## Step 1 — Code quality

```bash
npm run lint
```
Fix all lint errors before proceeding.

```bash
npx tsc --noEmit
```
Fix all TypeScript errors before proceeding.

```bash
npm run build
```
Fix any build errors. Do not proceed until this is clean.

## Step 2 — Database consistency

Confirm these three things are in sync:
1. Any DB migration was applied in Supabase SQL Editor (not drizzle-kit push)
2. `src/types/database.types.ts` matches the current Supabase schema
3. API routes map camelCase body keys → snake_case DB columns correctly

If there was a schema change, verify the `database.types.ts` was regenerated via Supabase MCP:
`mcp__plugin_supabase_supabase__generate_typescript_types`

## Step 3 — Documentation (Rule 8 — mandatory)

Check and update:
- [ ] `CHANGELOG.md` — new version entry with correct semver (PATCH/MINOR/MAJOR)
- [ ] `README.md` — update if routes/tables/stack/env vars changed
- [ ] `CLAUDE.md` — update if rules/routes/env vars/tables changed
- [ ] Relevant skill files in `.claude/skills/` — update if patterns changed

The current version is the last entry in `CHANGELOG.md`. Increment correctly:
- PATCH: bug fix, copy/style tweak, no schema change
- MINOR: new feature, new admin section, new integration
- MAJOR: breaking schema change, full redesign, platform migration

## Step 4 — Environment variables

If new env vars were added:
- [ ] Documented in `CLAUDE.md` → Environment Variables table
- [ ] Documented in `README.md`
- [ ] Added to `CLAUDE.local.md` with source instructions
- [ ] Added to Vercel project settings (if deploying to production)

## Step 5 — Git

```bash
git status
git add <specific files — never git add -A>
git commit -m "vX.Y.Z — short description"
git tag vX.Y.Z -m "vX.Y.Z — short description"
git push origin main
git push origin vX.Y.Z
```

## Step 6 — Verify production deploy

After Vercel auto-deploys main:
1. Open https://1upesports.org — public home loads
2. Open https://admin.1upesports.org — admin login works
3. Check the specific feature that was just shipped

## Step 7 — Client notification

Write a plain-language delivery message (in Spanish) using the template in `.claude/skills/release-management.md → Client Communication Template`.

Report:
- What version was shipped
- What changed (non-technical)
- Any required client actions (SQL to run, env vars to add, etc.)
- What's still pending (next version)
