# Product Management — Notion (keep it in sync)

The product backlog and the official docs live in **Notion** and must be kept current as work
ships. Use the Notion MCP (`mcp__claude_ai_Notion__*`) — it's connected.

## Where things live

| Thing | Notion |
|---|---|
| **Product Hub** ("1UP — Producción · Producto & Documentos") | page `371999f7-988e-81b7-9ce5-e2e4e2153cb2` |
| **Product Backlog** (database) | `8760290195374baa92c85f64f20e1159` · data source `collection://7018397b-7474-4e5a-9610-5b3090d01e6b` |
| Doc summary pages (under the hub) | Ficha Técnica v2.15 · Estado de Entrega EKX-2026-006 · Cuenta de Cobro EKX-2026-005 · Audit |

Backlog schema: `Name` (title) · `Status` (Idea/Backlog/Planned/In Progress/Shipped) ·
`Area` (Tournaments/Pass/Payments/Academia/Platform/Admin) · `Priority` (P0/P1/P2) ·
`Effort` (S/M/L) · `Why` · `Release` · `Links`.

## The rule

- **When you ship a feature:** find its backlog row and set `Status = Shipped` + the `Release`
  version + a PR link in `Links` (use `notion-update-page`). If no row exists, create one.
- **When you plan or discover work** (a new feature, an audit-deferred item, a fast-follow):
  add a backlog row with at least Name + Status + Area + Why (use `notion-create-pages` with
  `parent: { data_source_id }`).
- **When a release changes the Ficha Técnica / Estado de Entrega:** update the version line on
  the matching doc summary page so Notion doesn't drift from the repo.

## Source of truth

The full doc bodies are the repo Markdown (`docs/FICHA-TECNICA.md`, `docs/ESTADO_ENTREGA_*.md`,
`docs/CUENTA DE COBRO_*.md`, `AUDIT.md`). Notion holds summary cards + (optionally) the full
body via native **Markdown import** (`··· → Import → Markdown`) — do NOT hand-transcribe long
docs through the API; it's lossy on tables and wasteful. Keep the summary versions current.

## Drift warning

The older Notion "Platform Tracker" (Feb 2026) and the previous "FICHA TÉCNICA" page (under
*Ekinoxis Labs › Servicios › 1up*) describe a **different smart-contract architecture**
(IdentityNFT/ChallengeVault/CourseNFT) — that is NOT the production product. The live product
is the Next.js + Supabase platform. Don't trust those for current state.
