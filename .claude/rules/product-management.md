# Product Management — Notion (keep it in sync)

The product tracker and the official docs live in **Notion** and must be kept current as work
ships. Use the Notion MCP (`mcp__claude_ai_Notion__*`) — it's connected.

## Where things live

The single hub is **"Gaming Tower app — Ekinoxis × 1UP"** (`311999f7-988e-8049-89a4-d1a1b2f54b45`).
It's flat — every section is one child page:

| Thing | Notion |
|---|---|
| **Hub (entry point)** | page `311999f7-988e-8049-89a4-d1a1b2f54b45` |
| **Master Dashboard** (= Product Backlog DB) | `8760290195374baa92c85f64f20e1159` · data source `collection://7018397b-7474-4e5a-9610-5b3090d01e6b` |
| **Documentación funcionalidad-por-funcionalidad** | `388999f7-988e-81a9-886a-ccbabbf88e65` |
| **Referencia técnica** (Ficha Técnica · Auditoría) | container `388999f7-988e-81c1-a101-da4cd6937840` |
| **Trabajo on-chain** (Capa Blockchain · Platform Tracker) | container `388999f7-988e-813b-b8de-ec6563f36c39` |
| **Propuesta comercial & roadmap** (panorama + 6 docs) | container `388999f7-988e-8128-b9c1-eec8ca5b5dc6` |
| **Documentos privados** (Estado de Entrega · Cuenta de Cobro) | container `388999f7-988e-8150-ac22-ed6ca01be7a5` |

> The old "1UP — Producción · Producto & Documentos" sub-hub was dissolved — its pages were
> promoted to the flat hub above. Don't recreate it.

**Master Dashboard schema:** `Name` (title) · `Status` (Idea → Backlog → Planned → In Progress →
QA / En pruebas → Shipped) · `Módulo` (Torneos · 1UP Pass · Academia · 1UP Token & Wallet ·
Marketplace · Pagos · Onboarding & Identidad · Plataforma · Gaming Tower) · `Superficie`
(Público / Usuario / Admin / Transversal) · `Priority` (P0/P1/P2) · `Effort` (S/M/L) · `Why` ·
`Release` · `Links`. Saved views: **Flujo (Kanban)** · **Por Módulo** · **Por Superficie** ·
**Roadmap (pendiente)**.

## The ship funnel (the workflow — every feature and fix)

Each piece of work runs the same clean loop, tracked end-to-end in the **Master Dashboard**.
This is the funnel — describe → plan → build → test → ship → record:

1. **Check Notion** — open the Master Dashboard (Flujo/Kanban + Roadmap views). See what's in flight; avoid duplicates.
2. **Describe the issue / feature** — create a row: `Name` + `Módulo` + `Superficie` + `Why`, Status `Backlog` or `Planned`. Use `notion-create-pages` with `parent: { data_source_id: '7018397b-7474-4e5a-9610-5b3090d01e6b' }`. **Bugs are rows too.**
3. **Plan** — analyze the approach (plan mode / `code-architect` for non-trivial). Move Status → `In Progress`. Branch off `main`.
4. **Build** — implement on the feature branch.
5. **Test** — `npm run build` + `npm run test:run` + `npm run lint`, all green. Move Status → `QA / En pruebas`.
6. **Push & merge** — open a PR, merge to `main` (Vercel auto-deploys). Move Status → `Shipped`, set `Release` (version), and put the PR link in `Links` (use `notion-update-page`).
7. **Docs** — bump `CHANGELOG.md` / `README.md` / `FICHA-TECNICA.md` per CLAUDE.md Rule 8 (see also `.claude/skills/release-management.md`).

**Keep the dashboard in sync** — a feature isn't "done" until its row is `Shipped` with a Release.
When a release changes the Ficha Técnica / Estado de Entrega, update the matching Notion page so it
doesn't drift from the repo.

**Always keep a dated current-state version.** Every shipped change bumps the **"última
actualización" date to the current day** AND the prod-version line on the master docs it touches
(Ficha Técnica, the QA "Pruebas & Auditorías" page `389999f7-988e-8194-a0af-e304b8cb1ce5`, and the
relevant feature doc) — so the hub always shows a today-dated snapshot that matches `main`. Verify
versions/dates aren't stale when you touch a master page; the sweep on 2026-06-24 caught a Ficha that
still said prod v2.40.0 + two false claims.

## Source of truth

The repo is **PUBLIC**. Two classes of doc:

- **Public docs (in the repo):** `docs/FICHA-TECNICA.md` (institutional tech sheet) and `AUDIT.md`
  (closed findings). Keep these current in the repo.
- **PRIVATE docs (gitignored — local + Notion only, NEVER commit/push):**
  `docs/ESTADO_ENTREGA_*.md`, `docs/CUENTA DE COBRO_*.md`, `docs/SEGUIMIENTO-FEEDBACK.md`. These
  are delivery/billing/internal-feedback artifacts. They live on disk locally and their canonical
  home is **Notion (private)**. They're in `.gitignore` — do **not** re-add them to the repo, and
  never paste their billing amounts anywhere public. Update them locally + in Notion only.

Notion holds summary cards + (optionally) the full body via native **Markdown import**
(`··· → Import → Markdown`) — do NOT hand-transcribe long docs through the API; it's lossy on
tables and wasteful. Keep the summary versions current.

## Two product surfaces (this is real, not drift)

There are **two real product surfaces**, both built by Ekinoxis:

- **Website** — `1upesports.org` (Next.js + Supabase). The **live product**; contracted, **billed in
  COP** (Cuenta de Cobro EKX-2026-005, Estado de Entrega EKX-2026-006), evolving continuously.
- **On-chain-native app** — `gaming-tower-fe` + `gaming-tower-scs`. Built and **deployed on Base
  Mainnet** (factories, Feb 2026), **reserved for scale**, valued in **USD** (≈$42k, unbilled).

The Notion "Platform Tracker" documents the on-chain surface (it is **not** stale), and the
"Propuesta comercial" pages value it in USD — both now carry a "Panorama / Contexto" header that
reconciles them with the live website + COP billing. The "Capa Blockchain" page holds the deployed
factory addresses. Background: memory `project_two_surfaces_blockchain`. The older "FICHA TÉCNICA"
page under *Ekinoxis Labs › Servicios › 1up* predates all this — don't trust it for current state.

## Link repo files in Notion (don't write bare paths)

When a Notion page references a file/doc that lives in a repo, **link to GitHub** instead of writing
a bare path like "`AUDIT.md` en el repo". Both repos are **public**, so plain blob/tree links work
for everyone:
- Website: `https://github.com/Ekinoxis-evm/website-1up/blob/main/<path>` (tree for folders).
- Smart contracts: `https://github.com/Ekinoxis-evm/gaming-tower/blob/main/<path>`.

No GitHub MCP / auth is needed (and the GitHub MCP doesn't work with Claude Code anyway — use `gh`).
Apply this to every Notion page, new and existing.

## Notion-editing gotcha

`notion-create-pages` handles `\n` in `content` correctly, but `notion-update-page`
(`insert_content` / `update_content`) treats literal `\n` as an escaped "n" and can drop trailing
blocks (e.g. tables). For update-page, use **real newlines** in the string, or single-line
`update_content` replacements. `replace_content` refuses unless every existing child `<page>` /
`<database>` is re-listed.
