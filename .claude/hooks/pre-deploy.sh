#!/usr/bin/env bash
# ============================================================
# Hook: PreToolUse (mcp__plugin_vercel_vercel__deploy_to_vercel)
# Event: Fires BEFORE Claude triggers a Vercel deployment.
# Does: Runs lint + type check + build. BLOCKS deploy on failure.
# Disable: Remove the PreToolUse entry from .claude/settings.json
# ============================================================

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║         PRE-DEPLOY VALIDATION                ║"
echo "╚══════════════════════════════════════════════╝"

# ── 1. Lint ──────────────────────────────────────
echo ""
echo "→ Running ESLint..."
if ! npm run lint 2>&1; then
  echo ""
  echo "✗ DEPLOY BLOCKED — ESLint errors found."
  echo "  Fix all lint errors before deploying."
  exit 1
fi
echo "✓ Lint passed"

# ── 2. TypeScript ────────────────────────────────
echo ""
echo "→ Running TypeScript check..."
if ! npx --no tsc --noEmit 2>&1; then
  echo ""
  echo "✗ DEPLOY BLOCKED — TypeScript errors found."
  echo "  Fix all type errors before deploying."
  exit 1
fi
echo "✓ TypeScript clean"

# ── 3. Build ─────────────────────────────────────
echo ""
echo "→ Running production build..."
if ! npm run build 2>&1; then
  echo ""
  echo "✗ DEPLOY BLOCKED — Build failed."
  echo "  Fix all build errors before deploying."
  exit 1
fi
echo "✓ Build succeeded"

# ── 4. Docs reminder ─────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✓ All checks passed — deploying...         ║"
echo "║                                              ║"
echo "║  Reminder: Did you update CHANGELOG.md?     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Exit 0 — allow the deploy to proceed
exit 0
